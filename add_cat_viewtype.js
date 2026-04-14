require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    // categories 헤더 확인
    const cats = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'categories!A1:Z1' });
    const headers = cats.data.values[0];

    if (!headers.includes('viewType')) {
        const col = String.fromCharCode(65 + headers.length);
        await sheets.spreadsheets.values.update({
            spreadsheetId: id, range: 'categories!' + col + '1',
            valueInputOption: 'RAW',
            requestBody: { values: [['viewType']] }
        });
        console.log('categories viewType 컬럼 추가:', col);
    } else {
        console.log('viewType 컬럼 이미 존재');
    }
})();
