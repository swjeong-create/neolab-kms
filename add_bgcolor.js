require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    const p = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A1:Z1' });
    const headers = p.data.values[0];
    if (!headers.includes('bgColor')) {
        const col = String.fromCharCode(65 + headers.length);
        await sheets.spreadsheets.values.update({
            spreadsheetId: id, range: 'posts!' + col + '1',
            valueInputOption: 'RAW',
            requestBody: { values: [['bgColor']] }
        });
        console.log('bgColor 컬럼 추가:', col);
    } else {
        console.log('bgColor 이미 존재');
    }

    // server.js 헤더에도 추가
    console.log('server.js의 posts 헤더도 수정 필요');
})();
