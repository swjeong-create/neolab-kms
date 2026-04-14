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
    const thumbnailIdx = headers.indexOf('thumbnail');
    const contentIdx = headers.indexOf('content');
    const categoryIdx = headers.indexOf('categoryId');

    // 제품 매핑: 게시물 제목 키워드 → 파일명
    const productMap = {
        'N2': { photo: 'N2_제품사진.jpg', desc: 'N2_제품설명.jpg' },
        'M1+': { photo: 'M1+_제품사진.jpg', desc: 'M1+_제품설명.jpg' },
        'dimo': { photo: 'DIMO_제품사진.jpg', desc: 'DIMO_제품설명.jpg' },
        'A1': { photo: 'A1_제품사진.jpg', desc: 'A1_제품설명.jpg' },
        'R1': { photo: 'R1_제품사진.jpg', desc: 'R1_제품설명.jpg' },
        '라미': { photo: 'LAMY_제품사진.png', desc: 'LAMY_제품설명.jpg', desc2: 'LAMY_제품설명2.jpg' },
        'LAMY': { photo: 'LAMY_제품사진.png', desc: 'LAMY_제품설명.jpg', desc2: 'LAMY_제품설명2.jpg' }
    };

    let updated = 0;
    for (let i = 1; i < rows.length; i++) {
        const title = rows[i][titleIdx] || '';
        const catId = rows[i][categoryIdx] || '';

        // smartpen 카테고리만 대상
        if (catId !== 'smartpen') continue;

        for (const [keyword, files] of Object.entries(productMap)) {
            if (title.toLowerCase().includes(keyword.toLowerCase())) {
                // thumbnail = 제품사진
                const rowNum = i + 1;
                const thumbCol = String.fromCharCode(65 + thumbnailIdx);
                await sheets.spreadsheets.values.update({
                    spreadsheetId: id, range: `posts!${thumbCol}${rowNum}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [[files.photo]] }
                });

                // content에 제품설명 파일명 저장 (프론트에서 활용)
                let descFiles = files.desc;
                if (files.desc2) descFiles += '|' + files.desc2;
                const contentCol = String.fromCharCode(65 + contentIdx);
                await sheets.spreadsheets.values.update({
                    spreadsheetId: id, range: `posts!${contentCol}${rowNum}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [['[PRODUCT_DESC]' + descFiles]] }
                });

                console.log(`${title} → 사진: ${files.photo}, 설명: ${descFiles}`);
                updated++;
                break;
            }
        }
    }

    // M1 (M1+가 아닌) 처리 - title에 'M1'이 있고 'M1+'가 아닌 경우
    for (let i = 1; i < rows.length; i++) {
        const title = rows[i][titleIdx] || '';
        const catId = rows[i][categoryIdx] || '';
        if (catId !== 'smartpen') continue;
        if (title.includes('M1') && !title.includes('M1+') && !title.includes('dimo') && !title.includes('N2')) {
            // M1은 M1+ 이미지 사용 (별도 이미지 없으면)
            const currentThumb = rows[i][thumbnailIdx] || '';
            if (!currentThumb) {
                const rowNum = i + 1;
                const thumbCol = String.fromCharCode(65 + thumbnailIdx);
                await sheets.spreadsheets.values.update({
                    spreadsheetId: id, range: `posts!${thumbCol}${rowNum}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [['M1+_제품사진.jpg']] }
                });
                const contentCol = String.fromCharCode(65 + contentIdx);
                await sheets.spreadsheets.values.update({
                    spreadsheetId: id, range: `posts!${contentCol}${rowNum}`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [['[PRODUCT_DESC]M1+_제품설명.jpg']] }
                });
                console.log(`${title} → M1+ 이미지 공유`);
                updated++;
            }
        }
    }

    console.log(`총 ${updated}개 제품 이미지 업데이트 완료`);
})();
