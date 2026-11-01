// 자동 시험: 브라우저(Playwright)로 게임을 실제 화면의 버튼을 눌러 끝까지 진행한다.
// 정답은 게임 데이터와 진행 상태(G.play.cx, G.play.tm, G.play.ct)에서 찾는다. 대사는 글자를 한 번에 띄우고, 기다리는 시간은 줄인다.
// 중요한 장면마다 화면을 찍고, 콘솔 경고·오류, 힌트, 신뢰도 감소, 재판 연기를 모아 보여 준다.
//
// 실행: node tools/playtest.mjs --from 4 --to 6 [--out 폴더] [--probe] [--fast 8] [--portrait]
//   --from N : N화부터 시작 (4화의 "다음 화 예고"에서 [제5화 시작]을 눌러 이어 간다)
//   --to N   : N화가 끝나면 멈춘다
//   --probe  : 6화의 증언·반격에서 처음 한 번씩 일부러 틀린 증거(🟥 기록: 벌칙 없음)를 두 번 내서 힌트를 보고,
//              아직 차례가 아닌 정답도 내 본다 (벌칙 없이 힌트가 나와야 한다)
//   --fast N : 기다리는 시간을 1/N로 줄인다 (기본 8)
//   --html 파일 : index.html 대신 HTML 한 파일(dist/…게임2.html)을 시험한다
//   --rebuttal : 처음 화면의 [친구에게 답장하기]로 반박문 쓰기만 해 본다
//   (반박문 쓰기는 두 번 쓴다: 기억 노트가 있는 학생 → [짝도 쓰기] → 기억 노트가 없는 학생. 구글 시트로 가는 요청은 가짜 응답으로 가로챈다)
//   --start 막:명령 : 그 화의 이 자리부터 시작한다 (막은 0부터. 예: --from 6 --start 5:0). --fast 1 과 함께 쓰면 연출을 제 속도로 찍는다
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const FROM = +arg('--from', 6), TO = +arg('--to', FROM), FAST = +arg('--fast', 8);
const OUT = path.resolve(arg('--out', path.join(ROOT, 'dist', 'playtest')));
const PROBE = process.argv.includes('--probe');
const PORTRAIT = process.argv.includes('--portrait');
const HTML = arg('--html', null);
const [SA, SC] = String(arg('--start', '0:0')).split(':').map(Number);
const REBUTTAL_ONLY = process.argv.includes('--rebuttal');
fs.mkdirSync(OUT, { recursive: true });

// ─────────── 작은 정적 서버 ───────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = HTML && p === '/' ? path.resolve(HTML) : path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!f.startsWith(ROOT) && f !== path.resolve(HTML || '')) { res.writeHead(403); res.end(); return; }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, r));
const url = 'http://127.0.0.1:' + server.address().port + '/';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: PORTRAIT ? { width: 430, height: 900 } : { width: 1200, height: 800 } });
const logs = [];
page.on('console', (m) => { if (['warning', 'error'].includes(m.type()) && !/^Failed to load resource/.test(m.text())) logs.push('[' + m.type() + '] ' + m.text()); });
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
// 아직 없는 소리 파일과 글꼴(assets/audio/, game/fonts/)의 404는 예상된 것이라 빼고 센다
const expected404 = (u) => /^\/(assets\/audio|game\/fonts)\//.test(decodeURIComponent(new URL(u).pathname));
let quiet404 = 0;
page.on('response', (r) => { if (r.status() >= 400) { if (expected404(r.url())) quiet404++; else logs.push('[' + r.status() + '] ' + decodeURIComponent(new URL(r.url()).pathname)); } });
// 구글 시트(GAS)로 가는 요청: 실제 시트에 답이 쌓이지 않게 가짜로 답한다. 보낸 답은 모아서 끝에 보여 준다
const sheetPosts = [];
let sheetGets = 0;
await page.route(/script\.google(usercontent)?\.com/, (route) => {
  const req = route.request();
  const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
  if (req.method() === 'POST') { sheetPosts.push(req.postData()); return route.fulfill({ status: 200, headers: cors, body: '{"ok":true}' }); }
  sheetGets++;
  const body = sheetGets === 1 ? { ok: true, 선택: '맞다, 어쩔 수 없었을 것 같다', 이유: '(시험) 명령이라서' } : { ok: true, 없음: true };
  return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(body) });
});
await page.goto(url);
await page.waitForFunction(() => window.G && G.startGame && document.querySelector('.title-screen'), null, { timeout: 30000 });

