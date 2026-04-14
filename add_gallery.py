import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. CSS - 갤러리 뷰 스타일 추가
gallery_css = """
        /* 보기 전환 버튼 */
        .view-toggle { display: flex; gap: 4px; margin-left: auto; }
        .view-toggle-btn { padding: 6px 12px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .view-toggle-btn:first-child { border-radius: 6px 0 0 6px; }
        .view-toggle-btn:last-child { border-radius: 0 6px 6px 0; }
        .view-toggle-btn.active { background: var(--primary); color: white; border-color: var(--primary); }

        /* 갤러리 뷰 */
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .gallery-card { background: var(--card-bg); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow); transition: all 0.3s; cursor: pointer; }
        .gallery-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .gallery-thumb { width: 100%; height: 180px; object-fit: cover; background: linear-gradient(135deg, #f0f0f0, #e0e0e0); display: flex; align-items: center; justify-content: center; font-size: 64px; color: #ccc; overflow: hidden; }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .gallery-info { padding: 14px; }
        .gallery-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gallery-meta { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-light); }
        .gallery-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: var(--main-bg); color: var(--text-secondary); }
"""

content = content.replace(
    '        /* 기타 스타일 */',
    gallery_css + '\n        /* 기타 스타일 */'
)

# 2. HTML - 보기 전환 버튼 + 갤러리 컨테이너 추가
old_filter = '<div class="category-filter" id="boardFilterContainer"></div>'
new_filter = """<div style="display:flex; align-items:center; gap:12px; margin-bottom:24px; flex-wrap:wrap;">
                    <div class="category-filter" id="boardFilterContainer" style="margin-bottom:0; flex:1;"></div>
                    <div class="view-toggle" id="viewToggle">
                        <button type="button" class="view-toggle-btn active" data-view="list" onclick="switchView('list')">&#128203; &#47532;&#49828;&#53944;</button>
                        <button type="button" class="view-toggle-btn" data-view="gallery" onclick="switchView('gallery')">&#128444;&#65039; &#44040;&#47084;&#47532;</button>
                    </div>
                </div>"""
content = content.replace(old_filter, new_filter)

old_grid = '<div class="form-grid" id="boardGridContainer"></div>'
new_grid = """<div class="form-grid" id="boardGridContainer"></div>
                    <div class="gallery-grid" id="boardGalleryContainer" style="display:none;"></div>"""
content = content.replace(old_grid, new_grid)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('CSS and HTML done')
