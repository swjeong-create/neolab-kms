import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 게시물 관리 탭 교체 - 기존 postAdminTab 내용을 새로운 테이블형으로
old_post_tab_start = '<div class="admin-tab-content active" id="postAdminTab">'

# 기존 postAdminTab 내용 끝 찾기
post_tab_idx = content.find(old_post_tab_start)
if post_tab_idx == -1:
    # active가 없는 경우
    old_post_tab_start = '<div class="admin-tab-content" id="postAdminTab">'
    post_tab_idx = content.find(old_post_tab_start)

if post_tab_idx >= 0:
    # 다음 admin-tab-content 시작 전까지가 postAdminTab
    next_tab_idx = content.find('<div class="admin-tab-content"', post_tab_idx + len(old_post_tab_start))
    if next_tab_idx == -1:
        next_tab_idx = content.find('</div>\n                \n                <div class="admin-tab-content"', post_tab_idx + 10)

    # postAdminTab 전체를 새 내용으로 교체
    new_post_tab = """<div class="admin-tab-content active" id="postAdminTab">
                    <h2>&#128221; &#44172;&#49884;&#47932; &#44288;&#47532;</h2>

                    <!-- &#44172;&#49884;&#54032;/&#52852;&#53580;&#44256;&#47532; &#54596;&#53552; -->
                    <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">
                        <select id="adminPostBoardFilter" onchange="loadAdminPostTable()" style="padding:10px 14px; border:1px solid var(--border-color); border-radius:8px; font-size:14px; min-width:150px;">
                            <option value="all">&#51204;&#52404; &#44172;&#49884;&#54032;</option>
                        </select>
                        <select id="adminPostCatFilter" onchange="loadAdminPostTable()" style="padding:10px 14px; border:1px solid var(--border-color); border-radius:8px; font-size:14px; min-width:150px;">
                            <option value="all">&#51204;&#52404; &#52852;&#53580;&#44256;&#47532;</option>
                        </select>
                    </div>

                    <!-- &#44160;&#49353; -->
                    <div class="admin-search-box">
                        <select class="admin-search-select" id="adminPostSearchField">
                            <option value="title">&#51228;&#47785;</option>
                            <option value="content">&#45236;&#50857;</option>
                        </select>
                        <input type="text" class="admin-search-input" id="adminPostSearchInput" placeholder="&#44160;&#49353;&#50612;&#47484; &#51077;&#47141;&#54616;&#49464;&#50836;..." onkeypress="if(event.key==='Enter') loadAdminPostTable()">
                        <button type="button" class="admin-search-btn" onclick="loadAdminPostTable()">&#44160;&#49353;</button>
                    </div>

                    <!-- &#53812;&#48148; -->
                    <div class="admin-toolbar">
                        <div class="admin-toolbar-left">
                            <span id="adminPostCount">&#52509; 0&#44060;</span>
                        </div>
                        <div class="admin-toolbar-right">
                            <button type="button" class="admin-delete-btn" onclick="deleteSelectedPosts()">&#49325;&#51228;</button>
                            <button type="button" class="admin-write-btn" onclick="openWriteModal()">&#44544;&#50416;&#44592;</button>
                        </div>
                    </div>

                    <!-- &#44172;&#49884;&#47932; &#53580;&#51060;&#48660; -->
                    <div style="overflow-x:auto;">
                        <table class="admin-table" id="adminPostTable">
                            <thead>
                                <tr>
                                    <th class="td-check"><input type="checkbox" id="adminCheckAll" onchange="toggleAllPostChecks(this.checked)"></th>
                                    <th style="width:50px">&#48264;&#54840;</th>
                                    <th style="width:80px">&#44172;&#49884;&#54032;</th>
                                    <th style="width:80px">&#52852;&#53580;&#44256;&#47532;</th>
                                    <th>&#51228;&#47785;</th>
                                    <th style="width:70px">&#50976;&#54805;</th>
                                    <th style="width:90px">&#45216;&#51676;</th>
                                    <th style="width:60px">&#51312;&#54924;</th>
                                    <th style="width:100px">&#44288;&#47532;</th>
                                </tr>
                            </thead>
                            <tbody id="adminPostTableBody"></tbody>
                        </table>
                    </div>

                    <!-- &#54168;&#51060;&#51648;&#45348;&#51060;&#49496; -->
                    <div class="admin-pagination" id="adminPostPagination"></div>
                </div>"""

    # 기존 postAdminTab 끝 찾기 - </div> 매칭
    depth = 0
    i = post_tab_idx
    end_idx = -1
    while i < len(content):
        if content[i:i+5] == '<div ':
            depth += 1
        elif content[i:i+6] == '</div>':
            depth -= 1
            if depth == 0:
                end_idx = i + 6
                break
        i += 1

    if end_idx > 0:
        content = content[:post_tab_idx] + new_post_tab + content[end_idx:]
        print('postAdminTab replaced')
    else:
        print('ERROR: could not find end of postAdminTab')
else:
    print('ERROR: postAdminTab not found')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
