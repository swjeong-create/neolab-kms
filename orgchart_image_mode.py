import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 조직도 HTML - 이미지 표시 영역으로 변경
old_html = '<div class="org-chart" id="orgChartContainer"></div>'
new_html = '''<div id="orgChartContainer" style="text-align:center; padding:20px;">
                            <div id="orgChartImage" style="display:none;"><img id="orgChartImg" src="" alt="조직도" style="max-width:100%; height:auto; border-radius:8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                            <div id="orgChartEmpty" style="padding:60px 20px; color:var(--text-light);">
                                <div style="font-size:48px; margin-bottom:16px;">🏢</div>
                                <p style="font-size:16px;">조직도 이미지가 등록되지 않았습니다.</p>
                                <p style="font-size:13px;">관리자 모드에서 조직도 이미지를 업로드해주세요.</p>
                            </div>
                        </div>'''
content = content.replace(old_html, new_html)

# 2. loadOrgChart 함수 - 이미지 로드 방식으로 변경
old_func_start = 'async function loadOrgChart() {'
func_start = content.find(old_func_start)
# 함수 끝 찾기
brace = 0
i = func_start
found_first = False
func_end = -1
while i < len(content):
    if content[i] == '{':
        brace += 1
        found_first = True
    elif content[i] == '}':
        brace -= 1
        if found_first and brace == 0:
            func_end = i + 1
            break
    i += 1

new_func = '''async function loadOrgChart() {
    try {
        const settings = await cachedGet('/api/settings');
        const orgChartFile = settings.orgChartImage || '';
        const imgDiv = document.getElementById('orgChartImage');
        const emptyDiv = document.getElementById('orgChartEmpty');
        if (!imgDiv) return;

        if (orgChartFile) {
            document.getElementById('orgChartImg').src = '/api/files/' + orgChartFile;
            imgDiv.style.display = 'block';
            if (emptyDiv) emptyDiv.style.display = 'none';
        } else {
            imgDiv.style.display = 'none';
            if (emptyDiv) emptyDiv.style.display = 'block';
        }
    } catch(e) { console.error('조직도 로드 오류:', e); }
}'''

content = content[:func_start] + new_func + content[func_end:]

# 3. 관리자 조직도 탭 - 이미지 업로드 방식으로 변경
old_admin_org = '<div class="admin-tab-content" id="orgchartAdminTab">'
admin_org_start = content.find(old_admin_org)
# 닫는 </div> 찾기
brace2 = 0
j = admin_org_start
found2 = False
admin_org_end = -1
while j < len(content):
    if content[j:j+4] == '<div':
        brace2 += 1
        found2 = True
    elif content[j:j+6] == '</div>':
        brace2 -= 1
        if found2 and brace2 == 0:
            admin_org_end = j + 6
            break
    j += 1

new_admin_org = '''<div class="admin-tab-content" id="orgchartAdminTab">
                    <h2>🏢 조직도 관리</h2>
                    <p style="color:var(--text-secondary); margin-bottom:20px;">조직도 이미지를 업로드하면 인사정보 > 조직도 탭에 표시됩니다.<br>PNG, JPG, PDF 파일을 지원합니다. 권장 크기: 1200px 이상 가로 해상도</p>

                    <div style="margin-bottom:20px;">
                        <div id="orgChartPreview" style="margin-bottom:16px; text-align:center; padding:20px; background:var(--main-bg); border-radius:12px; border:2px dashed var(--border-color);">
                            <div id="orgPreviewImg" style="display:none;"><img id="orgAdminPreview" src="" style="max-width:100%; max-height:400px; border-radius:8px;"><br><span style="font-size:12px; color:var(--text-light); margin-top:8px; display:inline-block;">현재 등록된 조직도</span></div>
                            <div id="orgPreviewEmpty" style="padding:40px; color:var(--text-light);">등록된 조직도가 없습니다.</div>
                        </div>
                        <div class="admin-form-group">
                            <label>조직도 이미지 파일</label>
                            <input type="file" id="orgChartFileInput" accept=".png,.jpg,.jpeg,.pdf" style="padding:10px; border:1px solid var(--border-color); border-radius:8px; width:100%; box-sizing:border-box;">
                        </div>
                        <button type="button" class="admin-btn admin-btn-primary" onclick="uploadOrgChartImage()">조직도 업로드</button>
                        <button type="button" class="admin-btn admin-btn-danger" onclick="deleteOrgChartImage()" style="margin-left:8px;">삭제</button>
                    </div>
                </div>'''

content = content[:admin_org_start] + new_admin_org + content[admin_org_end:]

# 4. JS 함수 추가 - uploadOrgChartImage, deleteOrgChartImage
upload_js = '''
// ═══ 조직도 이미지 관리 ═══
window.uploadOrgChartImage = async function() {
    const fileInput = document.getElementById('orgChartFileInput');
    if (!fileInput || !fileInput.files.length) return alert('파일을 선택해주세요.');

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) return alert('업로드 실패: ' + data.error);

    // settings에 저장
    await api.put('/api/settings', { orgChartImage: data.fileName });
    invalidateAll();
    alert('조직도가 업로드되었습니다.');
    await loadAdminOrgChart();
    await loadOrgChart();
};

window.deleteOrgChartImage = async function() {
    if (!confirm('조직도 이미지를 삭제하시겠습니까?')) return;
    await api.put('/api/settings', { orgChartImage: '' });
    invalidateAll();
    alert('조직도가 삭제되었습니다.');
    await loadAdminOrgChart();
    await loadOrgChart();
};

'''

# openPost 앞에 삽입
content = content.replace('window.openPost = async function(id) {', upload_js + 'window.openPost = async function(id) {')

# 5. loadAdminOrgChart 함수 수정
old_admin_load = 'async function loadAdminOrgChart() {'
admin_load_start = content.find(old_admin_load)
# 함수 끝 찾기
brace3 = 0
k = admin_load_start
found3 = False
admin_load_end = -1
while k < len(content):
    if content[k] == '{':
        brace3 += 1
        found3 = True
    elif content[k] == '}':
        brace3 -= 1
        if found3 and brace3 == 0:
            admin_load_end = k + 1
            break
    k += 1

new_admin_load = '''async function loadAdminOrgChart() {
    try {
        const settings = await cachedGet('/api/settings');
        const orgFile = settings.orgChartImage || '';
        const previewImg = document.getElementById('orgPreviewImg');
        const previewEmpty = document.getElementById('orgPreviewEmpty');
        if (orgFile) {
            document.getElementById('orgAdminPreview').src = '/api/files/' + orgFile;
            if (previewImg) previewImg.style.display = 'block';
            if (previewEmpty) previewEmpty.style.display = 'none';
        } else {
            if (previewImg) previewImg.style.display = 'none';
            if (previewEmpty) previewEmpty.style.display = 'block';
        }
    } catch(e) { console.error(e); }
}'''

if admin_load_start >= 0 and admin_load_end > 0:
    content = content[:admin_load_start] + new_admin_load + content[admin_load_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done - orgchart image mode')
