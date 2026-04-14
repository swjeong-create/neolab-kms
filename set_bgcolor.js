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

    if (bgColorIdx === -1) { console.log('bgColor 컬럼 없음'); return; }

    const bgColLetter = String.fromCharCode(65 + bgColorIdx);

    // 흰색 로고는 다크 배경 필요
    const darkBgKeywords = ['화이트 1', '화이트 2'];
    // 나머지는 기본 흰색

    let updated = 0;
    for (let i = 1; i < rows.length; i++) {
        const title = rows[i][titleIdx] || '';
        const currentBg = rows[i][bgColorIdx] || '';
        const thumbnail = rows[i][thumbnailIdx] || '';

        // bgColor가 비어있는 모든 게시물에 기본값 설정
        if (!currentBg) {
            let newBg = '#ffffff';

            // 흰색 로고는 다크 배경
            if (darkBgKeywords.some(k => title.includes(k))) {
                newBg = '#1e293b';
            }
            // 흰색 심볼/로고 파일명 감지
            if (thumbnail && (thumbnail.includes('white') || thumbnail.includes('WHITE'))) {
                newBg = '#1e293b';
            }

            await sheets.spreadsheets.values.update({
                spreadsheetId: id, range: `posts!${bgColLetter}${i + 1}`,
                valueInputOption: 'RAW',
                requestBody: { values: [[newBg]] }
            });
            if (newBg !== '#ffffff') console.log(`${title} → ${newBg}`);
            updated++;
        }
    }

    console.log(`${updated}개 게시물 bgColor 설정 완료`);
})();
