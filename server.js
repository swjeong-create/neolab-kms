require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudflare/ngrok 프록시 신뢰 (HTTPS 콜백 URL 자동 생성에 필요)
app.set('trust proxy', true);

// ─── 로깅 함수 ───
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function writeLog(type, message, details = '') {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const logLine = `[${timeStr}] [${type}] ${message} ${details}\n`;

    // 콘솔 출력
    if (type === 'ERROR') console.error(logLine.trim());
    else console.log(logLine.trim());

    // 파일 기록
    const logFile = path.join(logsDir, `${dateStr}.log`);
    fs.appendFileSync(logFile, logLine);
}

// 오래된 로그 파일 자동 삭제 (30일)
function cleanOldLogs() {
    try {
        const files = fs.readdirSync(logsDir);
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        files.forEach(f => {
            const filePath = path.join(logsDir, f);
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs < cutoff) fs.unlinkSync(filePath);
        });
    } catch (e) { /* ignore */ }
}
cleanOldLogs();
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000); // 매일 실행

// ─── 비밀번호 해싱 ───
function hashPassword(password, salt = null) {
    salt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt] = storedHash.split(':');
    return hashPassword(password, salt) === storedHash;
}

// ─── 미들웨어 ───
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 세션 저장소: 파일 기반 (서버 재시작해도 로그인 유지)
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

app.use(session({
    store: new FileStore({
        path: sessionsDir,
        ttl: 86400,        // 24시간
        retries: 0,
        cleanupInterval: 3600  // 1시간마다 만료 세션 정리
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24시간
        secure: 'auto',               // HTTPS일 때 자동으로 secure 적용
        httpOnly: true,                // JavaScript에서 쿠키 접근 차단
        sameSite: 'lax'
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// 접속 로깅 미들웨어
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/auth/google' || req.path === '/auth/google/callback') {
        const user = req.user ? req.user.email : 'anonymous';
        writeLog('ACCESS', `${req.method} ${req.path}`, `user=${user} ip=${req.ip}`);
    }
    next();
});

// ─── Passport Google OAuth ───
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback',
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    const domain = email.split('@')[1];
    if (domain !== process.env.ALLOWED_DOMAIN) {
        writeLog('AUTH', `도메인 거부: ${email}`, `domain=${domain}`);
        return done(null, false, { message: '허용되지 않은 도메인입니다.' });
    }
    const admin = await isAdminEmail(email);
    writeLog('AUTH', `로그인 성공: ${email}`, `admin=${admin} superAdmin=${isSuperAdmin(email)}`);
    return done(null, {
        id: profile.id,
        email: email,
        name: profile.displayName,
        photo: profile.photos[0]?.value,
        isAdmin: admin,
        isSuperAdmin: isSuperAdmin(email)
    });
}));

// ─── 인증 미들웨어 ───
function requireAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: '로그인이 필요합니다.' });
}

async function requireAdmin(req, res, next) {
    if (!req.isAuthenticated()) return res.status(401).json({ error: '로그인이 필요합니다.' });
    if (!req.session.adminVerified) return res.status(403).json({ error: '관리자 인증이 필요합니다.' });
    // 실시간 관리자 확인 (세션 중에 관리자에서 제거되었을 수 있음)
    const admin = await isAdminEmail(req.user.email);
    if (!admin) return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    next();
}

function requireSuperAdmin(req, res, next) {
    if (!req.isAuthenticated()) return res.status(401).json({ error: '로그인이 필요합니다.' });
    if (!req.session.adminVerified) return res.status(403).json({ error: '관리자 인증이 필요합니다.' });
    if (!isSuperAdmin(req.user.email)) return res.status(403).json({ error: '슈퍼 관리자 권한이 필요합니다.' });
    next();
}

// ─── Google Sheets 클라이언트 ───
let sheets;
let SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function initSheets() {
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    if (!keyPath || !fs.existsSync(keyPath)) {
        writeLog('WARN', '서비스 계정 키 파일이 없습니다. Google Sheets 연동이 비활성화됩니다.');
        return;
    }
    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheets = google.sheets({ version: 'v4', auth });
    writeLog('INFO', 'Google Sheets 연결 완료');
}