// ─────────── 게임 안에서 한 걸음씩 진행하는 도우미 ───────────
await page.evaluate(({ FROM, FAST, PROBE }) => {
  try { localStorage.clear(); } catch (e) {}
  G.settings.speed = '즉시';
  G.input.HOLD = 0;
  const sl = G.sleep;
  G.sleep = (ms) => sl(Math.max(0, ms / FAST));
  const T = (window.__T = { shots: new Set(), want: null, probes: new Map(), probedCt: new WeakSet(), hints: [], penalties: 0, postponed: 0, actions: 0, ended: false, ep: FROM });
  const $ = (s, r = document) => r.querySelector(s);
  const shown = (el) => !!el && !el.hidden && el.offsetParent !== null;
  const clean = (t) => String(t || '').replace(/\*\*/g, '').replace(/[〔〕]/g, '').trim();

  // 힌트를 모은다
  const say = G.box.say.bind(G.box);
  G.box.say = (o) => { if (o.skin === 'hint') T.hints.push('제' + G.ep.번호 + '화 ' + o.이름 + ': ' + o.글); return say(o); };
  // 신뢰도 감소를 센다
  const pen = G.audio.se.bind(G.audio);
  G.audio.se = (n) => { if (n === '신뢰도 감소음') T.penalties++; return pen(n); };

  // 데이터 깊이 훑기
  const deep = (v, fn, seen = new Set()) => { if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v); fn(v); Object.values(v).forEach((x) => deep(x, fn, seen)); };

  function crossPlan() {
    const P = G.play;
    const cnt = $('#controls .count');
    const small = cnt.querySelector('small').textContent;
    const title = small.replace(/^증언 「/, '').replace(/」$/, '');
    const curId = cnt.textContent.slice(small.length).split(' / ')[0].trim();
    // 6화 문장을 하나씩 깨는 증언
    if (P.tm && P.tm.T.제목 === title) {
      const { chains, pos, ids, shown: vis, T: TT } = P.tm;
      const done = (j) => pos[j] >= chains[j].length;
      // 시험: 처음 한 번씩 틀린 증거, 아직 차례가 아닌 정답
      if (PROBE && !T.probes.has(title)) {
        const list = [{ target: ids.find((x) => vis.has(x)), ev: 'survivors_1961', probe: '틀린 🟥 기록 1' }, { target: ids.find((x) => vis.has(x)), ev: 'survivors_1961', probe: '틀린 🟥 기록 2 (힌트)' }];
        chains.forEach((c) => {
          const first = c[0];
          const later = c.slice(1).find((s) => !s.증언없이) || (first.마지막 ? first : null);
          const tg = [].concat(first.문장).map(String).find((x) => vis.has(x));
          if (later && tg) list.push({ target: tg, ev: [].concat(later.증거)[0], probe: '차례가 아닌 정답' });
          const viaNext = c.slice(1).find((s) => s.증언없이);
          if (viaNext && tg) list.push({ target: tg, ev: [].concat(viaNext.증거)[0], probe: '차례가 아닌 정답 (증언없이 단계)' });
        });
        T.probes.set(title, list);
      }
      const q = T.probes.get(title);
      if (q && q.length) { const it = q[0]; if (it.target === curId) q.shift(); return Object.assign({ action: 'present', curId }, it); } // 그 문장에 가서 낼 때 목록에서 지운다
      for (let j = 0; j < chains.length; j++) {
        if (done(j)) continue;
        const s = chains[j][pos[j]];
        if (s.증언없이) continue;
        if (pos[j] === 0 && s.마지막 && chains.some((c, jj) => jj !== j && !done(jj))) continue;
        const targets = [].concat(s.문장 != null ? s.문장 : chains[j][0].문장).map(String);
        const v = targets.filter((t) => vis.has(t));
        if (v.length) return { action: 'present', target: v[0], ev: [].concat(s.증거)[0], curId };
        const k = TT.문장.findIndex((st, i) => vis.has(ids[i]) && (st.추궁 || []).some((c) => targets.includes(String(c.증언추가))));
        if (k >= 0) return { action: 'press', target: ids[k], curId };
      }
      return { action: 'none', curId };
    }
    // 예전 방식의 증언 (단계, 확대, 수정, 추궁 정답)
    if (P.cx && P.cx.T.제목 === title) {
      const TT = P.cx.T, st = P.cx.stages[P.cx.stage()];
      if (TT.추궁정답) return { action: 'press', target: String(TT.추궁정답), curId };
      if (PROBE && G.ep.번호 === 6 && !T.probes.has(title)) {
        T.probes.set(title, [{ target: '1', ev: 'survivors_1961', probe: '틀린 🟥 기록 1' }, { target: '1', ev: 'survivors_1961', probe: '틀린 🟥 기록 2 (힌트)' }]);
      }
      const q = T.probes.get(title);
      if (q && q.length) { const it = q[0]; if (it.target === curId) q.shift(); return Object.assign({ action: 'present', curId }, it); } // 그 문장에 가서 낼 때 목록에서 지운다
      const a = st.정답[0];
      if (a.수정후 && !P.cx.revised[a.문장 - 1]) return { action: 'press', target: String(a.문장), curId };
      return { action: 'present', target: String(a.문장), ev: a.증거, zoom: a.확대후 ? st.확대 : null, curId };
    }
    return { action: 'none', curId };
  }

  function choiceIndex(labels) {
    let found = null;
    deep(G.ep.막, (v) => { if (!found && Array.isArray(v.선택지) && v.선택지.length === labels.length && v.선택지.every((o, i) => o.글 === labels[i])) found = v.선택지; });
    if (found) { const k = found.findIndex((o) => o.정답); return k < 0 ? 0 : k; }
    const k = labels.findIndex((t) => !t.includes('✓')); // 조사 장소 고르기
    return k < 0 ? 0 : k;
  }

  // 찍을 장면
  function shotReason() {
    const S = G.scene, stage = $('#stage'), ch = $('#char');
    const key = ch && !ch.hidden ? ch.dataset.key || '' : '';
    const ep = 'ep' + G.ep.번호 + '_';
    const want = [];
    if (G.ep.번호 === 6) {
      if (stage.dataset.seat === '방탄유리 부스' && key && shown($('#box'))) want.push('booth_' + key.split('/')[1]);
      if (stage.dataset.seat === '방탄유리 부스' && !key && $('#desk').dataset.key.includes('off')) want.push('booth_off');
      if (ch.classList.contains('flip') && key) want.push('flip_' + (stage.dataset.seat || stage.dataset.bg));
      if (key.includes('hitler')) want.push('hitler_' + key.split('_').pop() + ($('#scene').classList.contains('lowlight') ? '_lowlight' : ''));
      if (key.includes('david1961')) want.push('david1961');
      if (key.includes('hanna') && stage.dataset.seat === '피고석') want.push('hanna_defendant_seat');
      if (key.includes('hanna') && stage.dataset.bg === '면회실') want.push('hanna_visiting');
      if (key.includes('krause')) want.push('krause');
      const m = document.querySelectorAll('.montage .m-row.on').length;
      if (m) want.push('montage_' + G.play.section);
      if (document.querySelectorAll('.bricks .brick.on').length >= 9) want.push('bricks');
      if ($('#text .struck.half')) want.push('struck_half');
      else if ($('#text .struck')) want.push('struck_' + (G.play.tm ? G.play.tm.T.제목 : ''));
      if ($('#big .verdict-quiet')) want.push('guilty');
      if ($('.table-screen')) want.push('table');
      if ($('.drawer-cards.takeout.in')) want.push('takeout');
      if ($('#cards .card.center')) want.push('card_center_' + G.play.section);
      if (document.querySelectorAll('#cards .card').length >= 4) want.push('cards4_' + G.play.section);
      if ($('#subtitle div.on')) want.push('subtitle_' + G.play.section + '_' + clean($('#subtitle div.on').textContent).slice(0, 12));
      if ($('#closeup.on')) want.push('closeup_' + ($('#closeup img').dataset.key || '').split('/').pop());
      if ($('#subtitle .paper.on')) want.push('paper');
      if ($('.history-card')) want.push('history_' + G.play.section);
      if ($('.part-title')) want.push('part_' + G.play.section);
      if ($('.record')) want.push('record');
      if ($('#popup:not([hidden])')) want.push('popup_' + G.play.evidence.length);
      if (shown($('#controls .count'))) want.push('cross_' + $('#controls .count small').textContent);
      if (shown($('#controls .only'))) want.push('counter_' + G.play.section);
      if ($('.name-tag.on')) want.push('nametag_' + $('.name-tag b').textContent);
      if (shown($('#box.skin-hint')) || $('#box').classList.contains('skin-hint') && shown($('#box'))) want.push('hint');
      if (S.exploring) want.push('explore_' + S.exploring);
      const rb = $('.rebuttal .panel');
      if (rb) want.push('reb' + (T.reb ? T.reb.n : 0) + '_' + clean((rb.querySelector('.q') || {}).textContent || '').slice(0, 14) + (rb.querySelector('.ev-open') ? '_펼침' : '') + ($('.record') ? '_고르기' : ''));
      want.push('sec_' + G.play.section);
    } else {
      want.push('sec_' + G.ep.번호 + '_' + G.play.section);
    }
    for (const w of want) if (!T.shots.has(ep + w)) { T.shots.add(ep + w); return ep + w; }
    return null;
  }

  // 반박문 쓰기: 첫 학생은 메시지 ①(첫 증거), [짝도 쓰기] 뒤 둘째 학생은 메시지 ④(셋째 증거)
  function rebuttalStep(top) {
    const p = top.querySelector('.panel');
    const R = (T.reb = T.reb || { n: 0 });
    const by = (t) => [...p.querySelectorAll('button')].find((b) => b.textContent === t);
    const k = R.n ? 3 : 0;
    if (/불러오는 중|저장하는 중/.test(p.textContent)) return { did: 'reb-wait' };
    if (by('짝도 쓰기')) {
      if (R.n === 0) { R.n = 1; by('짝도 쓰기').click(); return { did: 'reb 짝도 쓰기' }; }
      T.ended = true;
      return { did: 'end', text: clean(p.textContent).slice(0, 160) };
    }
    const sels = p.querySelectorAll('select');
    if (sels.length) {
      sels[0].value = '2'; sels[1].value = String(7 + R.n);
      p.querySelector('input.text').value = R.n ? '시험 짝' : '시험 학생';
      by('다음').click();
      return { did: 'reb 반·번호·이름' };
    }
    const opts = p.querySelectorAll('.opts button');
    if (opts.length) { if (!p.querySelector('.opts button.on')) { opts[2].click(); return { did: 'reb 선택' }; } by('다음').click(); return { did: 'reb 다음' }; }
    const picks = p.querySelectorAll('.chat-pick');
    if (picks.length) { if (!picks[k].classList.contains('on')) { picks[k].click(); return { did: 'reb 메시지 ' + (k + 1) }; } by('다음').click(); return { did: 'reb 다음' }; }
    if (by('증거 제시하기')) { T.want = { ev: DATA.ep6.반박문.메시지[k].증거[R.n ? 2 : 0], pick: true }; by('증거 제시하기').click(); return { did: 'reb 증거 고르기' }; }
    if (p.querySelector('.ev-open') && by('다음')) { by('다음').click(); return { did: 'reb 다음' }; }
    if (by('저장하기')) { const ins = p.querySelectorAll('input.text'); ins[0].value = '(시험) 증거가 보여 주는 사실'; ins[1].value = '(시험) 내 생각'; by('저장하기').click(); return { did: 'reb 저장' }; }
    const inp = p.querySelector('input.text');
    if (inp && by('다음')) { inp.value = '(시험) 지금 이유'; by('다음').click(); return { did: 'reb 이유' }; }
    return { did: 'reb ?', text: clean(p.textContent).slice(0, 80), bad: true };
  }

  window.__step = () => {
    const P = G.play;
    T.actions++;
    const ov = $('#overlay');
    const top = ov.lastElementChild;
    const info = { ep: G.ep && G.ep.번호, sec: P.section, act: P.act };
    const shot = shotReason();
    if (shot) return Object.assign(info, { shot });
    if (top) {
      const c = top.classList;
      if (c.contains('record')) {
        const w = T.want;
        const close = top.querySelector('.rhead .close');
        if (!w) { close.click(); return Object.assign(info, { did: 'record-close(unexpected)' }); }
        const zoomEl = top.querySelector('.zoom');
        if (zoomEl) {
          const hook = P.zoomHook;
          if (w.flipping) return Object.assign(info, { did: 'wait-flip' });
          if (hook && !hook.done && w.zoom && w.zoom.면 != null) {
            w.flipping = true;
            zoomEl.querySelector('.flip-btn').click();
            setTimeout(() => { w.flipping = false; }, 1200);
            return Object.assign(info, { did: 'flip' });
          }
          [...zoomEl.querySelectorAll('.bar .ui-btn')].pop().click();
          return Object.assign(info, { did: 'zoom-close' });
        }
        const ev = G.ev[w.ev];
        if (!ev || (!w.pick && !P.evidence.includes(w.ev))) { close.click(); T.want = null; return Object.assign(info, { did: 'record-close(no evidence ' + w.ev + ')', bad: true }); }
        const nm = top.querySelector('.rname .nm');
        if (!nm || nm.textContent !== ev.이름) {
          const slot = [...top.querySelectorAll('.slot.item')].find((b) => b.getAttribute('aria-label') === ev.이름);
          if (slot) { slot.click(); return Object.assign(info, { did: 'select ' + w.ev }); }
          const tab = top.querySelector('.tabs .ui-btn:not(.on)');
          if (tab && tab.textContent.startsWith('증거')) { tab.click(); return Object.assign(info, { did: 'tab' }); }
          top.querySelector('.rstrip .arrow.next').click();
          return Object.assign(info, { did: 'page' });
        }
        if (w.zoom && !(P.zoomHook && P.zoomHook.done)) { top.querySelector('[aria-label="자세히 보기"]').click(); return Object.assign(info, { did: 'zoom-open' }); }
        top.querySelector('.rbtns [aria-label="증거 제시"]').click();
        T.want = null;
        return Object.assign(info, { did: 'present ' + w.ev + (w.probe ? ' (' + w.probe + ')' : '') });
      }
      if (c.contains('rebuttal')) return Object.assign(info, rebuttalStep(top));
      if (c.contains('episode-title')) { top.click(); return Object.assign(info, { did: 'episode-title' }); }
      if (c.contains('part-title')) { top.click(); return Object.assign(info, { did: 'part-title' }); }
      if (c.contains('history-card') || c.contains('table-screen') || c.contains('past-records')) { top.querySelector('.row .ui-btn').click(); return Object.assign(info, { did: 'continue' }); }
      if (top.querySelector('img[src]') && top.textContent.includes('이 증언부터 다시 하기')) { T.postponed++; top.querySelector('.ui-btn').click(); return Object.assign(info, { did: 'postponed', bad: true }); }
      const btns = [...top.querySelectorAll('button.ui-btn')];
      const nextEp = btns.find((b) => /^제\d+화 시작$/.test(b.textContent));
      if (btns.some((b) => b.textContent === '처음 화면으로')) {
        if (nextEp && G.ep.번호 < window.__TO) { T.ep = G.ep.번호 + 1; nextEp.click(); return Object.assign(info, { did: 'next-episode' }); }
        T.ended = true;
        return Object.assign(info, { did: 'end', text: clean(top.textContent).slice(0, 120) });
      }
      return Object.assign(info, { did: 'overlay?', text: clean(top.textContent).slice(0, 80) });
    }
    const choices = $('#choices');
    if (shown(choices) && choices.children.length) {
      const labels = [...choices.children].map((b) => b.textContent);
      const k = choiceIndex(labels);
      choices.children[k].click();
      return Object.assign(info, { did: 'choose ' + labels[k] });
    }
    const controls = $('#controls');
    if (shown(controls) && controls.children.length) {
      if (controls.querySelector('.count')) {
        const plan = crossPlan();
        if (plan.action === 'none') return Object.assign(info, { did: 'cross-none', bad: true });
        if (plan.curId !== plan.target) { controls.querySelector('.arrow.next').click(); return Object.assign(info, { did: 'next' }); }
        if (plan.action === 'press') { controls.querySelector('.press').click(); return Object.assign(info, { did: 'press ' + plan.target }); }
        T.want = { ev: plan.ev, zoom: plan.zoom, probe: plan.probe };
        controls.querySelector('.present').click();
        return Object.assign(info, { did: 'open-present @' + plan.target });
      }
      if (controls.querySelector('.only')) {
        const step = P.ct;
        if (PROBE && G.ep.번호 === 6 && !T.probedCt.has(step)) { T.probedCt.add(step); T.ctProbe = 2; }
        if (T.ctProbe > 0) { T.ctProbe--; T.want = { ev: 'survivors_1961', probe: '반격에 틀린 🟥 기록' }; }
        else T.want = { ev: [].concat(step.정답)[0] };
        controls.querySelector('.only').click();
        return Object.assign(info, { did: 'open-present (counter)' });
      }
      const spot = [...document.querySelectorAll('#hotspots .hotspot')].find((b) => !b.classList.contains('done'));
      if (spot) { spot.click(); return Object.assign(info, { did: 'hotspot ' + spot.getAttribute('aria-label') }); }
      const mv = controls.querySelector('.move');
      if (mv) { mv.click(); return Object.assign(info, { did: 'move' }); }
      return Object.assign(info, { did: 'controls?' });
    }
    // 그 밖: 대사창(또는 장면)을 눌러 넘긴다
    const box = $('#box');
    (shown(box) ? box : $('#stage')).click();
    return Object.assign(info, { did: 'tap', text: shown(box) ? clean($('#name').textContent) + ': ' + clean($('#text').textContent).slice(0, 40) : '' });
  };
  window.__TO = 0;
}, { FROM, FAST, PROBE });
await page.evaluate((TO) => { window.__TO = TO; }, TO);

