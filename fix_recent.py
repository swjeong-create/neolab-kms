import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix recent viewed docs click
old = """onclick="openPost('${p.id}')" style="border-left-color: var(--brand-gray);">"""
new = """onclick="goToBoardAndOpen('${p.boardId}', '${p.id}')" style="border-left-color: var(--brand-gray);">"""
content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed recent docs click')
