// 게임 전체(코드, 데이터, WebP 그림)를 HTML 파일 하나로 묶는다.
// 이 파일 하나만 있으면 인터넷 없이 더블클릭으로 실행할 수 있다. game/fonts/ 의 글꼴도 함께 넣는다. (소리 파일은 들어가지 않는다)
//
// 실행: node tools/build_single_html.mjs [저장할 파일]   (기본: dist/기억의_법정.html)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'dist', '기억의_법정.html'));
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 1) 그림: game/img/**/*.webp → { 'ui/textbox': 'data:image/webp;base64,…' }
//    게임에서 쓰는 그림만 넣는다 (아직 만들지 않은 화의 그림은 빼서 파일이 커지지 않게).
//    UI는 전부, 인물은 DATA.인물의 파일 이름으로 시작하는 것, 그 밖의 그림은 코드와 데이터에 이름이 나오는 것.
const codeText = ['game/data', 'game/js'].flatMap((d) =>
  fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(ROOT, d, f), 'utf8'))).join('\n');
const mentioned = (word) => new RegExp(`(?<![A-Za-z0-9_])${word}(?![A-Za-z0-9_])`).test(codeText);
const charFiles = new Set([...codeText.matchAll(/파일:\s*'([a-z0-9]+)'/g)].map((m) => m[1]));
function used(key) {
  const [dir, name] = key.split('/');
  if (dir === 'ui') return true;
  if (dir === 'characters') return charFiles.has(name.split('_')[0]);
  return mentioned(name);
}
const imgRoot = path.join(ROOT, 'game', 'img');
const embed = {};
const skipped = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.webp')) {
      const key = path.relative(imgRoot, full).replace(/\\/g, '/').replace(/\.webp$/, '');
      if (!used(key)) { skipped.push(key); continue; }
      embed[key] = 'data:image/webp;base64,' + fs.readFileSync(full).toString('base64');
    }
  }
})(imgRoot);

// 2) CSS와 JS를 파일 안에 넣는다
const inline = (s) => s.replace(/<\/script/gi, '<\\/script');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
  let css = fs.readFileSync(path.join(ROOT, href), 'utf8');
  // 글꼴: game/fonts/ 에 있는 파일은 파일 안에 넣고, 없는 파일 이름은 지운다 (없으면 인터넷에서 받는다)
  css = css.replace(/url\("\.\.\/fonts\/([^"]+)"\) format\("([^"]+)"\),\s*/g, (m2, name, fmt) => {
    const f = path.join(ROOT, 'game', 'fonts', name);
    if (!fs.existsSync(f)) return '';
    const mime = { woff2: 'font/woff2', woff: 'font/woff', opentype: 'font/otf', truetype: 'font/ttf' }[fmt] || 'application/octet-stream';
    return `url("data:${mime};base64,${fs.readFileSync(f).toString('base64')}") format("${fmt}"), `;
  });
  return '<style>\n' + css + '\n</style>';
});
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>\n' + inline(fs.readFileSync(path.join(ROOT, src), 'utf8')) + '\n</script>');
html = html.replace('<script>', '<script>window.EMBED_IMG = ' + JSON.stringify(embed) + ';</script>\n<script>');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${path.relative(ROOT, out)} 만듦: 그림 ${Object.keys(embed).length}장, ${(fs.statSync(out).size / 1048576).toFixed(1)}MB`);
if (skipped.length) console.log(`게임에서 아직 안 쓰는 그림 ${skipped.length}장은 넣지 않음: ${skipped.join(', ')}`);
