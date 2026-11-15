// 화면: 가로/세로 배치, 장면(배경·인물·책상), 연출, 대사창, 입력
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;
  const app = $('#app'), stage = $('#stage'), hud = $('#hud'), scene = $('#scene');
  const bgEl = $('#bg'), charEl = $('#char'), deskEl = $('#desk'), cutEl = $('#cut');

  // ─────────── 배치 ───────────
  // 가로 화면: 3:2 장면 위에 대사창과 버튼을 겹친다. 세로 화면: 위에 장면, 아래에 대사창과 버튼.
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
      sx = (vw - sw) / 2; sy = 0;
      put(stage, sx, 0, sw, sh);
      put(hud, 0, sh, vw, vh - sh);
    }
    // --u : 장면 그림(1536×1024)의 1픽셀이 화면에서 차지하는 크기
    app.style.setProperty('--u', sw / 1536 + 'px');
    for (const [k, v] of Object.entries({ '--sx': sx, '--sy': sy, '--sw': sw, '--sh': sh })) app.style.setProperty(k, v + 'px');
    app.classList.toggle('tight', !portrait && sw < 900);
  };

  // ─────────── 장면 상태 ───────────
  const S = (G.scene = { bgName: null, court: false, seat: null, offscreen: [], char: null, expr: null, trial: false });

  function isOffscreen(name) {
    const c = G.who(name);
    if (!c) return true;
    const b = G.cfg.배경[S.bgName];
    if (b && b.그림 === null) return true; // 검은 화면에서는 아무도 서지 않는다
    if (S.court) return false;
    return !!c.화면밖 || S.offscreen.includes(name);
  }

  G.stage = {
    // 배경 바꾸기. 법정: true 인 배경은 말하는 사람의 자리로 화면이 저절로 바뀐다
    setBackground(name, opts = {}) {
      let b = G.cfg.배경[name];
      if (!b) { console.warn('[배경 이름 없음]', name); b = G.cfg.배경[name] = { 그림: 'backgrounds/' + name }; }
      S.bgName = name;
      stage.dataset.bg = name;
      S.court = !!b.법정;
      scene.classList.toggle('dim', !!b.어둡게);
      S.offscreen = opts.화면밖 || [];
      S.char = null; S.expr = null;
      this.hideChar(true);
      this.cut(null);
      this.hideCards();
      this.photo(null);
      this.calm(false);
      this.dark(false);
      this.recall(false);
      if (S.court) this.camera('전경');
      else {
        S.seat = null;
        stage.dataset.seat = '';
        G.setImg(bgEl, b.그림 === null ? null : b.그림 || 'backgrounds/' + name);
        G.setImg(deskEl, b.책상 || null);
      }
      this.blackout(b.그림 === null);
      this.rain(false);
      this.closeup(null);
      this.glow(false);
      G.box.face(null);
    },
    camera(seat) {
      const z = G.cfg.법정자리[seat] || G.cfg.법정자리['증언대'];
      S.seat = seat;
      stage.dataset.seat = seat;
      G.setImg(bgEl, z.배경);
      G.setImg(deskEl, z.책상 || null);
    },
    // 말하는 사람을 화면에 맞게 보여 준다 (법정은 자리로 화면 전환, 화면 밖 인물은 얼굴만)
    speaker(name, expr) {
      if (!name || !G.who(name)) { G.box.face(null); return; } // 그림 없는 말(목소리, 자막)은 화면을 그대로 둔다
      if (isOffscreen(name)) { G.box.face(name, expr); return; }
      G.box.face(null);
      this.showChar(name, expr);
    },
    showChar(name, expr, opts = {}) {
      if (!G.who(name)) return;
      if (S.court) { const seat = G.seatOf(name); if (S.seat !== seat) this.camera(seat); }
      S.char = name; S.expr = expr;
      charEl.classList.remove('fade-out', 'fade-in', 'wobble');
      if (opts.fadeIn) { void charEl.offsetWidth; charEl.classList.add('fade-in'); }
      G.setImg(charEl, G.charKey(name, expr));
    },
    hideChar(instant) {
      S.char = null;
      if (instant) { charEl.hidden = true; charEl.dataset.key = ''; charEl.classList.remove('fade-out'); return; }
      charEl.classList.add('fade-out');
    },
    async exit() {
      charEl.classList.add('fade-out');
      await G.sleep(700);
      this.hideChar(true);
    },
    cut(key) { G.swapImg(cutEl, key); },
    shake(big) { scene.classList.remove('shake', 'shake-big'); void scene.offsetWidth; scene.classList.add(big ? 'shake-big' : 'shake'); },
    flash() { const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); },
    wobble() { charEl.classList.remove('wobble'); void charEl.offsetWidth; charEl.classList.add('wobble'); },
    blackout(on) { $('#black').classList.toggle('on', !!on); },
    // 차분한 화면: 색이 빠지고 어두워진다 (무거운 기록을 내놓을 때)
    calm(on) { scene.classList.toggle('calm', !!on); S.calm = !!on; },
    // 빛: 화면에 초록빛이 번진다 (희망적인 기록을 내놓을 때)
    glow(on) { $('#glow').classList.toggle('on', !!on); },
    rain(on) { $('#rain').classList.toggle('on', !!on); },
    dark(on) { scene.classList.toggle('dark', !!on); },
    // 회상: 화면 가장자리가 흐려진다
    recall(on) { stage.classList.toggle('recall', !!on); },
    // 확대 화면: 장면 위에 그림 한 장을 크게 띄운다. faces: 떠 있는 동안 말하는 사람을 대사창 옆 얼굴로
    closeup(key, opts = {}) {
      const c = $('#closeup');
      S.overlayFaces = !!(key && opts.faces !== false);
      if (!key) { c.classList.remove('on'); c.hidden = true; S.overlayFaces = false; return; }
      G.swapImg($('img', c), key);
      c.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('on')));
    },
    // 이름표: 처음 나오는 인물의 이름과 소개를 잠깐 띄운다. [이름, 소개]
    async nameTag(spec) {
      const [name, note] = G.list(spec);
      const t = h('div', { class: 'name-tag' }, h('b', {}, name), note ? h('small', {}, note) : null);
      stage.append(t);
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('on')));
      await G.sleep(1300);
      setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 700); }, 3200);
    },

    // ── 큰 글자 연출 (그림 없이 글자로 그린다) ──
    // 외침: 비스듬한 띠가 화면을 가로지른다
    async shout(text, ms = 950) {
      G.box.hide();
      G.audio.se('외침');
      this.shake(false);
      const el = h('div', { class: 'shout' }, h('span', {}, text));
      $('#big').append(el);
      await G.sleep(ms);
      el.remove();
    },
    // 띠: 장면이 바뀔 때 가운데를 지나가는 제목 ("휴정", "최종 변론" …)
    async banner(text, ms = 1900) {
      G.box.hide();
      const el = h('div', { class: 'banner' }, h('span', {}, text));
      el.style.animationDuration = ms + 'ms';
      $('#big').append(el);
      await G.sleep(ms);
      el.remove();
    },
    // 판결: 글자가 하나씩 쾅 하고 찍힌다. 누르면 넘어간다
    async verdict(text) {
      G.box.hide();
      const el = h('div', { class: 'verdict' });
      const n = Array.from(text).length; // 글자가 많으면 한 줄에 들어가게 줄인다
      if (n > 3) el.style.fontSize = 'max(' + Math.round(180 / n) + 'px, calc(var(--u) * ' + Math.round(1250 / n) + '))';
      $('#big').append(el);
      for (const ch of Array.from(text)) {
        if (ch === ' ') { el.append(h('i', { class: 'sp' })); continue; }
        el.append(h('b', {}, ch));
        this.shake(false); this.flash();
        G.audio.se('쾅');
        await G.sleep(650);
      }
      await G.sleep(300);
      await G.input.waitAdvance();
      el.remove();
    },

    // 화면 구석이나 가운데에 증거 카드 띄우기
    showCards(ids, opts = {}) {
      this.hideCards();
      const box = $('#cards');
      ids = ids.filter((id) => G.ev[id]);
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

    // 사진: 증거의 그림을 화면 가득 띄운다. 출처가 있으면 아래에 출처 띠를 함께 띄운다
    photo(evId) {
      const p = $('#photo');
      const ev = evId && G.ev[evId];
      S.photoFaces = !!ev;
      if (!ev) { p.classList.remove('on'); p.hidden = true; return; }
      G.swapImg($('#photo-img'), ev.그림 || 'evidence/' + evId);
      const cap = $('.caption', p);
      cap.textContent = ev.출처 ? '출처: ' + ev.출처 : '';
      cap.hidden = !ev.출처;
      p.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('on')));
    },

    // 검은 화면 자막. 겹쳐: 장면을 어둡게 비친 채 글을 띄운다. 크게: 한 문장을 크게. 길게: 긴 글 여러 문단
    async subtitle(lines, opts = {}) {
      G.box.hide();
      const black = $('#black');
      black.classList.toggle('veil', !!opts.겹쳐);
      this.blackout(true);
      const sub = $('#subtitle');
      sub.className = [opts.크게 && 'big', opts.길게 && 'long'].filter(Boolean).join(' ');
      sub.innerHTML = '';
      const divs = G.list(lines).map((t) => { const d = h('div'); d.innerHTML = G.mdBold(t); return d; });
      sub.append(...divs);
      for (const d of divs) { await G.sleep(250); d.classList.add('on'); await G.sleep(opts.크게 ? 1400 : 900); }
      await G.input.waitAdvance();
      divs.forEach((d) => d.classList.remove('on'));
      await G.sleep(700);
      sub.innerHTML = '';
      const b = G.cfg.배경[S.bgName];
      if (opts.겹쳐 || !(b && b.그림 === null)) { this.blackout(false); await G.sleep(300); }
      black.classList.remove('veil');
    },
    // 종이: 종이 한 장 위에 글이 한 줄씩 나타난다 (편지, 일기, 실험 보고서)
    async paper(lines, opts = {}) {
      G.box.hide();
      const black = $('#black');
      black.classList.add('veil');
      this.blackout(true);
      const sub = $('#subtitle');
      sub.className = 'paper-mode';
      sub.innerHTML = '';
      const sheet = h('div', { class: 'paper' });
      const divs = G.list(lines).map((t, i) => { const d = h('div', { class: opts.제목줄 && i === 0 ? 'head' : null }); d.innerHTML = G.mdBold(t); return d; });
      sheet.append(...divs);
      sub.append(sheet);
      let size = parseFloat(getComputedStyle(sheet).fontSize);
      for (let i = 0; i < 14 && sheet.scrollHeight > sheet.clientHeight + 1 && size > 10; i++) { size *= 0.93; sheet.style.fontSize = size + 'px'; }
      requestAnimationFrame(() => sheet.classList.add('on'));
      await G.sleep(700);
      for (const d of divs) { d.classList.add('on'); await G.sleep(1100); }
      await G.input.waitAdvance();
      sheet.classList.remove('on');
      await G.sleep(700);
      sub.innerHTML = '';
      sub.className = '';
      const b = G.cfg.배경[S.bgName];
      if (!(b && b.그림 === null)) this.blackout(false);
      await G.sleep(300);
      black.classList.remove('veil');
    },

    // 신뢰도: 왼쪽 위의 칸. 일반 증거를 잘못 내면 한 칸 줄고, 0이 되면 그 증언부터 다시 한다
    gauge(show) {
      const g = $('#gauge');
      g.hidden = !show;
      if (show) {
        g.innerHTML = '';
        g.append(h('small', {}, G.cfg.신뢰도.이름));
        for (let i = 0; i < G.cfg.신뢰도.칸; i++) g.append(h('i', { 'data-i': i }, G.cfg.신뢰도.아이콘 || ''));
        this.updateGauge();
      }
    },
    updateGauge(lostIndex) {
      document.querySelectorAll('#gauge i').forEach((c) => {
        c.classList.toggle('off', +c.dataset.i >= G.play.gauge);
        c.classList.toggle('lost', +c.dataset.i === lostIndex);
      });
    },

    // 증거 획득 알림: 화면 가운데에 카드, 대사창에 이름과 설명
    async evidencePopup(id, opts = {}) {
      const ev = G.ev[id];
      if (!ev) return;
      const pop = $('#popup');
      pop.innerHTML = '';
      const kind = G.kind(ev);
      pop.append(h('div', { class: 'pop-band', style: '--kc:' + (kind.색 || '#e8b84a') }, opts.updated ? G.cfg.말.갱신 : G.cfg.말.새기록, h('small', {}, kind.이름)), G.renderCard(id));
      pop.hidden = false;
      G.audio.se(opts.updated ? '증거 갱신음' : '증거 획득음');
      G.box.face(null);
      await G.box.say({ 이름: kind.이름, 글: G.evidenceText(ev), 증거: true });
      pop.hidden = true;
      pop.innerHTML = '';
    },
  };

  // ─────────── 대사창 ───────────
  const box = $('#box'), nameEl = $('#name'), textEl = $('#text'), measure = $('#text-measure'), faceEl = $('#face'), nextIcon = $('#next-icon');
  G.log = [];

  // 글 → [{ch, cls}]. **강조**, 〔추궁할 낱말〕, 🟥🟦🟩 → 작은 색 네모
  function tokenize(text, baseCls) {
    const out = [];
    let bold = false, point = false;
    const chars = Array.from(String(text == null ? '' : text));
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (c === '*' && chars[i + 1] === '*') { bold = !bold; i++; continue; }
      if (c === '〔') { point = true; continue; }
      if (c === '〕') { point = false; continue; }
      if (G.GEM[c]) { out.push({ gem: c }); continue; }
      out.push({ ch: c, cls: [baseCls, bold && 'hl', point && 'pt'].filter(Boolean).join(' ') });
    }
    return out;
  }
  function tokHtml(tokens, a, b, hidden) {
    let html = '';
    for (let i = a; i < b; i++) {
      const t = tokens[i];
      if (t.gem) { html += G.gemHtml(t.gem, hidden ? ' ch' : ''); continue; }
      const e = t.ch === '<' ? '&lt;' : t.ch === '&' ? '&amp;' : t.ch === '>' ? '&gt;' : t.ch;
      if (hidden) html += '<span class="ch ' + t.cls + '">' + e + '</span>';
      else html += t.cls ? '<span class="' + t.cls + '">' + e + '</span>' : e;
    }
    return html;
  }

  // 쪽 나누기: 대사창에 넘치면 문장 → 쉼표 → 띄어쓰기 순서로 끊는다. 대사를 일부러 짧게 쓸 필요가 없다.
  function paginate(tokens) {
    const n = tokens.length;
    const arr = tokens.map((t) => (t.gem ? '■' : t.ch));
    const fits = (a, b) => { measure.innerHTML = tokHtml(tokens, a, b, false); return measure.scrollHeight <= measure.clientHeight + 1; };
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
      if (!best) { let b = n - 1; while (b > start + 1 && !fits(start, b)) b--; best = Math.max(start + 1, b); }
      pages.push([start, best]);
      start = best;
      while (start < n && (arr[start] === ' ' || arr[start] === '\n')) start++;
    }
    measure.innerHTML = '';
    return pages.length ? pages : [[0, n]];
  }

  const SPEED = { '보통': 26, '빠름': 9, '즉시': 0 };
  let typing = null;

  async function typePage(tokens, a, b) {
    while (b > a && tokens[b - 1].ch && /\s/.test(tokens[b - 1].ch)) b--;
    textEl.innerHTML = tokHtml(tokens, a, b, true);
    const spans = textEl.querySelectorAll('.ch');
    const delay = G.fast ? 0 : SPEED[G.settings.speed] ?? 26;
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
    show(skin = 'normal') {
      box.hidden = false;
      box.classList.remove('skin-normal', 'skin-hint', 'skin-tutorial');
      box.classList.add('skin-' + skin);
    },
    hide() { box.hidden = true; nextIcon.classList.remove('on'); },
    face(name, expr) {
      box.classList.toggle('has-face', !!name);
      if (name) G.applyFace(faceEl, name, expr);
    },
    setName(t) {
      nameEl.textContent = t || '';
      nameEl.style.visibility = t ? 'visible' : 'hidden';
    },
    // 대사 한 줄: 넘치면 여러 쪽으로 나누고, 쪽마다 누를 때까지 기다린다
    async say({ 이름, 글, 표시이름, skin = 'normal', cls = '', 증거 = false, 제목 = null }) {
      this.show(skin);
      // "(목소리)" → 목소리, "기록 (자막)" → 기록
      const voice = (이름 || '').match(/^\(([^,)]+)[,)]/);
      const shownName = 표시이름 != null ? 표시이름 : voice ? voice[1].trim() : (이름 || '').replace(/\s*\(자막\)$/, '');
      this.setName(skin === 'normal' ? shownName : skin === 'hint' ? G.cfg.말.힌트 : G.cfg.말.알아두기);
      textEl.className = '';
      textEl.style.fontSize = '';
      글 = String(글 == null ? '' : 글);
      const thought = /^\(.*\)$/s.test(글); // (괄호로 감싼 대사)는 속마음
      const tokens = tokenize(제목 ? 제목 + '\n' + 글 : 글, [cls, thought && 'thought'].filter(Boolean).join(' '));
      if (증거 || 제목) { // 첫 줄(증거 이름, 안내창 제목)을 강조색으로
        const nl = tokens.findIndex((t) => t.ch === '\n');
        for (let i = 0; i < (nl < 0 ? tokens.length : nl); i++) if (tokens[i].ch) tokens[i].cls = 'name-line';
      }
      await G.nextFrame();
      const pages = paginate(tokens);
      G.log.push({ 이름: skin === 'hint' ? G.cfg.말.힌트 + (이름 ? ' · ' + 이름 : '') : skin === 'tutorial' ? G.cfg.말.알아두기 : shownName, 글 });
      if (G.log.length > 300) G.log.shift();
      for (const [a, b] of pages) {
        nextIcon.classList.remove('on');
        let shownAt = Infinity;
        // 글자가 나오는 중에 누르면 한 번에 다 보여 준다. 다 보인 뒤 잠깐은 눌러도 넘기지 않는다 (연타로 지나가지 않게)
        const waitTap = G.input.waitAdvance(() => { if (typing) { typing.finish(); return false; } return performance.now() - shownAt >= G.input.HOLD; });
        await Promise.race([typePage(tokens, a, b), waitTap]);
        shownAt = performance.now();
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
      // 칸보다 길면 글자를 조금씩 줄인다
      textEl.style.fontSize = '';
      let size = parseFloat(getComputedStyle(textEl).fontSize);
      for (let i = 0; i < 12 && textEl.scrollHeight > textEl.clientHeight + 1; i++) { size *= 0.94; textEl.style.fontSize = size + 'px'; }
    },
  };

  // ─────────── 입력 ───────────
  // 누르기(마우스, 터치)로 대사를 넘긴다. 버튼이나 창 위를 누른 것은 넘기지 않는다.
  let waiter = null;
  G.input = {
    HOLD: 350, // 새로 보인 것은 이 시간(ms) 동안 눌러도 넘기지 않는다
    waitAdvance(guard) {
      if (G.fast) return G.sleep(0); // 빨리 돌려 보기 (자동 시험, 교사용 건너뛰기)
      let resolveFn;
      const p = new Promise((r) => (resolveFn = r));
      waiter = { guard, since: performance.now(), resolve: () => { waiter = null; resolveFn(); } };
      return p;
    },
    release() { if (waiter) waiter.resolve(); },
    tap() {
      if (!waiter) return;
      if (waiter.guard ? waiter.guard() === false : performance.now() - waiter.since < G.input.HOLD) return;
      waiter.resolve();
    },
    onKey: null,
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('button, input, textarea, select, a, #overlay > *, .hotspot, #choices, #controls, #topbar')) return;
    if (!e.target.closest('#stage, #hud')) return;
    if (G.onStageTap && G.onStageTap(e)) return;
    G.input.tap();
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if ($('#overlay').children.length) {
      if (e.key === 'Escape' && G.closeTopOverlay) G.closeTopOverlay();
      else if (G.overlayKey && G.overlayKey(e)) e.preventDefault();
      return;
    }
    if (G.input.onKey && G.input.onKey(e)) { e.preventDefault(); return; }
    // 엔터·스페이스: 선택지나 조작 버튼에 초점이 있으면 그 버튼을 누르고, 아니면 대사를 넘긴다
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target.closest && e.target.closest('#choices button, #controls button')) return;
      e.preventDefault();
      if (!e.repeat) G.input.tap();
    }
  });
  window.addEventListener('resize', () => G.layout());
  window.addEventListener('orientationchange', () => setTimeout(G.layout, 150));
})();
