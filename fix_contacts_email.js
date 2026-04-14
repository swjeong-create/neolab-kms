require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    const res = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'contacts!A:G' });
    const rows = res.data.values;
    const headers = rows[0]; // id, name, position, dept, phone, email, status

    // 이메일 매핑 (PDF 기준)
    const emailMap = {
        '김성민': 'boykdr@neolab.net',
        '양진영': 'jylee@neolab.net',
        '이주영': 'jylee@neolab.net',
        '김서우': 'snflah3@neolab.net',
        '송하연': 'hysong@neolab.net',
        '김순정': 'sj.kim@neolab.net',
        '오보석': 'bsoh@neolab.net',
        '강효재': 'hjkang@neolab.net',
        '서기원': 'giwon.seo@neolab.net',
        '김덕중': 'otkdj0708@neolab.net',
        '정강훈': 'jeongkanghun@neolab.net',
        '신성진': 'sungjin.shin@neolab.net',
        '박용식': 'thed0520@neolab.net',
        '김영인': 'kyi4274@neolab.net',
        '윤응식': 'esyoon@neolab.net',
        '권영윤': 'rnjs4177@neolab.net',
        '박상은': 'pse678@neolab.net',
        '이동현': 'ldh0224@neolab.net',
        '최경희': 'bloom9293@neolab.net'
    };

    let updated = 0;
    for (let i = 1; i < rows.length; i++) {
        const name = rows[i][1]; // name column
        const currentEmail = rows[i][5] || '';
        if (!currentEmail && emailMap[name]) {
            rows[i][5] = emailMap[name];
            await sheets.spreadsheets.values.update({
                spreadsheetId: id,
                range: `contacts!F${i + 1}`,
                valueInputOption: 'RAW',
                requestBody: { values: [[emailMap[name]]] }
            });
            console.log(`${name}: ${emailMap[name]} 추가`);
            updated++;
        }
    }
    console.log(`${updated}명 이메일 업데이트 완료`);
})();
