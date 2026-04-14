import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 글쓰기 모달 HTML 추가 (adminOverlay 닫는 태그 전)
write_modal_html = """
    <!-- 글쓰기/수정 모달 -->
    <div class="write-modal-overlay" id="writeModalOverlay">
        <div class="write-modal">
            <h2 id="writeModalTitle">&#44544;&#50416;&#44592;</h2>
            <div class="write-form-row">
                <div class="write-form-group">
                    <label>&#44172;&#49884;&#54032; (&#45824;&#48516;&#47448;)</label>
                    <select id="writeBoard" onchange="updateWriteCategories()"></select>
                </div>
                <div class="write-form-group">
                    <label>&#52852;&#53580;&#44256;&#47532; (&#51473;&#48516;&#47448;)</label>
                    <select id="writeCat"></select>
                </div>
            </div>
            <div class="write-form-group">
                <label>&#51228;&#47785;</label>
                <input type="text" id="writeTitle" placeholder="&#44172;&#49884;&#47932; &#51228;&#47785;&#51012; &#51077;&#47141;&#54616;&#49464;&#50836;">
            </div>
            <div class="write-form-row">
                <div class="write-form-group">
                    <label>&#50976;&#54805;</label>
                    <select id="writeType" onchange="toggleWriteFields()">
                        <option value="text">&#53581;&#49828;&#53944;</option>
                        <option value="pdf">PDF</option>
                        <option value="url">URL &#47553;&#53356;</option>
                        <option value="docx">DOCX</option>
                        <option value="xlsx">XLSX</option>
                        <option value="pptx">PPTX</option>
                    </select>
                </div>
                <div class="write-form-group">
                    <label>&#48512;&#44032;&#51221;&#48372; (&#48260;&#51204;, &#44552;&#50529; &#46321;)</label>
                    <input type="text" id="writeSubInfo" placeholder="&#50696;: v2.0, 2026&#45380;&#46020;">
                </div>
            </div>
            <div class="write-form-group" id="writeUrlGroup" style="display:none;">
                <label>URL</label>
                <input type="text" id="writeUrl" placeholder="https://...">
            </div>
            <div class="write-form-group" id="writeFileGroup" style="display:none;">
                <label>&#54028;&#51068; &#52392;&#48512;</label>
                <input type="file" id="writeFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif">
                <div id="writeFileStatus" style="font-size:12px; color:var(--text-light); margin-top:4px;"></div>
            </div>
            <div class="write-form-group" id="writeThumbGroup">
                <label>&#49452;&#45348;&#51068; &#51060;&#48120;&#51648; (&#44040;&#47084;&#47532;&#50857;, &#49440;&#53469;)</label>
                <input type="file" id="writeThumb" accept=".png,.jpg,.jpeg,.gif">
            </div>
            <div class="write-form-group" id="writeContentGroup">
                <label>&#45236;&#50857;</label>
                <textarea id="writeContent" placeholder="&#44172;&#49884;&#47932; &#45236;&#50857;&#51012; &#51077;&#47141;&#54616;&#49464;&#50836;..."></textarea>
            </div>
            <div class="write-form-actions">
                <button type="button" class="write-cancel-btn" onclick="closeWriteModal()">&#52712;&#49548;</button>
                <button type="button" class="write-submit-btn" onclick="submitWriteForm()">&#51200;&#51109;</button>
            </div>
        </div>
    </div>
"""

# adminOverlay 닫는 div 앞에 모달 추가
# 먼저 기존에 write-modal이 있는지 확인
if 'writeModalOverlay' not in content:
    # </body> 앞에 추가
    content = content.replace('</body>', write_modal_html + '\n</body>')
    print('Write modal added')

