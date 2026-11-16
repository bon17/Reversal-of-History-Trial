// 키트 시험:  node tools/test.cjs
// 1) 두 판의 공통 파일이 같은가  2) 예시 데이터 점검  3) AI 답 읽기(글 → 데이터)  4) 예시 게임을 끝까지 자동 실행
// 5) 만들기 도우미: 붙여 넣기 → 점검 → 내보내기 → 내보낸 파일 실행.  4, 5는 Playwright가 있을 때만 한다.
const path = require('node:path'), fs = require('node:fs'), vm = require('node:vm'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const kit = path.resolve(__dirname, '..');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  통과  ' : '  실패  ') + m); if (!c) fail++; };
const loadData = (dir) => {
  const ctx = { window: {} }; ctx.window.DATA = {}; vm.createContext(ctx);
  const text = ['settings.js', 'story1.js'].map((f) => fs.readFileSync(path.join(dir, 'my-game', f), 'utf8')).join('\n');
  vm.runInContext('var DATA = window.DATA;' + text, ctx);
  return { text, data: JSON.parse(JSON.stringify(ctx.window.DATA)) };
};

(async () => {
  console.log('두 판 맞춤');
  try { execFileSync('node', [path.join(kit, 'tools/sync.mjs'), '--check'], { stdio: 'pipe' }); ok(true, '공통 파일이 같다'); } catch (e) { ok(false, '공통 파일이 다르다 → node tools/sync.mjs'); }

  globalThis.KIT_DEFAULTS = require(path.join(kit, 'general/engine/js/defaults.js'));
  const check = require(path.join(kit, 'general/engine/js/check.js'));
  const { parse, stringify } = require(path.join(kit, 'general/engine/js/parse.js'));
  for (const ed of ['general', 'history']) {
    console.log(ed + ': 데이터');
    const { text, data } = loadData(path.join(kit, ed));
    const issues = check(data).filter((i) => i.수준 !== '참고');
    ok(!issues.length, '예시 데이터에 오류와 주의가 없다' + (issues.length ? ' → ' + issues[0].곳 + ': ' + issues[0].글 : ''));
    const r = parse('네, 만들었어요!\n```js\n' + text + '\n```\n확인해 보세요.');
    ok(!r.errors.length && JSON.stringify(r.data) === JSON.stringify(data), '채팅에서 복사한 글을 읽으면 같은 데이터가 된다');
    ok(JSON.stringify(parse(stringify(data).all).data) === JSON.stringify(data), '데이터를 글로 바꿨다가 다시 읽어도 같다');
    const cut = parse(text.slice(0, Math.floor(text.length * 0.6)));
    ok(cut.errors.length === 1 && /끊긴/.test(cut.errors[0].도움), '끊긴 글은 끊겼다고 알려 준다');
    const bad = JSON.parse(JSON.stringify(data));
    bad.ep1.막[0].내용.push({ 대사: '말하는 사람이 없는 대사' }, { 말: '없는사람', 대사: '안녕' }, { 표정: '미소', 말: Object.keys(data.게임.인물)[1], 대사: '순서가 바뀐 명령' }, { 증거획득: 'no_such' });
    const bi = check(bad);
    ok(bi.some((i) => i.수준 === '오류' && /no_such/.test(i.글)) && bi.some((i) => /말하는 사람이 없/.test(i.도움)) && bi.some((i) => /없는사람/.test(i.글)) && !bi.some((i) => /모르는 명령이에요: '표정'/.test(i.글)), '틀린 데이터의 문제를 찾아낸다');
    const guide = fs.readFileSync(path.join(kit, ed, 'ai/guide.js'), 'utf8');
    ok(guide.includes(JSON.stringify(fs.readFileSync(path.join(kit, ed, 'ai/AI_지침.md'), 'utf8')).slice(1, 200)), 'ai/guide.js 가 지금 지침으로 만들어져 있다');
  }

  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { console.log('Playwright가 없어서 브라우저 시험은 건너뜁니다.'); }
  if (chromium) {
    const b = await chromium.launch();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-test-'));
    for (const ed of ['general', 'history']) {
      console.log(ed + ': 브라우저');
      const dir = path.join(kit, ed);
      const ctx = await b.newContext({ viewport: { width: 1100, height: 800 }, acceptDownloads: true });
      const errs = [];
      const watch = (p) => p.on('pageerror', (e) => errs.push(e.message));
      const g = await ctx.newPage(); watch(g);
      await g.goto('file://' + path.join(dir, 'index.html') + '?auto');
      const res = await g.waitForFunction(() => window.KIT_AUTO_RESULT, null, { timeout: 60000 }).then((h) => h.jsonValue()).catch(() => null);
      ok(res && res.ok, '예시 게임이 끝까지 자동 실행된다' + (res && !res.ok ? ' → ' + JSON.stringify(res.문제[0]) : ''));
      const m = await ctx.newPage(); watch(m);
      await m.goto('file://' + path.join(dir, 'maker.html'));
      await m.click('#btn-example'); await m.click('#btn-prompt');
      const prompt = await m.inputValue('#prompt');
      ok(/AI 지침/.test(prompt) && /데이터 형식/.test(prompt) && /수업 설계서/.test(prompt) && (ed !== 'history' || /역사 수업용 추가 지침/.test(prompt)), '만들기 도우미가 AI에게 줄 글을 만든다 (' + prompt.length + '자)');
      await m.fill('#paste', loadData(dir).text);
      await m.click('#btn-check');
      await m.waitForFunction(() => /끝까지 실행됐어요|실행 중 문제|읽지 못했어요/.test(document.querySelector('#result').textContent), null, { timeout: 60000 }).catch(() => {});
      ok(/끝까지 실행됐어요/.test(await m.textContent('#result')), '만들기 도우미의 점검과 자동 실행을 통과한다');
      const [dl] = await Promise.all([m.waitForEvent('download'), m.click('#btn-export')]);
      const file = path.join(tmp, ed + '.html');
      await dl.saveAs(file);
      const x = await ctx.newPage(); watch(x);
      await x.goto('file://' + file + '#auto');
      const res2 = await x.waitForFunction(() => window.KIT_AUTO_RESULT, null, { timeout: 60000 }).then((h) => h.jsonValue()).catch(() => null);
      ok(res2 && res2.ok, '내보낸 게임 파일 하나(' + Math.round(fs.statSync(file).size / 1024) + 'KB)가 끝까지 실행된다');
      ok(!errs.length, '화면 오류가 없다' + (errs.length ? ' → ' + errs[0] : ''));
      await ctx.close();
    }
    // 역사판: 기본 예시(원작 제1화)의 그림이 모두 있는가, 짧은 예시를 ?game= 으로 열어 끝까지 실행
    console.log('history: 원작 제1화 그림, 짧은 예시');
    const e = await b.newPage();
    const eerrs = []; e.on('pageerror', (x) => eerrs.push(x.message));
    await e.goto('file://' + path.join(kit, 'history/index.html') + '?auto');
    await e.waitForFunction(() => window.KIT_AUTO_RESULT, null, { timeout: 90000 }).catch(() => {});
    const miss = await e.evaluate(() => [...G.missing].filter((k) => !/^evidence\/(mobilization_law|hashima_photo)$/.test(k)));
    ok(!miss.length, '원작 제1화의 그림이 모두 있다' + (miss.length ? ' → 없음: ' + miss.join(', ') : ''));
    const ex = 'examples/daedong-map';
    const exIssues = (() => { const ctx = { window: {} }; ctx.window.DATA = {}; vm.createContext(ctx); for (const f of ['settings.js', 'story1.js']) vm.runInContext('var DATA = window.DATA;' + fs.readFileSync(path.join(kit, 'history', ex, f), 'utf8'), ctx); return check(JSON.parse(JSON.stringify(ctx.window.DATA))).filter((i) => i.수준 !== '참고'); })();
    ok(!exIssues.length, '짧은 예시 데이터에 오류와 주의가 없다' + (exIssues.length ? ' → ' + exIssues[0].글 : ''));
    await e.goto('file://' + path.join(kit, 'history/index.html') + '?game=' + ex + '&auto');
    const res3 = await e.waitForFunction(() => window.KIT_AUTO_RESULT, null, { timeout: 90000 }).then((h) => h.jsonValue()).catch(() => null);
    ok(res3 && res3.ok && !eerrs.length, '짧은 예시가 끝까지 자동 실행된다' + (res3 && !res3.ok ? ' → ' + JSON.stringify(res3.문제[0]) : ''));
    await b.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(fail ? '\n실패 ' + fail + '개' : '\n모두 통과');
  process.exit(fail ? 1 : 0);
})();