// ─── Sheets 헬퍼 함수 ───
async function getSheetData(sheetName) {
    if (!sheets) return [];
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!A:Z`
        });
        const rows = res.data.values;
        if (!rows || rows.length < 2) return [];
        const headers = rows[0];
        return rows.slice(1).map((row, idx) => {
            const obj = { _rowIndex: idx + 2 };
            headers.forEach((h, i) => { obj[h] = row[i] || ''; });
            return obj;
        });
    } catch (err) {
        if (err.code === 400 || err.message?.includes('Unable to parse range')) {
            await createSheet(sheetName);
            return [];
        }
        writeLog('ERROR', `Sheets 읽기 오류 (${sheetName})`, err.message);
        return [];
    }
}

async function createSheet(sheetName) {
    if (!sheets) return;
    try {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SHEET_ID,
            requestBody: {
                requests: [{ addSheet: { properties: { title: sheetName } } }]
            }
        });
        const headers = SHEET_HEADERS[sheetName];
        if (headers) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                requestBody: { values: [headers] }
            });
        }
        writeLog('INFO', `시트 생성 완료: ${sheetName}`);
    } catch (err) {
        if (!err.message?.includes('already exists')) {
            writeLog('ERROR', `시트 생성 오류 (${sheetName})`, err.message);
        }
    }
}

const SHEET_HEADERS = {
    boards: ['id', 'name', 'icon', 'order'],
    categories: ['id', 'boardId', 'name', 'order'],
    posts: ['id', 'boardId', 'categoryId', 'title', 'type', 'icon', 'subInfo', 'content', 'url', 'fileName', 'views', 'date', 'order'],
    notices: ['id', 'title', 'type', 'content', 'date'],
    contacts: ['id', 'name', 'position', 'dept', 'phone', 'email', 'status'],
    orgchart: ['id', 'name', 'title', 'level', 'parentId'],
    settings: ['key', 'value'],
    admins: ['email', 'name', 'passwordHash', 'addedBy', 'addedDate']
};

// ─── 관리자 확인 함수 (슈퍼관리자 + 추가관리자) ───
const superAdminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

async function isAdminEmail(email) {
    const lowerEmail = email.toLowerCase();
    // 1. 슈퍼 관리자 확인 (.env)
    if (superAdminEmails.includes(lowerEmail)) return true;
    // 2. 추가 관리자 확인 (Google Sheets)
    try {
        const admins = await getCached('admins');
        return admins.some(a => a.email.toLowerCase() === lowerEmail);
    } catch (e) {
        return false;
    }
}

function isSuperAdmin(email) {
    return superAdminEmails.includes(email.toLowerCase());
}

async function appendRow(sheetName, data) {
    if (!sheets) return;
    const headers = SHEET_HEADERS[sheetName];
    const row = headers.map(h => data[h] !== undefined ? String(data[h]) : '');
    await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] }
    });
}

async function updateRow(sheetName, rowIndex, data) {
    if (!sheets) return;
    const headers = SHEET_HEADERS[sheetName];
    const row = headers.map(h => data[h] !== undefined ? String(data[h]) : '');
    await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] }
    });
}

// 개선된 deleteRow: ID 기반 삭제 (동시 삭제 시 데이터 손상 방지)
async function deleteRow(sheetName, targetId) {
    if (!sheets) return;
    // 삭제 직전에 최신 데이터를 다시 읽어서 정확한 rowIndex 확보
    const freshData = await getSheetData(sheetName);
    // admins 시트는 email이 키, 나머지는 id가 키
    const keyField = sheetName === 'admins' ? 'email' : 'id';
    const row = freshData.find(r => r[keyField] === targetId);
    if (!row) {
        writeLog('WARN', `삭제 대상 없음: ${sheetName}/${targetId}`);
        return;
    }
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) return;
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheet.properties.sheetId,
                        dimension: 'ROWS',
                        startIndex: row._rowIndex - 1,
                        endIndex: row._rowIndex
                    }
                }
            }]
        }
    });
    writeLog('INFO', `행 삭제: ${sheetName}/${targetId}`);
}

// ─── 인메모리 캐시 (Sheets API 호출 최소화) ───
const cache = {};
const CACHE_TTL = 30000; // 30초

async function getCached(sheetName) {
    const now = Date.now();
    if (cache[sheetName] && (now - cache[sheetName].time < CACHE_TTL)) {
        return cache[sheetName].data;
    }
    const data = await getSheetData(sheetName);
    cache[sheetName] = { data, time: now };
    return data;
}

function invalidateCache(sheetName) {
    delete cache[sheetName];
}

// ─── 파일 업로드 설정 ───
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, uuidv4() + ext);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.gif'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('허용되지 않은 파일 형식입니다.'));
    }
});

// ─── 업로드 파일 자동 백업 ───
const backupDir = path.join(__dirname, 'uploads_backup');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

function backupUploads() {
    try {
        const files = fs.readdirSync(uploadsDir);
        let copied = 0;
        files.forEach(f => {
            const src = path.join(uploadsDir, f);
            const dest = path.join(backupDir, f);
            if (!fs.existsSync(dest)) {
                fs.copyFileSync(src, dest);
                copied++;
            }
        });
        if (copied > 0) writeLog('BACKUP', `파일 백업 완료: ${copied}개 신규 복사`);
    } catch (err) {
        writeLog('ERROR', '파일 백업 실패', err.message);
    }
}

// 1시간마다 백업 실행
backupUploads();
setInterval(backupUploads, 60 * 60 * 1000);

// ═══════════════════════════════════════
// 인증 라우트
// ═══════════════════════════════════════

app.get('/auth/google', (req, res, next) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const callbackURL = `${protocol}://${host}/auth/google/callback`;
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        hd: process.env.ALLOWED_DOMAIN,
        callbackURL: callbackURL
    })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const callbackURL = `${protocol}://${host}/auth/google/callback`;
    passport.authenticate('google', {
        failureRedirect: '/login.html?error=auth_failed',
        callbackURL: callbackURL
    })(req, res, () => {
        res.redirect('/');
    });
});

