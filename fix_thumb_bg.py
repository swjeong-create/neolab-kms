import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 갤러리 썸네일 이미지 배경을 흰색으로
content = content.replace(
    '.gallery-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 20px; box-sizing: border-box; }',
    '.gallery-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 20px; box-sizing: border-box; background: #fff; }'
)

# PDF lazy thumb의 배경도 흰색
content = content.replace(
    "style=\"background:#f8f9fa; padding:0; overflow:hidden; position:relative;\"",
    "style=\"background:#fff; padding:0; overflow:hidden; position:relative;\""
)

# Lazy loading으로 생성되는 iframe에도 흰색 배경 적용
content = content.replace(
    "el.innerHTML = '<iframe src=\"' + pdfUrl + '#toolbar=0&navpanes=0&scrollbar=0&page=1&view=Fit\" style=\"width:100%; height:100%; border:none; pointer-events:none;\"></iframe>'",
    "el.innerHTML = '<iframe src=\"' + pdfUrl + '#toolbar=0&navpanes=0&scrollbar=0&page=1&view=Fit\" style=\"width:100%; height:100%; border:none; pointer-events:none; background:#fff;\"></iframe>'"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
