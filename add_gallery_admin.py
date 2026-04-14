import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 관리자 - 대분류 추가 폼에 보기 설정 추가
old_board_form = '<button type="button" class="admin-btn admin-btn-success" id="addBoardBtn">'
new_board_form = """<div class="admin-form-group">
                            <label>기본 보기</label>
                            <select id="boardViewTypeInput" style="padding:10px; border:1px solid var(--border-color); border-radius:8px; font-size:14px;">
                                <option value="list">📋 리스트 (기본)</option>
                                <option value="gallery">🖼️ 갤러리</option>
                            </select>
                        </div>
                        <button type="button" class="admin-btn admin-btn-success" id="addBoardBtn">"""
content = content.replace(old_board_form, new_board_form)

# 게시물 추가 폼에 썸네일 이미지 업로드 추가
old_post_file = "document.getElementById('postFileInput').value = '';"
new_post_file = """document.getElementById('postFileInput').value = '';
    if(document.getElementById('postThumbInput')) document.getElementById('postThumbInput').value = '';"""

if old_post_file in content:
    content = content.replace(old_post_file, new_post_file)

# 대분류 추가 시 viewType 포함
old_add_board = "await api.post('/api/boards', { id, name });"
new_add_board = """const viewType = document.getElementById('boardViewTypeInput').value;
            await api.post('/api/boards', { id, name, viewType });"""
content = content.replace(old_add_board, new_add_board)

# 대분류 수정 시 viewType 포함
old_edit_board = "await api.put(`/api/boards/${editBoardId}`, { id, name });"
new_edit_board = """const viewType = document.getElementById('boardViewTypeInput').value;
            await api.put(`/api/boards/${editBoardId}`, { id, name, viewType });"""
content = content.replace(old_edit_board, new_edit_board)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Admin UI done')
