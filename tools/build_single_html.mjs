// 게임 전체(코드, 데이터, WebP 그림)를 HTML 파일 하나로 묶는다.
// 이 파일 하나만 있으면 인터넷 없이 더블클릭으로 실행할 수 있다. game/fonts/ 의 글꼴도 함께 넣는다. (소리 파일은 들어가지 않는다)
//
// 게임 1(1~3화)과 게임 2(4~6화)를 따로 만든다. 한 파일에 다 넣으면 30MB를 넘기 때문이다.
//   - 게임 1 파일: [처음부터]가 1화. 이어하기 코드는 1~3화만 받는다. 기억 노트 쓰기가 있다.
//   - 게임 2 파일: [처음부터]가 4화(게임 2 시작 화면). 이어하기 코드는 4~6화만 받는다.
//   - 그 게임에서 쓰는 그림만 넣는다. (게임 2의 지난 기록에 나오는 1부 인물 얼굴처럼, 다른 게임 그림도 쓰는 것만 넣는다)
//
// 실행: node tools/build_single_html.mjs              → dist/기억의_법정_게임1.html, dist/기억의_법정_게임2.html
//       node tools/build_single_html.mjs --game 2     → 게임 2 파일만
//       node tools/build_single_html.mjs --game 2 저장할파일.html
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const gi = args.indexOf('--game');
const onlyGame = gi >= 0 ? +args[gi + 1] : null;
const outArg = args.filter((a, i) => !a.startsWith('--') && !(gi >= 0 && i === gi + 1))[0];

// ─────────── 게임 데이터 읽기 ───────────
const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
const dataFiles = ['common.js', ...fs.readdirSync(path.join(ROOT, 'game/data')).filter((f) => /^ep\d+\.js$/.test(f)).sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)))];
for (const f of dataFiles) vm.runInContext(fs.readFileSync(path.join(ROOT, 'game/data', f), 'utf8'), ctx);
const DATA = ctx.window.DATA;
const partOf = (e) => e.게임 || (e.번호 <= 3 ? 1 : 2);
const episodes = Object.values(DATA).filter((d) => d && d.막 && d.번호);

// ─────────── 게임마다 쓰는 그림 모으기 ───────────
const imgRoot = path.join(ROOT, 'game', 'img');
const allImgs = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.webp')) allImgs.push(path.relative(imgRoot, full).replace(/\\/g, '/').replace(/\.webp$/, ''));
  }
})(imgRoot);
const charKey = (name, expr) => { const c = DATA.인물[name]; const e = DATA.표정[expr || '기본']; return c && e ? 'characters/' + c.파일 + '_' + e : null; };
const allExpr = (name) => { const c = DATA.인물[name]; return c ? allImgs.filter((k) => k.startsWith('characters/' + c.파일 + '_')) : []; };
const FIXED = ['신중한', '한나', '레테', '재판장']; // 늘 나오는 인물은 표정을 모두 넣는다

function imagesOf(part) {
  const keys = new Set();
  const people = new Set(); // 게임 1은 그 게임 인물의 표정을 모두 넣는다 (기억 노트 얼굴 버튼 등)
  const addBg = (name) => { const b = DATA.배경[name]; if (b) { keys.add(b.그림); keys.add(b.책상); } };
  const addEv = (ev) => { if (ev) ['그림', '겹침', '확대', '자세히'].forEach((k) => keys.add(ev[k])); if (ev && ev.얼굴) keys.add(charKey(ev.얼굴[0], ev.얼굴[1])); };
  const seen = new Set();
  const isImgKey = (x) => typeof x === 'string' && /^(backgrounds|evidence|characters|ui)\/[a-z0-9_]+$/.test(x);
  function visit(v) {
    if (isImgKey(v)) { keys.add(v); return; } // 목록 안의 그림 이름 (창문 그림자 네 장 등)
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) {
      // [인물, 표정] 짝 (지난 기록, 회상 얼굴, 증거의 얼굴)
      if (v.length === 2 && typeof v[0] === 'string' && DATA.인물[v[0]] && typeof v[1] === 'string') { keys.add(charKey(v[0], v[1])); people.add(v[0]); }
      v.forEach(visit);
      return;
    }
    for (const who of ['말', '보이기', '등장', '증인', '인물']) {
      if (typeof v[who] === 'string' && DATA.인물[v[who]]) { keys.add(charKey(v[who], who === '인물' ? '뒷모습' : v.표정)); people.add(v[who]); }
    }
    if (typeof v.보기 === 'string') keys.add(charKey(v.보기, v.보기표정));
    if (typeof v.퇴장 === 'string' && v.뒷모습) keys.add(charKey(v.퇴장, '뒷모습'));
    if (typeof v.배경 === 'string') addBg(v.배경);
    for (const x of Object.values(v)) visit(x);
  }
  for (const ep of episodes.filter((e) => partOf(e) === part)) {
    visit(ep.막);
    visit([ep.오답.일반, ep.오답.피해]);
    for (const [id, ev] of Object.entries(ep.증거)) addEv(ev.가져오기 ? (DATA[ev.가져오기] || { 증거: {} }).증거[ev.원래 || id] : ev);
  }
  // 늘 쓰는 것: UI 전부, 법정 자리, 처음 화면 배경, 고정 인물의 모든 표정, 재판장 놀람
  allImgs.filter((k) => k.startsWith('ui/')).forEach((k) => keys.add(k));
  Object.values(DATA.법정자리).forEach((z) => { keys.add(z.배경); keys.add(z.책상); });
  keys.add('backgrounds/court_wide');
  FIXED.forEach((n) => allExpr(n).forEach((k) => keys.add(k)));
  if (part === 1) people.forEach((n) => allExpr(n).forEach((k) => keys.add(k)));
  return new Set([...keys].filter((k) => k && allImgs.includes(k)));
}

// ─────────── HTML 한 파일 만들기 ───────────
const inline = (s) => s.replace(/<\/script/gi, '<\\/script');
function build(part, out) {
  const used = imagesOf(part);
  const embed = {};
  for (const key of [...used].sort()) embed[key] = 'data:image/webp;base64,' + fs.readFileSync(path.join(imgRoot, key + '.webp')).toString('base64');
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
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
  html = html.replace(/<title>([^<]*)<\/title>/, '<title>$1 게임 ' + part + '</title>');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>\n' + inline(fs.readFileSync(path.join(ROOT, src), 'utf8')) + '\n</script>');
  html = html.replace('<script>', '<script>window.GAME_PART = ' + part + '; window.EMBED_IMG = ' + JSON.stringify(embed) + ';</script>\n<script>');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  const mb = fs.statSync(out).size / 1048576;
  console.log(`${path.relative(ROOT, out)} 만듦 (게임 ${part}): 그림 ${used.size}장, ${mb.toFixed(1)}MB${mb > 30 ? '  ※ 30MB가 넘습니다' : ''}`);
}

for (const part of onlyGame ? [onlyGame] : [1, 2]) {
  build(part, path.resolve(onlyGame && outArg ? outArg : path.join(ROOT, 'dist', `기억의_법정_게임${part}.html`)));
}
