import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = """        const post = {
            id: String(maxId + 1),
            boardId: req.body.boardId || '',
            categoryId: req.body.categoryId || '',
            title: req.body.title || '',
            type: req.body.type || 'text',
            icon: req.body.icon || '📄',
            subInfo: req.body.subInfo || '',
            content: content,
            url: req.body.url || '',
            fileName: req.body.fileName || '',
            views: '0',
            date: new Date().toISOString().split('T')[0]
        };"""

new = """        const post = {
            id: String(maxId + 1),
            boardId: req.body.boardId || '',
            categoryId: req.body.categoryId || '',
            title: req.body.title || '',
            type: req.body.type || 'text',
            icon: req.body.icon || '📄',
            subInfo: req.body.subInfo || '',
            content: content,
            url: req.body.url || '',
            fileName: req.body.fileName || '',
            views: '0',
            date: new Date().toISOString().split('T')[0],
            order: req.body.order || '',
            thumbnail: req.body.thumbnail || '',
            bgColor: req.body.bgColor || '#ffffff'
        };"""

content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
