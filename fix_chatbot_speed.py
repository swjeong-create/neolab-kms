import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_chat = """app.post('/api/chat', requireAuth, async (req, res) => {
    const API_KEY = process.env.OPENROUTER_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'AI 챗봇이 설정되지 않았습니다.' });

    const { message, history } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: '질문을 입력해주세요.' });

    try {
        // 1. 등록된 게시물 데이터 수집
        const posts = await getSheetData('posts');
        const boards = await getSheetData('boards');
        const categories = await getSheetData('categories');
        const notices = await getSheetData('notices');
        const contacts = await getSheetData('contacts');"""

new_chat = """app.post('/api/chat', requireAuth, async (req, res) => {
    const API_KEY = process.env.OPENROUTER_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'AI 챗봇이 설정되지 않았습니다.' });

    const { message, history } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: '질문을 입력해주세요.' });

    try {
        // 1. 캐시에서 데이터 수집 (API 호출 없이 즉시)
        const posts = await getCached('posts');
        const boards = await getCached('boards');
        const categories = await getCached('categories');
        const notices = await getCached('notices');
        const contacts = await getCached('contacts');"""

content = content.replace(old_chat, new_chat)

# 모델을 더 빠른 것으로 변경 + max_tokens 줄이기
content = content.replace(
    "model: 'nvidia/nemotron-3-super-120b-a12b:free',",
    "model: 'google/gemini-2.0-flash-exp:free',"
)

# max_tokens 줄이기
content = content.replace(
    "max_tokens: 1024",
    "max_tokens: 512"
)

# 컨텍스트 축소 - content를 200자로 제한
content = content.replace(
    "(p.content || '').substring(0, 500)",
    "(p.content || '').substring(0, 200)"
)

# 연락처 컨텍스트 축소 - 이름/부서/전화만
content = content.replace(
    "contacts.forEach(c => {\n                context += `${c.name} | 직급: ${c.position || ''} | 부서: ${c.dept || ''} | 전화: ${c.phone || ''} | 이메일: ${c.email || ''}\\n`;",
    "contacts.slice(0, 30).forEach(c => {\n                context += `${c.name}|${c.position||''}|${c.dept||''}|${c.phone||''}\\n`;"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
