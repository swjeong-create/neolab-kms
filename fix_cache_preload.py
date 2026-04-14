import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = """async function start() {
    await initSheets();
    app.listen(PORT, () => {"""

new = """async function start() {
    await initSheets();

    // 서버 시작 시 캐시 미리 로드 (빈 화면 방지)
    if (sheets) {
        try {
            const preloadSheets = ['boards', 'categories', 'posts', 'contacts', 'notices', 'orgchart', 'settings', 'admins'];
            for (const name of preloadSheets) {
                const data = await getSheetData(name);
                cache[name] = { data, time: Date.now() };
            }
            writeLog('INFO', '캐시 미리 로드 완료: ' + preloadSheets.length + '개 시트');
        } catch(e) {
            writeLog('WARN', '캐시 미리 로드 실패: ' + e.message);
        }
    }

    app.listen(PORT, () => {"""

content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