# JS 함수 추가 - loadAdminPosts 근처에 새 함수들 추가
admin_post_js = """
// ═══ 새 관리자 게시물 테이블 ═══
let adminPostPage = 1;
const ADMIN_POSTS_PER_PAGE = 15;
let adminEditPostId = null;

async function loadAdminPostTable() {
    const boardFilter = document.getElementById('adminPostBoardFilter');
    const catFilter = document.getElementById('adminPostCatFilter');
    const searchInput = document.getElementById('adminPostSearchInput');
    const searchField = document.getElementById('adminPostSearchField');

    // 게시판 필터 옵션 업데이트
    const boards = await cachedGet('/api/boards');
    const categories = await cachedGet('/api/categories');

    if (boardFilter.options.length <= 1) {
        boards.sort(function(a,b) { return (parseInt(a.order)||999) - (parseInt(b.order)||999); });
        boards.forEach(function(b) {
            var opt = document.createElement('option');
            opt.value = b.id; opt.textContent = b.name;
            boardFilter.appendChild(opt);
        });
    }

    // 카테고리 필터 업데이트
    var selectedBoard = boardFilter.value;
    catFilter.innerHTML = '<option value="all">\\uc804\\uccb4 \\uce74\\ud14c\\uace0\\ub9ac</option>';
    if (selectedBoard !== 'all' && categories[selectedBoard]) {
        categories[selectedBoard].forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.id; opt.textContent = c.name;
            catFilter.appendChild(opt);
        });
    }

    // 게시물 가져오기
    let posts = await api.get('/api/posts');
    posts = posts.sort(function(a,b) { return (parseInt(a.order)||999) - (parseInt(b.order)||999); });

    // 필터 적용
    if (selectedBoard !== 'all') posts = posts.filter(function(p) { return p.boardId === selectedBoard; });
    var selectedCat = catFilter.value;
    if (selectedCat !== 'all') posts = posts.filter(function(p) { return p.categoryId === selectedCat; });

    // 검색 적용
    var query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    if (query) {
        var field = searchField ? searchField.value : 'title';
        posts = posts.filter(function(p) {
            if (field === 'content') return (p.content || '').toLowerCase().includes(query);
            return (p.title || '').toLowerCase().includes(query);
        });
    }

    // 게시판/카테고리 이름 맵
    var boardMap = {};
    boards.forEach(function(b) { boardMap[b.id] = b.name; });
    var catMap = {};
    Object.keys(categories).forEach(function(k) {
        if (Array.isArray(categories[k])) {
            categories[k].forEach(function(c) { catMap[c.id] = c.name; });
        }
    });

    // 카운트 표시
    document.getElementById('adminPostCount').textContent = '\\ucd1d ' + posts.length + '\\uac1c';

    // 페이지네이션
    var totalPages = Math.max(1, Math.ceil(posts.length / ADMIN_POSTS_PER_PAGE));
    if (adminPostPage > totalPages) adminPostPage = totalPages;
    var startIdx = (adminPostPage - 1) * ADMIN_POSTS_PER_PAGE;
    var pagePosts = posts.slice(startIdx, startIdx + ADMIN_POSTS_PER_PAGE);

    // 테이블 렌더링
    var tbody = document.getElementById('adminPostTableBody');
    var typeLabels = { pdf:'PDF', docx:'DOCX', xlsx:'XLSX', pptx:'PPTX', url:'LINK', text:'TEXT' };

    if (pagePosts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-light);">\\ub4f1\\ub85d\\ub41c \\uac8c\\uc2dc\\ubb3c\\uc774 \\uc5c6\\uc2b5\\ub2c8\\ub2e4.</td></tr>';
    } else {
        tbody.innerHTML = pagePosts.map(function(p, i) {
            return '<tr>' +
                '<td class="td-check"><input type="checkbox" class="post-check" value="' + p.id + '"></td>' +
                '<td class="td-num">' + (startIdx + i + 1) + '</td>' +
                '<td><span class="td-badge badge-cat">' + (boardMap[p.boardId] || '') + '</span></td>' +
                '<td><span class="td-badge badge-cat">' + (catMap[p.categoryId] || '') + '</span></td>' +
                '<td class="td-title-link" onclick="editPost(\\'' + p.id + '\\')">' + p.title + '</td>' +
                '<td><span class="board-row-type ' + (p.type||'text') + '">' + (typeLabels[p.type] || 'TEXT') + '</span></td>' +
                '<td style="font-size:13px; color:var(--text-light);">' + (p.date || '-') + '</td>' +
                '<td style="font-size:13px; color:var(--text-light);">' + (p.views || 0) + '</td>' +
                '<td>' +
                    '<button type="button" onclick="editPost(\\'' + p.id + '\\')" style="background:none; border:1px solid var(--primary); color:var(--primary); padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px; margin-right:4px;">\\uc218\\uc815</button>' +
                    '<button type="button" onclick="deleteOnePost(\\'' + p.id + '\\')" style="background:none; border:1px solid #ef4444; color:#ef4444; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;">\\uc0ad\\uc81c</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    // 페이지네이션 렌더링
    var pagDiv = document.getElementById('adminPostPagination');
    var pagHtml = '';
    if (totalPages > 1) {
        pagHtml += '<button class="admin-page-btn" onclick="goAdminPage(1)">&laquo;</button>';
        pagHtml += '<button class="admin-page-btn" onclick="goAdminPage(' + Math.max(1, adminPostPage-1) + ')">&lsaquo;</button>';
        var startPage = Math.max(1, adminPostPage - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        for (var pg = startPage; pg <= endPage; pg++) {
            pagHtml += '<button class="admin-page-btn' + (pg === adminPostPage ? ' active' : '') + '" onclick="goAdminPage(' + pg + ')">' + pg + '</button>';
        }
        pagHtml += '<button class="admin-page-btn" onclick="goAdminPage(' + Math.min(totalPages, adminPostPage+1) + ')">&rsaquo;</button>';
        pagHtml += '<button class="admin-page-btn" onclick="goAdminPage(' + totalPages + ')">&raquo;</button>';
    }
    pagDiv.innerHTML = pagHtml;
}

window.goAdminPage = function(page) { adminPostPage = page; loadAdminPostTable(); };

window.toggleAllPostChecks = function(checked) {
    document.querySelectorAll('.post-check').forEach(function(cb) { cb.checked = checked; });
};

window.deleteSelectedPosts = async function() {
    var checks = document.querySelectorAll('.post-check:checked');
    if (checks.length === 0) return alert('\\uc0ad\\uc81c\\ud560 \\uac8c\\uc2dc\\ubb3c\\uc744 \\uc120\\ud0dd\\ud574\\uc8fc\\uc138\\uc694.');
    if (!confirm(checks.length + '\\uac1c \\uac8c\\uc2dc\\ubb3c\\uc744 \\uc0ad\\uc81c\\ud558\\uc2dc\\uac8c\\uc2b5\\ub2c8\\uae4c?')) return;
    for (var i = 0; i < checks.length; i++) {
        await api.del('/api/posts/' + checks[i].value);
    }
    invalidateAll();
    loadAdminPostTable();
};

window.deleteOnePost = async function(id) {
    if (!confirm('\\uc774 \\uac8c\\uc2dc\\ubb3c\\uc744 \\uc0ad\\uc81c\\ud558\\uc2dc\\uac8c\\uc2b5\\ub2c8\\uae4c?')) return;
    await api.del('/api/posts/' + id);
    invalidateAll();
    loadAdminPostTable();
};

// ═══ 글쓰기/수정 모달 ═══
window.openWriteModal = async function(postId) {
    adminEditPostId = postId || null;
    var modal = document.getElementById('writeModalOverlay');
    var title = document.getElementById('writeModalTitle');

    // 게시판/카테고리 옵션 로드
    var boards = await cachedGet('/api/boards');
    var categories = await cachedGet('/api/categories');
    var boardSelect = document.getElementById('writeBoard');
    boardSelect.innerHTML = '';
    boards.sort(function(a,b) { return (parseInt(a.order)||999) - (parseInt(b.order)||999); });
    boards.forEach(function(b) {
        var opt = document.createElement('option');
        opt.value = b.id; opt.textContent = b.name;
        boardSelect.appendChild(opt);
    });

    // 현재 필터된 게시판 자동 선택
    var currentFilter = document.getElementById('adminPostBoardFilter');
    if (currentFilter && currentFilter.value !== 'all') boardSelect.value = currentFilter.value;

    updateWriteCategories();

    if (postId) {
        title.textContent = '\\uac8c\\uc2dc\\ubb3c \\uc218\\uc815';
        var post = await api.get('/api/posts/' + postId);
        boardSelect.value = post.boardId;
        updateWriteCategories();
        document.getElementById('writeCat').value = post.categoryId;
        document.getElementById('writeTitle').value = post.title;
        document.getElementById('writeType').value = post.type || 'text';
        document.getElementById('writeSubInfo').value = post.subInfo || '';
        document.getElementById('writeUrl').value = post.url || '';
        document.getElementById('writeContent').value = post.content || '';
        document.getElementById('writeFileStatus').textContent = post.fileName ? '\\uae30\\uc874 \\ud30c\\uc77c: ' + post.fileName : '';
    } else {
        title.textContent = '\\uae00\\uc4f0\\uae30';
        document.getElementById('writeTitle').value = '';
        document.getElementById('writeType').value = 'text';
        document.getElementById('writeSubInfo').value = '';
        document.getElementById('writeUrl').value = '';
        document.getElementById('writeContent').value = '';
        document.getElementById('writeFileStatus').textContent = '';
        if(document.getElementById('writeFile')) document.getElementById('writeFile').value = '';
        if(document.getElementById('writeThumb')) document.getElementById('writeThumb').value = '';
    }

    toggleWriteFields();
    modal.classList.add('show');
};

window.closeWriteModal = function() {
    document.getElementById('writeModalOverlay').classList.remove('show');
    adminEditPostId = null;
};

window.editPost = function(id) { openWriteModal(id); };

window.updateWriteCategories = function() {
    var boardId = document.getElementById('writeBoard').value;
    var catSelect = document.getElementById('writeCat');
    catSelect.innerHTML = '<option value="">-- \\uc120\\ud0dd --</option>';
    var categories = dataCache['/api/categories'] ? dataCache['/api/categories'].data : {};
    if (categories[boardId]) {
        categories[boardId].forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c.id; opt.textContent = c.name;
            catSelect.appendChild(opt);
        });
    }
};

window.toggleWriteFields = function() {
    var type = document.getElementById('writeType').value;
    document.getElementById('writeUrlGroup').style.display = (type === 'url') ? 'block' : 'none';
    document.getElementById('writeFileGroup').style.display = (['pdf','docx','xlsx','pptx'].includes(type)) ? 'block' : 'none';
    document.getElementById('writeContentGroup').style.display = (type === 'text') ? 'block' : 'none';
};

window.submitWriteForm = async function() {
    var boardId = document.getElementById('writeBoard').value;
    var categoryId = document.getElementById('writeCat').value;
    var title = document.getElementById('writeTitle').value.trim();
    var type = document.getElementById('writeType').value;
    var subInfo = document.getElementById('writeSubInfo').value.trim();
    var url = document.getElementById('writeUrl').value.trim();
    var content = document.getElementById('writeContent').value.trim();

    if (!title) return alert('\\uc81c\\ubaa9\\uc744 \\uc785\\ub825\\ud574\\uc8fc\\uc138\\uc694.');
    if (!boardId) return alert('\\uac8c\\uc2dc\\ud310\\uc744 \\uc120\\ud0dd\\ud574\\uc8fc\\uc138\\uc694.');

    var fileName = '';

    // 파일 업로드
    var fileInput = document.getElementById('writeFile');
    if (fileInput && fileInput.files.length > 0) {
        var formData = new FormData();
        formData.append('file', fileInput.files[0]);
        var uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        var uploadData = await uploadRes.json();
        if (uploadData.error) return alert('\\ud30c\\uc77c \\uc5c5\\ub85c\\ub4dc \\uc2e4\\ud328: ' + uploadData.error);
        fileName = uploadData.fileName;
    }

    // 썸네일 업로드
    var thumbnail = '';
    var thumbInput = document.getElementById('writeThumb');
    if (thumbInput && thumbInput.files.length > 0) {
        var formData2 = new FormData();
        formData2.append('file', thumbInput.files[0]);
        var thumbRes = await fetch('/api/upload', { method: 'POST', body: formData2 });
        var thumbData = await thumbRes.json();
        if (!thumbData.error) thumbnail = thumbData.fileName;
    }

    var postData = { boardId: boardId, categoryId: categoryId, title: title, type: type, subInfo: subInfo, url: url, content: content };
    if (fileName) postData.fileName = fileName;
    if (thumbnail) postData.thumbnail = thumbnail;

    if (adminEditPostId) {
        await api.put('/api/posts/' + adminEditPostId, postData);
    } else {
        await api.post('/api/posts', postData);
    }

    invalidateAll();
    closeWriteModal();
    loadAdminPostTable();
    alert(adminEditPostId ? '\\uc218\\uc815\\ub418\\uc5c8\\uc2b5\\ub2c8\\ub2e4.' : '\\ub4f1\\ub85d\\ub418\\uc5c8\\uc2b5\\ub2c8\\ub2e4.');
};

"""

# 기존 loadAdminPosts 함수 앞에 새 함수 추가
if 'loadAdminPostTable' not in content:
    old_marker = 'async function loadAdminPosts()'
    if old_marker in content:
        content = content.replace(old_marker, admin_post_js + '\n' + old_marker)
        print('Admin post JS added')
    else:
        # 대체 위치 찾기
        content = content.replace('window.openPost = async function(id) {', admin_post_js + '\nwindow.openPost = async function(id) {')
        print('Admin post JS added (alt location)')

# 관리자 모드 진입 시 loadAdminPostTable 호출 추가
old_admin_enter = "document.getElementById('adminOverlay').classList.add('show');"
if 'loadAdminPostTable' not in content.split(old_admin_enter)[0] if old_admin_enter in content else True:
    content = content.replace(
        old_admin_enter,
        old_admin_enter + '\n        loadAdminPostTable();',
        1  # 첫 번째만 교체
    )
    print('loadAdminPostTable call added')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('JS done')
