// 처음 화면, 이어하기 코드 입력, 이어하기, 설정, 전체 화면, 여러 안내 화면
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;
  const ov = $('#overlay');
  // 모든 화 (game/data/ep1.js, ep2.js … 를 불러온 것)
  const episodes = () => Object.values(DATA).filter((d) => d && d.막 && d.번호).sort((a, b) => a.번호 - b.번호);
  const epByNo = (n) => episodes().find((e) => e.번호 === n);
  G.ep = epByNo(1);

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
    const input = h('input', { class: 'code-input text', type: 'text', autocomplete: 'off', maxlength: '20', placeholder: '예: 두 개의 국적', 'aria-label': '이어하기 코드' });
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
      menu, loading,
      h('div', { class: 'corner' }, fullscreenButton())));

    const startBtn = h('button', { class: 'ui-btn', onclick: async () => {
      if (canResume && !(await ask('처음부터 시작하면 저장된 진행이 지워져요. 처음부터 할까요?', '처음부터 하기'))) return;
      G.store.clear();
      G.ep = epByNo(1);
      startFrom({ 막: 0, 명령: 0 });
    } }, '처음부터');
    const resumeBtn = h('button', { class: 'ui-btn', disabled: !canResume, onclick: () => { G.ep = savedEp; startFrom(saved); } },
      canResume ? '이어하기 (제' + savedEp.번호 + '화 「' + savedEp.막[saved.막].이름 + '」부터)' : '이어하기');
    const codeBtn = h('button', { class: 'ui-btn sub', onclick: codeScreen, hidden: !hasCodes() }, '이어하기 코드 입력');
    [startBtn, resumeBtn, codeBtn].forEach((b) => { b.disabled = true; menu.append(b); });

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
    startBtn.disabled = false; codeBtn.disabled = false; resumeBtn.disabled = !canResume;
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