app.get('/auth/logout', (req, res) => {
    const email = req.user?.email || 'unknown';
    req.logout(() => {
        writeLog('AUTH', `로그아웃: ${email}`);
        res.redirect('/');
    });
});

// 관리자 비밀번호 확인 (개별 비밀번호)
app.post('/api/admin/verify', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    const admin = await isAdminEmail(req.user.email);
    if (!admin) return res.status(403).json({ error: '관리자 계정이 아닙니다.' });
    const { password } = req.body;

    // 관리자 시트에서 해당 이메일의 비밀번호 해시 조회
    const admins = await getSheetData('admins');
    const adminRow = admins.find(a => a.email.toLowerCase() === req.user.email.toLowerCase());

    let passwordOk = false;

    if (adminRow && adminRow.passwordHash) {
        // 개별 비밀번호가 설정되어 있으면 해시 비교
        passwordOk = verifyPassword(password, adminRow.passwordHash);
    } else {
        // 비밀번호가 아직 설정되지 않은 경우 (슈퍼관리자 최초 또는 신규 관리자)
        // .env의 기본 비밀번호로 확인
        passwordOk = (password === process.env.ADMIN_PASSWORD);
        // 최초 로그인 시 자동으로 개별 비밀번호 등록
        if (passwordOk) {
            const hashed = hashPassword(password);
            if (adminRow) {
                adminRow.passwordHash = hashed;
                await updateRow('admins', adminRow._rowIndex, adminRow);
            } else {
                // 슈퍼 관리자가 admins 시트에 없으면 추가
                await appendRow('admins', {
                    email: req.user.email.toLowerCase(),
                    name: req.user.name || '',
                    passwordHash: hashed,
                    addedBy: 'system',
                    addedDate: new Date().toISOString().split('T')[0]
                });
            }
            invalidateCache('admins');
        }
    }

    if (passwordOk) {
        req.session.adminVerified = true;
        req.user.isAdmin = true;
        req.user.isSuperAdmin = isSuperAdmin(req.user.email);
        // 비밀번호 변경 필요 여부 (기본 비밀번호 사용 중인 경우)
        const needsPasswordChange = !adminRow || !adminRow.passwordHash;
        writeLog('ADMIN', `관리자 인증 성공: ${req.user.email}`);
        res.json({ success: true, needsPasswordChange });
    } else {
        writeLog('ADMIN', `관리자 인증 실패: ${req.user.email}`);
        res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
    }
});

