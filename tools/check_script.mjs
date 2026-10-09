// 대본(md)과 게임 데이터(game/data/epN.js)를 비교해서 빠진 대사, 글자가 다른 대사, 대본에 없는 대사를 찾는다.
// 소리 이름, 배경 이름이 표에 있는지도 확인하고, 아직 없는 그림 목록을 따로 보여 준다.
//
// 실행: node tools/check_script.mjs          (1화)
//       node tools/check_script.mjs --ep 2   (2화)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ei = process.argv.indexOf('--ep');
const EPNO = ei > 0 ? +process.argv[ei + 1] : 1;
const scriptDir = path.join(ROOT, 'docs/대본');
const MD = path.join(scriptDir, fs.readdirSync(scriptDir).find((f) => f.startsWith('제' + EPNO + '화_')));

// ─────────── 게임 데이터 읽기 ───────────
const ctx = {};
ctx.window = ctx; // 브라우저처럼 window.DATA 가 전역 DATA 가 되게
vm.createContext(ctx);
// --data <파일> 로 다른 데이터 파일을 비교할 수도 있다 (도구 점검용)
const di = process.argv.indexOf('--data');
const dataFile = di > 0 ? path.resolve(process.argv[di + 1]) : path.join(ROOT, 'game/data/ep' + EPNO + '.js');
// 다른 화 데이터도 함께 읽는다 (4화처럼 다른 화의 증거를 빌려 오는 화가 있어서). 비교하는 화의 파일은 맨 뒤에 읽는다
const otherEps = fs.readdirSync(path.join(ROOT, 'game/data')).filter((f) => /^ep\d+\.js$/.test(f) && f !== 'ep' + EPNO + '.js').map((f) => path.join(ROOT, 'game/data', f));
for (const f of [path.join(ROOT, 'game/data/common.js'), ...otherEps, dataFile]) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const DATA = ctx.window.DATA;
const EP = DATA['ep' + EPNO];
const alias = (n) => (DATA.별칭 && DATA.별칭[n]) || n;

// ─────────── 대본 읽기 ───────────
const md = fs.readFileSync(MD, 'utf8').split('# ' + EPNO + '화 정리표')[0];
const lines = md.split('\n');
const want = []; // { 종류, 말, 표정, 글, 줄 }
let section = '';
const add = (종류, 글, 줄, 말 = null, 표정 = null) => want.push({ 종류, 글: 글.trim(), 줄, 말, 표정, 구간: section });

