// 단독판 대본(docs/대본/단독판_평범한_사람들.md)과 게임 데이터를 비교한다.
// 단독판 대본에는 4~6화 대본에서 "바뀌는 곳"만 적혀 있다. 그래서 이렇게 본다.
//   - 새로 쓴 장면의 대사, 안내창, 자막: 단독판 데이터에 있어야 한다 (말하는 사람, 표정까지)
//   - "게임 2 | 단독판" 표의 한 줄: 단독판 글은 단독판 데이터에 있고, 게임 2 글은 단독판에는 없고 게임 2 데이터에는 있어야 한다
//   - ~~지운 줄~~: 단독판 데이터에 없어야 한다
// 4~6화 대본 자체와 게임 2 판은 tools/check_script.mjs --ep 4~6 으로 본다.
//
// 실행: node tools/check_solo.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MD = path.join(ROOT, 'docs/대본/단독판_평범한_사람들.md');

// ─────────── 데이터 읽기 (게임 2 판, 단독판) ───────────
function load(solo) {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  const files = ['common.js', ...fs.readdirSync(path.join(ROOT, 'game/data')).filter((f) => /^ep\d+\.js$/.test(f)).sort()];
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, 'game/data', f), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'game/js/edition.js'), 'utf8'), ctx);
  return ctx.applyEdition(ctx.window.DATA, solo);
}
const DATA = { game2: load(false), solo: load(true) };

// 화마다: 모든 글(문자열), 말(대사 → [말, 표정] 목록)
function index(ep) {
  const texts = [], lines = new Map();
  (function walk(v) {
    if (typeof v === 'string') { texts.push(v); return; }
    if (!v || typeof v !== 'object') return;
    if (typeof v.말 === 'string' && typeof v.대사 === 'string') {
      if (!lines.has(v.대사)) lines.set(v.대사, []);
      lines.get(v.대사).push([v.말, v.표정 || '']);
    }
    Object.values(v).forEach(walk);
  })({ 막: ep.막, 증거: ep.증거, 오답: ep.오답 });
  return { texts, lines };
}
const IDX = {};
for (const ed of ['game2', 'solo']) for (const n of [4, 5, 6]) IDX[ed + n] = index(DATA[ed]['ep' + n]);
const has = (ed, n, t) => IDX[ed + n].texts.some((x) => x === t || x.includes(t));

// ─────────── 대본 읽기 ───────────
const md = fs.readFileSync(MD, 'utf8').split('\n');
const problems = [];
let checked = 0;
let ep = 0; // 대본 기준 화 번호 (# 제4화 …). 0이면 화 밖 (안내, 시스템, 공략)
let section = '';
let afterHeading = false;
let tableHead = null;
const SPEAKER = /^\*\*([^*\[\]]+?)\*\* \(([^)]+)\):\s*(.+)$/;

function wantLine(who, expr, text, where) {
  checked++;
  const got = IDX['solo' + ep].lines.get(text);
  if (!got) { problems.push(`${where}: 단독판에 없는 대사 — ${who}: ${text}`); return; }
  if (!got.some(([w]) => w === who)) problems.push(`${where}: 말하는 사람이 다름 — 대본 ${who}, 게임 ${got.map(([w]) => w).join(', ')}: ${text}`);
  else if (expr && !got.some(([w, e]) => w === who && e === expr)) problems.push(`${where}: 표정이 다름 — ${who} 대본 (${expr}), 게임 (${got.filter(([w]) => w === who).map(([, e]) => e).join(', ')}): ${text}`);
}
function wantText(text, where) {
  checked++;
  if (!has('solo', ep, text)) problems.push(`${where}: 단독판에 없는 글 — ${text}`);
}
function cell(t) { // 표 칸: "**이름** (표정): 글" 또는 글만
  const m = t.match(SPEAKER);
  return m ? { who: m[1], expr: m[2], text: m[3] } : { text: t };
}

