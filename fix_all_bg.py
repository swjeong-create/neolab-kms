import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 갤러리 카드 자체 배경을 흰색으로
content = content.replace(
    '.gallery-thumb { width: 100%; height: 180px; background: #f8f9fa;',
    '.gallery-thumb { width: 100%; height: 180px; background: #ffffff;'
)

# 2. 이미지 배경 흰색 (이미 적용됨 확인)
# 이미 background: #fff 있음

# 3. URL 타입 배경도 흰색
content = content.replace(
    "style=\"background:#f8f9fa; color:#6b7280;\"",
    "style=\"background:#ffffff; color:#6b7280;\""
)

# 4. 기타 타입 배경도 흰색
content = content.replace(
    "style=\"background:#f8f9fa;\"",
    "style=\"background:#ffffff;\""
)

# 5. lazy loading 후 생성되는 iframe 내 빈 영역도 흰색
old_lazy = "el.innerHTML = '<iframe src=\"' + pdfUrl + '#toolbar=0&navpanes=0&scrollbar=0&page=1&view=Fit\" style=\"width:100%; height:100%; border:none; pointer-events:none;"
new_lazy = "el.innerHTML = '<iframe src=\"' + pdfUrl + '#toolbar=0&navpanes=0&scrollbar=0&page=1&view=Fit\" style=\"width:100%; height:100%; border:none; pointer-events:none; background:#fff;"
content = content.replace(old_lazy, new_lazy)

# 6. 갤러리 카드 전체 배경
content = content.replace(
    '.gallery-card { background: var(--card-bg);',
    '.gallery-card { background: #ffffff;'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