// 관리자 비밀번호 변경 (본인만)
app.post('/api/admin/change-password', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    if (!req.session.adminVerified) return res.status(403).json({ error: '관리자 인증이 필요합니다.' });

    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: '새 비밀번호는 4자 이상이어야 합니다.' });
    }

    const admins = await getSheetData('admins');
    const adminRow = admins.find(a => a.email.toLowerCase() === req.user.email.toLowerCase());

    // 현재 비밀번호 확인
    let currentOk = false;
    if (adminRow && adminRow.passwordHash) {
        currentOk = verifyPassword(currentPassword, adminRow.passwordHash);
    } else {
        currentOk = (currentPassword === process.env.ADMIN_PASSWORD);
    }

    if (!currentOk) {
        return res.status(401).json({ error: '현재 비밀번호가 틀렸습니다.' });
    }

    // 새 비밀번호 저장
    const hashed = hashPassword(newPassword);
    if (adminRow) {
        adminRow.passwordHash = hashed;
        await updateRow('admins', adminRow._rowIndex, adminRow);
    } else {
        await appendRow('admins', {
            email: req.user.email.toLowerCase(),
            name: req.user.name || '',
            passwordHash: hashed,
            addedBy: 'system',
            addedDate: new Date().toISOString().split('T')[0]
        });
    }
    invalidateCache('admins');
    writeLog('ADMIN', `비밀번호 변경: ${req.user.email}`);
    res.json({ success: true });
});

// 관리자 비밀번호 초기화 (슈퍼 관리자가 다른 관리자의 비밀번호를 초기화)
app.post('/api/admins/:email/reset-password', requireSuperAdmin, async (req, res) => {
    try {
        const targetEmail = decodeURIComponent(req.params.email).toLowerCase();
        const admins = await getSheetData('admins');
        const adminRow = admins.find(a => a.email.toLowerCase() === targetEmail);
        if (!adminRow) return res.status(404).json({ error: '해당 관리자를 찾을 수 없습니다.' });

        // 기본 비밀번호로 초기화
        adminRow.passwordHash = '';
        await updateRow('admins', adminRow._rowIndex, adminRow);
        invalidateCache('admins');
        writeLog('ADMIN', `비밀번호 초기화: ${targetEmail}`, `by=${req.user.email}`);
        res.json({ success: true, message: `${targetEmail}의 비밀번호가 기본 비밀번호로 초기화되었습니다.` });
    } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/me', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    const admin = await isAdminEmail(req.user.email);
    res.json({
        email: req.user.email,
        name: req.user.name,
        photo: req.user.photo,
        isAdmin: admin,
        isSuperAdmin: isSuperAdmin(req.user.email)
    });
});

// ═══════════════════════════════════════
// 관리자 관리 API (슈퍼 관리자 전용)
// ═══════════════════════════════════════

