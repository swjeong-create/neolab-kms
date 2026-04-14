import sys, re

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 사이드바 메뉴에서 공지사항 제거
content = content.replace(
    """                    <div class="menu-item" data-page="notices">
                        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        <span class="menu-text">공지사항</span>
                    </div>""",
    ""
)

# 2. 관리자 탭 버튼에서 공지사항 제거
content = content.replace(
    """                    <button type="button" class="admin-tab" data-tab="notices">📢 공지사항</button>""",
    ""
)

print('Notices removed from sidebar and admin tabs')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
