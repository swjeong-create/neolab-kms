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

    // 카테고리 ID 확인
    const cats = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'categories!A:D' });
    const certCat = cats.data.values.find(r => r[1] === 'company' && r[2] && r[2].includes('인증서'));
    const catId = certCat ? certCat[0] : 'cert';
    console.log('카테고리 ID:', catId);

    const files = [
        { title: '사업자등록증', fileName: '네오랩컨버전스 사업자등록증.pdf', subInfo: '네오랩컨버전스', order: '1' },
        { title: '이노비즈 확인서', fileName: '이노비즈 확인서(2027.04.29).pdf', subInfo: '유효기간 ~2027.04.29', order: '2' },
        { title: '중소기업확인서', fileName: '중소기업확인서(260401~270331).pdf', subInfo: '유효기간 2026.04~2027.03', order: '3' }
    ];

    const posts = files.map((f, i) => ({
        id: String(maxId + i + 1),
        boardId: 'company',
        categoryId: catId,
        title: f.title,
        type: 'pdf',
        icon: '📋',
        subInfo: f.subInfo,
        content: '',
        url: '',
        fileName: f.fileName,
        views: '0',
        date: today,
        order: f.order,
        thumbnail: ''
    }));

    const rows = posts.map(p => headers.map(h => p[h] !== undefined ? p[h] : ''));

    await sheets.spreadsheets.values.append({
        spreadsheetId: id, range: 'posts!A:Z', valueInputOption: 'RAW',
        requestBody: { values: rows }
    });

    console.log(posts.length + '개 인증서 게시물 등록 완료');
    posts.forEach(p => console.log('  ' + p.title + ' (' + p.subInfo + ')'));
})();
