import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 갤러리 썸네일 이미지 경로 인코딩
content = content.replace(
    "'/api/files/' + post.thumbnail + '\"",
    "'/api/files/' + encodeURIComponent(post.thumbnail) + '\""
)

# 갤러리 PDF 미리보기 iframe 경로 인코딩
content = content.replace(
    "'/api/files/' + post.fileName + '#toolbar",
    "'/api/files/' + encodeURIComponent(post.fileName) + '#toolbar"
)

# 라이트박스 이미지 경로 인코딩
content = content.replace(
    "'/api/files/' + post.thumbnail + '\" alt",
    "'/api/files/' + encodeURIComponent(post.thumbnail) + '\" alt"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
