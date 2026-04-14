require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const auth = new google.auth.GoogleAuth({ keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });

(async () => {
    const sheets = google.sheets({ version: 'v4', auth });
    const id = process.env.GOOGLE_SHEET_ID;

    // uploads 폴더에서 특허 PDF 파일 목록
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir).filter(f => f.includes('NO.') || f.includes('10-2882132'));

    console.log('특허 파일 수:', files.length);

    // posts 헤더 확인
    const postsRes = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A1:Z1' });
    const headers = postsRes.data.values[0];

    // 최대 ID 확인
    const allPosts = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: 'posts!A:A' });
    let maxId = 0;
    (allPosts.data.values || []).slice(1).forEach(r => { const n = parseInt(r[0]); if (n > maxId) maxId = n; });

    const today = new Date().toISOString().split('T')[0];

    // 파일명에서 정보 추출
    const posts = files.map((fileName, i) => {
        // (NO.1) [KR] [10-1049457호] 네트워크 상의...
        let title = fileName.replace('.pdf', '').replace(/\(등록증\)/g, '').trim();

        // 국가 코드 추출
        const countryMatch = title.match(/\[(KR|JP|US|CN)\]/);
        const country = countryMatch ? countryMatch[1] : '';

        // 번호 추출
        const numMatch = title.match(/\[([^\]]+호?)\]/g);
        let patentNo = '';
        if (numMatch && numMatch.length >= 2) {
            patentNo = numMatch[1].replace(/[\[\]]/g, '');
        }

        // 제목 추출 (마지막 ] 이후)
        const titleMatch = title.match(/\]\s*(.+)$/);
        let cleanTitle = titleMatch ? titleMatch[1].trim() : title;

        // NO 번호 추출
        const noMatch = title.match(/\(NO\.(\d+)\)/);
        const order = noMatch ? noMatch[1] : String(100 + i);

        return {
            id: String(maxId + i + 1),
            boardId: 'company',
            categoryId: 'IPR',
            title: `[${country}] ${cleanTitle}`,
            type: 'pdf',
            icon: '📜',
            subInfo: patentNo,
            content: '',
            url: '',
            fileName: fileName,
            views: '0',
            date: today,
            order: order,
            thumbnail: ''
        };
    });

    // 순서 정렬
    posts.sort((a, b) => parseInt(a.order) - parseInt(b.order));

    // ID 재할당
    posts.forEach((p, i) => { p.id = String(maxId + i + 1); });

    const rows = posts.map(p => headers.map(h => p[h] !== undefined ? p[h] : ''));

    await sheets.spreadsheets.values.append({
        spreadsheetId: id, range: 'posts!A:Z', valueInputOption: 'RAW',
        requestBody: { values: rows }
    });

    console.log(posts.length + '개 특허 게시물 등록 완료');
    posts.forEach(p => console.log(`  ${p.order}. ${p.title} (${p.subInfo})`));

    // 회사정보 게시판을 갤러리 뷰로 설정하지 않음 (리스트 유지, IPR만 갤러리로 보면 됨)
})();
