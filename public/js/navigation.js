/* ==========================================
   사이드바 메뉴 렌더링
========================================== */
async function renderSidebarMenus() {
    var boards = (await cachedGet('/api/boards')).sort(function(a,b) { return (parseInt(a.order)||999) - (parseInt(b.order)||999); });
    var categories = await cachedGet('/api/categories');
    Object.keys(categories).forEach(function(k) {
        if (Array.isArray(categories[k])) categories[k].sort(function(a,b) { return (parseInt(a.order)||999) - (parseInt(b.order)||999); });
    });
    var dynamicArea = document.getElementById('dynamicSidebarArea');
    var html = '';

    // "인사 및 채용" 보드에 연락처/조직도를 자동 주입 (기존 카테고리와 나란히 노출)
    var HR_HOST_BOARD = '인사 및 채용';

    boards.forEach(function(board) {
        pageNames[board.id] = '📋 ' + board.name;
        var isHrHost = (board.name || '').trim() === HR_HOST_BOARD;
        var innerItems = '';
        if (categories[board.id] && categories[board.id].length > 0) {
            categories[board.id].forEach(function(cat) {
                innerItems += '<div class="submenu-item" data-action="goto-board" data-board="' + board.id + '" data-cat="' + cat.id + '">' + cat.name + '</div>';
            });
        }
        if (isHrHost) {
            innerItems += '<div class="submenu-item" data-action="goto-hr-contacts">연락처</div>';
            innerItems += '<div class="submenu-item" data-action="goto-hr-org">조직도</div>';
        }
        var subHtml = innerItems ? ('<div class="submenu">' + innerItems + '</div>') : '';
        html += '<div class="menu-item" data-page="' + board.id + '">' +
            '<svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="' + (board.icon || 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z') + '"/></svg>' +
            '<span class="menu-text">' + board.name + '</span>' +
            (subHtml ? '<svg class="menu-arrow" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : '') +
            '</div>' + subHtml;
    });
    dynamicArea.innerHTML = html;
}

/* ==========================================
   페이지 네비게이션 (히스토리 통합 관리)
========================================== */

// _skipPushState: popstate에서 호출 시 pushState 방지용 내부 플래그
var _skipPushState = false;

async function navigateTo(pageId, pushToHistory, targetCatId) {
    if (pushToHistory === undefined) pushToHistory = true;
    if (!pageNames[pageId]) return;

    // 페이지 이동 시 인라인 뷰어 및 제품 상세 닫기
    closeInlineViewer();
    var detailView = document.getElementById('productDetailView');
    if (detailView && detailView.style.display !== 'none') closeProductDetail();

    // 사이드바 메뉴 활성화
    document.querySelectorAll('.menu-item').forEach(function(mi) { mi.classList.remove('active'); });
    var targetMenu = document.querySelector('.menu-item[data-page="' + pageId + '"]');
    if (targetMenu) {
        targetMenu.classList.add('active');
        var submenu = targetMenu.nextElementSibling;
        if (submenu && submenu.classList.contains('submenu')) {
            targetMenu.classList.add('expanded');
            submenu.classList.add('show');
        }
    }

    // 페이지 섹션 전환
    document.querySelectorAll('.page-section').forEach(function(ps) { ps.classList.remove('active'); });
    var boards = await cachedGet('/api/boards');
    var isDynamicBoard = boards.some(function(b) { return b.id === pageId; });

    if (isDynamicBoard) {
        document.getElementById('dynamicBoardSection').classList.add('active');
        await renderDynamicBoardContent(pageId, targetCatId);
    } else {
        var targetSection = document.getElementById(pageId);
        if (targetSection) targetSection.classList.add('active');
    }

    // 빵가루 네비게이션
    var breadcrumb = document.getElementById('breadcrumb');
    if (pageId === 'dashboard') {
        breadcrumb.innerHTML = '<span class="breadcrumb-current">🏠 홈</span>';
    } else {
        var crumbHtml = '<span class="breadcrumb-item"><a onclick="navigateTo(\'dashboard\')">🏠 홈</a></span><span class="breadcrumb-sep">›</span>';
        if (targetCatId && targetCatId !== 'all') {
            var cats = await cachedGet('/api/categories');
            var boardCats = cats[pageId] || [];
            var cat = boardCats.find(function(c) { return c.id === targetCatId; });
            crumbHtml += '<span class="breadcrumb-item"><a onclick="navigateTo(\'' + pageId + '\')">' + (pageNames[pageId] || pageId).replace(/^[^\s]+\s/, '') + '</a></span>';
            if (cat) crumbHtml += '<span class="breadcrumb-sep">›</span><span class="breadcrumb-current">' + cat.name + '</span>';
        } else {
            crumbHtml += '<span class="breadcrumb-current">' + (pageNames[pageId] || pageId) + '</span>';
        }
        breadcrumb.innerHTML = crumbHtml;
    }

    // 히스토리 관리
    if (pushToHistory) {
        navHistory.push({ type: 'page', page: pageId, cat: targetCatId || null });
        // 브라우저 히스토리에도 push (popstate에서 호출된 경우 제외)
        if (!_skipPushState) {
            history.pushState({ page: pageId, cat: targetCatId || null }, '', '#' + pageId);
        }
    }

    updateBackBtn();
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('mobile-show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 뒤로가기 버튼 상태
function updateBackBtn() {
    backBtn.style.display = navHistory.length > 1 ? 'flex' : 'none';
}

// 뒤로가기 실행 (버튼 클릭 전용)
function goBack() {
    // 게시물 상세가 열려있으면 먼저 닫기
    var detailView = document.getElementById('productDetailView');
    if (detailView && detailView.style.display !== 'none') {
        closeProductDetail();
        if (navHistory.length > 0 && navHistory[navHistory.length - 1].type === 'post') {
            navHistory.pop();
        }
        updateBackBtn();
        return;
    }

    // 이전 페이지로 이동
    if (navHistory.length > 1) {
        navHistory.pop(); // 현재 제거
        var prev = navHistory[navHistory.length - 1];
        _skipPushState = true;
        navigateTo(prev.page, false, prev.cat);
        _skipPushState = false;
        // 브라우저 히스토리도 뒤로
        history.back();
    } else {
        navigateTo('dashboard', false);
    }
    updateBackBtn();
}

// 뒤로가기 버튼 클릭
backBtn.addEventListener('click', function() {
    goBack();
});

// 브라우저 뒤로가기/앞으로가기 (popstate)
window.addEventListener('popstate', function(e) {
    // 게시물 상세가 열려있으면 먼저 닫기
    var detailView = document.getElementById('productDetailView');
    if (detailView && detailView.style.display !== 'none') {
        closeProductDetail();
        if (navHistory.length > 0 && navHistory[navHistory.length - 1].type === 'post') {
            navHistory.pop();
        }
        updateBackBtn();
        // 다시 현재 state로 push해서 브라우저 히스토리 유지
        if (navHistory.length > 0) {
            var cur = navHistory[navHistory.length - 1];
            history.pushState({ page: cur.page, cat: cur.cat }, '', '#' + cur.page);
        }
        return;
    }

    // state에서 페이지 정보 읽기
    var state = e.state;
    if (state && state.page) {
        // navHistory 동기화
        if (navHistory.length > 1) navHistory.pop();
        _skipPushState = true;
        navigateTo(state.page, false, state.cat);
        _skipPushState = false;
    } else {
        // state가 없으면 (최초 페이지) 대시보드로
        navHistory = [{ type: 'page', page: 'dashboard', cat: null }];
        _skipPushState = true;
        navigateTo('dashboard', false);
        _skipPushState = false;
    }
    updateBackBtn();
});

// 사이드바 클릭 핸들러
document.getElementById('sidebar').addEventListener('click', function(e) {
    var submenuItem = e.target.closest('.submenu-item');
    if (submenuItem) {
        var action = submenuItem.getAttribute('data-action');
        if (action === 'goto-board') {
            navigateTo(submenuItem.getAttribute('data-board'), true, submenuItem.getAttribute('data-cat'));
        } else if (action === 'goto-hr-contacts') {
            navigateTo('hr'); document.querySelector('#hr .tab[data-tab="contacts"]').click();
        } else if (action === 'goto-hr-org') {
            navigateTo('hr'); document.querySelector('#hr .tab[data-tab="orgchart"]').click();
        }
        return;
    }
    var menuItem = e.target.closest('.menu-item');
    if (menuItem) {
        if (menuItem.id === 'adminMenuBtn') return;
        var submenu = menuItem.nextElementSibling;
        var hasSubmenu = submenu && submenu.classList.contains('submenu');

        if (hasSubmenu) {
            var isExpanded = menuItem.classList.contains('expanded');
            if (isExpanded) {
                menuItem.classList.remove('expanded');
                submenu.classList.remove('show');
            } else {
                menuItem.classList.add('expanded');
                submenu.classList.add('show');
                var page = menuItem.getAttribute('data-page');
                if (page) navigateTo(page);
            }
        } else {
            var page = menuItem.getAttribute('data-page');
            if (page) navigateTo(page);
        }
    }
});
