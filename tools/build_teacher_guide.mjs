// 선생님 창의 재판 공략 가이드를 만든다: docs/재판_공략_가이드.html → game/data/teacher_guide.js (암호화)
//
// - 게임 1(1~3화)용과 게임 2(4~6화)용으로 나누어, 그 게임의 화만 담은 공략 HTML을 따로 만든다.
// - 두 HTML을 비밀번호로 암호화해서 넣는다 (PBKDF2-SHA256 → AES-GCM 256, 브라우저의 Web Crypto와 같은 방식).
//   사이트와 HTML 한 파일 게임에는 암호문만 들어가므로, 소스 보기로는 정답을 볼 수 없다.
// - 비밀번호는 저장소 어디에도 적지 않는다. 만들 때만 환경 변수로 넣는다. (선생님께 받는다)
//   게임은 넣은 비밀번호를 소문자로 바꾸고 띄어쓰기를 빼고, 한글 자판으로 친 글자는 영문 자판 글자로 바꿔서 쓴다
//   (game/js/teacher.js 의 normPw). 여기서도 같은 규칙으로 바꾼 비밀번호로 암호화한다.
//
// 실행: GUIDE_PASSWORD=비밀번호 node tools/build_teacher_guide.mjs
//       공략 가이드(docs/재판_공략_가이드.html)를 고치거나 비밀번호를 바꾸면 다시 실행해서 game/data/teacher_guide.js 를 올린다.
// 확인: GUIDE_PASSWORD=비밀번호 node tools/build_teacher_guide.mjs --check  → 지금 파일이 그 비밀번호로 풀리는지만 본다
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto as crypto } from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'docs', '재판_공략_가이드.html');
const OUT = path.join(ROOT, 'game', 'data', 'teacher_guide.js');
const ITER = 250000;
const PARTS = { 1: [1, 2, 3], 2: [4, 5, 6] };
const PART_NAME = { 1: '게임 1 · 제1화~제3화', 2: '게임 2 · 제4화~제6화' };

const pw = process.env.GUIDE_PASSWORD;
if (!pw) {
  console.error('비밀번호가 없습니다. 이렇게 실행하세요: GUIDE_PASSWORD=비밀번호 node tools/build_teacher_guide.mjs');
  process.exit(1);
}
// game/js/teacher.js 의 normPw 와 같아야 한다 (영문 비밀번호는 소문자로, 띄어쓰기 없이)
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');
if (/[^\x21-\x7e]/.test(norm(pw))) {
  console.error('비밀번호는 영문 자판으로 칠 수 있는 글자(영문, 숫자, 기호)로만 정해 주세요.');
  process.exit(1);
}

const b64 = (buf) => Buffer.from(buf).toString('base64');
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
async function keyOf(salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm(pw)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

// ─────────── 확인만 ───────────
if (process.argv.includes('--check')) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(OUT, 'utf8'), ctx);
  const T = ctx.window.TEACHER_GUIDE;
  const key = await keyOf(unb64(T.salt), T.iter);
  for (const [part, p] of Object.entries(T.parts)) {
    try {
      const html = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p.iv) }, key, unb64(p.data)));
      console.log(`게임 ${part}: 풀림 (${html.length.toLocaleString()}자, ${(html.match(/<title>([^<]*)<\/title>/) || [])[1]})`);
    } catch {
      console.log(`게임 ${part}: 이 비밀번호로는 풀리지 않습니다`);
      process.exitCode = 1;
    }
  }
  process.exit();
}

// ─────────── 게임마다 공략 HTML 만들기 ───────────
const src = fs.readFileSync(SRC, 'utf8');
// 바꿔 넣기: 꼭 한 번 있어야 한다 (공략 가이드 글이 바뀌어서 못 찾으면 멈춘다)
function swap(html, from, to) {
  const n = html.split(from).length - 1;
  if (n !== 1) throw new Error(`공략 가이드에서 "${from.slice(0, 40)}"를 ${n}번 찾았습니다 (1번이어야 함). tools/build_teacher_guide.mjs 를 고쳐 주세요.`);
  return html.replace(from, () => to);
}
const m = src.match(/const EPISODES = (\[[\s\S]*?\n\]);\n/);
if (!m) throw new Error('공략 가이드에서 const EPISODES = [ … ]; 를 찾지 못했습니다.');
const EPISODES = vm.runInNewContext('(' + m[1] + ')');

// 목차 링크(#ep1)가 게임 안 창, 새 창, 저장한 파일 어디서든 이 문서 안에서만 움직이게
// (게임 안 창(iframe srcdoc)과 새 창은 주소가 게임 주소라서, #ep1 이 게임 주소로 가 버리는 것을 막는다)
const LINK_FIX = `<script>
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest('a[href^="#"]');
  const t = a && document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
  if (!t) return;
  e.preventDefault();
  t.scrollIntoView({ block: "start" });
});
</script>
`;

function partHtml(part) {
  const nos = PARTS[part];
  const eps = EPISODES.filter((e) => nos.includes(e.no));
  if (eps.length !== nos.length) throw new Error(`게임 ${part}의 화(${nos.join(', ')})가 공략 가이드에 다 있지 않습니다.`);
  const a = nos[0], z = nos[nos.length - 1];
  let html = src;
  html = swap(html, m[0], 'const EPISODES = ' + JSON.stringify(eps) + ';\n');
  html = swap(html, '<title>기억의 법정 공략집</title>', `<title>기억의 법정 공략집 (${PART_NAME[part]})</title>`);
  html = swap(html, '<h1>기억의 법정 공략집</h1>', `<h1>기억의 법정 공략집</h1>\n    <p class="eyebrow">${PART_NAME[part]}</p>`);
  html = swap(html, '1화부터 6화까지,', `${a}화부터 ${z}화까지,`);
  html = swap(html, '제1화~제6화 대본', `제${a}화~제${z}화 대본`);
  html = swap(html, 'setCurrent(location.hash.slice(1) || "ep1");', `setCurrent(location.hash.slice(1) || ${JSON.stringify(eps[0].id)});`);
  html = swap(html, '</script>\n', '</script>\n' + LINK_FIX);
  return html;
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await keyOf(salt, ITER);
const parts = {};
for (const part of Object.keys(PARTS)) {
  const html = partHtml(part);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(html));
  parts[part] = { iv: b64(iv), data: b64(data) };
  console.log(`게임 ${part}: ${PARTS[part].join('·')}화, ${html.length.toLocaleString()}자`);
}
const out = `// 선생님 창(game/js/teacher.js)의 재판 공략 가이드. 비밀번호로 암호화되어 있다. 손으로 고치지 않는다.
// 만드는 법: docs/재판_공략_가이드.html 을 고친 뒤 GUIDE_PASSWORD=비밀번호 node tools/build_teacher_guide.mjs (비밀번호는 저장소에 적지 않는다)
window.TEACHER_GUIDE = ${JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), parts })};
`;
fs.writeFileSync(OUT, out);
console.log(`${path.relative(ROOT, OUT)} 만듦 (${(out.length / 1024).toFixed(0)}KB)`);