let i = 0;
const next = () => lines[i + 1] ?? '';
const quoteBlock = (from) => { // from 다음 줄부터 이어지는 '> ' 줄들. 읽은 줄은 건너뛴다.
  const out = [];
  let k = from + 1;
  while (k < lines.length && (lines[k].startsWith('>') || (out.length === 0 && lines[k].trim() === ''))) {
    if (lines[k].startsWith('>')) { const t = lines[k].replace(/^>\s?/, ''); if (t.trim()) out.push([t, k + 1]); }
    k++;
  }
  i = k - 1;
  return [out, k];
};
let prevSpeaker = false; // 바로 앞 줄이 대사였는지 (대사 뒤의 '> ' 인용을 찾으려고)
let afterHeading = false; // 바로 앞 줄(빈 줄 빼고)이 ## 제목이었는지. 제목 바로 아래 '> ' 글은 만드는 사람에게 주는 설명이다 (4화 게임 2 시작 화면)
for (i = 0; i < lines.length; i++) {
  // 힌트 목록의 "- (1단계) **한나** (진지): …" 는 앞머리를 떼고 보통 대사로 읽는다
  const L = lines[i].replace(/^- \(\d단계\)\s*(?=\*\*)/, '');
  let m;
  if (!L.trim()) continue;
  const wasSpeaker = prevSpeaker;
  prevSpeaker = false;
  const wasHeading = afterHeading;
  afterHeading = /^## /.test(L);
  if (wasHeading && L.startsWith('>')) { quoteBlock(i - 1); continue; }
  if ((m = L.match(/^## (.+)$/))) { section = m[1]; if (!['표기 안내', '공통 규칙', '등장인물과 표정', '이번 화의 특징', '이번 화의 원칙'].includes(section)) add('구간', section, i + 1); continue; }
  if (/^\|/.test(L) && section.startsWith('증언') ) {
    // 반대 심문 표: | 번호 | 증언 | 추궁 | 정답 증거 |
    const cells = L.split('|').slice(1, -1).map((c) => c.trim());
    if (/^\d+$/.test(cells[0])) {
      add('증언문장', cells[1], i + 1);
      const press = cells[2];
      const pm = press.match(/^\*\*(.+?):\*\*\s*(.+?)\s*\/\s*\*\*(.+?):\*\*\s*(.+)$/);
      if (pm) { add('대사', pm[2], i + 1, alias(pm[1])); add('대사', pm[4], i + 1, alias(pm[3])); }
    }
    continue;
  }
  if ((m = L.match(/^\*\*\[(증거 획득|개념 카드)\]\s*(🟥|🟦|🟩)?\s*(.+?)\*\*/))) {
    add('증거이름', m[3].trim(), i + 1);
    const [qs] = quoteBlock(i);
    qs.forEach(([t, n]) => add('증거설명', t, n));
    continue;
  }
  if (/^\*\*\[증거 갱신\]/.test(L)) { quoteBlock(i)[0].forEach(([t, n]) => add('증거설명', t.replace(/^\(내용 추가\)\s*/, ''), n)); continue; }
  if (/^\*\*\[증언 추가\]\*\*/.test(L)) { quoteBlock(i)[0].forEach(([t, n]) => add('증언문장', t.replace(/^\d+(-\d+)?\.\s*/, ''), n)); continue; }
  if (/^\*\*\[교사용 메모/.test(L)) { quoteBlock(i); continue; } // 게임 밖 자료
  // "**[튜토리얼 안내창] 조작 복습 1: 조사** (…)" 처럼 제목이 붙기도 한다
  if (/^\*\*\[튜토리얼 안내창\]/.test(L)) { quoteBlock(i)[0].forEach(([t, n]) => add('안내창', t, n)); continue; }
  if (/^\*\*\[연출\][^*]*검은 화면에 자막\*\*/.test(L)) { quoteBlock(i)[0].forEach(([t, n]) => add('자막', t, n)); continue; }
  if (/^\*\*\[증언 수정\]\*\*/.test(L)) { quoteBlock(i)[0].forEach(([t, n]) => add('증언문장', t.replace(/^\d+\.\s*/, ''), n)); continue; }
  if (/^\*\*\[다음 화 예고\]\*\*/.test(L)) { quoteBlock(i)[0].forEach(([t, n]) => add('다음화', t, n)); continue; }
  if (/^\*\*\[선택지\]\*\*/.test(L)) {
    let k = i + 1;
    while (k < lines.length && /^- ▶/.test(lines[k])) { add('선택지', lines[k].replace(/^- ▶\s*/, ''), k + 1); k++; }
    continue;
  }
  if (section === '실제 역사 기록' && L.startsWith('>')) {
    const t = L.replace(/^>\s?/, '').trim();
    if (!t) continue;
    if (/^\*\*실제 역사 기록\*\*$/.test(t)) add('기록카드', '실제 역사 기록', i + 1);
    else add('기록카드', t, i + 1);
    continue;
  }
  // 표정 없이 이름만 있는 말: (목소리), (목소리, 일본어 억양), 웨스트 대위의 기록 (자막)
  if ((m = L.match(/^\*\*([^*\[\]]+?)\*\*:\s*(.+)$/))) { add('대사', m[2], i + 1, m[1]); prevSpeaker = true; continue; }
  // 대사 바로 뒤에 따로 적힌 인용 (예: 포로들의 비밀 기록 내용)
  if (L.startsWith('>') && wasSpeaker) {
    let k = i;
    while (k < lines.length && lines[k].startsWith('>')) { const t = lines[k].replace(/^>\s?/, '').trim(); if (t) add('인용', t, k + 1); k++; }
    i = k - 1;
    continue;
  }
  // 그 밖의 '> ' 줄 (연출 뒤의 화면 글: 신문 제목, 기록 한 줄씩, 판결 문구, 1부 끝 자막, 엔딩 글, 활동 화면 안내 등)
  if (L.startsWith('>')) { const t = L.replace(/^>\s?/, '').trim(); if (t) add('자막', t, i + 1); continue; }
  if ((m = L.match(/^\*\*([^*\[\]]+?)\*\* \(([^)]+)\):\s*(.*)$/))) {
    const [, who, expr, text] = m;
    if (text.trim()) {
      // 레테의 반격 힌트는 두 단계 힌트가 한 줄에 " / (임금 반박 때) " 로 붙어 있다
      // 두 단계 힌트가 한 줄에 " / (임금 반박 때) ", " / (두 번째) " 로 붙어 있다
      const parts = text.split(/\s*\/\s*\((?:임금 반박 때|두 번째|반격 때)\)\s*/);
      parts.forEach((t) => add('대사', t, i + 1, who, expr));
      // 바로 아래 목록(1. / - )은 같은 사람의 이어지는 대사
      let k = i + 1;
      while (k < lines.length && /^(\d+\. |- )/.test(lines[k]) && !/^- \(\d단계\)/.test(lines[k])) {
        const t = lines[k].replace(/^- /, '');
        add('대사', t, k + 1, who, expr);
        k++;
      }
      i = k - 1;
    } else {
      // 이름만 있고 내용이 아래에 있는 경우: 증언(번호 목록), 인용(>) 목록, 글머리(-) 목록
      let k = i + 1;
      while (k < lines.length && (/^(\d+\. |> |- )/.test(lines[k]))) {
        if (lines[k].startsWith('>')) add('대사', lines[k].replace(/^>\s?/, ''), k + 1, who, expr);
        else if (lines[k].startsWith('- ')) add('대사', lines[k].replace(/^- /, ''), k + 1, who, expr);
        else add('증언낭독', lines[k].replace(/^\d+\.\s*/, ''), k + 1, who, expr);
        k++;
      }
      i = k - 1;
    }
    prevSpeaker = true;
  }
}

// ─────────── 게임 데이터 펼치기 ───────────
const have = [];
const put = (종류, 글, 말 = null, 표정 = null, 곳 = '') => have.push({ 종류, 글: String(글).trim(), 말, 표정, 곳 });
function walk(list, where) {
  for (const c of list || []) {
    if (!c || typeof c !== 'object') continue;
    if (c.구간) put('구간', c.구간, null, null, where);
    if (c.말 && c.대사 != null) put('대사', c.대사, c.말, c.표정 || null, where);
    if (c.안내창) c.안내창.forEach((t) => put('안내창', t, null, null, where));
    if (c.자막) c.자막.forEach((t) => put('자막', t, null, null, where));
    if (c.선택지) { c.선택지.forEach((o) => { put('선택지', o.글, null, null, where); walk(o.결과, where); }); }
    if (c.기록카드) { if (c.기록카드.제목) put('기록카드', c.기록카드.제목, null, null, where); c.기록카드.문단.forEach((t) => put('기록카드', t, null, null, where)); }
    if (c.기록글) c.기록글.forEach((t) => put('기록카드', t, null, null, where));
    if (c.숫자화면) [...c.숫자화면.줄, ...(c.숫자화면.뒤 || [])].forEach((t) => put('기록카드', t, null, null, where));
    if (Array.isArray(c.뒷모습)) c.뒷모습.forEach((b) => put('자막', b.글, null, null, where));
    if (c.기억노트) c.기억노트.안내.forEach((t) => put('자막', t, null, null, where));
    if (c.부제목) c.부제목.forEach((t) => put('자막', t, null, null, where));
    if (c.지난기록) c.지난기록.forEach((k) => k.글.forEach((t) => put('자막', t, null, null, where)));
    if (c.종이) c.종이.forEach((t) => put('자막', t, null, null, where));
    if (c.판결) put('자막', '**' + c.판결 + '**', null, null, where);
    if (c.다음화) put('다음화', c.다음화, null, null, where);
    if (c.인용) put('인용', c.인용, null, null, where);
    if (c.증언) {
      const T = c.증언;
      T.문장.forEach((st) => {
        put('증언문장', st.글, null, null, where);
        put('증언낭독', (st.낭독 || st.글).replace(/[〔〕]/g, ''), T.증인, T.표정, where);
        walk(st.추궁, where);
        if (st.수정) { put('증언문장', st.수정.글, null, null, where); walk(st.수정.뒤, where); }
        (st.추가 || []).forEach((t) => put('증언문장', t, null, null, where));
      });
      (T.보조정답 || []).forEach((a) => walk(a.장면, where));
      walk(T.증언후, where); walk(T.반대심문전, where); walk(T.정답장면, where);
      (T.단계 || []).forEach((st) => {
        walk(st.앞, where); walk(st.정답장면, where); if (st.힌트) walk([st.힌트], where);
        if (st.확대) { walk([st.확대.대사], where); (st.확대.자막 || []).forEach((t) => put('자막', t, null, null, where)); } // 5화: 뒷면을 보면 그림 아래에 띄우는 글
      });
      if (Array.isArray(T.일반오답)) walk(T.일반오답, where);
      if (Array.isArray(T.피해오답)) walk(T.피해오답, where);
      if (T.힌트) walk([T.힌트], where);
    }
    if (c.반격) {
      c.반격.단계.forEach((s) => { walk(s.앞, where); walk(s.정답장면, where); walk([s.힌트], where); (s.따로오답 || []).forEach((o) => walk(o.장면, where)); });
    }
    if (c.조사파트) {
      c.조사파트.장소.forEach((l) => { put('소제목', l.소제목, null, null, where); walk(l.도착, where); l.포인트.forEach((p) => walk(p.내용, where)); });
      walk(c.조사파트.마무리, where);
    }
  }
}
EP.막.forEach((m, a) => walk(m.내용, '제' + (a + 1) + '막'));
walk(EP.오답.일반, '오답(공통)');
walk(EP.오답.피해, '오답(공통)');
for (const ev of Object.values(EP.증거)) {
  if (ev.표시전용) continue; // 화면에만 잠깐 띄우는 카드
  if (ev.가져오기) continue; // 다른 화에서 빌려 온 증거 (그 화의 대본에서 확인한다)
  put('증거이름', ev.이름.replace(/\s*\(1938\)$/, '') === '국가 총동원법' ? '국가 총동원법 (1938)' : ev.이름);
  ev.설명.forEach((t) => put('증거설명', t));
  (ev.갱신 || []).forEach((u) => u.설명.forEach((t) => put('증거설명', t)));
}

// 구간별 대사 순서 (갈래가 없는 구간만: 증언, 반격, 조사는 순서가 대본과 다르게 배치되므로 제외)
const haveBySec = new Map();
{
  let sec = '';
  for (const m of EP.막) for (const c of m.내용) {
    if (c.구간) { sec = c.구간; haveBySec.set(sec, []); continue; }
    if (c.증언 || c.반격 || c.조사파트) { haveBySec.set(sec, null); continue; }
    if (!haveBySec.get(sec)) continue;
    const before = have.length;
    walk([c], sec);
    haveBySec.get(sec).push(...have.splice(before).filter((x) => x.종류 === '대사'));
  }
}

// ─────────── 비교 ───────────
const key = (x) => x.종류 + '|' + x.글;
const haveMap = new Map();
have.forEach((x) => { const k = key(x); if (!haveMap.has(k)) haveMap.set(k, []); haveMap.get(k).push(x); });
const wantKeys = new Set(want.map(key));

const missing = [], exprDiff = [], whoDiff = [];
for (const w of want) {
  if (w.종류 === '구간') continue;
  const list = haveMap.get(key(w));
  if (!list) {
    // 소제목(### 조사 1: …)은 md에서 ## 가 아니어서 따로 본다
    missing.push(w);
    continue;
  }
  if (w.말 && !list.some((x) => x.말 === w.말)) whoDiff.push({ w, got: list.map((x) => x.말) });
  else if (w.표정 && !list.some((x) => x.말 === w.말 && x.표정 === w.표정)) exprDiff.push({ w, got: list.filter((x) => x.말 === w.말).map((x) => x.표정) });
}
const extra = have.filter((x) => !['구간', '소제목'].includes(x.종류) && !wantKeys.has(key(x)));
// 같은 대사가 대본에 여러 번 나오는데 게임에는 그보다 적게 들어간 것
const wantCount = new Map();
want.forEach((w) => { if (w.종류 !== '구간') wantCount.set(key(w), (wantCount.get(key(w)) || 0) + 1); });
const fewer = [...wantCount].filter(([k, n]) => haveMap.has(k) && haveMap.get(k).length < n).map(([k, n]) => ({ k, n, got: haveMap.get(k).length }));

const orderDiff = [];
for (const [sec, got] of haveBySec) {
  if (!got) continue;
  const exp = want.filter((w) => w.구간 === sec && w.종류 === '대사');
  const a = exp.map((w) => w.말 + '|' + w.글), b = got.map((x) => x.말 + '|' + x.글);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    const k = a.findIndex((v, j) => v !== b[j]);
    orderDiff.push(`「${sec}」 ${k + 1}번째 대사부터 다름: 대본 "${a[k] || '(없음)'}" / 게임 "${b[k] || '(없음)'}"`);
  }
}

// 구간(## 제목) 순서
const wantSec = want.filter((w) => w.종류 === '구간').map((w) => w.글);
const haveSec = have.filter((x) => x.종류 === '구간').map((x) => x.글);
const secMissing = wantSec.filter((s) => !haveSec.includes(s));
const secOrderOk = JSON.stringify(wantSec.filter((s) => haveSec.includes(s))) === JSON.stringify(haveSec.filter((s) => wantSec.includes(s)));

// ─────────── 파일과 이름 확인 ───────────
const problems = [];
const missingImgs = new Set(); // 아직 없는 그림 (게임에서는 "그림 준비 중" 자리 그림으로 보임)
const imgExists = (key) => ['game/img/' + key + '.webp', 'assets/' + key + '.png', 'assets/' + key + '.jpg'].some((f) => fs.existsSync(path.join(ROOT, f)));
const allCmds = [];
(function collect(list) { for (const c of list || []) { if (!c || typeof c !== 'object') continue; allCmds.push(c); for (const v of Object.values(c)) { if (Array.isArray(v)) collect(v.filter((x) => x && typeof x === 'object')); else if (v && typeof v === 'object') collect([v]); } } })(EP.막.flatMap((m) => m.내용).concat(EP.오답.일반, EP.오답.피해));
const splitName = (table, full) => { if (table[full]) return full; const m = full.match(/^(.*?)\s*\(([^)]*)\)\s*$/); return m && table[m[1]] ? m[1] : null; };
for (const c of allCmds) {
  if (c.BGM && !['멈춤', '없음'].includes(c.BGM) && !splitName(DATA.소리.BGM, c.BGM)) problems.push('BGM 이름이 소리 표에 없음: ' + c.BGM);
  if (c.효과음 && c.효과음 !== '멈춤' && !splitName(DATA.소리.효과음, c.효과음)) problems.push('효과음 이름이 소리 표에 없음: ' + c.효과음);
  if (c.배경 && !DATA.배경[c.배경]) problems.push('배경 이름이 표에 없음: ' + c.배경);
  const who = c.말 || c.보이기 || c.등장 || c.증인;
  const nameOnly = (n) => /^\(.*\)$/.test(n) || /\(자막\)$/.test(n); // 그림 없이 이름만 나오는 말: (목소리), (법원 직원), … (자막)
  const people = [[who, c.표정]];
  if (c.보기) people.push([c.보기, c.보기표정]);
  for (const [w, ex] of people) {
    if (!w || nameOnly(w)) continue;
    const person = DATA.인물[w];
    if (!person) { problems.push('인물 표에 없음: ' + w); continue; }
    const e = DATA.표정[ex || '기본'];
    if (!e) problems.push('표정 이름이 표에 없음: ' + w + ' ' + ex);
    else if (!imgExists('characters/' + person.파일 + '_' + e)) missingImgs.add('characters/' + person.파일 + '_' + e);
  }
  if (c.증거획득 && !EP.증거[c.증거획득]) problems.push('증거 목록에 없음: ' + c.증거획득);
  if (c.증거갱신 && !(EP.증거[c.증거갱신] || {}).갱신) problems.push('갱신 내용이 없는 증거: ' + c.증거갱신);
  if (c.컷 && !imgExists(c.컷)) missingImgs.add(c.컷);
  if (typeof c.확대 === 'string' && !imgExists(c.확대)) missingImgs.add(c.확대); // 4화 증언 단계의 확대: { 증거, 대사 } 는 그림이 아니다
  if (c.배경 && DATA.배경[c.배경]) { const b = DATA.배경[c.배경]; if (b.그림 && !imgExists(b.그림)) missingImgs.add(b.그림); if (b.책상 && !imgExists(b.책상)) missingImgs.add(b.책상); }
  if (c.장소) c.장소.forEach((l) => {
    const b = DATA.배경[l.배경]; if (!b) problems.push('배경 이름이 표에 없음: ' + l.배경); else if (b.그림 && !imgExists(b.그림)) missingImgs.add(b.그림);
    if (l.음악 && !splitName(DATA.소리.BGM, l.음악)) problems.push('BGM 이름이 소리 표에 없음: ' + l.음악);
    if (l.환경음 && !splitName(DATA.소리.효과음, l.환경음)) problems.push('효과음 이름이 소리 표에 없음: ' + l.환경음);
  });
  if (c.음악 && !splitName(DATA.소리.BGM, c.음악)) problems.push('BGM 이름이 소리 표에 없음: ' + c.음악);
  // 4화 연출 그림과 인물
  const needImg = (k) => { if (k && !imgExists(k)) missingImgs.add(k); };
  [c.겹치기, c.사진컷].forEach(needImg);
  // 5화 연출 그림
  if (typeof c.그림 === 'string') needImg(c.그림);
  if (c.나란히겹치기) c.나란히겹치기.forEach((p) => needImg(p.그림));
  if (c.아이콘지도) { needImg(c.아이콘지도.지도); needImg(c.아이콘지도.아이콘); }
  if (c.훑어보기) needImg(c.훑어보기.그림);
  if (c.장소) c.장소.forEach((l) => { if (l.조사배경) { const b = DATA.배경[l.조사배경]; if (!b) problems.push('배경 이름이 표에 없음: ' + l.조사배경); else if (b.그림 && !imgExists(b.그림)) missingImgs.add(b.그림); } });
  if (c.지도넓히기) { needImg(c.지도넓히기.처음); needImg(c.지도넓히기.전체); }
  if (c.창문그림자) { needImg(c.창문그림자.바탕); c.창문그림자.그림자.forEach(needImg); }
  const faces = [];
  if (c.지난기록) c.지난기록.forEach((k) => { faces.push(k.피고); faces.push(...k.진범); });
  if (c.회상얼굴) faces.push(...c.회상얼굴);
  for (const [w, ex] of faces) {
    const person = DATA.인물[w];
    if (!person) { problems.push('인물 표에 없음: ' + w); continue; }
    const e = DATA.표정[ex || '기본'];
    if (!e) problems.push('표정 이름이 표에 없음: ' + w + ' ' + ex);
    else needImg('characters/' + person.파일 + '_' + e);
  }
}
for (const [id, ev] of Object.entries(EP.증거)) {
  if (ev.그림 && !imgExists(ev.그림)) missingImgs.add(ev.그림);
  if (ev.확대 && !imgExists(ev.확대)) missingImgs.add(ev.확대);
  if (ev.자세히 && !imgExists(ev.자세히)) missingImgs.add(ev.자세히);
  if (ev.겹침 && !imgExists(ev.겹침)) missingImgs.add(ev.겹침);
  if (ev.뒤집기) ev.뒤집기.그림.forEach((k) => { if (!imgExists(k)) missingImgs.add(k); });
  if (ev.가져오기 && !(DATA[ev.가져오기] || {}).증거) problems.push('빌려 올 화의 데이터를 읽지 않음: ' + id + ' → ' + ev.가져오기);
}
if (EP.지도점 && typeof EP.지도점 === 'object' && EP.지도점.겹침 && !imgExists(EP.지도점.겹침)) missingImgs.add(EP.지도점.겹침);
for (const z of Object.values(DATA.법정자리)) { if (!imgExists(z.배경)) missingImgs.add(z.배경); if (z.책상 && !imgExists(z.책상)) missingImgs.add(z.책상); }


// ─────────── 보고 ───────────
const count = (k) => want.filter((w) => w.종류 === k).length;
console.log('대본: ' + path.relative(ROOT, MD));
console.log(`대본에서 찾은 것: 대사 ${count('대사')}줄, 증언 낭독 ${count('증언낭독')}줄, 반대 심문 문장 ${count('증언문장')}줄, 증거 ${count('증거이름')}개(설명 ${count('증거설명')}줄), 안내창 ${count('안내창')}줄, 선택지 ${count('선택지')}개, 자막 ${count('자막')}줄, 기록 카드 ${count('기록카드')}줄, 구간 ${wantSec.length}개`);
console.log('');
const show = (title, arr, fmt) => { console.log(`■ ${title}: ${arr.length}`); arr.slice(0, 60).forEach((x) => console.log('   ' + fmt(x))); };
show('게임에 빠진 것', missing, (w) => `[${w.종류}] ${w.줄}줄 ${w.말 ? w.말 + (w.표정 ? ' (' + w.표정 + ')' : '') + ': ' : ''}${w.글}`);
show('말하는 사람이 다른 것', whoDiff, (d) => `${d.w.줄}줄 ${d.w.말}: ${d.w.글}  → 게임: ${d.got.join(', ')}`);
show('표정이 다른 것', exprDiff, (d) => `${d.w.줄}줄 ${d.w.말} (${d.w.표정}): ${d.w.글}  → 게임: ${d.got.join(', ')}`);
show('대본보다 적게 들어간 것', fewer, (f) => `${f.k.replace('|', '] ').replace(/^/, '[')}  (대본 ${f.n}번, 게임 ${f.got}번)`);
show('대본에 없는 글 (게임에만 있음)', extra, (x) => `[${x.종류}] ${x.곳} ${x.말 ? x.말 + ': ' : ''}${x.글}`);
show('빠진 구간(## 제목)', secMissing, (s) => s);
show('구간 안의 대사 순서가 다른 것', orderDiff, (s) => s);
console.log('■ 구간 순서: ' + (secOrderOk ? '대본과 같음' : '대본과 다름'));
// 재판장 놀람 연출: 대본의 「[연출] 재판장이 놀란다」 줄 수와 게임의 { 연출: '재판장 놀람' } 수가 같아야 한다
const judgeWant = (md.match(/\[연출\] 재판장이 놀란다/g) || []).length;
const judgeGot = (fs.readFileSync(dataFile, 'utf8').match(/연출: '재판장 놀람'/g) || []).length;
if (judgeWant !== judgeGot) problems.push(`재판장 놀람 연출: 대본 ${judgeWant}곳, 게임 ${judgeGot}곳`);
console.log('■ 재판장 놀람 연출: 대본 ' + judgeWant + '곳, 게임 ' + judgeGot + '곳');
show('소리, 이름 문제', [...new Set(problems)], (s) => s);
console.log('');
show('아직 없는 그림 (게임에서는 "그림 준비 중"으로 보임, 이 이름으로 assets/ 에 올리면 됨)', [...missingImgs].sort(), (s) => 'assets/' + s + '.png');
const bad = orderDiff.length + fewer.length + missing.length + whoDiff.length + exprDiff.length + extra.length + secMissing.length + problems.length + (secOrderOk ? 0 : 1);
console.log('');
console.log(bad ? `확인할 것이 ${bad}건 있습니다.` : '대본과 게임 데이터가 일치합니다.');
process.exitCode = bad ? 1 : 0;
