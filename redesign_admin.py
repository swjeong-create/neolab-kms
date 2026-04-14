import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 관리자 CSS 개선
old_admin_css = """        .admin-tab-content { display: none; background: var(--card-bg); border-radius: 16px; padding: 30px; box-shadow: var(--shadow-lg); }
        .admin-tab-content.active { display: block; }
        .admin-tab-content h2 { font-size: 24px; color: var(--text-primary); margin-bottom: 20px; }"""

new_admin_css = """        .admin-tab-content { display: none; background: var(--card-bg); border-radius: 16px; padding: 30px; box-shadow: var(--shadow-lg); }
        .admin-tab-content.active { display: block; }
        .admin-tab-content h2 { font-size: 24px; color: var(--text-primary); margin-bottom: 20px; }

        /* 관리자 테이블 */
        .admin-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .admin-table thead th { padding: 12px 14px; font-size: 13px; font-weight: 600; color: var(--text-light); background: var(--main-bg); border-bottom: 2px solid var(--border-color); text-align: left; white-space: nowrap; }
        .admin-table tbody tr { border-bottom: 1px solid var(--border-color); transition: background 0.15s; }
        .admin-table tbody tr:hover { background: rgba(255,103,32,0.03); }
        .admin-table td { padding: 12px 14px; font-size: 14px; color: var(--text-primary); vertical-align: middle; }
        .admin-table .td-check { width: 40px; text-align: center; }
        .admin-table .td-num { width: 50px; text-align: center; color: var(--text-light); font-size: 13px; }
        .admin-table .td-title-link { cursor: pointer; color: var(--text-primary); font-weight: 500; }
        .admin-table .td-title-link:hover { color: var(--primary); text-decoration: underline; }
        .admin-table .td-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .admin-table .badge-notice { background: #dbeafe; color: #1d4ed8; }
        .admin-table .badge-cat { background: var(--main-bg); color: var(--text-secondary); }

        /* 관리자 툴바 */
        .admin-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .admin-toolbar-left { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-secondary); }
        .admin-toolbar-right { display: flex; align-items: center; gap: 8px; }
        .admin-search-box { display: flex; align-items: center; gap: 0; margin-bottom: 20px; }
        .admin-search-select { padding: 10px 12px; border: 1px solid var(--border-color); border-right: none; border-radius: 8px 0 0 8px; font-size: 14px; background: var(--main-bg); color: var(--text-primary); }
        .admin-search-input { flex: 1; padding: 10px 14px; border: 1px solid var(--border-color); font-size: 14px; color: var(--text-primary); background: var(--card-bg); outline: none; }
        .admin-search-input:focus { border-color: var(--primary); }
        .admin-search-btn { padding: 10px 20px; background: var(--brand-gray); color: white; border: none; border-radius: 0 8px 8px 0; font-size: 14px; font-weight: 600; cursor: pointer; }
        .admin-search-btn:hover { background: var(--text-primary); }

        /* 글쓰기 버튼 */
        .admin-write-btn { padding: 10px 24px; background: var(--brand-gray); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .admin-write-btn:hover { background: var(--text-primary); transform: translateY(-1px); }
        .admin-delete-btn { padding: 10px 20px; background: white; color: #ef4444; border: 1px solid #ef4444; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .admin-delete-btn:hover { background: #fef2f2; }

        /* 글쓰기 모달 */
        .write-modal-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center; }
        .write-modal-overlay.show { display:flex; }
        .write-modal { background:var(--card-bg); border-radius:16px; width:90%; max-width:700px; max-height:90vh; overflow-y:auto; padding:30px; }
        .write-modal h2 { font-size:22px; margin-bottom:24px; color:var(--text-primary); }
        .write-form-group { margin-bottom:16px; }
        .write-form-group label { display:block; font-size:13px; font-weight:600; color:var(--text-secondary); margin-bottom:6px; }
        .write-form-group input, .write-form-group select, .write-form-group textarea { width:100%; padding:10px 14px; border:1px solid var(--border-color); border-radius:8px; font-size:14px; color:var(--text-primary); background:var(--card-bg); box-sizing:border-box; }
        .write-form-group textarea { min-height:120px; resize:vertical; }
        .write-form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .write-form-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:24px; }
        .write-cancel-btn { padding:10px 24px; background:var(--main-bg); color:var(--text-secondary); border:1px solid var(--border-color); border-radius:8px; font-size:14px; cursor:pointer; }
        .write-submit-btn { padding:10px 24px; background:var(--brand-gray); color:white; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; }

        /* 페이지네이션 */
        .admin-pagination { display:flex; justify-content:center; gap:4px; margin-top:24px; }
        .admin-page-btn { width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border-color); border-radius:8px; background:var(--card-bg); color:var(--text-secondary); font-size:14px; cursor:pointer; transition:all 0.15s; }
        .admin-page-btn:hover { border-color:var(--primary); color:var(--primary); }
        .admin-page-btn.active { background:var(--brand-gray); color:white; border-color:var(--brand-gray); }"""

content = content.replace(old_admin_css, new_admin_css)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('CSS done')
