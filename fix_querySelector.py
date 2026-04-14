import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the querySelector line
old = "    const selector = '.menu-item[data-board=' + ' + boardId + ' + ']';\n    const menuItem = document.querySelector(selector);"
new = '    const menuItem = document.querySelector(\'.menu-item[data-board="\' + boardId + \'"]\');'

content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed querySelector')
