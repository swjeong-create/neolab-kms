require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    // 기존 orgchart 클리어
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
    const oSheet = meta.data.sheets.find(s => s.properties.title === 'orgchart');
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'orgchart!A:Z' });
    if (existing.data.values && existing.data.values.length > 1) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: id,
            requestBody: { requests: [{ deleteDimension: { range: { sheetId: oSheet.properties.sheetId, dimension: 'ROWS', startIndex: 1, endIndex: existing.data.values.length } } }] }
        });
    }

    // 새 조직도: id, name, title, level
    // level 1=최상위, 2=임원, 3=본부, 4=팀, 5=파트
    // CSO는 level 2로 별도 표시 (staff 역할)
    const orgchart = [
        ['1','이상규 대표이사','CEO','1'],
        ['2','이철규 전무이사','COO','2'],
        ['3','박지완 부사장','CSO (경영전략)','2'],
        ['10','사업본부','이철규 전무이사(겸)','3'],
        ['11','국내사업팀','김지민 수석/팀장','4'],
        ['12','해외사업팀','조연수 수석/팀장','4'],
        ['13','서비스기획팀','조성아 수석/팀장','4'],
        ['14','출판기획파트','한윤정 책임/파트장','5'],
        ['20','기술연구소','김범석 이사/연구소장','3'],
        ['21','SW개발팀','임무생 수석연구원/팀장','4'],
        ['22','FW개발팀','하성훈 수석연구원/팀장','4'],
        ['23','HW개발팀','장동완 수석연구원(겸)','4'],
        ['30','생산본부','이동현 이사/본부장','3'],
        ['31','개발품질팀','','4'],
        ['32','구매팀','박용식 수석/팀장','4'],
        ['33','생산팀','윤응식 수석','4'],
        ['34','양산품질팀','김진관 수석/팀장','4'],
        ['35','CS팀','황진영 책임/팀장(대행)','4'],
        ['40','경영지원본부','','3'],
        ['41','재무회계팀','김한나 수석/팀장','4'],
        ['42','인사총무팀','김수희 수석/팀장','4']
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: id, range: 'orgchart!A:D', valueInputOption: 'RAW',
        requestBody: { values: orgchart }
    });
    console.log(orgchart.length + '개 조직도 등록 완료');
})();
