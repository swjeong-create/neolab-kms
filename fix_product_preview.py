import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# openGalleryPreview에서 thumbnail이 있는 경우의 처리를 수정
# 기존: thumbnail만 보여줌
# 변경: content에 [PRODUCT_DESC]가 있으면 제품설명 이미지를 보여줌

old = """        if (post.thumbnail) {
            content.innerHTML = '<img src="/api/files/' + post.thumbnail + '" alt="' + post.title + '">';
        } else {
            let icon = post.icon || '📦';
            content.innerHTML = '<div class="lightbox-icon">' + icon + '</div>';
        }

        title.textContent = post.title;
        sub.textContent = [catName, post.subInfo].filter(Boolean).join(' · ');"""

new = """        if (post.content && post.content.startsWith('[PRODUCT_DESC]')) {
            // 제품 설명 이미지 모드
            var descFiles = post.content.replace('[PRODUCT_DESC]', '').split('|');
            var imgHtml = descFiles.map(function(f) {
                return '<img src="/api/files/' + encodeURIComponent(f.trim()) + '" alt="' + post.title + '" style="max-width:90vw; max-height:80vh; border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,0.5); background:#fff; margin-bottom:8px;">';
            }).join('');
            content.innerHTML = '<div style="display:flex; flex-direction:column; align-items:center; gap:8px; max-height:85vh; overflow-y:auto;">' + imgHtml + '</div>';
        } else if (post.thumbnail) {
            content.innerHTML = '<img src="/api/files/' + encodeURIComponent(post.thumbnail) + '" alt="' + post.title + '">';
        } else {
            let icon = post.icon || '📦';
            content.innerHTML = '<div class="lightbox-icon">' + icon + '</div>';
        }

        title.textContent = post.title;
        sub.innerHTML = [catName, post.subInfo].filter(Boolean).join(' · ');
        if (post.content && post.content.startsWith('[PRODUCT_DESC]')) {
            sub.innerHTML += ' <span style="opacity:0.5; margin-left:8px;">제품 상세 설명</span>';
        }"""

content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
