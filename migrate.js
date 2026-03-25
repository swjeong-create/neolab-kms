/**
 * KMS 데이터 마이그레이션 스크립트
 *
 * 기존 localStorage 백업 JSON 파일을 Google Sheets로 마이그레이션합니다.
 * Base64로 저장된 PDF는 파일로 추출하여 uploads/ 디렉토리에 저장합니다.
 *
 * 사용법:
 *   1. 기존 KMS에서 백업 JSON을 다운로드 (관리자 > 백업/복원 > 다운로드)
 *   2. 이 파일과 같은 디렉토리에 kms_backup.json 으로 저장
 *   3. .env 파일에 Google Sheets 설정이 완료되어 있어야 함
 *   4. npm run migrate 실행
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
const BACKUP_FILE = process.argv[2] || 'kms_backup.json';

const SHEET_HEADERS = {
    boards: ['id', 'name', 'icon'],
    categories: ['id', 'boardId', 'name'],
    posts: ['id', 'boardId', 'categoryId', 'title', 'type', 'icon', 'subInfo', 'content', 'url', 'fileName', 'views', 'date'],
    notices: ['id', 'title', 'type', 'content', 'date'],
    contacts: ['id', 'name', 'position', 'dept', 'phone', 'email', 'status'],
    orgchart: ['id', 'name', 'title', 'level'],
    settings: ['key', 'value']
};

async function main() {
    console.log('🚀 KMS 마이그레이션 시작\n');

    // 1. 백업 파일 읽기
    if (!fs.existsSync(BACKUP_FILE)) {
        console.error(`❌ 백업 파일을 찾을 수 없습니다: ${BACKUP_FILE}`);
        console.log('   사용법: npm run migrate -- kms_backup.json');
        process.exit(1);
    }
    const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
    console.log('📂 백업 파일 로드 완료:', BACKUP_FILE);

    // 2. Google Sheets 인증
    if (!KEY_PATH || !fs.existsSync(KEY_PATH)) {
        console.error('❌ 서비스 계정 키 파일이 없습니다. .env의 GOOGLE_SERVICE_ACCOUNT_KEY_PATH를 확인하세요.');
        process.exit(1);
    }
    const auth = new google.auth.GoogleAuth({ keyFile: KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets 인증 완료\n');

    // 3. uploads 디렉토리 준비
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // 4. 시트별 데이터 준비 및 입력
    const stats = {};

    for (const sheetName of Object.keys(SHEET_HEADERS)) {
        const headers = SHEET_HEADERS[sheetName];
        let rows = [];

        // 시트 생성 (없으면)
        try {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
            });
            console.log(`📋 시트 생성: ${sheetName}`);
        } catch (e) {
            if (e.message?.includes('already exists')) {
                // 기존 데이터 삭제 (헤더 포함)
                await sheets.spreadsheets.values.clear({
                    spreadsheetId: SHEET_ID,
                    range: `${sheetName}!A:Z`
                });
                console.log(`🔄 시트 초기화: ${sheetName}`);
            }
        }

        // 헤더 입력
        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: [headers] }
        });

        // 데이터 변환
        if (sheetName === 'boards' && backup.boards) {
            rows = backup.boards.map(b => headers.map(h => String(b[h] || '')));

        } else if (sheetName === 'categories' && backup.categories) {
            // categories는 { boardId: [{id, name}] } 형태 → 플랫 변환
            if (typeof backup.categories === 'object' && !Array.isArray(backup.categories)) {
                for (const [boardId, cats] of Object.entries(backup.categories)) {
                    if (Array.isArray(cats)) {
                        cats.forEach(c => rows.push([String(c.id || ''), boardId, String(c.name || '')]));
                    }
                }
            } else if (Array.isArray(backup.categories)) {
                rows = backup.categories.map(c => headers.map(h => String(c[h] || '')));
            }

        } else if (sheetName === 'posts' && backup.posts) {
            for (const post of backup.posts) {
                let fileName = '';

                // Base64 PDF → 파일 추출
                if (post.pdfData && post.pdfData.startsWith('data:')) {
                    try {
                        const base64Data = post.pdfData.split(',')[1];
                        if (base64Data) {
                            fileName = uuidv4() + '.pdf';
                            fs.writeFileSync(path.join(uploadsDir, fileName), Buffer.from(base64Data, 'base64'));
                            console.log(`  📄 PDF 추출: ${post.title} → ${fileName}`);
                        }
                    } catch (err) {
                        console.warn(`  ⚠️ PDF 추출 실패 (${post.title}): ${err.message}`);
                    }
                }

                rows.push(headers.map(h => {
                    if (h === 'fileName') return fileName;
                    if (h === 'pdfData') return ''; // Base64 데이터는 시트에 저장하지 않음
                    return String(post[h] !== undefined ? post[h] : '');
                }));
            }

        } else if (sheetName === 'notices' && backup.notices) {
            rows = backup.notices.map(n => headers.map(h => String(n[h] || '')));

        } else if (sheetName === 'contacts' && backup.contacts) {
            rows = backup.contacts.map(c => headers.map(h => String(c[h] || '')));

        } else if (sheetName === 'orgchart' && backup.orgchart) {
            rows = backup.orgchart.map(o => headers.map(h => String(o[h] || '')));

        } else if (sheetName === 'settings' && backup.settings) {
            if (typeof backup.settings === 'object' && !Array.isArray(backup.settings)) {
                rows = Object.entries(backup.settings).map(([key, value]) => [key, String(value)]);
            }
        }

        // 데이터 입력
        if (rows.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: `${sheetName}!A:Z`,
                valueInputOption: 'RAW',
                requestBody: { values: rows }
            });
        }

        stats[sheetName] = rows.length;
        console.log(`✅ ${sheetName}: ${rows.length}건 입력 완료`);
    }

    console.log('\n🎉 마이그레이션 완료!');
    console.log('─────────────────────────');
    Object.entries(stats).forEach(([k, v]) => console.log(`  ${k}: ${v}건`));
    console.log('─────────────────────────');

    const pdfFiles = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));
    if (pdfFiles.length > 0) {
        console.log(`\n📁 추출된 PDF 파일: ${pdfFiles.length}개 (uploads/ 디렉토리)`);
    }
}

main().catch(err => { console.error('❌ 마이그레이션 오류:', err); process.exit(1); });
