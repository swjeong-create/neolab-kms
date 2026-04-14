require('dotenv').config();
const sheets = require('./lib/sheets');
const { uploadsDir } = require('./lib/upload');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BASE = path.join(__dirname, '업로드용');

function copyFile(srcPath) {
    if (!fs.existsSync(srcPath)) { console.log('  ⚠️ 파일 없음:', srcPath); return null; }
    const ext = path.extname(srcPath);
    const newName = uuidv4() + ext;
    fs.copyFileSync(srcPath, path.join(uploadsDir, newName));
    return newName;
}

async function main() {
    await sheets.initSheets();

    const existingPosts = await sheets.getSheetData('posts');
    const maxId = existingPosts.reduce((max, p) => Math.max(max, parseInt(p.id) || 0), 0);
    let nextId = maxId + 1;

    const newPosts = [];

    // ==========================================
    // 1. 회사소개서 (company > intro)
    // ==========================================
    const introFiles = [
        { file: '회사소개서/국문/네오랩컨버전스_회사소개서_2025.pdf', title: '네오랩컨버전스 회사소개서 2025 (국문)', icon: '🇰🇷' },
        { file: '회사소개서/영문/NeoLAB Introduction- revised.pdf', title: 'NeoLAB Company Introduction (English)', icon: '🇺🇸' },
        { file: '회사소개서/일문/Neolab technology Introduction _JP.pdf', title: 'NeoLAB 技術紹介 (日本語)', icon: '🇯🇵' },
        { file: '회사소개서/일문/N planner_紹介資料_202511.pdf', title: 'N Planner 紹介資料 (日本語)', icon: '🇯🇵' },
        { file: '회사소개서/일문/NeoLAB_音声ペン事例ご紹介_202306.pdf', title: 'NeoLAB 音声ペン事例紹介 (日本語)', icon: '🇯🇵' },
        { file: '회사소개서/일문/Formsolution Proposal.pdf', title: 'Formsolution Proposal (日本語)', icon: '🇯🇵' },
        { file: '회사소개서/일문/InvestorRelations2025_NeoLAB_250826_rev4.pdf', title: 'Investor Relations 2025 (日本語)', icon: '🇯🇵' },
        { file: '회사소개서/일문/네오캐스트_EDIX 한국관 디렉토리북 용도.pdf', title: '네오캐스트 EDIX 한국관 디렉토리북 (日本語)', icon: '🇯🇵' },
    ];

    for (const item of introFiles) {
        const srcPath = path.join(BASE, item.file);
        const fileName = copyFile(srcPath);
        if (!fileName) continue;
        newPosts.push({
            id: String(nextId++),
            boardId: 'company',
            categoryId: 'intro',
            title: item.title,
            type: 'pdf',
            icon: item.icon,
            subInfo: '',
            content: '',
            url: '',
            fileName: fileName,
            views: '0',
            date: new Date().toISOString().split('T')[0]
        });
        console.log('✅ 회사소개서:', item.title);
    }

    // ==========================================
    // 2. 제품 - 기존에 없는 것만 추가
    // ==========================================
    const existingTitles = existingPosts.map(p => p.title.toLowerCase());

    // 소리펜 - 기존에 없는 것
    const newSoundPens = [
        { folder: '소리펜/팝펜프라임_C172PM', title: '팝펜프라임 (PopPen Prime C172PM)', icon: '🔊' },
        { folder: '소리펜/스콜라스틱팝펜_C30', title: '스콜라스틱 팝펜 (Scholastic PopPen C30)', icon: '🔊' },
        { folder: '소리펜/핀덴카', title: '한솔교육 핀덴카 (C190)', icon: '🔊' },
    ];

    for (const pen of newSoundPens) {
        // 이미 있는지 간단 체크
        const already = existingTitles.some(t =>
            t.includes('팝펜프라임') || t.includes('c172') ||
            t.includes('스콜라스틱') || t.includes('c30') ||
            t.includes('핀덴카')
        );

        const dirPath = path.join(BASE, '제품', pen.folder);
        const files = fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
        const imgFile = files.find(f => /\.(png|jpg|jpeg)$/i.test(f));

        if (imgFile) {
            const fileName = copyFile(path.join(dirPath, imgFile));
            if (fileName) {
                // 썸네일도 있으면 복사
                let thumbnail = '';
                const thumbFile = files.find(f => f !== imgFile && /\.(png|jpg|jpeg)$/i.test(f));
                if (thumbFile) {
                    thumbnail = copyFile(path.join(dirPath, thumbFile));
                }

                newPosts.push({
                    id: String(nextId++),
                    boardId: 'product',
                    categoryId: 'soundpen',
                    title: pen.title,
                    type: 'text',
                    icon: pen.icon,
                    subInfo: '',
                    content: '',
                    url: '',
                    fileName: fileName,
                    views: '0',
                    date: new Date().toISOString().split('T')[0],
                    thumbnail: thumbnail || ''
                });
                console.log('✅ 소리펜:', pen.title);
            }
        }
    }

    // 노트류 - 전부 신규
    const noteProducts = [
        { folder: '노트류/네오패드', title: '네오패드 (NeoPad)', catId: 'etc_product', icon: '📓' },
        { folder: '노트류/스마트 캘린더', title: '스마트 캘린더', catId: 'etc_product', icon: '📅' },
        { folder: '노트류/스마트 플래너', title: '스마트 플래너', catId: 'etc_product', icon: '📒' },
    ];

    for (const note of noteProducts) {
        const dirPath = path.join(BASE, '제품', note.folder);
        const files = fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
        const imgFile = files.find(f => /\.(png|jpg|jpeg)$/i.test(f));

        if (imgFile) {
            const fileName = copyFile(path.join(dirPath, imgFile));
            if (fileName) {
                let thumbnail = '';
                const thumbFile = files.find(f => f !== imgFile && /\.(png|jpg|jpeg)$/i.test(f));
                if (thumbFile) {
                    thumbnail = copyFile(path.join(dirPath, thumbFile));
                }

                newPosts.push({
                    id: String(nextId++),
                    boardId: 'product',
                    categoryId: note.catId,
                    title: note.title,
                    type: 'text',
                    icon: note.icon,
                    subInfo: '',
                    content: '',
                    url: '',
                    fileName: fileName,
                    views: '0',
                    date: new Date().toISOString().split('T')[0],
                    thumbnail: thumbnail || ''
                });
                console.log('✅ 노트류:', note.title);
            }
        }
    }

    // ==========================================
    // 3. 기존 제품 이미지 업데이트 (제품사진/설명이 없는 경우)
    // ==========================================
    const penImageUpdates = [
        { folder: '필기펜_이미지/A1', existingTitle: '네오스마트펜 A1' },
        { folder: '필기펜_이미지/DIMO', existingTitle: '네오스마트펜 dimo' },
        { folder: '필기펜_이미지/LAMY', existingTitle: '라미 사파리' },
        { folder: '필기펜_이미지/M1+', existingTitle: '네오스마트펜 M1+' },
        { folder: '필기펜_이미지/N2', existingTitle: '네오스마트펜 N2' },
        { folder: '필기펜_이미지/R1', existingTitle: '네오스마트펜 R1' },
    ];

    for (const update of penImageUpdates) {
        const dirPath = path.join(BASE, '제품', update.folder);
        const files = fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
        const imgFile = files.find(f => f.includes('제품사진'));

        if (imgFile) {
            const existingPost = existingPosts.find(p => p.title.toLowerCase().includes(update.existingTitle.toLowerCase()));
            if (existingPost && !existingPost.thumbnail) {
                const thumbName = copyFile(path.join(dirPath, imgFile));
                if (thumbName) {
                    existingPost.thumbnail = thumbName;
                    await sheets.updateRow('posts', existingPost._rowIndex, existingPost);
                    console.log('🔄 썸네일 업데이트:', existingPost.title);
                }
            }
        }
    }

    // ==========================================
    // 4. 새 게시물 일괄 등록
    // ==========================================
    console.log(`\n📝 총 ${newPosts.length}건 신규 등록 중...`);

    for (const post of newPosts) {
        await sheets.appendRow('posts', post);
        console.log(`  → #${post.id} ${post.title}`);
    }

    sheets.invalidateCache('posts');
    console.log(`\n✅ 완료! ${newPosts.length}건 등록됨`);
    process.exit(0);
}

main().catch(err => { console.error('❌ 오류:', err); process.exit(1); });