for (let i = 0; i < md.length; i++) {
  const L = md[i];
  const where = `${i + 1}줄`;
  let m;
  if ((m = L.match(/^# 제(\d)화/))) { ep = +m[1]; section = ''; continue; }
  if (/^# /.test(L)) { ep = 0; continue; }
  if (!ep) continue;
  const wasHeading = afterHeading;
  if (L.trim()) afterHeading = /^##+ /.test(L);
  if ((m = L.match(/^##+ (.+)$/))) { section = m[1]; tableHead = null; continue; }
  if (!L.trim()) { tableHead = null; continue; }
  // 제목 바로 아래 '> ' 글은 만드는 사람에게 주는 설명이다
  if (wasHeading && L.startsWith('>')) { while (i + 1 < md.length && md[i + 1].startsWith('>')) i++; continue; }

  // 표
  if (L.startsWith('|')) {
    const cells = L.split('|').slice(1, -1).map((c) => c.trim());
    if (!tableHead) { tableHead = cells; continue; }
    if (/^-+$/.test(cells[0].replace(/[:\s]/g, '') || '-') && cells.every((c) => /^[-:\s]*$/.test(c))) continue;
    const gi = tableHead.indexOf('게임 2'), si = tableHead.indexOf('단독판');
    if (gi < 0 || si < 0) continue; // 화 번호 표 같은 것
    const g = cell(cells[gi]), s = cell(cells[si]);
    // 말하는 사람이 앞 칸에 따로 있는 표: | 말하는 사람 | 게임 2 | 단독판 |
    const whoCol = cells.slice(0, gi).map((c) => c.match(/^\*\*([^*\[\]]+?)\*\* \(([^)]+)\)$/)).find(Boolean);
    if (whoCol) { s.who = s.who || whoCol[1]; s.expr = s.expr || whoCol[2]; }
    // 이름표 칸: **[이름표]** 하야시 (한나의 동료 기자)
    const tag = (c) => (c.text.match(/^\*\*\[이름표\]\*\*\s*\S+\s*\((.+)\)$/) || [])[1];
    const sText = tag(s) || s.text, gText = tag(g) || g.text;
    if (s.who && !tag(s)) wantLine(s.who, s.expr, sText, where); else wantText(sText, where);
    if (gText !== sText) {
      checked++;
      if (has('solo', ep, gText)) problems.push(`${where}: 단독판에 아직 남은 게임 2 글 — ${gText}`);
      if (!has('game2', ep, gText)) problems.push(`${where}: 게임 2 데이터에 없는 글 (대본 표의 왼쪽 칸 확인) — ${gText}`);
    }
    continue;
  }
  tableHead = null;

  // 지운 줄
  if ((m = L.match(/^\s*- ~~(.+)~~\s*$/))) {
    for (const part of m[1].split(' / ')) {
      const c = cell(part.trim());
      if (!c.who) continue;
      checked++;
      if (has('solo', ep, c.text)) problems.push(`${where}: 단독판에 남아 있는 지운 대사 — ${c.who}: ${c.text}`);
    }
    continue;
  }
  // 대사
  if ((m = L.match(SPEAKER))) { wantLine(m[1], m[2], m[3], where); continue; }
  // 안내창, 개념 카드, 자막 같은 '> ' 묶음
  if (L.startsWith('>')) {
    const t = L.replace(/^>\s?/, '').trim();
    if (!t) continue;
    if (/^\*\*제\d화\*\*|^\*\*제\d화 「/.test(t)) continue; // 화 제목, 다음 화 예고: 게임이 번호를 바꿔 띄운다
    const prev = md.slice(0, i).reverse().find((x) => !x.startsWith('>') && x.trim()) || '';
    if (/\[개념 카드\]/.test(prev)) continue; // 1화의 개념 카드를 빌려 온다
    wantText(t, where);
    continue;
  }
}

// ─────────── 화 번호 (화면에 보이는 번호) ───────────
const solo = DATA.solo;
const nums = [4, 5, 6].map((n) => `제${n}화 → 제${n - 3}화`).join(', ');

console.log('대본: ' + path.relative(ROOT, MD));
console.log(`비교한 곳: ${checked}곳 (화면의 화 번호: ${nums})`);
console.log('단독판 막: ' + solo.ep4.막.map((a) => a.이름).join(' / '));
console.log('');
if (problems.length) {
  console.log(`■ 확인할 것: ${problems.length}`);
  problems.forEach((p) => console.log('   ' + p));
  console.log('');
  console.log(`확인할 것이 ${problems.length}건 있습니다.`);
  process.exitCode = 1;
} else {
  console.log('단독판 대본과 게임 데이터가 일치합니다.');
}
