// 게임 전체(코드, 데이터, WebP 그림)를 HTML 파일 하나로 묶는다.
// 이 파일 하나만 있으면 인터넷 없이 더블클릭으로 실행할 수 있다. (소리 파일과 글꼴 파일은 들어가지 않는다)
//
// 실행: node tools/build_single_html.mjs [저장할 파일]   (기본: dist/기억의_법정_1화.html)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'dist', '기억의_법정_1화.html'));
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 1) 그림: game/img/**/*.webp → { 'ui/textbox': 'data:image/webp;base64,…' }
const imgRoot = path.join(ROOT, 'game', 'img');
const embed = {};
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.webp')) {
      const key = path.relative(imgRoot, full).replace(/\\/g, '/').replace(/\.webp$/, '');
      embed[key] = 'data:image/webp;base64,' + fs.readFileSync(full).toString('base64');
    }
  }
})(imgRoot);

// 2) CSS와 JS를 파일 안에 넣는다
const inline = (s) => s.replace(/<\/script/gi, '<\\/script');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  let css = fs.readFileSync(path.join(ROOT, href), 'utf8');
  css = css.replace(/url\("\.\.\/fonts\/[^"]+"\) format\("woff"\),\s*/g, ''); // 글꼴 파일은 인터넷에서 받는다
  return '<style>\n' + css + '\n</style>';
});
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>\n' + inline(fs.readFileSync(path.join(ROOT, src), 'utf8')) + '\n</script>');
html = html.replace('<script>', '<script>window.EMBED_IMG = ' + JSON.stringify(embed) + ';</script>\n<script>');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${path.relative(ROOT, out)} 만듦: 그림 ${Object.keys(embed).length}장, ${(fs.statSync(out).size / 1048576).toFixed(1)}MB`);
