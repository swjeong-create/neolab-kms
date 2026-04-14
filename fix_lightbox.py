import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# z-index를 99999로 올림
content = content.replace(
    '.lightbox-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.9); z-index:10001;',
    '.lightbox-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.9); z-index:99999;'
)

# lightbox-close도 z-index 올림
content = content.replace(
    '.lightbox-close { position:absolute; top:16px; right:24px; color:white; font-size:32px; cursor:pointer; background:rgba(0,0,0,0.4); border:none; opacity:0.8; transition:opacity 0.2s; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:10;',
    '.lightbox-close { position:absolute; top:16px; right:24px; color:white; font-size:32px; cursor:pointer; background:rgba(0,0,0,0.4); border:none; opacity:0.8; transition:opacity 0.2s; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:100000;'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
