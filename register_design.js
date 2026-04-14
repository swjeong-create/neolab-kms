require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    const postsRes = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A1:Z1' });
    const headers = postsRes.data.values[0];

    const allPosts = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A:A' });
    let maxId = 0;
    (allPosts.data.values || []).slice(1).forEach(r => { const n = parseInt(r[0]); if (n > maxId) maxId = n; });

    const today = new Date().toISOString().split('T')[0];

    // 이미지 파일은 thumbnail과 fileName 모두 같은 파일 사용
    const designFiles = [
        // 로고
        { title: 'NeoLAB CI 로고 (기본)', fileName: 'NeoLAB-CI-1.png', subInfo: 'CI 로고', order: '1' },
        { title: 'NeoLAB CI 로고 (가로형)', fileName: 'NeoLAB-CI-2-1.png', subInfo: 'CI 로고', order: '2' },
        { title: 'NeoLAB CI 로고 (영문)', fileName: 'NeoLAB-CI-3.png', subInfo: 'CI 로고', order: '3' },
        { title: 'NeoLAB CI 로고 (심볼+텍스트)', fileName: 'NeoLAB-CI-4.png', subInfo: 'CI 로고', order: '4' },
        { title: 'NeoLAB 심볼 (화이트 1)', fileName: 'SYMBOL-white_01.png', subInfo: '심볼', order: '5' },
        { title: 'NeoLAB 심볼 (화이트 2)', fileName: 'SYMBOL-white_02.png', subInfo: '심볼', order: '6' },
        { title: 'NeoLAB 심볼 (그레이)', fileName: 'SYMBOL-grey_02.png', subInfo: '심볼', order: '7' },
        { title: 'Neo Smartpen 로고 (그레이 1)', fileName: 'NEO-SMARTPEN-grey_01-1.png', subInfo: '제품 로고', order: '8' },
        { title: 'Neo Smartpen 로고 (그레이 2)', fileName: 'NEO-SMARTPEN-grey_02.png', subInfo: '제품 로고', order: '9' },
        { title: 'Neo Smartpen 로고 (그레이 3)', fileName: 'NEO-SMARTPEN-grey_03.png', subInfo: '제품 로고', order: '10' },
        { title: 'Neo Smartpen 로고 (그레이 4)', fileName: 'NEO-SMARTPEN-grey_04.png', subInfo: '제품 로고', order: '11' },
        // 브랜드
        { title: '브랜드 아이덴티티 가이드', fileName: 'bi01.jpg', subInfo: '브랜드 가이드', order: '12' },
    ];

    const posts = designFiles.map((f, i) => {
        const isImage = f.fileName.match(/\.(png|jpg|jpeg|gif)$/i);
        return {
            id: String(maxId + i + 1),
            boardId: 'company',
            categoryId: 'CI',
            title: f.title,
            type: isImage ? 'text' : 'pdf',  // 이미지는 text 타입 (라이트박스로 열기)
            icon: '🎨',
            subInfo: f.subInfo,
            content: '',
            url: '',
            fileName: f.fileName,
            views: '0',
            date: today,
            order: f.order,
            thumbnail: f.fileName  // 썸네일도 같은 파일
        };
    });

    const rows = posts.map(p => headers.map(h => p[h] !== undefined ? p[h] : ''));

    await sheets.spreadsheets.values.append({
        spreadsheetId: id, range: 'posts!A:Z', valueInputOption: 'RAW',
        requestBody: { values: rows }
    });

    console.log(posts.length + '개 디자인 게시물 등록 완료');
    posts.forEach(p => console.log('  ' + p.title));
})();
