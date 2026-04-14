require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    // 1. 인프라 게시판을 갤러리 뷰로 설정
    const boards = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'boards!A:E' });
    const boardRows = boards.data.values;
    for (let i = 1; i < boardRows.length; i++) {
        if (boardRows[i][0] === 'infra') {
            await sheets.spreadsheets.values.update({
                spreadsheetId: id, range: `boards!E${i + 1}`, valueInputOption: 'RAW',
                requestBody: { values: [['gallery']] }
            });
            console.log('인프라 게시판 갤러리 뷰 설정 완료');
            break;
        }
    }

    // 2. 인프라 카테고리 정리 - 기존 카테고리 확인
    const cats = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'categories!A:D' });
    const catRows = cats.data.values || [];
    const infraCats = catRows.filter((r, i) => i > 0 && r[1] === 'infra');
    console.log('기존 인프라 카테고리:', infraCats.map(c => c[2]));

    // 기존 인프라 카테고리가 없으면 추가
    const existingCatIds = infraCats.map(c => c[0]);
    const newCats = [];
    if (!existingCatIds.includes('tools')) newCats.push(['tools', 'infra', '업무 도구', '1']);
    if (!existingCatIds.includes('facility')) newCats.push(['facility', 'infra', '시설/총무', '2']);

    if (newCats.length > 0) {
        await sheets.spreadsheets.values.append({
            spreadsheetId: id, range: 'categories!A:D', valueInputOption: 'RAW',
            requestBody: { values: newCats }
        });
        console.log('인프라 카테고리 추가:', newCats.map(c => c[2]));
    }

    // 3. 기존 인프라 게시물 삭제 (사내메일, 그룹웨어 등 기존 것)
    const posts = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A:Z' });
    const postRows = posts.data.values || [];
    const headers = postRows[0];
    const boardIdx = headers.indexOf('boardId');

    // 기존 인프라 게시물 ID 수집
    const infraPostIds = [];
    for (let i = 1; i < postRows.length; i++) {
        if (postRows[i][boardIdx] === 'infra') {
            infraPostIds.push(i);
        }
    }

    // 역순으로 삭제 (인덱스 밀림 방지)
    if (infraPostIds.length > 0) {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
        const postSheet = meta.data.sheets.find(s => s.properties.title === 'posts');
        for (let i = infraPostIds.length - 1; i >= 0; i--) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: id,
                requestBody: {
                    requests: [{ deleteDimension: { range: { sheetId: postSheet.properties.sheetId, dimension: 'ROWS', startIndex: infraPostIds[i], endIndex: infraPostIds[i] + 1 } } }]
                }
            });
        }
        console.log('기존 인프라 게시물 ' + infraPostIds.length + '개 삭제');
    }

    // 4. 새 인프라 게시물 추가
    // 현재 최대 ID 확인
    const freshPosts = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A:Z' });
    const freshRows = freshPosts.data.values || [];
    let maxId = 0;
    freshRows.slice(1).forEach(r => { const n = parseInt(r[0]); if (n > maxId) maxId = n; });

    const today = new Date().toISOString().split('T')[0];

    const newPosts = [
        {
            id: String(maxId + 1), boardId: 'infra', categoryId: 'tools',
            title: 'Gmail', type: 'url', icon: '📧',
            subInfo: '사내 이메일', content: '', url: 'https://mail.google.com',
            fileName: '', views: '0', date: today, order: '1', thumbnail: ''
        },
        {
            id: String(maxId + 2), boardId: 'infra', categoryId: 'tools',
            title: 'Google Drive', type: 'url', icon: '📁',
            subInfo: '클라우드 파일 저장소', content: '', url: 'https://drive.google.com',
            fileName: '', views: '0', date: today, order: '2', thumbnail: ''
        },
        {
            id: String(maxId + 3), boardId: 'infra', categoryId: 'tools',
            title: 'Google Chat', type: 'url', icon: '💬',
            subInfo: '사내 메신저', content: '', url: 'https://chat.google.com',
            fileName: '', views: '0', date: today, order: '3', thumbnail: ''
        },
        {
            id: String(maxId + 4), boardId: 'infra', categoryId: 'tools',
            title: '그룹웨어', type: 'url', icon: '🏢',
            subInfo: '전자결재/근태관리', content: '', url: 'https://gw.neolab.net',
            fileName: '', views: '0', date: today, order: '4', thumbnail: ''
        },
        {
            id: String(maxId + 5), boardId: 'infra', categoryId: 'tools',
            title: '이카운트 ERP', type: 'url', icon: '📊',
            subInfo: '회계/재무 시스템', content: '', url: 'https://login.ecount.com/Login/KR/',
            fileName: '', views: '0', date: today, order: '5', thumbnail: ''
        },
        {
            id: String(maxId + 6), boardId: 'infra', categoryId: 'facility',
            title: '시설이용예약', type: 'url', icon: '🏗️',
            subInfo: '회의실/택배/퀵/비품', content: '회사 내부계정공유, 택배접수, 퀵서비스 접수, 비품 구매신청',
            url: 'https://gw.neolab.net/api/epsso/ssoRedirect',
            fileName: '', views: '0', date: today, order: '6', thumbnail: ''
        }
    ];

    const postHeaders = freshRows[0];
    const rows = newPosts.map(p => postHeaders.map(h => p[h] !== undefined ? p[h] : ''));

    await sheets.spreadsheets.values.append({
        spreadsheetId: id, range: 'posts!A:Z', valueInputOption: 'RAW',
        requestBody: { values: rows }
    });

    console.log(newPosts.length + '개 인프라 게시물 등록 완료');
})();
