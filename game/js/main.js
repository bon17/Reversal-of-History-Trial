// 처음 화면, 이어하기 코드 입력, 이어하기, 설정, 전체 화면, 여러 안내 화면
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;
  const ov = $('#overlay');
  // 한 파일짜리 게임(tools/build_single_html.mjs)은 게임 1(1~3화)용과 게임 2(4~6화)용으로 나누어 만든다.
  // 그 파일에는 window.GAME_PART 가 1 또는 2로 적혀 있고, 그 게임의 화만 고를 수 있다. 사이트(index.html)는 둘 다 쓴다.
  const PART = window.GAME_PART || 0;
  const partOf = (e) => e.게임 || (e.번호 <= 3 ? 1 : 2);
  // 모든 화 (game/data/ep1.js, ep2.js … 를 불러온 것)
  const episodes = () => Object.values(DATA).filter((d) => d && d.막 && d.번호 && (!PART || partOf(d) === PART)).sort((a, b) => a.번호 - b.번호);
  const epByNo = (n) => episodes().find((e) => e.번호 === n);
  G.ep = episodes()[0];

  // 화면 전체를 덮는 창 하나를 띄우고, 닫힐 때까지 기다린다
  function openScreen(el) { ov.append(el); return el; }

  // ─────────── 전체 화면 ───────────
  const fsEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  function toggleFullscreen() {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else {
      const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      if (r && r.catch) r.catch(() => {});
    }
  }
  function fullscreenButton() {
    return h('button', { class: 'round-btn', 'aria-label': '전체 화면', onclick: toggleFullscreen, hidden: !fsEnabled }, '⛶');
  }

  // ─────────── 안내 화면들 ───────────
  G.screens = {
    // 제1화 제목
    episodeTitle() {
      return new Promise((resolve) => {
        const s = openScreen(h('div', { class: 'screen solid episode-title', onclick: () => { s.remove(); resolve(); } },
          G.imgEl('ui/title_episode_bg', 'art'),
          h('div', { class: 'inner' }, h('div', { class: 'no' }, '제' + G.ep.번호 + '화'), h('div', { class: 'ttl' }, '「' + G.ep.제목 + '」'))));
      });
    },
    // 부 제목 화면 (게임 2 타이틀, 「제2부 「평범한 사람들」」): 마지막 줄을 크게, 앞줄은 작게
    partTitle(lines) {
      return new Promise((resolve) => {
        const shownAt = performance.now();
        const text = h('div', { class: 'part-text' }, lines.map((t, i) => {
          const d = h('div', { class: i === lines.length - 1 ? 'big' : 'small' });
          d.textContent = t.replace(/\*\*/g, '');
          return d;
        }));
        const s = openScreen(h('div', { class: 'screen solid part-title', onclick: () => { if (performance.now() - shownAt < 900) return; s.remove(); resolve(); } },
          h('div', { class: 'art-frame' }, G.imgEl('ui/title_part_bg', 'art'), text)));
      });
    },
    // 지난 기록: 카드 한 장마다 피고 얼굴(색)과 진범 실루엣, 글 네 줄. [다음]으로 넘긴다
    pastRecords(cards) {
      return new Promise((resolve) => {
        let i = 0;
        const s = openScreen(h('div', { class: 'screen past-records' }));
        const draw = () => {
          const c = cards[i];
          const face = h('div', { class: 'face' });
          G.applyFace(face, c.피고[0], c.피고[1]);
          const culprits = h('div', { class: 'culprits' }, c.진범.map(([n, e]) => h('div', { class: 'sil' }, G.imgEl(G.charKey(n, e)))));
          const lines = c.글.map((t, k) => { const p = h('p', { class: k === 0 ? 'ttl' : null }); p.innerHTML = G.mdBold(t).replace(/<b>/g, '<span class="hl">').replace(/<\/b>/g, '</span>'); return p; });
          const last = i === cards.length - 1;
          const panel = h('div', { class: 'panel past-card' },
            h('div', { class: 'people' },
              h('div', { class: 'who' }, face, h('small', {}, '피고')),
              h('div', { class: 'who' }, culprits, h('small', {}, '진범'))),
            ...lines,
            h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: () => { if (last) { s.remove(); resolve(); } else { i++; draw(); } } }, last ? '계속' : '다음 기록')));
          s.innerHTML = '';
          s.append(h('div', { class: 'pc-count' }, (i + 1) + ' / ' + cards.length), panel);
        };
        const keys = [];
        cards.forEach((c) => { keys.push(G.charKey(c.피고[0], c.피고[1])); c.진범.forEach(([n, e]) => keys.push(G.charKey(n, e))); });
        G.preload(keys).then(draw);
      });
    },
    // 신뢰도 0 → 재판 연기
    trialPostponed() {
      return new Promise((resolve) => {
        G.audio.bgm('멈춤');
        const s = openScreen(h('div', { class: 'screen solid art-screen' },
          G.imgEl('ui/screen_trial_postponed', 'art'),
          h('div', { class: 'bottom' }, h('button', { class: 'ui-btn', onclick: () => { s.remove(); resolve(); } }, '이 증언부터 다시 하기'))));
      });
    },
    // 실제 역사 기록 카드
    historyCard(card) {
      return new Promise((resolve) => {
        const panel = h('div', { class: 'panel' }, h('h2', {}, card.제목));
        card.문단.forEach((t) => { const p = h('p'); p.innerHTML = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>'); panel.append(p); });
        panel.append(h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: () => { s.remove(); resolve(); } }, '계속')));
        const s = openScreen(h('div', { class: 'screen history-card' }, panel));
      });
    },
    // 다음 화 예고 → 다음 화가 만들어져 있으면 [제N화 시작], 아니면 처음 화면
    nextEpisode(title) {
      return new Promise(() => {
        G.store.clear();
        const next = epByNo(G.ep.번호 + 1);
        const startNext = () => {
          ov.innerHTML = '';
          G.audio.bgm('멈춤');
          G.ep = next;
          G.startGame({ 막: 0, 명령: 0 });
        };
        openScreen(h('div', { class: 'screen solid art-screen' },
          h('div', { class: 'art-frame' },
            G.imgEl('ui/screen_next_episode', 'art'),
            h('div', { class: 'next-title' }, title),
            h('div', { class: 'bottom' },
              next ? h('button', { class: 'ui-btn', onclick: startNext }, '제' + next.번호 + '화 시작') : null,
              h('button', { class: 'ui-btn sub', onclick: () => location.reload() }, '처음 화면으로')))));
      });
    },
  };

  // 확인 창 (브라우저 confirm 대신 게임 안의 창)
  function ask(message, yes) {
    return new Promise((resolve) => {
      const s = openScreen(h('div', { class: 'screen' },
        h('div', { class: 'panel' },
          h('p', { style: 'text-align:center' }, message),
          h('div', { class: 'row' },
            h('button', { class: 'ui-btn sub', onclick: () => { s.remove(); resolve(false); } }, '아니요'),
            h('button', { class: 'ui-btn', onclick: () => { s.remove(); resolve(true); } }, yes)))));
    });
  }

  // ─────────── 이어하기 코드 입력 ───────────
  // 화마다 코드가 하나 있다. 코드는 그 화의 제목이다 (예: 두 개의 국적). 1화는 [처음부터]로 시작하므로 코드가 없다.
  // 띄어쓰기, 따옴표, 낫표는 무시한다.
  const hasCodes = () => episodes().some((e) => e.코드);
  const norm = (t) => String(t || '').replace(/[\s「」『』"'.,!?·]/g, '');
  function codeScreen() {
    const input = h('input', { class: 'code-input text', type: 'text', autocomplete: 'off', maxlength: '20', placeholder: PART === 2 ? '예: 숨겨진 방' : '예: 두 개의 국적', 'aria-label': '이어하기 코드' });
    const msg = h('div', { class: 'msg' });
    const go = () => {
      const v = norm(input.value);
      const ep = v && episodes().find((e) => e.코드 && norm(e.코드) === v);
      if (!ep) { msg.textContent = '코드가 맞지 않아요. 다시 확인해 주세요.'; input.select(); return; }
      s.remove();
      G.ep = ep;
      startFrom({ 막: 0, 명령: 0 });
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    const s = openScreen(h('div', { class: 'screen' },
      h('div', { class: 'panel' },
        h('h2', {}, '이어하기 코드 입력'),
        h('p', { style: 'text-align:center' }, '선생님이 알려 준 코드(그 화의 제목)를 넣으면 그 화의 처음부터 시작해요.'),
        input, msg,
        h('div', { class: 'row' },
          h('button', { class: 'ui-btn sub', onclick: () => s.remove() }, '취소'),
          h('button', { class: 'ui-btn', onclick: go }, '시작하기')))));
    setTimeout(() => input.focus(), 50);
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
    const act = G.play.running ? G.ep.막[G.play.act] : null;
    const close = () => { s.remove(); G.closeTopOverlay = null; };
    G.closeTopOverlay = close;
    const s = openScreen(h('div', { class: 'screen', onclick: (e) => { if (e.target === s) close(); } },
      h('div', { class: 'panel' },
        h('h2', {}, '설정'),
        act ? h('p', { style: 'text-align:center' }, '지금: 제' + G.ep.번호 + '화 「' + G.ep.제목 + '」') : null,
        h('label', {}, '글자 나오는 속도'), seg,
        h('label', {}, '음악 크기'), slider('bgm', () => G.audio.refreshVolume()),
        h('label', {}, '효과음 크기'), slider('se'),
        h('div', { class: 'row' },
          h('button', { class: 'ui-btn sub', onclick: logScreen }, '지난 대사 보기'),
          h('button', { class: 'ui-btn sub', onclick: async () => { if (await ask('처음 화면으로 갈까요? 진행은 저장되어 있어서 [이어하기]로 돌아올 수 있어요.', '처음 화면으로')) location.reload(); } }, '처음 화면으로')),
        h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: close }, '닫기')))));
  }

  function logScreen() {
    const lines = h('div', { class: 'lines' });
    G.log.forEach((l) => {
      const d = h('div', { class: 'line' }, l.이름 ? h('b', {}, l.이름) : null);
      d.append(document.createTextNode(l.글.replace(/\*\*/g, '').replace(/[〔〕]/g, '')));
      lines.append(d);
    });
    const s = openScreen(h('div', { class: 'screen log' },
      h('div', { class: 'panel' }, h('h2', {}, '지난 대사'), lines,
        h('div', { class: 'row' }, h('button', { class: 'ui-btn', onclick: () => s.remove() }, '닫기')))));
    setTimeout(() => { lines.scrollTop = lines.scrollHeight; }, 0);
  }

  // ─────────── 처음 화면 ───────────
  function startFrom(from) {
    ov.innerHTML = '';
    G.startGame(from);
  }

  async function titleScreen() {
    const saved = G.store.load();
    const savedEp = saved && epByNo(saved.화);
    const canResume = !!(savedEp && savedEp.막[saved.막]);
    const loading = h('div', { class: 'loading' }, '그림을 불러오는 중…');
    const menu = h('div', { class: 'menu' });
    const s = openScreen(h('div', { class: 'screen title-screen' },
      G.imgEl('backgrounds/court_wide', 'art cover'),
      G.imgEl('ui/title_logo', 'logo'),
      PART ? h('div', { class: 'part-badge' }, PART === 2 ? '게임 2 · 제2부 「평범한 사람들」' : '게임 1 · 제1부 「심판받지 않은 자들」') : null,
      menu, loading,
      h('div', { class: 'corner' }, fullscreenButton())));

    const startBtn = h('button', { class: 'ui-btn', onclick: async () => {
      if (canResume && !(await ask('처음부터 시작하면 저장된 진행이 지워져요. 처음부터 할까요?', '처음부터 하기'))) return;
      G.store.clear();
      G.ep = episodes()[0];
      startFrom({ 막: 0, 명령: 0 });
    } }, '처음부터');
    const resumeBtn = h('button', { class: 'ui-btn', disabled: !canResume, onclick: () => { G.ep = savedEp; startFrom(saved); } },
      canResume ? '이어하기 (제' + savedEp.번호 + '화 「' + savedEp.막[saved.막].이름 + '」부터)' : '이어하기');
    const codeBtn = h('button', { class: 'ui-btn sub', onclick: codeScreen, hidden: !hasCodes() }, '이어하기 코드 입력');
    // 기억 노트만 바로 쓰기 (결석한 학생, 게임을 끝까지 못 한 학생). 끝나면 처음 화면으로 돌아온다
    const noteSpec = PART !== 2 && DATA.ep3 && DATA.ep3.막.flatMap((m) => m.내용).find((c) => c.기억노트);
    const noteBtn = h('button', { class: 'ui-btn sub', hidden: !noteSpec, onclick: async () => {
      s.remove();
      await G.memoryNote(noteSpec.기억노트);
      location.reload();
    } }, '기억 노트 쓰기');
    [startBtn, resumeBtn, codeBtn, noteBtn].forEach((b) => { b.disabled = true; menu.append(b); });

    // 처음에 꼭 필요한 그림을 먼저 받는다
    const first = ['ui/textbox', 'ui/window_hint', 'ui/window_tutorial', 'ui/btn_press', 'ui/btn_present', 'ui/btn_record', 'ui/btn_move', 'ui/btn_examine',
      'ui/icon_next', 'ui/icon_record_colors', 'ui/cursor_magnifier', 'ui/popup_evidence_get', 'ui/card_red', 'ui/card_blue', 'ui/card_concept',
      'ui/shout_objection', 'ui/shout_holdit', 'ui/shout_takethat', 'ui/text_testimony_start', 'ui/title_episode_bg',
      'ui/gauge_frame', 'ui/gauge_candle_on', 'ui/gauge_candle_off', 'ui/caption_source'];
    await G.preload(first, (d, n) => { loading.textContent = '그림을 불러오는 중… ' + Math.round((d / n) * 100) + '%'; });
    // 글꼴을 받은 뒤에 시작해야 대사창 쪽 나누기가 맞는다 (최대 4초 기다림)
    if (document.fonts && document.fonts.load) {
      loading.textContent = '글꼴을 불러오는 중…';
      await Promise.race([document.fonts.load('20px "RIDIBatang"', '기억의 법정').catch(() => {}), G.sleep(4000)]);
    }
    loading.textContent = '';
    startBtn.disabled = false; codeBtn.disabled = false; noteBtn.disabled = false; resumeBtn.disabled = !canResume;
  }

  // ─────────── 시작 ───────────
  function boot() {
    G.setImg($('#next-icon'), 'ui/icon_next');
    G.setImg($('#btn-record img'), 'ui/btn_record');
    G.loadImg('ui/textbox').then((url) => { if (url) $('#app').style.setProperty('--tb-img', 'url("' + new URL(url, location.href).href + '")'); });
    G.prepareGems();
    $('#btn-record').addEventListener('click', () => G.record.open());
    $('#btn-menu').addEventListener('click', settingsScreen);
    $('#btn-full').addEventListener('click', toggleFullscreen);
    $('#btn-full').hidden = !fsEnabled;
    $('#btn-record').hidden = true;
    G.layout();
    titleScreen();
  }
  boot();
})();
