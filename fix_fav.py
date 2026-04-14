import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix favorites click (quick-item without style)
old = """<div class="quick-item" onclick="openPost('${p.id}')">"""
new = """<div class="quick-item" onclick="goToBoardAndOpen('${p.boardId}', '${p.id}')">"""
content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed favorites click')
