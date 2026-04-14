import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = "async function loadOrgChart() {"
old_end = "    container.innerHTML = html;\n}"

# Find the function
start = content.find(old)
# Find the closing of this specific function (line 2394-2395)
# Search for the pattern after the function start
search_from = start
for i in range(4):  # find the 2nd occurrence of "container.innerHTML = html;\n}"
    pos = content.find(old_end, search_from)
    if pos > start and pos < start + 10000:
        end = pos + len(old_end)
        break
    search_from = pos + 1

new_func = '''async function loadOrgChart() {
    const container = document.getElementById('orgChartContainer');
    if (!container) return;

    container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:0; overflow-x:auto; padding:20px;">
        <!-- CEO -->
        <div class="org-box ceo" style="padding:16px 40px;"><div class="org-name">CEO</div></div>
        <div style="display:flex; align-items:stretch; justify-content:center;">
            <div style="width:140px;"></div>
            <div style="width:2px; height:70px; background:var(--border-color); position:relative;">
                <div style="position:absolute; top:50%; left:0; width:140px; height:2px; background:var(--border-color);"></div>
            </div>
            <div style="display:flex; align-items:center; width:140px;">
                <div class="org-box cso"><div class="org-name">CSO</div></div>
            </div>
        </div>
        <!-- COO -->
        <div class="org-box coo"><div class="org-name">COO</div></div>
        <div class="org-vline" style="height:20px;"></div>

        <!-- 가로선 -->
        <div style="width:85%; max-width:1100px; height:2px; background:var(--border-color);"></div>

        <!-- 4개 본부 -->
        <div style="display:flex; gap:24px; justify-content:center; width:100%;">
            <!-- 사업본부 -->
            <div class="org-section">
                <div class="org-vline" style="height:16px;"></div>
                <div class="org-box director"><div class="org-name">사업본부</div></div>
                <div class="org-vline" style="height:16px;"></div>
                <div class="org-division-teams">
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">국내사업팀</div></div></div>
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">해외사업팀</div></div></div>
                    <div class="org-section">
                        <div class="org-box team"><div class="org-name" style="font-size:13px;">서비스기획팀</div></div>
                        <div class="org-vline" style="height:12px;"></div>
                        <div class="org-box part"><div class="org-name" style="font-size:12px;">출판기획파트</div></div>
                    </div>
                </div>
            </div>
            <!-- 기술연구소 -->
            <div class="org-section">
                <div class="org-vline" style="height:16px;"></div>
                <div class="org-box director"><div class="org-name">기술연구소</div></div>
                <div class="org-vline" style="height:16px;"></div>
                <div class="org-division-teams">
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">SW개발팀</div></div></div>
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">FW개발팀</div></div></div>
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">HW개발팀</div></div></div>
                </div>
            </div>
            <!-- 생산본부 -->
            <div class="org-section">
                <div class="org-vline" style="height:16px;"></div>
                <div class="org-box director"><div class="org-name">생산본부</div></div>
                <div class="org-vline" style="height:16px;"></div>
                <div class="org-division-teams">
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">개발품질팀</div></div></div>
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">구매팀</div></div></div>
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">생산팀</div></div></div>
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">양산품질팀</div></div></div>
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">CS팀</div></div></div>
                </div>
            </div>
            <!-- 경영지원본부 -->
            <div class="org-section">
                <div class="org-vline" style="height:16px;"></div>
                <div class="org-box director"><div class="org-name">경영지원본부</div></div>
                <div class="org-vline" style="height:16px;"></div>
                <div class="org-division-teams">
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">재무회계팀</div></div></div>
                    <div class="org-section"><div class="org-box team"><div class="org-name" style="font-size:13px;">인사총무팀</div></div></div>
                </div>
            </div>
        </div>
    </div>`;
}'''

content = content[:start] + new_func + content[end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
