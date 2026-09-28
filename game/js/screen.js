// 화면: 가로/세로 배치, 장면(배경·인물·책상), 연출, 대사창, 입력
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;
  const app = $('#app'), stage = $('#stage'), hud = $('#hud'), scene = $('#scene');
  const bgEl = $('#bg'), charEl = $('#char'), deskEl = $('#desk'), cutEl = $('#cut');

  // ─────────── 배치 ───────────
  G.isPortrait = false;
  G.layout = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const portrait = vw / vh < 1.2;
    G.isPortrait = portrait;
    app.classList.toggle('port', portrait);
    app.classList.toggle('land', !portrait);
    let sw, sh, sx, sy;
    const put = (el, x, y, w, hh) => Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
    if (!portrait) {
      sw = Math.min(vw, vh * 1.5); sh = sw / 1.5;
      sx = (vw - sw) / 2; sy = (vh - sh) / 2;
      put(stage, sx, sy, sw, sh);
      put(hud, sx, sy, sw, sh);
    } else {
      sw = vw; sh = sw / 1.5;
      const minPanel = 300;
      if (vh - sh < minPanel) { sh = Math.max(vh * 0.42, vh - minPanel); sw = sh * 1.5; }
      sx = (vw - sw) / 2;
      put(stage, sx, 0, sw, sh);
      put(hud, 0, sh, vw, vh - sh);
    }
    app.style.setProperty('--u', sw / 1536 + 'px');
    // 작은 가로 화면(휴대폰 가로 등)은 대사창 글자 칸을 촘촘하게
    app.classList.toggle('tight', !portrait && sw < 900);
    app.style.setProperty('--k', portrait ? (vw >= 700 ? 0.55 : 0.42) : 0.42);
    G.box.relayout();
  };

  // ─────────── 장면 상태 ───────────
  // 이 상태만 있으면 이어하기 때 화면을 다시 그릴 수 있다.
  const S = (G.scene = { bgName: null, court: false, seat: null, offscreen: [], char: null, expr: null, trial: false });

  function isOffscreen(name) {
    const c = DATA.인물[name];
    if (!c) return true;
    const b = DATA.배경[S.bgName];
    if (b && b.그림 === null) return true; // 검은 화면에서는 아무도 서지 않는다
    if (S.court) return false;
    return !!c.화면밖 || S.offscreen.includes(name);
  }

  G.stage = {
    setBackground(name, opts = {}) {
      const b = DATA.배경[name];
      if (!b) { console.warn('[배경 이름 없음]', name); return; }
      S.bgName = name;
      stage.dataset.bg = name;
      S.court = !!b.법정;
      S.offscreen = opts.화면밖 || [];
      S.char = null; S.expr = null;
      this.hideChar(true);
      this.cut(null);
      this.hideCards();
      this.photo(null);
      this.calm(false);
      if (S.court) this.camera('전경');
      else {
        S.seat = null;
        stage.dataset.seat = '';
        G.setImg(bgEl, b.그림);
        G.setImg(deskEl, b.책상 || null);
      }
      this.blackout(b.그림 === null);
      this.rain(false);
      this.closeup(null);
      this.green(false);
      G.box.face(null);
    },
    camera(seat) {
      const z = DATA.법정자리[seat];
      S.seat = seat;
      stage.dataset.seat = seat;
      G.setImg(bgEl, z.배경);
      G.setImg(deskEl, z.책상);
    },
    // 말하는 사람을 화면에 맞게 보여 준다 (법정은 자리로 화면 전환, 화면 밖 인물은 얼굴만)
    speaker(name, expr) {
      // 이름만 있고 그림이 없는 말(목소리, 기록 자막 등)은 지금 화면을 그대로 둔다
      if (!name || !DATA.인물[name]) { G.box.face(null); return; }
      if (isOffscreen(name)) { G.box.face(name, expr); return; }
      G.box.face(null);
      this.showChar(name, expr);
    },
    showChar(name, expr, opts = {}) {
      if (S.court) {
        const seat = DATA.인물[name].자리;
        if (S.seat !== seat) this.camera(seat);
      }
      S.char = name; S.expr = expr;
      charEl.classList.remove('fade-out', 'back', 'fade-in', 'wobble');
      if (opts.fadeIn) { void charEl.offsetWidth; charEl.classList.add('fade-in'); }
      G.setImg(charEl, G.charKey(name, expr));
    },
    hideChar(instant) {
      S.char = null;
      if (instant) { charEl.hidden = true; charEl.dataset.key = ''; charEl.classList.remove('fade-out', 'back'); return; }
      charEl.classList.add('fade-out');
    },
    async exit(name, back) {
      if (back && name) {
        const key = G.charKey(name, '뒷모습');
        await G.setImg(charEl, key);
        charEl.classList.add('back');
        await G.sleep(900);
      }
      charEl.classList.add('fade-out');
      await G.sleep(700);
      this.hideChar(true);
    },
    cut(key) { G.setImg(cutEl, key); },
    shake(big) {
      scene.classList.remove('shake', 'shake-big');
      void scene.offsetWidth;
      scene.classList.add(big ? 'shake-big' : 'shake');
    },
    flash() { const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); },
    wobble() { charEl.classList.remove('wobble'); void charEl.offsetWidth; charEl.classList.add('wobble'); },
    blackout(on) { $('#black').classList.toggle('on', !!on); },
    calm(on) { scene.classList.toggle('calm', !!on); S.calm = !!on; },
    // 🟩 선택 기록 제시: 화면에 초록빛이 번진다
    green(on) { $('#greenglow').classList.toggle('on', !!on); },
    // 비 내리는 효과 (2화 오프닝)
    rain(on) { $('#rain').classList.toggle('on', !!on); },
    // 확대 화면 (흉터, 칼집 끝 등): 장면 위에 그림 한 장을 크게 띄운다
    closeup(key) {
      const c = $('#closeup');
      if (!key) { c.classList.remove('on'); c.hidden = true; return; }
      G.setImg($('img', c), key);
      c.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('on')));
    },
    dark(on) { scene.classList.toggle('dark', !!on); S.dark = !!on; },

    // 외침, 띠, 증언 개시 같은 큰 그림
    async big(key, anim, ms) {
      const img = G.imgEl(key, anim);
      img.style.animationDuration = ms + 'ms'; // 보이는 시간에 맞춰 애니메이션 길이도 맞춘다
      await G.loadImg(key);
      $('#big').append(img);
      await G.sleep(ms);
      img.remove();
    },

    // 화면 구석이나 가운데에 증거 카드 띄우기
    showCards(ids, opts = {}) {
      this.hideCards();
      const box = $('#cards');
      ids.forEach((id, i) => {
        const card = G.renderCard(id);
        card.classList.add('shown');
        if (opts.center) card.classList.add('center');
        else card.style.right = 'calc(var(--u) * ' + (24 + (ids.length - 1 - i) * 270) + ')';
        if (opts.slow) card.classList.add('slow');
        box.append(card);
      });
    },
    hideCards() { $('#cards').innerHTML = ''; },

    // 실제 사진은 늘 출처 띠와 함께 띄운다
    photo(evId) {
      const p = $('#photo');
      if (!evId) { p.classList.remove('on'); p.hidden = true; return; }
      const ev = G.ev[evId];
      G.setImg($('#photo-img'), ev.그림);
      G.setImg($('.caption-band', p), 'ui/caption_source');
      $('.caption-text', p).textContent = ev.출처 || '';
      p.hidden = false;
      p.classList.toggle('with-box', true);
      requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('on')));
    },

    // 검은 화면 자막
    async subtitle(lines) {
      G.box.hide();
      this.blackout(true);
      const sub = $('#subtitle');
      sub.innerHTML = '';
      const divs = lines.map((t) => h('div', {}, t));
      sub.append(...divs);
      for (const d of divs) { await G.sleep(250); d.classList.add('on'); await G.sleep(900); }
      await G.input.waitAdvance();
      divs.forEach((d) => d.classList.remove('on'));
      await G.sleep(700);
      sub.innerHTML = '';
    },

    gauge(show) {
      const g = $('#gauge');
      g.hidden = !show;
      if (show && !g.firstChild) {
        g.append(G.imgEl('ui/gauge_frame', 'frame'));
        // 촛대 5개의 가운데 x (1536 기준). 촛불 그림은 너비 22%, 몸통 가운데가 그림의 191/384 지점.
        [203, 486, 770, 1054, 1337].forEach((x, i) => {
          const c = G.imgEl('ui/gauge_candle_on', 'candle');
          c.style.left = ((x - 0.22 * 1536 * (191 / 384)) / 1536) * 100 + '%';
          c.dataset.i = i;
          g.append(c);
        });
      }
      if (show) this.updateGauge();
    },
    updateGauge(lostIndex) {
      document.querySelectorAll('#gauge .candle').forEach((c) => {
        const on = +c.dataset.i < G.play.gauge;
        G.setImg(c, on ? 'ui/gauge_candle_on' : 'ui/gauge_candle_off');
        c.classList.toggle('lost', +c.dataset.i === lostIndex);
      });
    },

    // 증거 획득 알림 (알림 그림 + 왼쪽 네모 안에 증거 그림)
    async evidencePopup(id, opts = {}) {
      const ev = G.ev[id];
      const pop = $('#popup');
      const green = ev.색 === '초록';
      pop.innerHTML = '';
      pop.append(G.imgEl(green ? 'ui/popup_green_get' : 'ui/popup_evidence_get', 'band'));
      const thumb = h('div', { class: 'thumb' + (ev.사진 ? ' photo' : '') + (green ? ' green' : '') });
      thumb.append(ev.그림 || ev.얼굴 ? G.cardInner(id) : h('div', { class: 'word' }, ev.이름));
      pop.append(thumb);
      // 실제 사진은 출처 표기 띠를 함께 띄운다
      if (ev.사진) pop.append(h('div', { class: 'source' }, G.imgEl('ui/caption_source', 'caption-band'), h('span', { class: 'caption-text' }, ev.출처)));
      // 증거 갱신: 알림 위에 "갱신" 도장을 찍는다
      if (opts.updated) {
        pop.append(G.imgEl('ui/stamp_updated', 'upd-stamp'));
      }
      pop.hidden = false;
      G.box.face(null);
      await G.box.say({ 이름: G.kindName(ev), 표시이름: opts.updated ? '증거 갱신' : null, 글: G.evidenceText(ev), 증거: true });
      pop.hidden = true;
      pop.innerHTML = '';
    },
  };

  // ─────────── 대사창 ───────────
  const box = $('#box'), nameEl = $('#name'), textEl = $('#text'), measure = $('#text-measure'), faceEl = $('#face'), nextIcon = $('#next-icon');
  G.log = [];

  // 대본 글자 → [{ch, cls}] (**강조**, 〔추궁 단어〕, 🟥🟦🟩 → 작은 보석 그림)
  function tokenize(text, baseCls) {
    const out = [];
    let bold = false, point = false;
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (c === '*' && chars[i + 1] === '*') { bold = !bold; i++; continue; }
      if (c === '〔') { point = true; continue; }
      if (c === '〕') { point = false; continue; }
      if (c === '🟥' || c === '🟦' || c === '🟩') { out.push({ gem: c }); continue; }
      const cls = [baseCls, bold && 'hl', point && 'pt'].filter(Boolean).join(' ');
      out.push({ ch: c, cls });
    }
    return out;
  }
  function tokHtml(tokens, a, b, hidden) {
    let html = '';
    for (let i = a; i < b; i++) {
      const t = tokens[i];
      if (t.gem) { html += '<span class="gem gem-' + GEM[t.gem] + (hidden ? ' ch' : '') + '"></span>'; continue; }
      const esc = t.ch === '<' ? '&lt;' : t.ch === '&' ? '&amp;' : t.ch === '>' ? '&gt;' : t.ch;
      if (hidden) html += '<span class="ch ' + t.cls + '">' + esc + '</span>';
      else html += t.cls ? '<span class="' + t.cls + '">' + esc + '</span>' : esc;
    }
    return html;
  }
  // 🟥🟦🟩 → icon_record_colors 한 장에서 보석 하나씩 잘라 보이는 작은 그림
  const GEM = { '🟥': 'r', '🟦': 'b', '🟩': 'g' };
  G.prepareGems = async () => {
    const url = await G.loadImg('ui/icon_record_colors');
    // CSS 변수 속 주소는 css 파일 기준으로 풀리므로 절대 주소로 바꿔 넣는다
    if (url) app.style.setProperty('--gem-img', 'url("' + new URL(url, location.href).href + '")');
  };

  // 페이지 나누기: 창에 넘치면 문장 → 쉼표 → 띄어쓰기 순서로 끊는다. 글자는 바꾸지 않는다.
  function paginate(tokens) {
    const n = tokens.length;
    const plain = tokens.map((t) => (t.gem ? '■' : t.ch)).join('');
    const arr = Array.from(plain);
    const fits = (a, b) => {
      measure.innerHTML = tokHtml(tokens, a, b, false);
      return measure.scrollHeight <= measure.clientHeight + 1;
    };
    const lines = [], sents = [], commas = [], spaces = [];
    for (let i = 1; i < n; i++) {
      const p = arr[i - 1], c = arr[i];
      if (p === '\n') lines.push(i);
      else if (c === ' ' || c === '\n') {
        const q = arr[i - 1], qq = arr[i - 2];
        if ('.?!…'.includes(q) || ('"\')'.includes(q) && '.?!…'.includes(qq))) sents.push(i + 1);
        else if (q === ',') commas.push(i + 1);
        else spaces.push(i + 1);
      }
    }
    const pages = [];
    let start = 0, guard = 0;
    while (start < n && guard++ < 200) {
      if (fits(start, n)) { pages.push([start, n]); break; }
      let best = null;
      for (const list of [lines, sents, commas, spaces]) {
        for (const b of list) if (b > start && b < n && fits(start, b)) best = b;
        if (best) break;
      }
      if (!best) { // 한 글자씩 줄여서라도 넣는다
        let b = n - 1;
        while (b > start + 1 && !fits(start, b)) b--;
        best = Math.max(start + 1, b);
      }
      pages.push([start, best]);
      start = best;
      while (start < n && (arr[start] === ' ' || arr[start] === '\n')) start++;
    }
    measure.innerHTML = '';
    return pages;
  }

  const SPEED = { '보통': 26, '빠름': 9, '즉시': 0 };
  let typing = null; // { finish() }

  function trimEnds(tokens, a, b) {
    while (b > a && tokens[b - 1].ch && /\s/.test(tokens[b - 1].ch)) b--;
    return b;
  }

  async function typePage(tokens, a, b) {
    b = trimEnds(tokens, a, b);
    textEl.innerHTML = tokHtml(tokens, a, b, true);
    const spans = textEl.querySelectorAll('.ch');
    const delay = SPEED[G.settings.speed] ?? 26;
    let finished = false;
    const finishAll = () => { finished = true; spans.forEach((s) => s.classList.add('on')); };
    if (!delay) { finishAll(); return; }
    let resolveTyping;
    const done = new Promise((r) => (resolveTyping = r));
    typing = { finish: () => { finishAll(); resolveTyping(); } };
    (async () => {
      for (let i = 0; i < spans.length && !finished; i++) {
        spans[i].classList.add('on');
        const ch = spans[i].textContent;
        if (i % 3 === 0 && ch.trim()) G.audio.blip();
        await G.sleep('.?!…'.includes(ch) ? delay * 6 : ch === ',' ? delay * 3 : delay);
      }
      finishAll();
      resolveTyping();
    })();
    await done;
    typing = null;
  }

  G.box = {
    skin: 'normal',
    show(skin = 'normal') {
      box.hidden = false;
      if (this.skin !== skin || !$('#box-img').dataset.key) {
        this.skin = skin;
        box.classList.remove('skin-normal', 'skin-hint', 'skin-tutorial');
        box.classList.add('skin-' + skin);
        G.setImg($('#box-img'), { normal: 'ui/textbox', hint: 'ui/window_hint', tutorial: 'ui/window_tutorial' }[skin]);
      }
      $('#photo').classList.toggle('with-box', true);
    },
    hide() { box.hidden = true; nextIcon.classList.remove('on'); $('#photo').classList.toggle('with-box', false); },
    face(name, expr) {
      this.faceName = name;
      box.classList.toggle('has-face', !!name);
      if (name) G.applyFace(faceEl, name, expr);
    },
    relayout() { /* 글자 크기가 바뀌면 다음 대사부터 새로 나눈다 */ },
    setName(t) {
      nameEl.textContent = t || '';
      nameEl.style.visibility = t ? 'visible' : 'hidden';
      // 이름이 길면 글자를 줄인다
      nameEl.style.fontSize = '';
      const len = Array.from(t || '').length;
      if (len > 7) nameEl.style.fontSize = 'calc(' + getComputedStyle(nameEl).fontSize + ' * ' + (7 / len).toFixed(2) + ')';
    },
    // 대사 한 줄: 넘치면 여러 쪽으로 나누고, 쪽마다 누를 때까지 기다린다.
    async say({ 이름, 글, 표시이름, skin = 'normal', cls = '', 증거 = false }) {
      this.show(skin);
      textEl.style.fontSize = '';
      // "(목소리, 일본어 억양)" → 목소리, "웨스트 대위의 기록 (자막)" → 웨스트 대위의 기록
      const shownName = 표시이름 != null ? 표시이름 : /^\(목소리/.test(이름 || '') ? '목소리' : (이름 || '').replace(/\s*\(자막\)$/, '');
      this.setName(skin === 'normal' ? shownName : (skin === 'hint' ? '힌트' : '알아두기'));
      textEl.className = '';
      const thought = /^\(.*\)$/s.test(글);
      const tokens = tokenize(글, [cls, thought && 'thought'].filter(Boolean).join(' '));
      if (증거) { // 증거 알림: 첫 줄(증거 이름)을 금색으로
        const nl = tokens.findIndex((t) => t.ch === '\n');
        for (let i = 0; i < (nl < 0 ? tokens.length : nl); i++) if (tokens[i].ch) tokens[i].cls = 'name-line';
      }
      await G.nextFrame();
      const pages = paginate(tokens);
      G.log.push({ 이름: skin === 'hint' ? '힌트 · 한나' : skin === 'tutorial' ? '알아두기' : shownName, 글 });
      if (G.log.length > 300) G.log.shift();
      for (const [a, b] of pages) {
        nextIcon.classList.remove('on');
        const waitTap = G.input.waitAdvance(() => { if (typing) { typing.finish(); return false; } return true; });
        await Promise.race([typePage(tokens, a, b), waitTap.started]);
        nextIcon.classList.add('on');
        await waitTap;
      }
      nextIcon.classList.remove('on');
    },
    // 기다리지 않고 글만 띄우기 (반대 심문 문장, 반격 주장)
    showStatic({ 이름, 글, cls = '', glow = false }) {
      this.show('normal');
      this.setName(이름);
      const tokens = tokenize(글, cls);
      textEl.innerHTML = tokHtml(tokens, 0, tokens.length, false);
      textEl.className = glow ? 'glow' : '';
      nextIcon.classList.remove('on');
      // 칸보다 길면 전부 보이도록 글자를 조금씩 줄인다
      textEl.style.fontSize = '';
      let size = parseFloat(getComputedStyle(textEl).fontSize);
      for (let i = 0; i < 12 && textEl.scrollHeight > textEl.clientHeight + 1; i++) {
        size *= 0.94;
        textEl.style.fontSize = size + 'px';
      }
    },
  };

  // ─────────── 입력 ───────────
  // 누르기(마우스, 터치), Enter, 스페이스로 대사를 넘긴다. 버튼이나 창 위를 누른 것은 넘기지 않는다.
  let waiter = null;
  G.input = {
    // guard(): false를 돌려주면 이번 누름은 넘기지 않음 (글자 한 번에 보이기 등)
    waitAdvance(guard) {
      let resolveFn;
      const p = new Promise((r) => (resolveFn = r));
      p.started = new Promise(() => {}); // Promise.race 용 (끝나지 않음)
      waiter = { guard, resolve: () => { waiter = null; resolveFn(); } };
      return p;
    },
    tap() {
      if (!waiter) return;
      if (waiter.guard && waiter.guard() === false) return;
      waiter.resolve();
    },
    onKey: null, // 반대 심문 등에서 방향키를 받는 곳
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('button, input, a, #overlay > *, .hotspot, #choices, #controls, #topbar')) return;
    if (!e.target.closest('#stage, #hud')) return;
    if (G.onStageTap && G.onStageTap(e)) return;
    G.input.tap();
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input')) return;
    if ($('#overlay').children.length) {
      const top = $('#overlay').lastElementChild;
      if (e.key === 'Escape' && G.closeTopOverlay) G.closeTopOverlay();
      else if ((e.key === 'Enter' || e.key === ' ') && top && top.matches('.episode-title')) { e.preventDefault(); top.click(); }
      return;
    }
    if (G.input.onKey && G.input.onKey(e)) { e.preventDefault(); return; }
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') { e.preventDefault(); G.input.tap(); }
  });
  window.addEventListener('resize', () => G.layout());
  window.addEventListener('orientationchange', () => setTimeout(G.layout, 150));
})();
