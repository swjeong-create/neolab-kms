/* ============================================================
   데모 단일 HTML 파일 빌더
   ------------------------------------------------------------
   demo/index.html 의 외부 CSS/JS 를 전부 인라인해
   demo/NeoLAB-Guidebook-데모.html 한 파일로 만든다.
   (더블클릭만으로 오프라인 실행 — 이메일/USB 배포 용이)

   실행: node demo/build-standalone.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const demoDir = __dirname;
let html = fs.readFileSync(path.join(demoDir, 'index.html'), 'utf8');

// 1) CSS 인라인
html = html.replace(
    /<link rel="stylesheet" href="css\/style\.css[^"]*">/,
    function () {
        const css = fs.readFileSync(path.join(demoDir, 'css', 'style.css'), 'utf8');
        return '<style>\n' + css + '\n</style>';
    }
);

// 2) JS 인라인 (src="js/...js" 형태 전부)
html = html.replace(
    /<script src="js\/([^"?]+)(\?[^"]*)?"><\/script>/g,
    function (match, file) {
        const jsPath = path.join(demoDir, 'js', file);
        if (!fs.existsSync(jsPath)) return match; // 못 찾으면 원본 유지
        let js = fs.readFileSync(jsPath, 'utf8');
        // 인라인 시 </script> 시퀀스가 조기 종료시키지 않도록 이스케이프
        js = js.replace(/<\/script>/gi, '<\\/script>');
        return '<script>\n' + js + '\n</script>';
    }
);

const outPath = path.join(demoDir, 'NeoLAB-Guidebook-데모.html');
fs.writeFileSync(outPath, html, 'utf8');
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log('✅ 단일 파일 생성: ' + outPath + ' (' + kb + ' KB)');
