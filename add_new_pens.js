require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    const postsRes = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A:Z' });
    const rows = postsRes.data.values;
    const headers = rows[0];

    let maxId = 0;
    rows.slice(1).forEach(r => { const n = parseInt(r[0]); if (n > maxId) maxId = n; });

    const today = new Date().toISOString().split('T')[0];

    const newPens = [
        {
            id: String(maxId + 1), boardId: 'product', categoryId: 'smartpen',
            title: '네오스마트펜 A1', type: 'text', icon: '🖊️',
            subInfo: 'NWP-A1', content: '[PRODUCT_DESC]A1_제품설명.jpg',
            url: '', fileName: '', views: '0', date: today, order: '6',
            thumbnail: 'A1_제품사진.jpg'
        },
        {
            id: String(maxId + 2), boardId: 'product', categoryId: 'smartpen',
            title: '네오스마트펜 R1', type: 'text', icon: '🖊️',
            subInfo: 'NWP-R1', content: '[PRODUCT_DESC]R1_제품설명.jpg',
            url: '', fileName: '', views: '0', date: today, order: '7',
            thumbnail: 'R1_제품사진.jpg'
        }
    ];

    const newRows = newPens.map(p => headers.map(h => p[h] !== undefined ? p[h] : ''));

    await sheets.spreadsheets.values.append({
        spreadsheetId: id, range: 'posts!A:Z', valueInputOption: 'RAW',
        requestBody: { values: newRows }
    });

    console.log('A1, R1 제품 추가 완료');
})();