// 시작
if (REBUTTAL_ONLY) {
  await page.waitForFunction(() => [...document.querySelectorAll('.title-screen button')].some((b) => b.textContent === '친구에게 답장하기' && !b.disabled), null, { timeout: 30000 });
  await page.evaluate(() => { G.ep = DATA.ep6; [...document.querySelectorAll('.title-screen button')].find((b) => b.textContent === '친구에게 답장하기').click(); });
} else {
  await page.evaluate(([ep, a, c]) => {
    document.getElementById('overlay').innerHTML = '';
    G.ep = DATA['ep' + ep];
    G.startGame({ 막: a, 명령: c });
  }, [FROM, SA, SC]);
}

const t0 = Date.now();
let last = '', same = Date.now(), shots = 0;
const trail = [], fullTrail = [];
for (let n = 0; n < 60000; n++) {
  const r = await page.evaluate(() => window.__step());
  if (r.shot) {
    await page.waitForTimeout((r.shot.includes('montage') || r.shot.includes('bricks') || r.shot.includes('subtitle') || r.shot.includes('takeout') ? 500 : 250) * (FAST <= 2 ? 3 : 1));
    await page.screenshot({ path: path.join(OUT, String(++shots).padStart(3, '0') + '_' + r.shot.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 80) + '.png') });
    continue;
  }
  trail.push(`제${r.ep}화 ${r.act}막 ${r.did}${r.text ? ' | ' + r.text : ''}`);
  if (r.did !== 'tap' || /^(힌트|알아두기)/.test(r.text || '')) fullTrail.push(trail[trail.length - 1]);
  if (trail.length > 40) trail.shift();
  if (r.bad) console.log('※', trail[trail.length - 1]);
  if (r.did === 'end') break;
  const sig = JSON.stringify([r.ep, r.act, r.sec, r.did, r.text]);
  if (sig !== last) { last = sig; same = Date.now(); }
  if (Date.now() - same > 40000) { /* 40초 동안 같은 상태 */ console.log('※ 진행이 멈춘 것 같습니다. 마지막 동작:'); trail.slice(-15).forEach((t) => console.log('   ' + t)); break; }
  await page.waitForTimeout(r.did === 'tap' ? 25 : 60);
}
const T = await page.evaluate(() => ({ hints: window.__T.hints, penalties: window.__T.penalties, postponed: window.__T.postponed, ended: window.__T.ended, ep: G.ep.번호, gauge: G.play.gauge, missing: [...G.missing] }));
await page.screenshot({ path: path.join(OUT, String(++shots).padStart(3, '0') + '_last.png') });
console.log(`\n${((Date.now() - t0) / 1000).toFixed(0)}초, 화면 ${shots}장 → ${path.relative(ROOT, OUT)}`);
console.log(T.ended ? `■ 끝까지 진행함 (마지막: 제${T.ep}화)` : `■ 끝까지 가지 못함 (제${T.ep}화)`);
console.log(`■ 신뢰도 감소 ${T.penalties}번, 재판 연기 ${T.postponed}번, 남은 신뢰도 ${T.gauge}`);
console.log(`■ 없는 그림: ${T.missing.length ? T.missing.join(', ') : '없음'}`);
console.log(`■ 힌트 ${T.hints.length}번`);
T.hints.forEach((h) => console.log('   ' + h));
if (sheetPosts.length || sheetGets) {
  console.log(`■ 구글 시트로 보낸 답 ${sheetPosts.length}건 (불러오기 ${sheetGets}번, 모두 가짜 응답으로 가로챔)`);
  sheetPosts.forEach((b) => console.log('   ' + b));
}
const uniq = [...new Set(logs)];
console.log(`■ 콘솔 경고·오류 ${uniq.length}가지 (아직 없는 소리·글꼴 파일 404 ${quiet404}번은 뺌)`);
uniq.slice(0, 40).forEach((l) => console.log('   ' + l));
if (!T.ended) { console.log('■ 마지막 동작'); trail.slice(-12).forEach((t) => console.log('   ' + t)); }
fs.writeFileSync(path.join(OUT, 'trail.txt'), fullTrail.join('\n'));
await browser.close();
server.close();
process.exitCode = T.ended && !T.postponed ? 0 : 1;
