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
    const bgColorIdx = headers.indexOf('bgColor');
    const thumbnailIdx = headers.indexOf('thumbnail');

    const bgColLetter = String.fromCharCode(65 + bgColorIdx);

    // 전체 bgColor 값 배열 생성
    const bgValues = [];
    for (let i = 1; i < rows.length; i++) {
        const title = rows[i][titleIdx] || '';
        const currentBg = rows[i][bgColorIdx] || '';
        const thumbnail = rows[i][thumbnailIdx] || '';

        if (currentBg) {
            bgValues.push([currentBg]);
            continue;
        }

        let newBg = '#ffffff';
        if (title.includes('화이트') || (thumbnail && thumbnail.toLowerCase().includes('white'))) {
            newBg = '#1e293b';
        }
        bgValues.push([newBg]);
    }

    // 한번에 배치 업데이트
    await sheets.spreadsheets.values.update({
        spreadsheetId: id,
        range: `posts!${bgColLetter}2:${bgColLetter}${rows.length}`,
        valueInputOption: 'RAW',
        requestBody: { values: bgValues }
    });

    const darkCount = bgValues.filter(v => v[0] === '#1e293b').length;
    console.log(`${bgValues.length}개 게시물 bgColor 설정 완료 (다크: ${darkCount}개)`);
})();
