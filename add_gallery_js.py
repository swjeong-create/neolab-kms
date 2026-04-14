import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# JS - 갤러리 뷰 전환 및 렌더링 함수 추가
gallery_js = """
// ─── 갤러리 뷰 ───
let currentViewMode = 'list';
let currentBoardViewType = 'list'; // 게시판 기본 보기 설정

window.switchView = function(mode) {
    currentViewMode = mode;
    document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector('.view-toggle-btn[data-view="' + mode + '"]');
    if (activeBtn) activeBtn.classList.add('active');

    const listContainer = document.getElementById('boardGridContainer');
    const galleryContainer = document.getElementById('boardGalleryContainer');

    if (mode === 'gallery') {
        if (listContainer) listContainer.style.display = 'none';
        if (galleryContainer) galleryContainer.style.display = 'grid';
    } else {
        if (listContainer) listContainer.style.display = 'flex';
        if (galleryContainer) galleryContainer.style.display = 'none';
    }
};

async function renderGalleryView(boardId, categoryId) {
    let url = '/api/posts?boardId=' + boardId;
    if (categoryId && categoryId !== 'all') url += '&categoryId=' + categoryId;
    let posts = await api.get(url);
    const categories = await cachedGet('/api/categories');
    const catMap = {};
    if(categories[boardId]) categories[boardId].forEach(function(c) { catMap[c.id] = c.name; });

    posts = posts.sort(function(a, b) { return (parseInt(a.order) || 999) - (parseInt(b.order) || 999); });

    const container = document.getElementById('boardGalleryContainer');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-light);"><div style="font-size:48px; margin-bottom:16px;">&#128237;</div><p>&#46321;&#47197;&#46108; &#44172;&#49884;&#47932;&#51060; &#50630;&#49845;&#45768;&#45796;.</p></div>';
        return;
    }

    var html = '';
    posts.forEach(function(post) {
        var icon = post.icon || '&#128196;';
        var catName = catMap[post.categoryId] || '';
        var thumbHtml = '';

        if (post.thumbnail) {
            thumbHtml = '<div class="gallery-thumb"><img src="/api/files/' + post.thumbnail + '" alt="' + post.title + '" onerror="this.parentElement.innerHTML=\\'' + icon + '\\'"></div>';
        } else if (post.type === 'pdf' && post.fileName) {
            thumbHtml = '<div class="gallery-thumb" style="background:linear-gradient(135deg,#ef4444,#f87171); color:white;">&#128213;</div>';
        } else if (post.type === 'url') {
            thumbHtml = '<div class="gallery-thumb" style="background:linear-gradient(135deg,#6366f1,#818cf8); color:white;">&#128279;</div>';
        } else {
            thumbHtml = '<div class="gallery-thumb">' + icon + '</div>';
        }

        html += '<div class="gallery-card" onclick="openPost(\\'' + post.id + '\\')">' +
            thumbHtml +
            '<div class="gallery-info">' +
            '<div class="gallery-title" title="' + post.title + '">' + post.title + '</div>' +
            '<div class="gallery-meta">' +
            '<span class="gallery-badge">' + catName + '</span>' +
            '<span>' + (post.date || '') + '</span>' +
            '</div></div></div>';
    });

    container.innerHTML = html;
}

"""

# renderPostGrid 함수 끝에 갤러리 동시 렌더링 추가
old_render_end = "    grid.innerHTML = html;\n}"
new_render_end = """    grid.innerHTML = html;

    // 갤러리 뷰도 동시 렌더링
    await renderGalleryView(boardId, categoryId);
}"""

content = content.replace(old_render_end, new_render_end, 1)

# renderDynamicBoardContent에서 게시판 기본 보기 설정 적용
old_board_render = "    await renderPostGrid(boardId, targetCatId || 'all');"
new_board_render = """    // 게시판 기본 보기 설정 적용
    const currentBoard = board;
    currentBoardViewType = currentBoard.viewType || 'list';
    currentViewMode = currentBoardViewType;
    const toggleBtns = document.querySelectorAll('.view-toggle-btn');
    toggleBtns.forEach(function(b) { b.classList.remove('active'); });
    const activeToggle = document.querySelector('.view-toggle-btn[data-view="' + currentViewMode + '"]');
    if (activeToggle) activeToggle.classList.add('active');

    const listC = document.getElementById('boardGridContainer');
    const galleryC = document.getElementById('boardGalleryContainer');
    if (currentViewMode === 'gallery') {
        if (listC) listC.style.display = 'none';
        if (galleryC) galleryC.style.display = 'grid';
    } else {
        if (listC) listC.style.display = 'flex';
        if (galleryC) galleryC.style.display = 'none';
    }

    await renderPostGrid(boardId, targetCatId || 'all');"""

content = content.replace(old_board_render, new_board_render)

# openPost 함수 앞에 갤러리 JS 삽입
content = content.replace(
    "window.openPost = async function(id) {",
    gallery_js + "window.openPost = async function(id) {"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('JS done')
