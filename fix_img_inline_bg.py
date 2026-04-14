import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 갤러리 썸네일 이미지에 인라인 style로 흰색 배경 강제 적용
content = content.replace(
    """'<div class="gallery-thumb"><img src="/api/files/' + encodeURIComponent(post.thumbnail) + '" alt="' + post.title + '"'""",
    """'<div class="gallery-thumb" style="background:#fff;"><img src="/api/files/' + encodeURIComponent(post.thumbnail) + '" style="background:#fff;" alt="' + post.title + '"'"""
)

# encodeURIComponent가 없는 버전도 처리
content = content.replace(
    """'<div class="gallery-thumb"><img src="/api/files/' + post.thumbnail + '" alt="' + post.title + '"'""",
    """'<div class="gallery-thumb" style="background:#fff;"><img src="/api/files/' + post.thumbnail + '" style="background:#fff;" alt="' + post.title + '"'"""
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
