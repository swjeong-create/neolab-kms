require('dotenv').config();
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    // 기존 contacts 클리어
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
    const cSheet = meta.data.sheets.find(s => s.properties.title === 'contacts');
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'contacts!A:Z' });
    if (existing.data.values && existing.data.values.length > 1) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: id,
            requestBody: { requests: [{ deleteDimension: { range: { sheetId: cSheet.properties.sheetId, dimension: 'ROWS', startIndex: 1, endIndex: existing.data.values.length } } }] }
        });
    }

    const contacts = [
        ['1','이상규','대표이사','CEO','02-2284-9200','kitty@neolab.net','active'],
        ['2','박지완','부사장','CSO','02-2284-9292','jiwanpark@neolab.net','active'],
        ['3','이철규','전무이사','COO/사업본부장','02-2284-9244','syfer@neolab.net','active'],
        ['4','김지민','수석/팀장','사업본부/국내사업팀','02-2284-9223','jimin.kim@neolab.net','active'],
        ['5','김성민','수석','사업본부/국내사업팀','02-2284-9268','','active'],
        ['6','양진영','수석','사업본부/국내사업팀(재택)','','','active'],
        ['7','이주영','수석','사업본부/국내사업팀','02-2284-9208','','active'],
        ['8','황준호','책임','사업본부/국내사업팀','02-2284-9234','juno@neolab.net','active'],
        ['9','조연수','수석/팀장','사업본부/해외사업팀','02-2223-9280','leocho@neolab.net','active'],
        ['10','황락평','수석','사업본부/해외사업팀','02-2284-9259','leping1010@neolab.net','active'],
        ['11','안진','책임','사업본부/해외사업팀','02-2223-8367','alex.ahn@neolab.net','active'],
        ['12','한수영','책임','사업본부/해외사업팀','02-2223-8310','serena@neolab.net','active'],
        ['13','김진희','책임','사업본부/해외사업팀','02-2223-8361','jhkim@neolab.net','active'],
        ['14','Farha Sadia','책임','사업본부/해외사업팀(육아휴직~2026/06)','02-2284-9227','sfarha@neolab.net','leave'],
        ['15','조성아','수석/팀장','사업본부/서비스기획팀','02-2223-8309','sunga.jo@neolab.net','active'],
        ['16','이윤원','수석','사업본부/서비스기획팀','02-2284-9271','mayamix@neolab.net','active'],
        ['17','최경희','수석','사업본부/서비스기획팀(재택)','','bloom9293@neolab.net','active'],
        ['18','김순정','수석','사업본부/서비스기획팀','','sj.kim@neolab.net','active'],
        ['19','이승애','책임','사업본부/서비스기획팀','02-2284-9212','lsaclo@neolab.net','active'],
        ['20','김서우','책임','사업본부/서비스기획팀','','snflah3@neolab.net','active'],
        ['21','송하연','책임','사업본부/서비스기획팀','','hysong@neolab.net','active'],
        ['22','한윤정','책임/파트장','사업본부/출판기획파트','02-2284-9267','hanyj@neolab.net','active'],
        ['23','서예진','매니저','사업본부/출판기획파트','02-2284-9229','s_yj_@neolab.net','active'],
        ['24','장민지','매니저','사업본부/출판기획파트','02-2284-9246','mjm@neolab.net','active'],
        ['25','김한나','수석/팀장','경영지원본부/재무회계팀','02-2223-8328','HannahKim@neolab.net','active'],
        ['26','고은정','책임','경영지원본부/재무회계팀(육아휴직)','02-2284-9297','eunjung@neolab.net','leave'],
        ['27','김민정','책임','경영지원본부/재무회계팀','02-2284-9297','mjkim@neolab.net','active'],
        ['28','김수희','수석/팀장','경영지원본부/인사총무팀','02-2284-9260','shkim@neolab.net','active'],
        ['29','정선웅','책임','경영지원본부/인사총무팀','02-2284-9299','sw_jeong@neolab.net','active'],
        ['30','김범석','이사/연구소장','기술연구소','02-2284-9251','bskim@neolab.net','active'],
        ['31','임무생','수석연구원/팀장','기술연구소/SW개발팀(재택)','02-2284-9235','mrlove1@neolab.net','active'],
        ['32','오보석','수석연구원','기술연구소/SW개발팀(재택)','','bsoh@neolab.net','active'],
        ['33','강효재','수석연구원','기술연구소/SW개발팀','','hjkang@neolab.net','active'],
        ['34','서기원','책임연구원','기술연구소/SW개발팀','','giwon.seo@neolab.net','active'],
        ['35','서원호','책임연구원','기술연구소/SW개발팀','02-2284-9226','swh1182@neolab.net','active'],
        ['36','김덕중','연구원','기술연구소/SW개발팀','','otkdj0708@neolab.net','active'],
        ['37','하성훈','수석연구원/팀장','기술연구소/펌웨어개발팀','02-2284-9250','jason@neolab.net','active'],
        ['38','정강훈','수석연구원','기술연구소/펌웨어개발팀','','jeongkanghun@neolab.net','active'],
        ['39','김성현','수석연구원','기술연구소/펌웨어개발팀','02-2223-8311','kimsunghyun@neolab.net','active'],
        ['40','장동완','수석연구원','기술연구소/하드웨어개발팀','02-2284-9214','jdw@neolab.net','active'],
        ['41','김종민','수석연구원','기술연구소/하드웨어개발팀','02-2284-9240','jmkim@neolab.net','active'],
        ['42','김하늘','책임연구원','기술연구소/하드웨어개발팀','02-2223-8307','haneul95.kim@neolab.net','active'],
        ['43','신성진','책임연구원','기술연구소/하드웨어개발팀','','sungjin.shin@neolab.net','active'],
        ['44','이동현','이사/본부장','생산본부','','ldh0224@neolab.net','active'],
        ['45','박성민','책임','생산본부/개발품질팀','02-2223-8364','poss30@neolab.net','active'],
        ['46','김한나','책임','생산본부/개발품질팀','02-2284-9238','hnkim@neolab.net','active'],
        ['47','박용식','수석/팀장','생산본부/구매팀','','thed0520@neolab.net','active'],
        ['48','김영인','수석','생산본부/구매팀','','kyi4274@neolab.net','active'],
        ['49','윤응식','수석','생산본부/생산팀','','esyoon@neolab.net','active'],
        ['50','김진관','수석/팀장','생산본부/양산품질팀','02-2223-8327','jkkim@neolab.net','active'],
        ['51','권영윤','매니저','생산본부/양산품질팀','','rnjs4177@neolab.net','active'],
        ['52','황진영','책임/팀장(대행)','생산본부/CS팀','02-2223-8322','hjy10074@neolab.net','active'],
        ['53','김민수','책임','생산본부/CS팀','02-2223-8352','mskim@neolab.net','active'],
        ['54','정현','매니저','생산본부/CS팀','02-2284-9231','noon5582@neolab.net','active'],
        ['55','박소희','매니저','생산본부/CS팀','02-2223-8391','dbtrx0603@neolab.net','active'],
        ['56','박상은','매니저','생산본부/CS팀','','pse678@neolab.net','active'],
        ['57','남형우','수석','생산본부/CS팀(육아휴직~2026/04)','02-2223-8395','nhw0223@neolab.net','leave']
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: id, range: 'contacts!A:G', valueInputOption: 'RAW',
        requestBody: { values: contacts }
    });
    console.log(contacts.length + '명 인사정보 등록 완료');

    // 조직도 등록
    const oSheet = meta.data.sheets.find(s => s.properties.title === 'orgchart');
    const oExisting = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'orgchart!A:Z' });
    if (oExisting.data.values && oExisting.data.values.length > 1) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: id,
            requestBody: { requests: [{ deleteDimension: { range: { sheetId: oSheet.properties.sheetId, dimension: 'ROWS', startIndex: 1, endIndex: oExisting.data.values.length } } }] }
        });
    }

    const orgchart = [
        ['1','이상규 대표이사','CEO','1'],
        ['2','박지완 부사장','CSO','2'],
        ['3','이철규 전무이사','COO','2'],
        ['10','사업본부','이철규 전무이사(겸)','3'],
        ['11','국내사업팀','김지민 수석/팀장','4'],
        ['12','해외사업팀','조연수 수석/팀장','4'],
        ['13','서비스기획팀','조성아 수석/팀장','4'],
        ['14','출판기획파트','한윤정 책임/파트장','5'],
        ['20','경영지원본부','','3'],
        ['21','재무회계팀','김한나 수석/팀장','4'],
        ['22','인사총무팀','김수희 수석/팀장','4'],
        ['30','기술연구소','김범석 이사/연구소장','3'],
        ['31','SW개발팀','임무생 수석연구원/팀장','4'],
        ['32','펌웨어개발팀','하성훈 수석연구원/팀장','4'],
        ['33','하드웨어개발팀','장동완 수석연구원(겸)','4'],
        ['40','생산본부','이동현 이사/본부장','3'],
        ['41','개발품질팀','','4'],
        ['42','구매팀','박용식 수석/팀장','4'],
        ['43','생산팀','윤응식 수석','4'],
        ['44','양산품질팀','김진관 수석/팀장','4'],
        ['45','CS팀','황진영 책임/팀장(대행)','4']
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId: id, range: 'orgchart!A:D', valueInputOption: 'RAW',
        requestBody: { values: orgchart }
    });
    console.log(orgchart.length + '개 조직도 등록 완료');
})();