// 관리자 목록 조회
app.get('/api/admins', requireAdmin, async (req, res) => {
    try {
        const admins = await getCached('admins');
        const adminList = admins.map(({ _rowIndex, ...r }) => r);
        // 슈퍼 관리자도 목록에 포함
        const allAdmins = superAdminEmails.map(email => ({
            email,
            name: '슈퍼 관리자',
            addedBy: 'system',
            addedDate: '-',
            isSuperAdmin: true
        }));
        // 추가 관리자 병합 (슈퍼 관리자와 중복 제거)
        adminList.forEach(a => {
            if (!superAdminEmails.includes(a.email.toLowerCase())) {
                allAdmins.push({ ...a, isSuperAdmin: false });
            }
        });
        res.json(allAdmins);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 관리자 추가 (슈퍼 관리자만 가능)
app.post('/api/admins', requireSuperAdmin, async (req, res) => {
    try {
        const { email, name } = req.body;
        if (!email) return res.status(400).json({ error: '이메일은 필수입니다.' });

        // 도메인 확인
        const domain = email.split('@')[1];
        if (domain !== process.env.ALLOWED_DOMAIN) {
            return res.status(400).json({ error: `@${process.env.ALLOWED_DOMAIN} 도메인만 추가할 수 있습니다.` });
        }

        // 이미 관리자인지 확인
        const existing = await isAdminEmail(email);
        if (existing) return res.status(400).json({ error: '이미 관리자로 등록되어 있습니다.' });

        await appendRow('admins', {
            email: email.toLowerCase(),
            name: name || '',
            addedBy: req.user.email,
            addedDate: new Date().toISOString().split('T')[0]
        });
        invalidateCache('admins');
        writeLog('ADMIN', `관리자 추가: ${email}`, `by=${req.user.email}`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 관리자 삭제 (슈퍼 관리자만 가능)
app.delete('/api/admins/:email', requireSuperAdmin, async (req, res) => {
    try {
        const targetEmail = decodeURIComponent(req.params.email).toLowerCase();

        // 슈퍼 관리자는 삭제 불가
        if (isSuperAdmin(targetEmail)) {
            return res.status(403).json({ error: '슈퍼 관리자는 삭제할 수 없습니다.' });
        }

        const admins = await getSheetData('admins');
        const row = admins.find(a => a.email.toLowerCase() === targetEmail);
        if (!row) return res.status(404).json({ error: '해당 관리자를 찾을 수 없습니다.' });

        await deleteRow('admins', row.email);
        invalidateCache('admins');
        writeLog('ADMIN', `관리자 삭제: ${targetEmail}`, `by=${req.user.email}`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// 데이터 API 라우트
// ═══════════════════════════════════════

// --- Boards ---
app.get('/api/boards', requireAuth, async (req, res) => {
    try {
        const data = await getCached('boards');
        res.json(data.map(({ _rowIndex, ...r }) => r));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/boards', requireAdmin, async (req, res) => {
    try {
        const { id, name, icon } = req.body;
        if (!id || !name) return res.status(400).json({ error: 'id와 name은 필수입니다.' });
        await appendRow('boards', { id, name, icon: icon || '' });
        invalidateCache('boards');
        writeLog('ADMIN', `게시판 추가: ${name}`, `id=${id} by=${req.user.email}`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/boards/:id', requireAdmin, async (req, res) => {
    try {
        const data = await getSheetData('boards');
        const row = data.find(r => r.id === req.params.id);
        if (!row) return res.status(404).json({ error: '게시판을 찾을 수 없습니다.' });
        const updated = { ...row, ...req.body };
        await updateRow('boards', row._rowIndex, updated);
        invalidateCache('boards');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/boards/:id', requireAdmin, async (req, res) => {
    try {
        await deleteRow('boards', req.params.id);
        invalidateCache('boards');
        writeLog('ADMIN', `게시판 삭제: ${req.params.id}`, `by=${req.user.email}`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Categories ---
app.get('/api/categories', requireAuth, async (req, res) => {
    try {
        const data = await getCached('categories');
        const clean = data.map(({ _rowIndex, ...r }) => r);
        if (req.query.boardId) {
            res.json(clean.filter(c => c.boardId === req.query.boardId));
        } else {
            const grouped = {};
            clean.forEach(c => {
                if (!grouped[c.boardId]) grouped[c.boardId] = [];
                grouped[c.boardId].push({ id: c.id, name: c.name });
            });
            res.json(grouped);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
    try {
        const { id, boardId, name } = req.body;
        if (!id || !boardId || !name) return res.status(400).json({ error: 'id, boardId, name은 필수입니다.' });
        await appendRow('categories', { id, boardId, name });
        invalidateCache('categories');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/categories/:boardId/:catId', requireAdmin, async (req, res) => {
    try {
        const data = await getSheetData('categories');
        const row = data.find(r => r.boardId === req.params.boardId && r.id === req.params.catId);
        if (!row) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
        const updated = { ...row, ...req.body };
        await updateRow('categories', row._rowIndex, updated);
        invalidateCache('categories');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/categories/:boardId/:catId', requireAdmin, async (req, res) => {
    try {
        await deleteRow('categories', req.params.catId);
        invalidateCache('categories');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Posts ---
app.get('/api/posts', requireAuth, async (req, res) => {
    try {
        let data = await getCached('posts');
        data = data.map(({ _rowIndex, ...r }) => r);
        if (req.query.boardId) data = data.filter(p => p.boardId === req.query.boardId);
        if (req.query.categoryId) data = data.filter(p => p.categoryId === req.query.categoryId);
        if (req.query.search) {
            const q = req.query.search.toLowerCase();
            data = data.filter(p => p.title.toLowerCase().includes(q) || (p.content && p.content.toLowerCase().includes(q)));
        }
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/posts/:id', requireAuth, async (req, res) => {
    try {
        const data = await getCached('posts');
        const post = data.find(p => p.id === req.params.id);
        if (!post) return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
        const { _rowIndex, ...clean } = post;
        res.json(clean);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/posts', requireAdmin, async (req, res) => {
    try {
        const data = await getSheetData('posts');
        const maxId = data.reduce((max, p) => Math.max(max, parseInt(p.id) || 0), 0);
        const post = {
            id: String(maxId + 1),
            boardId: req.body.boardId || '',
            categoryId: req.body.categoryId || '',
            title: req.body.title || '',
            type: req.body.type || 'text',
            icon: req.body.icon || '📄',
            subInfo: req.body.subInfo || '',
            content: req.body.content || '',
            url: req.body.url || '',
            fileName: req.body.fileName || '',
            views: '0',
            date: new Date().toISOString().split('T')[0]
        };
        await appendRow('posts', post);
        invalidateCache('posts');
        writeLog('ADMIN', `게시물 추가: ${post.title}`, `id=${post.id} by=${req.user.email}`);
        res.json({ success: true, id: post.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/posts/:id', requireAdmin, async (req, res) => {
    try {
        const data = await getSheetData('posts');
        const row = data.find(p => p.id === req.params.id);
        if (!row) return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
        const updated = { ...row, ...req.body, date: new Date().toISOString().split('T')[0] };
        await updateRow('posts', row._rowIndex, updated);
        invalidateCache('posts');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/posts/:id', requireAdmin, async (req, res) => {
    try {
        const data = await getSheetData('posts');
        const row = data.find(p => p.id === req.params.id);
        if (!row) return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
        // 첨부 파일 삭제
        if (row.fileName) {
            const filePath = path.join(uploadsDir, row.fileName);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await deleteRow('posts', req.params.id);
        invalidateCache('posts');
        writeLog('ADMIN', `게시물 삭제: ${row.title}`, `id=${req.params.id} by=${req.user.email}`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 조회수 증가 (일반 사용자도 가능)
app.post('/api/posts/:id/view', requireAuth, async (req, res) => {
    try {
        const data = await getSheetData('posts');
        const row = data.find(p => p.id === req.params.id);
        if (!row) return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
        row.views = String((parseInt(row.views) || 0) + 1);
        await updateRow('posts', row._rowIndex, row);
        invalidateCache('posts');
        res.json({ views: row.views });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 순서 변경 공통 API ---
app.put('/api/:sheetName/reorder', requireAdmin, async (req, res) => {
    try {
        const { sheetName } = req.params;
        const { items } = req.body; // [{id, order}, ...]
        if (!['boards', 'categories', 'posts'].includes(sheetName)) {
            return res.status(400).json({ error: '순서 변경이 지원되지 않는 시트입니다.' });
        }
        const data = await getSheetData(sheetName);
        for (const item of items) {
            const row = data.find(r => r.id === item.id);
            if (row) {
                row.order = String(item.order);
                await updateRow(sheetName, row._rowIndex, row);
            }
        }
        invalidateCache(sheetName);
        writeLog('ADMIN', `순서 변경: ${sheetName}`, `${items.length}건 by=${req.user.email}`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Notices ---
app.get('/api/notices', requireAuth, async (req, res) => {
    try {
        const data = await getCached('notices');
        res.json(data.map(({ _rowIndex, ...r }) => r));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notices', requireAdmin, async (req, res) => {
    try {
        const notice = {
            id: String(Date.now()),
            title: req.body.title || '',
            type: req.body.type || 'info',
            content: req.body.content || '',
            date: new Date().toISOString().split('T')[0]
        };
        await appendRow('notices', notice);
        invalidateCache('notices');
        writeLog('ADMIN', `공지 추가: ${notice.title}`, `by=${req.user.email}`);
        res.json({ success: true, id: notice.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notices/:id', requireAdmin, async (req, res) => {
    try {
        const data = await getSheetData('notices');
        const row = data.find(r => r.id === req.params.id);
        if (!row) return res.status(404).json({ error: '공지를 찾을 수 없습니다.' });
        const updated = { ...row, ...req.body, date: new Date().toISOString().split('T')[0] };
        await updateRow('notices', row._rowIndex, updated);
        invalidateCache('notices');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notices/:id', requireAdmin, async (req, res) => {
    try {
        await deleteRow('notices', req.params.id);
        invalidateCache('notices');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Contacts ---
app.get('/api/contacts', requireAuth, async (req, res) => {
    try {
        const data = await getCached('contacts');
        res.json(data.map(({ _rowIndex, ...r }) => r));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/contacts', requireAdmin, async (req, res) => {
    try {
        const contact = {
            id: String(Date.now()),
            name: req.body.name || '',
            position: req.body.position || '',
            dept: req.body.dept || '',
            phone: req.body.phone || '',
            email: req.body.email || '',
            status: req.body.status || 'active'
        };
        await appendRow('contacts', contact);
        invalidateCache('contacts');
        res.json({ success: true, id: contact.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/contacts/:id', requireAdmin, async (req, res) => {
    try {
        const data = await getSheetData('contacts');
        const row = data.find(r => r.id === req.params.id);
        if (!row) return res.status(404).json({ error: '연락처를 찾을 수 없습니다.' });
        const updated = { ...row, ...req.body };
        await updateRow('contacts', row._rowIndex, updated);
        invalidateCache('contacts');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/contacts/:id', requireAdmin, async (req, res) => {
    try {
        await deleteRow('contacts', req.params.id);
        invalidateCache('contacts');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Org Chart ---
app.get('/api/orgchart', requireAuth, async (req, res) => {
    try {
        const data = await getCached('orgchart');
        res.json(data.map(({ _rowIndex, ...r }) => r));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orgchart', requireAdmin, async (req, res) => {
    try {
        const entry = {
            id: String(Date.now()),
            name: req.body.name || '',
            title: req.body.title || '',
            level: req.body.level || '6',
            parentId: req.body.parentId || ''
        };
        await appendRow('orgchart', entry);
        invalidateCache('orgchart');
        res.json({ success: true, id: entry.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/orgchart/:id', requireAdmin, async (req, res) => {
    try {
        const data = await getSheetData('orgchart');
        const row = data.find(r => r.id === req.params.id);
        if (!row) return res.status(404).json({ error: '조직도 항목을 찾을 수 없습니다.' });
        const updated = { ...row, ...req.body };
        await updateRow('orgchart', row._rowIndex, updated);
        invalidateCache('orgchart');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/orgchart/:id', requireAdmin, async (req, res) => {
    try {
        await deleteRow('orgchart', req.params.id);
        invalidateCache('orgchart');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Settings ---
app.get('/api/settings', requireAuth, async (req, res) => {
    try {
        const data = await getCached('settings');
        const obj = {};
        data.forEach(r => { obj[r.key] = r.value; });
        res.json(obj);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/settings', requireAdmin, async (req, res) => {
    try {
        const data = await getSheetData('settings');
        for (const [key, value] of Object.entries(req.body)) {
            const existing = data.find(r => r.key === key);
            if (existing) {
                await updateRow('settings', existing._rowIndex, { key, value });
            } else {
                await appendRow('settings', { key, value });
            }
        }
        invalidateCache('settings');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// 파일 라우트
// ═══════════════════════════════════════

app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });
    writeLog('ADMIN', `파일 업로드: ${req.file.originalname}`, `size=${req.file.size} by=${req.user.email}`);
    res.json({
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
    });
});

app.get('/api/files/:filename', requireAuth, (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });

    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath);
});

// ─── 임시 공개 토큰 시스템 (Office Online Viewer용) ───
const fileTokens = new Map(); // token -> { filename, expires }

// 토큰 자동 정리 (1분마다)
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of fileTokens) {
        if (now > data.expires) fileTokens.delete(token);
    }
}, 60 * 1000);

// 임시 토큰 발급 (인증된 사용자만)
app.post('/api/files/:filename/token', requireAuth, (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });

    const token = uuidv4();
    fileTokens.set(token, {
        filename,
        expires: Date.now() + 10 * 60 * 1000 // 10분 유효
    });
    writeLog('ACCESS', `파일 토큰 발급: ${filename}`, `user=${req.user.email}`);
    res.json({ token });
});

// 토큰 기반 공개 파일 접근 (Office Online Viewer가 사용)
app.get('/api/public-files/:token/:filename', (req, res) => {
    const tokenData = fileTokens.get(req.params.token);
    if (!tokenData || Date.now() > tokenData.expires) {
        return res.status(403).json({ error: '만료되었거나 유효하지 않은 토큰입니다.' });
    }
    if (tokenData.filename !== req.params.filename) {
        return res.status(403).json({ error: '파일이 일치하지 않습니다.' });
    }

    const filePath = path.join(uploadsDir, path.basename(req.params.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });

    const ext = path.extname(req.params.filename).toLowerCase();
    const mimeTypes = {
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
});

// ═══════════════════════════════════════
// 백업/복원 라우트
// ═══════════════════════════════════════

app.get('/api/backup', requireAdmin, async (req, res) => {
    try {
        const backup = {};
        for (const sheetName of Object.keys(SHEET_HEADERS)) {
            const data = await getSheetData(sheetName);
            backup[sheetName] = data.map(({ _rowIndex, ...r }) => r);
        }
        writeLog('ADMIN', '데이터 백업 실행', `by=${req.user.email}`);
        res.setHeader('Content-Disposition', 'attachment; filename=kms_backup.json');
        res.json(backup);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/restore', requireAdmin, express.json({ limit: '100mb' }), async (req, res) => {
    try {
        const data = req.body;
        for (const sheetName of Object.keys(SHEET_HEADERS)) {
            if (!data[sheetName]) continue;
            const existing = await getSheetData(sheetName);
            if (existing.length > 0) {
                const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
                const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
                if (sheet) {
                    await sheets.spreadsheets.batchUpdate({
                        spreadsheetId: SHEET_ID,
                        requestBody: {
                            requests: [{
                                deleteDimension: {
                                    range: {
                                        sheetId: sheet.properties.sheetId,
                                        dimension: 'ROWS',
                                        startIndex: 1,
                                        endIndex: existing.length + 1
                                    }
                                }
                            }]
                        }
                    });
                }
            }
            const headers = SHEET_HEADERS[sheetName];
            const rows = data[sheetName].map(item =>
                headers.map(h => item[h] !== undefined ? String(item[h]) : '')
            );
            if (rows.length > 0) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SHEET_ID,
                    range: `${sheetName}!A:Z`,
                    valueInputOption: 'RAW',
                    requestBody: { values: rows }
                });
            }
        }
        Object.keys(cache).forEach(k => delete cache[k]);
        writeLog('ADMIN', '데이터 복원 실행', `by=${req.user.email}`);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════
// 정적 파일 서빙 (인증 후에만)
// ═══════════════════════════════════════

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) return next();
    if (!req.isAuthenticated()) {
        if (req.accepts('html')) return res.redirect('/login.html');
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── 글로벌 에러 핸들러 ───
app.use((err, req, res, next) => {
    writeLog('ERROR', `서버 에러: ${err.message}`, err.stack?.split('\n')[1]?.trim());
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// 예상치 못한 에러로 서버 종료 방지
process.on('uncaughtException', (err) => {
    writeLog('ERROR', `Uncaught Exception: ${err.message}`, err.stack?.split('\n')[1]?.trim());
});
process.on('unhandledRejection', (reason) => {
    writeLog('ERROR', `Unhandled Rejection: ${reason}`);
});

// ─── 서버 시작 ───
async function start() {
    await initSheets();
    app.listen(PORT, () => {
        writeLog('INFO', `NeoLab KMS 서버 시작: http://localhost:${PORT}`);
        writeLog('INFO', `허용 도메인: @${process.env.ALLOWED_DOMAIN}`);
        writeLog('INFO', `관리자: ${process.env.ADMIN_EMAILS}`);
        writeLog('INFO', `파일 저장: ${uploadsDir}`);
        writeLog('INFO', `파일 백업: ${backupDir}`);
        writeLog('INFO', `로그 저장: ${logsDir}`);
        console.log(`\n🚀 NeoLab KMS 서버 시작: http://localhost:${PORT}`);
        console.log(`📋 허용 도메인: @${process.env.ALLOWED_DOMAIN}`);
        console.log(`🔑 관리자: ${process.env.ADMIN_EMAILS}`);
        console.log(`📂 파일 저장: ${uploadsDir}`);
        console.log(`💾 파일 백업: ${backupDir}`);
        console.log(`📝 로그 저장: ${logsDir}\n`);
    });
}

start();
