// 묶음 만들기:  node tools/build.mjs            → engine/bundle.js, ai/guide.js 를 다시 만든다 (엔진이나 ai/ 문서를 고친 뒤)
//              node tools/build.mjs --html      → dist/내게임.html (my-game 폴더를 HTML 파일 하나로. 그림과 소리도 함께 넣는다)
// 만들기 도우미(maker.html)는 인터넷이나 서버 없이 열리므로, 엔진과 AI 지침을 미리 글로 묶어 둔 파일이 필요하다.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const require = createRequire(import.meta.url);
const ENGINE = ['defaults', 'core', 'screen', 'record', 'play', 'write', 'check', 'main'];

export function makeBundle() {
  const html = read('index.html');
  const body = html.slice(html.indexOf('<!--APP-->') + 10, html.indexOf('<!--/APP-->')).trim();
  const guide = JSON.parse(read('ai/form.json'));
  return { 판: guide.판이름, css: read('engine/css/game.css'), js: ENGINE.map((f) => '// ── ' + f + '.js ──\n' + read('engine/js/' + f + '.js')).join('\n'), body };
}
export function makeGuide() {
  const form = JSON.parse(read('ai/form.json'));
  // AI에게 형식 예시로 보내는 게임: 양식에 예시폴더가 적혀 있으면 그 폴더, 아니면 my-game (짧은 예시일수록 좋다)
  const ex = form.예시폴더 || 'my-game';
  return Object.assign({}, form, { 지침: read('ai/AI_지침.md'), 형식: read('ai/데이터_형식.md'), 예시설정: read(ex + '/settings.js'), 예시이야기: read(ex + '/story1.js') });
}
const asJs = (name, obj, note) => '// 이 파일은 node tools/build.mjs 가 만든다. 직접 고치지 않는다. (' + note + ')\nwindow.' + name + ' = ' + JSON.stringify(obj).replace(/<\/(script)/gi, '<\\/$1') + ';\n';

function loadGame(dir) {
  const ctx = { window: {}, console };
  ctx.window.DATA = {};
  vm.createContext(ctx);
  for (const f of readdirSync(dir).filter((f) => /^(settings|story\d+)\.js$/.test(f)).sort()) vm.runInContext('var DATA = window.DATA;\n' + readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  return JSON.parse(JSON.stringify(ctx.window.DATA));
}
function embedFiles(dir, types) {
  const out = {};
  const walk = (d, rel) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) { walk(p, rel + f + '/'); continue; }
      const ext = path.extname(f).slice(1).toLowerCase();
      if (!types[ext]) continue;
      out[rel + f.slice(0, -ext.length - 1)] = 'data:' + types[ext] + ';base64,' + readFileSync(p).toString('base64');
    }
  };
  walk(dir, '');
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(path.join(root, 'engine/bundle.js'), asJs('KIT_BUNDLE', makeBundle(), '엔진을 글로 묶은 것'));
  writeFileSync(path.join(root, 'ai/guide.js'), asJs('KIT_GUIDE', makeGuide(), 'AI 지침과 설계서 양식을 글로 묶은 것'));
  // 수업 설계서(글로 된 양식)도 같은 양식(ai/form.json)에서 만든다
  const form = JSON.parse(read('ai/form.json'));
  const sheet = ['# 수업 설계서 (' + form.판이름 + ')', '', '아는 만큼만 적으면 됩니다. 빈칸은 AI가 물어보거나 알아서 정합니다. `*` 는 꼭 적어 주세요.',
    '다 적은 뒤 이 글을 통째로 AI에게 주고 "이 설계서로 게임 데이터를 만들어 줘"라고 하세요. (`ai/AI_지침.md`, `ai/데이터_형식.md` 도 함께 주세요)',
    '만들기 도우미(`maker.html`)를 쓰면 이 양식을 화면에서 채울 수 있습니다.', '',
    ...form.설계서.flatMap((f) => ['## ' + f.이름 + (f.필수 ? ' *' : ''), '', (f.도움말 || '') + (f.보기 ? ' (' + f.보기.join(' / ') + ')' : ''), '',
      ...(f.예시 ? ['> 예시:', ...String(f.예시).split('\n').map((l) => '> ' + l), ''] : []), '(여기에 적기)', ''])].join('\n');
  writeFileSync(path.join(root, 'ai/수업_설계서.md'), sheet);
  console.log('만들었어요: engine/bundle.js, ai/guide.js, ai/수업_설계서.md');
  if (process.argv.includes('--html')) {
    const { exportHtml } = require(path.join(root, 'engine/js/export.js'));
    // 다른 폴더의 게임을 묶으려면: node tools/build.mjs --html --game=examples/daedong-map
    const game = path.join(root, (process.argv.find((a) => a.startsWith('--game=')) || '--game=my-game').slice(7));
    const data = loadGame(game);
    const images = embedFiles(path.join(game, 'images'), { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml' });
    const audio = embedFiles(path.join(game, 'audio'), { mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4' });
    const html = exportHtml({ bundle: makeBundle(), data, images, audio });
    mkdirSync(path.join(root, 'dist'), { recursive: true });
    const name = (String((data.게임 || {}).아이디 || '').replace(/[^A-Za-z0-9_-]+/g, '') || 'my-game') + '.html';
    writeFileSync(path.join(root, 'dist', name), html);
    console.log('만들었어요: dist/' + name + ' (' + (html.length / 1024 / 1024).toFixed(2) + 'MB, 그림 ' + Object.keys(images).length + '개, 소리 ' + Object.keys(audio).length + '개)');
  }
}
