require('dotenv').config();
const sheets = require('./lib/sheets');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const uploadsDir = path.join(__dirname, 'uploads');
const BASE = path.join(__dirname, '업로드용', '제품');

function copyFile(srcPath) {
    if (!fs.existsSync(srcPath)) { console.log('  ⚠️ 파일 없음:', srcPath); return null; }
    const ext = path.extname(srcPath);
    const newName = uuidv4() + ext;
    fs.copyFileSync(srcPath, path.join(uploadsDir, newName));
    return newName;
}

async function main() {
    await sheets.initSheets();

    // 1. 카테고리 추가 (노트류, 서비스)
    const cats = await sheets.getSheetData('categories');
    const existingCatIds = cats.map(c => c.id);

    if (!existingCatIds.includes('notes')) {
        await sheets.appendRow('categories', { id: 'notes', boardId: 'product', name: '노트류', order: '3' });
        console.log('✅ 카테고리 추가: 노트류 (notes)');
    }
    if (!existingCatIds.includes('service')) {
        await sheets.appendRow('categories', { id: 'service', boardId: 'product', name: '서비스', order: '4' });
        console.log('✅ 카테고리 추가: 서비스 (service)');
    }
    sheets.invalidateCache('categories');

    // 2. 게시물 등록
    const posts = await sheets.getSheetData('posts');
    let nextId = posts.reduce((max, p) => Math.max(max, parseInt(p.id) || 0), 0) + 1;

    const products = [
        // ── 필기펜 ──
        { cat: 'smartpen', name: '네오스마트펜 N2', folder: '필기펜/N2' },
        { cat: 'smartpen', name: '네오스마트펜 M1+', folder: '필기펜/M1+' },
        { cat: 'smartpen', name: '네오스마트펜 DIMO', folder: '필기펜/DIMO' },
        { cat: 'smartpen', name: '네오스마트펜 A1', folder: '필기펜/A1' },
        { cat: 'smartpen', name: '네오스마트펜 R1', folder: '필기펜/R1' },
        { cat: 'smartpen', name: '라미 사파리 올블랙 Ncode', folder: '필기펜/LAMY' },
        { cat: 'smartpen', name: '몰스킨 스마트 라이팅 세트', folder: '필기펜/Moleskine' },

        // ── 소리펜 ──
        { cat: 'soundpen', name: '팝펜 (PopPen)', folder: '소리펜/팝펜' },
        { cat: 'soundpen', name: '팝펜프라임 (PopPen Prime C172PM)', folder: '소리펜/팝펜프라임_C172PM' },
        { cat: 'soundpen', name: '포코로 (POKORO)', folder: '소리펜/포코로' },
        { cat: 'soundpen', name: '구몬 스마트펜', folder: '소리펜/구몬 스마트펜' },
        { cat: 'soundpen', name: '잉글리시에그 플링플링', folder: '소리펜/플링플링' },
        { cat: 'soundpen', name: '대교 눈높이 영어펜', folder: '소리펜/대교 눈높이펜' },
        { cat: 'soundpen', name: '스콜라스틱 팝펜 (C30)', folder: '소리펜/스콜라스틱팝펜_C30' },
        { cat: 'soundpen', name: '한솔교육 핀덴카 (C190)', folder: '소리펜/핀덴카' },
        { cat: 'soundpen', name: '핑크퐁 사운드펜', folder: '소리펜/핑크퐁' },

        // ── 서비스 ──
        { cat: 'service', name: '그리다보드 (Grida Board)', folder: '서비스/그리다보드' },
        { cat: 'service', name: '네오스튜디오 (Neo Studio)', folder: '서비스/네오스튜디오' },
        { cat: 'service', name: '아이글 (aigle) - AI 서논술 평가', folder: '서비스/아이글' },
        { cat: 'service', name: '현대자동차 산업용 펜', folder: '서비스/현대자동차 산업용 펜' },

        // ── 노트류 ──
        { cat: 'notes', name: '네오패드 (NeoPad)', folder: '노트류/네오패드' },
        { cat: 'notes', name: '스마트 캘린더', folder: '노트류/스마트 캘린더' },
        { cat: 'notes', name: '스마트 플래너', folder: '노트류/스마트 플래너' },
        { cat: 'notes', name: 'Lamy Note', folder: '노트류/Lamy Note' },
        { cat: 'notes', name: 'Moleskine Note', folder: '노트류/Moleskine' },
        { cat: 'notes', name: '베이직 노트', folder: '노트류/베이직 노트' },
    ];

    let registered = 0;
    for (const prod of products) {
        const dirPath = path.join(BASE, prod.folder);
        if (!fs.existsSync(dirPath)) {
            console.log('⚠️ 폴더 없음:', prod.folder);
            continue;
        }

        const files = fs.readdirSync(dirPath);

        // 썸네일: "제품사진" 파일 찾기
        let thumbnail = '';
        const thumbFile = files.find(f => f.includes('제품사진') || f.includes('썸네일'));
        if (thumbFile) {
            thumbnail = copyFile(path.join(dirPath, thumbFile));
        } else {
            // 제품사진이 없으면 첫 번째 이미지 사용
            const firstImg = files.find(f => /\.(png|jpg|jpeg)$/i.test(f));
            if (firstImg) thumbnail = copyFile(path.join(dirPath, firstImg));
        }

        // 상세 이미지: "제품설명" 파일들 찾기 (최대 3장)
        const detailFiles = files.filter(f => f.includes('제품설명') || f.includes('설명'));
        // 제품설명이 없으면 썸네일 아닌 나머지 이미지/PDF 사용
        let detailSources = detailFiles.length > 0 ? detailFiles : files.filter(f => {
            if (thumbFile && f === thumbFile) return false;
            return /\.(png|jpg|jpeg|pdf)$/i.test(f);
        });
        detailSources = detailSources.slice(0, 3);

        const detailNames = [];
        for (const df of detailSources) {
            const name = copyFile(path.join(dirPath, df));
            if (name) detailNames.push(name);
        }

        // PDF 타입 파일이 있는 경우 (제품설명이 PDF)
        let type = 'text';
        let fileName = '';
        const pdfDetail = detailFiles.find(f => f.endsWith('.pdf'));
        if (pdfDetail && !detailFiles.some(f => /\.(png|jpg|jpeg)$/i.test(f))) {
            // 상세가 PDF만 있는 경우
            type = 'pdf';
            fileName = detailNames[0] || '';
        }

        const post = {
            id: String(nextId++),
            boardId: 'product',
            categoryId: prod.cat,
            title: prod.name,
            type: type,
            icon: '',
            subInfo: '',
            content: '',
            url: '',
            fileName: fileName,
            views: '0',
            date: new Date().toISOString().split('T')[0],
            order: '',
            thumbnail: thumbnail || '',
            bgColor: '',
            detailImage: detailNames.join('|')
        };

        await sheets.appendRow('posts', post);
        console.log(`✅ #${post.id} [${prod.cat}] ${prod.name} (썸네일:${thumbnail ? '✓' : '✗'} 상세:${detailNames.length}장)`);
        registered++;
    }

    sheets.invalidateCache('posts');
    console.log(`\n🎉 총 ${registered}건 등록 완료!`);
    process.exit(0);
}

main().catch(err => { console.error('❌ 오류:', err); process.exit(1); });
