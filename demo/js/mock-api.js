/* ============================================================
   오프라인 데모용 Mock API 레이어
   ------------------------------------------------------------
   - window.fetch 를 가로채 내장 샘플 데이터를 반환합니다.
   - 서버/로그인/DB 없이 file:// 로 열어도 동작합니다.
   - GET = 읽기, POST/PUT/DELETE = 메모리상 변경(세션 동안만 유지).
   - /api/files/* 이미지는 인라인 SVG 플레이스홀더로 대체합니다.
   - 이 스크립트는 반드시 core.js 보다 먼저 로드되어야 합니다.
   ============================================================ */
(function () {
    'use strict';

    var todayKST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    function daysAgo(n) {
        var d = new Date();
        d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    }

    // ─────────────────────────────────────────
    // 샘플 데이터베이스 (메모리)
    // ─────────────────────────────────────────
    var DB = {
        me: {
            email: 'demo@neolab.net',
            name: '데모 관리자',
            photo: '',
            isAdmin: true,
            isSuperAdmin: false
        },

        settings: {
            siteName: 'NeoLAB Guidebook',
            siteDesc: '사내 지식포탈 데모',
            maintenance: 'false',
            footerText: 'NeoLAB Convergence Inc. — 데모 환경'
        },

        // 대분류(게시판) — 사이드바 메뉴
        boards: [
            { id: 'company', name: '회사소개', icon: '🏢', order: '1', viewType: 'list' },
            { id: 'rule', name: '사내규정', icon: '📋', order: '2', viewType: 'list' },
            { id: 'product', name: '제품정보', icon: '📦', order: '3', viewType: 'gallery' },
            { id: 'helper', name: '업무도우미', icon: '🛠️', order: '4', viewType: 'list' },
            { id: 'hr', name: '인사정보', icon: '👥', order: '5', viewType: 'list' }
        ],

        // 중분류(카테고리)
        categories: [
            { id: 'c-company-1', boardId: 'company', name: '회사 개요', order: '1', viewType: '' },
            { id: 'c-company-2', boardId: 'company', name: 'CI / BI', order: '2', viewType: '' },
            { id: 'c-rule-1', boardId: 'rule', name: '복무규정', order: '1', viewType: '' },
            { id: 'c-rule-2', boardId: 'rule', name: '복리후생', order: '2', viewType: '' },
            { id: 'c-rule-3', boardId: 'rule', name: '경비/정산', order: '3', viewType: '' },
            { id: 'c-product-1', boardId: 'product', name: '스마트펜', order: '1', viewType: '' },
            { id: 'c-product-2', boardId: 'product', name: '액세서리', order: '2', viewType: '' },
            { id: 'c-helper-1', boardId: 'helper', name: '업무 가이드', order: '1', viewType: '' }
        ],

        // 게시물
        posts: [
            {
                id: '1', boardId: 'company', categoryId: 'c-company-1', title: '회사 개요 및 비전',
                type: 'text', icon: '🏢', subInfo: '경영지원팀', views: '152', date: daysAgo(2), order: '1',
                content: '<h3 style="color:#ff6720;">NeoLAB Convergence</h3><p>NeoLAB은 인간의 삶과 디지털 세계를 연결하는 스마트펜을 개발하는 회사입니다.</p><table border="1" cellpadding="8" style="border-collapse:collapse; margin-top:12px;"><tr style="background:#fff7f2;"><th>구분</th><th>내용</th></tr><tr><td>설립</td><td>2012년</td></tr><tr><td>본사</td><td>서울 구로구</td></tr><tr><td>사업영역</td><td>스마트펜, 디지털 필기 솔루션</td></tr></table>',
                url: '', fileName: '', thumbnail: '', bgColor: '', detailImage: '', detailImageLinks: '', ocrText: ''
            },
            {
                id: '2', boardId: 'company', categoryId: 'c-company-2', title: 'CI 가이드라인',
                type: 'text', icon: '🎨', subInfo: 'v2.0', views: '88', date: daysAgo(5), order: '2',
                content: '<p>회사 컬러 가이드</p><p>🟧 <b>#ff6720</b> (Pantone 165 C — 강조)<br>⬛ <b>#53565A</b> (Pantone Cool Gray 11 — 본문)</p><p>로고는 최소 여백을 유지하고 임의 변형을 금지합니다.</p>',
                url: '', fileName: '', thumbnail: '', bgColor: '', detailImage: '', detailImageLinks: '', ocrText: ''
            },
            {
                id: '3', boardId: 'rule', categoryId: 'c-rule-1', title: '근무시간 및 유연근무제',
                type: 'text', icon: '🕐', subInfo: '인사팀', views: '243', date: daysAgo(1), order: '1',
                content: '<h3>표준 근무시간</h3><p>09:00 ~ 18:00 (점심 12:00~13:00)</p><h3>유연근무제</h3><ul><li>출근 08:00~10:00 사이 자유 선택</li><li>주 40시간 근무 기준</li><li>코어타임 10:00~16:00</li></ul>',
                url: '', fileName: '', thumbnail: '', bgColor: '', detailImage: '', detailImageLinks: '', ocrText: ''
            },
            {
                id: '4', boardId: 'rule', categoryId: 'c-rule-2', title: '복리후생 안내',
                type: 'text', icon: '🎁', subInfo: '2026', views: '197', date: daysAgo(7), order: '2',
                content: '<h3>주요 복리후생</h3><ul><li>🏥 4대보험 + 단체상해보험</li><li>🍱 중식 지원</li><li>📚 도서구입비 지원</li><li>🏖️ 장기근속 휴가 및 포상</li><li>💻 업무 장비 지원</li></ul>',
                url: '', fileName: '', thumbnail: '', bgColor: '', detailImage: '', detailImageLinks: '', ocrText: ''
            },
            {
                id: '5', boardId: 'rule', categoryId: 'c-rule-3', title: '경비 정산 규정',
                type: 'text', icon: '💳', subInfo: '재무회계팀', views: '134', date: daysAgo(10), order: '3',
                content: '<h3>경비 정산 절차</h3><ol><li>지출 후 영수증 첨부</li><li>경비 시스템에 등록</li><li>팀장 승인</li><li>재무팀 검토 후 익월 지급</li></ol><p>법인카드 사용분은 자동 연동됩니다.</p>',
                url: '', fileName: '', thumbnail: '', bgColor: '', detailImage: '', detailImageLinks: '', ocrText: ''
            },
            {
                id: '6', boardId: 'product', categoryId: 'c-product-1', title: 'NeoLAB 스마트펜 N2',
                type: 'images', icon: '🖊️', subInfo: '주력 제품', views: '321', date: daysAgo(3), order: '1',
                content: '<p>N2는 NeoLAB의 대표 스마트펜으로, 일반 종이에 쓴 필기를 실시간으로 디지털화합니다.</p><ul><li>블루투스 4.1 연결</li><li>최대 1,000페이지 내장 메모리</li><li>USB-C 충전, 약 5시간 사용</li></ul>',
                url: '', fileName: '', thumbnail: 'demo-pen.svg', bgColor: '#f8f9fa',
                detailImage: 'demo-pen.svg', detailImageLinks: '', ocrText: ''
            },
            {
                id: '7', boardId: 'product', categoryId: 'c-product-2', title: '전용 노트 & 케이스',
                type: 'images', icon: '📓', subInfo: '액세서리', views: '76', date: daysAgo(8), order: '2',
                content: '<p>스마트펜 전용 N코드 노트와 휴대용 케이스 라인업입니다.</p>',
                url: '', fileName: '', thumbnail: 'demo-note.svg', bgColor: '#fff7ed',
                detailImage: 'demo-note.svg', detailImageLinks: '', ocrText: ''
            },
            {
                id: '8', boardId: 'helper', categoryId: 'c-helper-1', title: '사내 메일 서명 만들기',
                type: 'url', icon: '✉️', subInfo: '가이드', views: '110', date: daysAgo(4), order: '1',
                content: '', url: 'https://www.neolab.net', fileName: '',
                thumbnail: '', bgColor: '', detailImage: '', detailImageLinks: '', ocrText: ''
            },
            {
                id: '9', boardId: 'helper', categoryId: 'c-helper-1', title: '회의실 예약 방법',
                type: 'text', icon: '📅', subInfo: '총무', views: '64', date: daysAgo(6), order: '2',
                content: '<h3>회의실 예약</h3><p>그룹웨어 > 자원예약 > 회의실 메뉴에서 예약합니다.</p><p>예약 후 미사용 시 반드시 취소해 주세요.</p>',
                url: '', fileName: '', thumbnail: '', bgColor: '', detailImage: '', detailImageLinks: '', ocrText: ''
            }
        ],

        // 연락처
        contacts: [
            { id: '1', name: '홍길동', position: '대표이사', dept: '경영지원', phone: '2284-9200', mobile: '010-1234-0001', email: 'ceo@neolab.net', status: 'active' },
            { id: '2', name: '김철수', position: '본부장', dept: '개발본부', phone: '2284-9210', mobile: '010-1234-0002', email: 'cs.kim@neolab.net', status: 'active' },
            { id: '3', name: '이영희', position: '팀장', dept: '인사팀', phone: '2284-9220', mobile: '010-1234-0003', email: 'yh.lee@neolab.net', status: 'active' },
            { id: '4', name: '박민수', position: '수석연구원', dept: 'SW개발팀', phone: '2284-9230', mobile: '010-1234-0004', email: 'ms.park@neolab.net', status: 'active' },
            { id: '5', name: '정수연', position: '책임연구원', dept: 'FW개발팀', phone: '2284-9240', mobile: '010-1234-0005', email: 'sy.jung@neolab.net', status: 'active' },
            { id: '6', name: '최동훈', position: '매니저', dept: '서비스기획팀', phone: '2284-9250', mobile: '010-1234-0006', email: 'dh.choi@neolab.net', status: 'active' },
            { id: '7', name: '강지은', position: '연구원', dept: 'HW개발팀', phone: '2284-9260', mobile: '010-1234-0007', email: 'je.kang@neolab.net', status: 'leave' },
            { id: '8', name: '윤서준', position: '선임', dept: '품질관리팀', phone: '2284-9270', mobile: '010-1234-0008', email: 'sj.yoon@neolab.net', status: 'active' },
            { id: '9', name: '임하늘', position: '사원', dept: '재무회계팀', phone: '2284-9280', mobile: '010-1234-0009', email: 'hn.lim@neolab.net', status: 'dispatch' },
            { id: '10', name: '한지민', position: '사원', dept: '경영지원', phone: '2284-9290', mobile: '010-1234-0010', email: 'jm.han@neolab.net', status: 'active' }
        ],

        // 조직도 (좌표 기반)
        orgchart: [
            { id: 'o1', name: '홍길동', title: '대표이사', department: '경영진', level: '0', parentId: '', order: '1', x: '420', y: '40', color: '#ff6720' },
            { id: 'o2', name: '김철수', title: '본부장', department: '개발본부', level: '1', parentId: 'o1', order: '1', x: '200', y: '180', color: '#53565A' },
            { id: 'o3', name: '이영희', title: '팀장', department: '경영지원', level: '1', parentId: 'o1', order: '2', x: '640', y: '180', color: '#53565A' },
            { id: 'o4', name: '박민수', title: '수석', department: 'SW개발팀', level: '2', parentId: 'o2', order: '1', x: '60', y: '320', color: '#10b981' },
            { id: 'o5', name: '정수연', title: '책임', department: 'FW개발팀', level: '2', parentId: 'o2', order: '2', x: '340', y: '320', color: '#10b981' },
            { id: 'o6', name: '한지민', title: '사원', department: '경영지원', level: '2', parentId: 'o3', order: '1', x: '640', y: '320', color: '#f59e0b' }
        ],

        // 공지사항
        notices: [
            { id: 'n1', title: '2026년 상반기 워크숍 안내', type: 'important', content: '6월 둘째 주 전사 워크숍이 예정되어 있습니다. 자세한 일정은 추후 공지합니다.', date: daysAgo(1) },
            { id: 'n2', title: '사내 포탈(데모) 오픈', type: 'normal', content: '지식포탈 데모 버전이 오픈되었습니다. 자유롭게 둘러보세요.', date: daysAgo(3) },
            { id: 'n3', title: '여름 휴가 신청 안내', type: 'normal', content: '여름 휴가 신청은 그룹웨어에서 진행해 주세요.', date: daysAgo(9) }
        ],

        // 개선요청
        suggestions: [
            { id: 's1', content: '구내식당 메뉴를 미리 공지해주면 좋겠습니다.', date: daysAgo(2), status: 'open', adminNote: '', completedBy: '', completedDate: '' },
            { id: 's2', content: '회의실 예약 시스템이 더 직관적이면 좋겠어요.', date: daysAgo(11), status: 'done', adminNote: '신규 시스템 도입 검토 중', completedBy: '데모 관리자', completedDate: daysAgo(5) }
        ],

        admins: [
            { email: 'demo@neolab.net', name: '데모 관리자', addedBy: 'system', addedDate: daysAgo(30) }
        ]
    };

    // ─────────────────────────────────────────
    // 인라인 SVG 플레이스홀더 이미지 (오프라인용)
    // ─────────────────────────────────────────
    function placeholderSvg(label, bg) {
        bg = bg || '#ff6720';
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380">' +
            '<rect width="600" height="380" fill="' + bg + '"/>' +
            '<rect x="20" y="20" width="560" height="340" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2" rx="12"/>' +
            '<text x="300" y="180" font-family="sans-serif" font-size="40" fill="#ffffff" text-anchor="middle" font-weight="bold">' + label + '</text>' +
            '<text x="300" y="230" font-family="sans-serif" font-size="18" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">데모 이미지 (오프라인)</text>' +
            '</svg>';
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    // ─────────────────────────────────────────
    // 응답 헬퍼
    // ─────────────────────────────────────────
    function json(data, status) {
        return Promise.resolve(new Response(JSON.stringify(data == null ? null : data), {
            status: status || 200,
            headers: { 'Content-Type': 'application/json' }
        }));
    }
    function ok() { return json({ success: true }); }
    function genId() { return String(Date.now()); }

    function parseBody(opts) {
        if (!opts || !opts.body) return {};
        if (typeof opts.body === 'string') {
            try { return JSON.parse(opts.body); } catch (e) { return {}; }
        }
        return {};
    }

    // 카테고리 그룹핑 (서버 동작 모사)
    function categoriesGrouped() {
        var grouped = {};
        DB.categories.forEach(function (c) {
            if (!grouped[c.boardId]) grouped[c.boardId] = [];
            grouped[c.boardId].push({ id: c.id, name: c.name, order: c.order || '', viewType: c.viewType || '' });
        });
        Object.keys(grouped).forEach(function (k) {
            grouped[k].sort(function (a, b) { return (parseInt(a.order) || 999) - (parseInt(b.order) || 999); });
        });
        return grouped;
    }

    // ─────────────────────────────────────────
    // API 라우팅
    // ─────────────────────────────────────────
    function route(path, method, opts, query) {
        var qp = new URLSearchParams(query || '');

        // 인증/사용자
        if (path === '/api/me') return json(DB.me);
        if (path === '/api/maintenance') return json({ maintenance: false });
        if (path === '/api/settings') {
            if (method === 'PUT' || method === 'POST') { Object.assign(DB.settings, parseBody(opts)); return ok(); }
            return json(DB.settings);
        }

        // 게시판
        if (path === '/api/boards') {
            if (method === 'POST') { var b = parseBody(opts); b.id = b.id || genId(); DB.boards.push(b); return json({ success: true, id: b.id }); }
            return json(DB.boards.slice().sort(function (a, b) { return (parseInt(a.order) || 999) - (parseInt(b.order) || 999); }));
        }
        if (/^\/api\/boards\//.test(path)) {
            var bid = decodeURIComponent(path.split('/')[3] || '');
            if (method === 'DELETE') { DB.boards = DB.boards.filter(function (x) { return x.id !== bid; }); return ok(); }
            if (method === 'PUT') { var bb = DB.boards.find(function (x) { return x.id === bid; }); if (bb) Object.assign(bb, parseBody(opts)); return ok(); }
        }

        // 카테고리
        if (path === '/api/categories') {
            if (method === 'POST') { var c = parseBody(opts); c.id = c.id || genId(); DB.categories.push(c); return json({ success: true, id: c.id }); }
            var bId = qp.get('boardId');
            if (bId) {
                return json(DB.categories.filter(function (x) { return x.boardId === bId; })
                    .sort(function (a, b) { return (parseInt(a.order) || 999) - (parseInt(b.order) || 999); }));
            }
            return json(categoriesGrouped());
        }
        if (/^\/api\/categories\//.test(path)) {
            var parts = path.split('/'); // ['', 'api', 'categories', boardId, catId]
            var catId = decodeURIComponent(parts[4] || '');
            if (method === 'DELETE') { DB.categories = DB.categories.filter(function (x) { return x.id !== catId; }); return ok(); }
            if (method === 'PUT') { var cc = DB.categories.find(function (x) { return x.id === catId; }); if (cc) Object.assign(cc, parseBody(opts)); return ok(); }
        }

        // 게시물
        if (path === '/api/posts') {
            if (method === 'POST') {
                var np = parseBody(opts); np.id = genId(); np.views = '0'; np.date = todayKST;
                DB.posts.push(np); return json({ success: true, id: np.id });
            }
            var list = DB.posts.slice();
            var boardId = qp.get('boardId'), categoryId = qp.get('categoryId'), search = qp.get('search');
            if (boardId) list = list.filter(function (p) { return p.boardId === boardId; });
            if (categoryId) list = list.filter(function (p) { return p.categoryId === categoryId; });
            if (search) {
                var q = search.toLowerCase();
                list = list.filter(function (p) {
                    return (p.title || '').toLowerCase().indexOf(q) !== -1 ||
                        (p.content || '').toLowerCase().indexOf(q) !== -1;
                });
            }
            // 목록에서는 큰 필드 축약 (서버 동작 모사)
            list = list.map(function (p) {
                var copy = Object.assign({}, p);
                copy.content = (p.content && p.content.charAt(0) === '[') ? p.content.substring(0, 200) : '';
                delete copy.ocrText;
                return copy;
            });
            return json(list);
        }
        if (/^\/api\/posts\//.test(path)) {
            var pparts = path.split('/');
            var pid = decodeURIComponent(pparts[3] || '');
            if (pparts[4] === 'view') return ok(); // 조회수 +1 (무시)
            var post = DB.posts.find(function (x) { return x.id === pid; });
            if (method === 'DELETE') { DB.posts = DB.posts.filter(function (x) { return x.id !== pid; }); return ok(); }
            if (method === 'PUT') { if (post) Object.assign(post, parseBody(opts)); return ok(); }
            if (!post) return json({ error: '게시물을 찾을 수 없습니다.' }, 404);
            return json(post);
        }

        // 연락처
        if (path === '/api/contacts') {
            if (method === 'POST') { var nc = parseBody(opts); nc.id = genId(); DB.contacts.push(nc); return json({ success: true, id: nc.id }); }
            return json(DB.contacts);
        }
        if (path === '/api/contacts/bulk') {
            if (method === 'POST') { var body = parseBody(opts); if (Array.isArray(body.contacts)) DB.contacts = body.contacts; return ok(); }
        }
        if (path === '/api/contact-order') return ok();
        if (/^\/api\/contacts\//.test(path)) {
            var ctId = decodeURIComponent(path.split('/')[3] || '');
            if (method === 'DELETE') { DB.contacts = DB.contacts.filter(function (x) { return x.id !== ctId; }); return ok(); }
            if (method === 'PUT') { var ct = DB.contacts.find(function (x) { return x.id === ctId; }); if (ct) Object.assign(ct, parseBody(opts)); return ok(); }
        }

        // 조직도
        if (path === '/api/orgchart') {
            if (method === 'POST') { var no = parseBody(opts); no.id = no.id || genId(); DB.orgchart.push(no); return json({ success: true, id: no.id }); }
            return json(DB.orgchart);
        }
        if (path === '/api/orgchart/bulk' || path === '/api/orgchart/reorder' || path === '/api/orgchart/save-positions') return ok();
        if (/^\/api\/orgchart\//.test(path)) {
            var oid = decodeURIComponent(path.split('/')[3] || '');
            if (method === 'DELETE') { DB.orgchart = DB.orgchart.filter(function (x) { return x.id !== oid; }); return ok(); }
            if (method === 'PUT') { var on = DB.orgchart.find(function (x) { return x.id === oid; }); if (on) Object.assign(on, parseBody(opts)); return ok(); }
        }

        // 공지
        if (path === '/api/notices') {
            if (method === 'POST') { var nn = parseBody(opts); nn.id = genId(); nn.date = todayKST; DB.notices.unshift(nn); return json({ success: true, id: nn.id }); }
            return json(DB.notices);
        }
        if (/^\/api\/notices\//.test(path)) {
            var nid = decodeURIComponent(path.split('/')[3] || '');
            if (method === 'DELETE') { DB.notices = DB.notices.filter(function (x) { return x.id !== nid; }); return ok(); }
            if (method === 'PUT') { var nt = DB.notices.find(function (x) { return x.id === nid; }); if (nt) Object.assign(nt, parseBody(opts)); return ok(); }
        }

        // 개선요청
        if (path === '/api/suggestions') {
            if (method === 'POST') { var ns = parseBody(opts); ns.id = genId(); ns.date = todayKST; ns.status = 'open'; DB.suggestions.unshift(ns); return json({ success: true, id: ns.id }); }
            return json(DB.suggestions);
        }
        if (/^\/api\/suggestions\//.test(path)) {
            var sid = decodeURIComponent(path.split('/')[3] || '');
            if (method === 'DELETE') { DB.suggestions = DB.suggestions.filter(function (x) { return x.id !== sid; }); return ok(); }
            if (method === 'PUT') { var sg = DB.suggestions.find(function (x) { return x.id === sid; }); if (sg) Object.assign(sg, parseBody(opts)); return ok(); }
        }

        // 관리자/통계 기타
        if (path === '/api/admins') return json(DB.admins);
        if (/^\/api\/admins\//.test(path)) return ok();
        if (path === '/api/admin/verify') return json({ ok: true });
        if (path === '/api/access-stats') return json({ totalUsers: 42, todayUsers: 7, dailyStats: [], topUsers: [] });
        if (path === '/api/restore') return ok();
        if (path === '/api/upload') return json({ fileName: 'demo-upload.svg', originalName: 'demo.svg', size: 1024, extractedText: '' });

        // 알 수 없는 엔드포인트 — 빈 배열/객체로 안전 반환
        return json([]);
    }

    // ─────────────────────────────────────────
    // fetch 가로채기
    // ─────────────────────────────────────────
    var _origFetch = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;

    window.fetch = function (input, opts) {
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        opts = opts || {};
        var method = (opts.method || 'GET').toUpperCase();
        var apiIdx = url.indexOf('/api/');

        if (apiIdx === -1) {
            // API가 아니면 외부 리소스 — 오프라인에선 원래 fetch 시도, 실패해도 무시
            if (_origFetch) return _origFetch(input, opts).catch(function () {
                return new Response('', { status: 200 });
            });
            return Promise.resolve(new Response('', { status: 200 }));
        }

        var path = url.substring(apiIdx);
        var query = '';
        var qIdx = path.indexOf('?');
        if (qIdx !== -1) { query = path.substring(qIdx + 1); path = path.substring(0, qIdx); }

        try {
            return route(path, method, opts, query);
        } catch (e) {
            console.warn('[demo mock] route error:', path, e);
            return json([]);
        }
    };

    // ─────────────────────────────────────────
    // /api/files/* 이미지 → SVG 플레이스홀더로 대체
    // (img 로드 에러를 캡처해 src 교체)
    // ─────────────────────────────────────────
    document.addEventListener('error', function (e) {
        var el = e.target;
        if (el && el.tagName === 'IMG' && el.src && el.src.indexOf('/api/files/') !== -1 && !el.dataset.demoFixed) {
            el.dataset.demoFixed = '1';
            var label = '🖊️ NeoLAB';
            if (/note/i.test(el.src)) label = '📓 Note';
            else if (/pen/i.test(el.src)) label = '🖊️ Smart Pen';
            el.src = placeholderSvg(label);
        }
    }, true);

    console.log('%c[NeoLAB Guidebook] 오프라인 데모 모드 활성화', 'color:#ff6720; font-weight:bold;');
})();
