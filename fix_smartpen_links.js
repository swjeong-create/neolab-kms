require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    const postsRes = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A:Z' });
    const rows = postsRes.data.values;
    const headers = rows[0];
    const titleIdx = headers.indexOf('title');
    const typeIdx = headers.indexOf('type');
    const urlIdx = headers.indexOf('url');
    const categoryIdx = headers.indexOf('categoryId');
    const contentIdx = headers.indexOf('content');

    let updated = 0;
    for (let i = 1; i < rows.length; i++) {
        const catId = rows[i][categoryIdx] || '';
        const type = rows[i][typeIdx] || '';
        const url = rows[i][urlIdx] || '';
        const title = rows[i][titleIdx] || '';

        // smartpen 카테고리의 url 타입 게시물만 대상
        if (catId !== 'smartpen') continue;
        if (type !== 'url') continue;

        const rowNum = i + 1;

        // type을 text로 변경 (링크 제거)
        const typeCol = String.fromCharCode(65 + typeIdx);
        await sheets.spreadsheets.values.update({
            spreadsheetId: id, range: `posts!${typeCol}${rowNum}`,
            valueInputOption: 'RAW',
            requestBody: { values: [['text']] }
        });

        // url 비우기
        const urlCol = String.fromCharCode(65 + urlIdx);
        await sheets.spreadsheets.values.update({
            spreadsheetId: id, range: `posts!${urlCol}${rowNum}`,
            valueInputOption: 'RAW',
            requestBody: { values: [['']] }
        });

        console.log(`${title}: url 링크 제거, type=text로 변경`);
        updated++;
    }

    console.log(`총 ${updated}개 수정 완료`);
})();
