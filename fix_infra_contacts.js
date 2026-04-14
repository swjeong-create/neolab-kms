require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    // 1. 인프라 카테고리 삭제 (중분류 제거)
    const cats = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'categories!A:E' });
    const catRows = cats.data.values || [];
    const infraCatIndices = [];
    for (let i = 1; i < catRows.length; i++) {
        if (catRows[i][1] === 'infra') {
            infraCatIndices.push(i);
            console.log('인프라 카테고리 삭제 대상:', catRows[i][2]);
        }
    }

    if (infraCatIndices.length > 0) {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
        const catSheet = meta.data.sheets.find(s => s.properties.title === 'categories');
        // 역순으로 삭제
        for (let i = infraCatIndices.length - 1; i >= 0; i--) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: id,
                requestBody: { requests: [{ deleteDimension: { range: { sheetId: catSheet.properties.sheetId, dimension: 'ROWS', startIndex: infraCatIndices[i], endIndex: infraCatIndices[i] + 1 } } }] }
            });
        }
        console.log(infraCatIndices.length + '개 인프라 카테고리 삭제 완료');
    }

    // 2. 인프라 게시물의 categoryId도 비우기
    const posts = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A:Z' });
    const postRows = posts.data.values || [];
    const headers = postRows[0];
    const boardIdx = headers.indexOf('boardId');
    const catIdx = headers.indexOf('categoryId');

    for (let i = 1; i < postRows.length; i++) {
        if (postRows[i][boardIdx] === 'infra' && postRows[i][catIdx]) {
            const colLetter = String.fromCharCode(65 + catIdx);
            await sheets.spreadsheets.values.update({
                spreadsheetId: id, range: `posts!${colLetter}${i + 1}`,
                valueInputOption: 'RAW',
                requestBody: { values: [['']] }
            });
        }
    }
    console.log('인프라 게시물 categoryId 초기화 완료');

    // 3. 인프라 갤러리 전용 확인
    const boards = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'boards!A:E' });
    const boardRows = boards.data.values;
    for (let i = 1; i < boardRows.length; i++) {
        if (boardRows[i][0] === 'infra') {
            await sheets.spreadsheets.values.update({
                spreadsheetId: id, range: `boards!E${i + 1}`,
                valueInputOption: 'RAW',
                requestBody: { values: [['gallery']] }
            });
            console.log('인프라 갤러리 설정 확인/적용');
        }
    }

    console.log('완료');
})();
