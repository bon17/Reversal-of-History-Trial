// 처음 화면, 화 고르기, 이어하기, 설정, 여러 안내 화면, 시작
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;
  const ov = $('#overlay');
  const params = new URLSearchParams(location.search);
  const flag = (k) => params.has(k) || location.hash.includes(k) || (window.KIT_FLAGS || []).includes(k);

  const epByNo = (n) => G.episodes().find((e) => e.번호 === n);
  const epLabel = (e) => '제' + e.번호 + '화 「' + e.제목 + '」';
  function openScreen(el) { ov.append(el); return el; }
  // 누르면 닫히는 화면. 자동으로 돌려 볼 때(G.auto)는 바로 넘어간다
  const tapToClose = (make) => new Promise((resolve) => {
    if (G.auto) { resolve(); return; }
    const shownAt = performance.now();
    const s = openScreen(make(() => { if (performance.now() - shownAt < 500) return; s.remove(); resolve(); }));
  });
  const boldHtml = (t) => G.mdBold(t).replace(/<b>/g, '<span class="hl">').replace(/<\/b>/g, '</span>');

  // ─────────── 전체 화면 ───────────
  const fsEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  function toggleFullscreen() {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else { const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (r && r.catch) r.catch(() => {}); }
  }

  // ─────────── 안내 화면들 ───────────
  G.screens = {
    // 화 제목
    episodeTitle: () => tapToClose((close) => h('div', { class: 'screen solid episode-title', onclick: close },
      h('div', { class: 'inner' }, G.episodes().length > 1 ? h('div', { class: 'no' }, '제' + G.ep.번호 + '화') : null, h('div', { class: 'ttl' }, G.ep.제목), h('div', { class: 'tap' }, '화면을 눌러 시작')))),
    // 부제목 화면: 마지막 줄을 크게, 앞줄은 작게
    partTitle: (lines) => tapToClose((close) => h('div', { class: 'screen solid episode-title', onclick: close },
      h('div', { class: 'inner' }, lines.map((t, i) => h('div', { class: i === lines.length - 1 ? 'ttl' : 'no' }, String(t).replace(/\*\*/g, '')))))),
    // 신뢰도 0 → 재판 연기
    trialPostponed: () => new Promise((resolve) => {
      if (G.auto) { resolve(); return; }
      G.audio.bgm('멈춤');
      const s = openScreen(h('div', { class: 'screen solid episode-title' },
        h('div', { class: 'inner' }, h('div', { class: 'ttl' }, G.cfg.말.재판연기), h('div', { class: 'no' }, G.cfg.신뢰도.이름 + '가 모두 떨어졌어요. 증거를 다시 살펴보고 도전해요.'),
          h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: () => { s.remove(); resolve(); } }, '이 장면부터 다시 하기')))));
    }),
    // 기록 카드: 실제 사실, 교과 지식 정리 등 읽을거리 한 장 { 제목, 문단: [...], 출처 }
    infoCard: (card) => new Promise((resolve) => {
      if (G.auto) { resolve(); return; }
      const panel = h('div', { class: 'panel' }, h('h2', {}, card.제목 || ''));
      G.list(card.문단 || card.글).forEach((t) => { const p = h('p'); p.innerHTML = boldHtml(t); panel.append(p); });
      if (card.출처) panel.append(h('p', { class: 'src' }, '출처: ' + card.출처));
      panel.append(h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: () => { s.remove(); resolve(); } }, '계속')));
      const s = openScreen(h('div', { class: 'screen info-card' }, panel));
    }),
    // 표 화면: { 제목, 머리: [칸, …], 줄: [[칸, …], …] }
    table: (spec) => new Promise((resolve) => {
      if (G.auto) { resolve(); return; }
      const cell = (tag, t) => { const c = h(tag); c.innerHTML = boldHtml(t); return c; };
      const tbl = h('table', {},
        h('thead', {}, h('tr', {}, G.list(spec.머리).map((t) => cell('th', t)))),
        h('tbody', {}, G.list(spec.줄).map((r) => h('tr', {}, G.list(r).map((t, k) => cell(k === 0 ? 'th' : 'td', t))))));
      const s = openScreen(h('div', { class: 'screen table-screen' },
        h('div', { class: 'panel' }, spec.제목 ? h('h2', {}, spec.제목) : null, h('div', { class: 'tbl-wrap' }, tbl),
          h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: () => { s.remove(); resolve(); } }, '계속')))));
    }),
    // 연표: { 제목, 줄: [[때, 일], …], 강조: [줄 번호, …] } 때와 일을 차례로 보여 준다
    timeline: (spec) => new Promise((resolve) => {
      if (G.auto) { resolve(); return; }
      const strong = G.list(spec.강조);
      const rows = G.list(spec.줄).map((r, i) => {
        const [when, what] = Array.isArray(r) ? r : [r.때, r.일];
        const d = h('div', { class: 'tl-row' + (strong.includes(i + 1) || (r && r.강조) ? ' strong' : '') }, h('b', {}, when));
        const t = h('span'); t.innerHTML = boldHtml(what || ''); d.append(t);
        return d;
      });
      const s = openScreen(h('div', { class: 'screen timeline' },
        h('div', { class: 'panel' }, spec.제목 ? h('h2', {}, spec.제목) : null, h('div', { class: 'tl' }, rows), spec.출처 ? h('p', { class: 'src' }, '출처: ' + spec.출처) : null,
          h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: () => { s.remove(); resolve(); } }, '계속')))));
    }),
    // 다음 화 예고 → 다음 화가 있으면 [다음 화 시작]
    nextEpisode: (title) => new Promise((resolve) => {
      G.store.clear();
      if (G.auto) { resolve(); return; }
      const next = epByNo(G.ep.번호 + 1);
      openScreen(h('div', { class: 'screen solid episode-title' },
        h('div', { class: 'inner' }, h('div', { class: 'no' }, '다음 이야기'), h('div', { class: 'ttl' }, typeof title === 'string' ? title : next ? epLabel(next) : ''),
          h('div', { class: 'row' },
            next ? h('button', { class: 'ui-btn', onclick: () => { ov.innerHTML = ''; G.audio.bgm('멈춤'); G.ep = next; setTimeout(() => G.startGame({ 막: 0, 명령: 0 }), 0); } }, epLabel(next) + ' 시작') : null,
            h('button', { class: 'ui-btn sub', onclick: () => location.reload() }, '처음 화면으로')))));
    }),
    // 끝 화면
    ending: (text) => new Promise((resolve) => {
      if (G.auto) { resolve(); return; }
      G.audio.bgm('멈춤');
      const lines = G.list(typeof text === 'string' || Array.isArray(text) ? text : null);
      openScreen(h('div', { class: 'screen solid episode-title' },
        h('div', { class: 'inner' }, h('div', { class: 'ttl' }, '끝'), lines.map((t) => { const d = h('div', { class: 'no' }); d.innerHTML = boldHtml(t); return d; }),
          h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: () => location.reload() }, '처음 화면으로')))));
    }),
  };

  // 확인 창
  function ask(message, yes) {
    return new Promise((resolve) => {
      const s = openScreen(h('div', { class: 'screen' },
        h('div', { class: 'panel' }, h('p', { style: 'text-align:center' }, message),
          h('div', { class: 'row' }, h('button', { class: 'ui-btn sub', onclick: () => { s.remove(); resolve(false); } }, '아니요'), h('button', { class: 'ui-btn', onclick: () => { s.remove(); resolve(true); } }, yes)))));
    });
  }
  G.ask = ask;

  // ─────────── 화 고르기 / 코드 입력 ───────────
  const norm = (t) => String(t || '').replace(/[\s「」『』"'.,!?·]/g, '');
  function startFrom(ep, from) { ov.innerHTML = ''; G.ep = ep; G.startGame(from); }

  function episodeScreen() {
    const cleared = G.store.cleared();
    const list = h('div', { class: 'ep-list' });
    G.episodes().forEach((e, i, all) => {
      const locked = G.cfg.화선택 === '순서' && i > 0 && !cleared.includes(all[i - 1].번호);
      list.append(h('button', { class: 'ui-btn', disabled: locked ? '' : null, onclick: () => startFrom(e, { 막: 0, 명령: 0 }) },
        epLabel(e) + (cleared.includes(e.번호) ? '  ✓' : locked ? '  🔒' : '')));
    });
    const s = openScreen(h('div', { class: 'screen' }, h('div', { class: 'panel' }, h('h2', {}, '이야기 고르기'), list,
      h('div', { class: 'row' }, h('button', { class: 'ui-btn sub', onclick: () => s.remove() }, '닫기')))));
  }
  function codeScreen() {
    const input = h('input', { class: 'text', type: 'text', autocomplete: 'off', maxlength: '30', placeholder: '선생님이 알려 준 코드', 'aria-label': '코드' });
    const msg = h('div', { class: 'msg' });
    const go = () => {
      const v = norm(input.value);
      const ep = v && G.episodes().find((e) => e.코드 && norm(e.코드) === v);
      if (!ep) { msg.textContent = '코드가 맞지 않아요. 다시 확인해 주세요.'; input.select(); return; }
      startFrom(ep, { 막: 0, 명령: 0 });
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    const s = openScreen(h('div', { class: 'screen' }, h('div', { class: 'panel' }, h('h2', {}, '코드 입력'),
      h('p', { style: 'text-align:center' }, '코드를 넣으면 그 이야기의 처음부터 시작해요.'), input, msg,
      h('div', { class: 'row' }, h('button', { class: 'ui-btn sub', onclick: () => s.remove() }, '취소'), h('button', { class: 'ui-btn', onclick: go }, '시작하기')))));
    setTimeout(() => input.focus(), 50);
  }
  // 교사용: 장면을 골라 그 자리부터 시작한다 (주소 끝에 ?teacher 를 붙이면 처음 화면에 나온다)
  function teacherScreen() {
    const list = h('div', { class: 'ep-list' });
    for (const e of G.episodes()) {
      list.append(h('div', { class: 'ep-head' }, epLabel(e)));
      // 사실 확인 목록: 이야기에 쓴 사실 가운데 선생님이 확인할 것 (화 데이터의 사실확인)
      if (G.list(e.사실확인).length) list.append(h('details', { class: 'facts' }, h('summary', {}, '사실 확인 목록 (' + G.list(e.사실확인).length + ')'), ...G.list(e.사실확인).map((t) => h('p', {}, '□ ' + t))));
      e.막.forEach((act, a) => G.list(act.내용).forEach((c, i) => {
        if (c && c.구간 != null) list.append(h('button', { class: 'ui-btn sub', onclick: () => startFrom(e, { 막: a, 명령: i }) }, (act.이름 ? act.이름 + ' · ' : '') + c.구간));
      }));
    }
    const s = openScreen(h('div', { class: 'screen' }, h('div', { class: 'panel' }, h('h2', {}, '교사용: 장면 골라 시작'),
      h('p', { style: 'text-align:center' }, '그 장면까지 얻었을 증거를 가진 채로 시작해요.'), list,
      h('div', { class: 'row' }, h('button', { class: 'ui-btn sub', onclick: () => s.remove() }, '닫기')))));
  }

  // ─────────── 설정 ───────────
  function settingsScreen() {
    const seg = h('div', { class: 'seg' });
    const drawSeg = () => {
      seg.innerHTML = '';
      ['보통', '빠름', '즉시'].forEach((sp) => seg.append(h('button', { class: 'ui-btn' + (G.settings.speed === sp ? ' on' : ''), onclick: () => { G.settings.speed = sp; G.saveSettings(); drawSeg(); } }, sp)));
    };
    drawSeg();
    const slider = (key, onchange) => {
      const r = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(G.settings[key]) });
      r.addEventListener('input', () => { G.settings[key] = +r.value; G.saveSettings(); onchange && onchange(); });
      return r;
    };
    const close = () => { s.remove(); G.closeTopOverlay = null; };
    G.closeTopOverlay = close;
    const s = openScreen(h('div', { class: 'screen', onclick: (e) => { if (e.target === s) close(); } },
      h('div', { class: 'panel' }, h('h2', {}, '설정'),
        G.play.running ? h('p', { style: 'text-align:center' }, '지금: ' + epLabel(G.ep)) : null,
        h('label', {}, '글자 나오는 속도'), seg,
        h('label', {}, '음악 크기'), slider('bgm', () => G.audio.refreshVolume()),
        h('label', {}, '효과음 크기'), slider('se'),
        h('div', { class: 'row' },
          h('button', { class: 'ui-btn sub', onclick: logScreen }, '지난 대사 보기'),
          h('button', { class: 'ui-btn sub', onclick: async () => { if (await ask('처음 화면으로 갈까요? 진행은 저장되어 있어서 [이어하기]로 돌아올 수 있어요.', '처음 화면으로')) location.reload(); } }, '처음 화면으로')),
        h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: close }, '닫기')),
        h('p', { class: 'credit' }, G.KIT.이름 + ' ' + G.KIT.판))));
  }
  function logScreen() {
    const lines = h('div', { class: 'lines' });
    G.log.forEach((l) => {
      const d = h('div', { class: 'line' }, l.이름 ? h('b', {}, l.이름) : null);
      d.append(document.createTextNode(String(l.글).replace(/\*\*/g, '').replace(/[〔〕]/g, '')));
      lines.append(d);
    });
    const s = openScreen(h('div', { class: 'screen log' }, h('div', { class: 'panel' }, h('h2', {}, '지난 대사'), lines,
      h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: () => s.remove() }, '닫기')))));
    setTimeout(() => { lines.scrollTop = lines.scrollHeight; }, 0);
  }

  // 점검 결과 창: 데이터에 문제가 있으면 처음 화면에서 알려 준다 (학생에게 주기 전에 고친다)
  function issuesScreen(issues) {
    const list = h('div', { class: 'lines' });
    issues.forEach((it) => list.append(h('div', { class: 'line issue ' + (it.수준 === '오류' ? 'err' : 'warn') }, h('b', {}, it.수준 + ' · ' + it.곳), it.글, it.도움 ? h('small', {}, ' → ' + it.도움) : null)));
    const text = issues.map((it) => '[' + it.수준 + '] ' + it.곳 + ': ' + it.글 + (it.도움 ? ' → ' + it.도움 : '')).join('\n');
    const copy = h('button', { class: 'ui-btn sub', onclick: async () => { try { await navigator.clipboard.writeText('내 게임 데이터를 점검했더니 아래 문제가 나왔어. 고친 파일 전체를 다시 써 줘.\n\n' + text); copy.textContent = '복사했어요!'; } catch (e) { copy.textContent = '복사하지 못했어요'; } } }, 'AI에게 보낼 글 복사');
    const s = openScreen(h('div', { class: 'screen log' }, h('div', { class: 'panel' }, h('h2', {}, '데이터 점검 결과'), list,
      h('div', { class: 'row' }, copy, h('button', { class: 'ui-btn', onclick: () => s.remove() }, '닫기')))));
  }

  // ─────────── 처음 화면 ───────────
  async function titleScreen(issues) {
    const eps = G.episodes();
    const saved = G.store.load();
    const savedEp = saved && epByNo(saved.화);
    const canResume = !!(savedEp && savedEp.막[saved.막]);
    const menu = h('div', { class: 'menu' });
    const C = G.cfg;
    const s = openScreen(h('div', { class: 'screen title-screen' },
      G.imgEl(C.처음화면그림 || C.법정자리['전경'].배경, 'art cover'),
      h('div', { class: 'logo' }, C.부제 ? h('small', {}, C.부제) : null, h('h1', {}, C.제목)),
      menu,
      h('div', { class: 'foot' }, C.만든이 ? '만든이: ' + C.만든이 : ''),
      h('div', { class: 'corner' }, h('button', { class: 'round-btn', 'aria-label': '전체 화면', onclick: toggleFullscreen, hidden: !fsEnabled }, '⛶'))));

    const multi = eps.length > 1;
    menu.append(h('button', { class: 'ui-btn', onclick: async () => {
      if (canResume && !(await ask('처음부터 시작하면 저장된 진행이 지워져요. 처음부터 할까요?', '처음부터 하기'))) return;
      G.store.clear();
      startFrom(eps[0], { 막: 0, 명령: 0 });
    } }, multi ? '처음부터 (' + epLabel(eps[0]) + ')' : '시작하기'));
    menu.append(h('button', { class: 'ui-btn', disabled: canResume ? null : '', onclick: () => startFrom(savedEp, saved) },
      canResume ? '이어하기 (' + (multi ? '제' + savedEp.번호 + '화 ' : '') + '「' + (savedEp.막[saved.막].이름 || '') + '」부터)' : '이어하기'));
    if (multi && C.화선택 !== '코드') menu.append(h('button', { class: 'ui-btn sub', onclick: episodeScreen }, '이야기 고르기'));
    if (C.화선택 === '코드' && eps.some((e) => e.코드)) menu.append(h('button', { class: 'ui-btn sub', onclick: codeScreen }, '코드 입력'));
    // 쓰기 활동만 바로 하기 (게임을 끝까지 못 한 학생, 결석한 학생)
    const writes = [];
    eps.forEach((e) => G.walk(e.막.flatMap((m) => G.list(m.내용)), (c) => { if (c.쓰기) writes.push([e, c.쓰기]); }));
    writes.forEach(([e, w]) => menu.append(h('button', { class: 'ui-btn sub', onclick: async () => { s.remove(); G.ep = e; await G.writing(w, { 바로: true }); location.reload(); } }, (w.제목 || '쓰기 활동') + '만 하기')));
    if (flag('teacher')) menu.append(h('button', { class: 'ui-btn sub', onclick: teacherScreen }, '교사용: 장면 골라 시작'));
    if (issues && issues.length) {
      const errs = issues.filter((i) => i.수준 === '오류').length;
      menu.append(h('button', { class: 'ui-btn warn', onclick: () => issuesScreen(issues) }, '⚠ 데이터 점검: ' + (errs ? '오류 ' + errs + '개' : '주의 ' + issues.length + '개')));
    }
  }

  // ─────────── 자동으로 끝까지 돌려 보기 (주소 끝에 ?auto) ───────────
  // 정답을 스스로 내면서 모든 화를 끝까지 실행해 보고, 도중에 만난 문제를 알려 준다. 만들기 도우미의 점검이 쓴다.
  async function runAuto() {
    G.auto = true; G.fast = true;
    const result = { ok: true, 문제: [], 화: [] };
    const send = () => { window.KIT_AUTO_RESULT = result; try { parent.postMessage({ kitAuto: result }, '*'); } catch (e) {} };
    try {
      for (const ep of G.episodes()) {
        G.ep = ep;
        ov.innerHTML = '';
        await Promise.race([G.startGame({ 막: 0, 명령: 0 }), new Promise((_, rej) => setTimeout(() => rej(new Error('제' + ep.번호 + '화가 20초 안에 끝나지 않았어요. 어딘가에서 멈춘 것 같아요.')), 20000))]);
        result.화.push(ep.번호);
      }
    } catch (err) { result.ok = false; result.문제.push({ 글: String((err && err.message) || err), 화: G.ep && G.ep.번호, 막: G.play.act, 명령: G.play.idx }); }
    result.문제.push(...G.problems);
    if (result.문제.length) result.ok = false;
    send();
    ov.innerHTML = '';
    openScreen(h('div', { class: 'screen solid' }, h('div', { class: 'panel' }, h('h2', {}, result.ok ? '끝까지 문제없이 실행됐어요' : '실행 중 문제가 있었어요'),
      ...result.문제.map((p) => h('p', {}, (p.화 ? '제' + p.화 + '화: ' : '') + p.글)))));
  }

  // ─────────── 시작 ───────────
  // my-game/story2.js, story3.js … 가 있으면 저절로 불러온다 (index.html 을 고치지 않아도 된다)
  function loadStories() {
    if (window.KIT_SINGLE) return Promise.resolve();
    const one = (n) => new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'my-game/story' + n + '.js';
      s.onload = s.onerror = () => resolve();
      document.head.append(s);
    });
    return Promise.all([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(one));
  }

  async function boot() {
    await loadStories();
    G.setup();
    $('#btn-record').textContent = G.cfg.버튼.기록;
    $('#btn-record').addEventListener('click', () => G.record.open());
    $('#btn-menu').addEventListener('click', (e) => { e.currentTarget.blur(); settingsScreen(); });
    $('#btn-full').addEventListener('click', (e) => { e.currentTarget.blur(); toggleFullscreen(); });
    $('#btn-full').hidden = !fsEnabled;
    $('#btn-record').hidden = true;
    G.layout();
    const eps = G.episodes();
    if (!eps.length) {
      openScreen(h('div', { class: 'screen solid' }, h('div', { class: 'panel' }, h('h2', {}, '이야기를 찾지 못했어요'),
        h('p', {}, 'my-game/story1.js 파일에 DATA.ep1 = { 번호: 1, 제목: …, 막: [ … ] } 모양의 이야기가 있어야 해요.'),
        h('p', {}, '파일이 있는데도 이 화면이 나오면 파일 안에 글자가 잘못 들어간 곳(따옴표, 쉼표, 괄호)이 있는 거예요. maker.html 의 점검에 파일 내용을 붙여 넣으면 어디가 잘못됐는지 알려 줘요.'))));
      return;
    }
    G.ep = eps[0];
    if (flag('auto')) { runAuto(); return; }
    if (flag('fast')) G.fast = true;
    let issues = [];
    try { if (G.check && !window.KIT_SINGLE) issues = G.check(DATA).filter((i) => i.수준 !== '참고'); } catch (e) { console.error(e); }
    await G.preload([G.cfg.처음화면그림 || G.cfg.법정자리['전경'].배경]);
    titleScreen(issues);
  }
  boot();
})();
