// 기본 도구: DOM, 그림 불러오기(WebP 먼저, 없으면 원본), 소리 자리, 저장
(function () {
  const G = (window.G = window.G || {});

  G.$ = (s, r = document) => r.querySelector(s);
  G.h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return e;
  };
  // 글 안의 **강조** 만 굵은 글씨로 살린 HTML (나머지는 글자 그대로)
  G.mdBold = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  G.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  G.nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // ─────────── 그림 ───────────
  // key 예: 'characters/okada_arrogant'. game/img/…webp → assets/…png → assets/…jpg 순서로 찾는다.
  const imgCache = {};
  G.loadImg = (key) => {
    if (!key || typeof key !== 'string') return Promise.resolve(''); // 그림 이름이 아닌 것이 들어와도 멈추지 않게
    if (imgCache[key]) return imgCache[key];
    // 한 파일짜리 게임(tools/build_single_html.mjs로 만든 것)은 그림이 파일 안에 들어 있다
    if (window.EMBED_IMG && window.EMBED_IMG[key]) return (imgCache[key] = Promise.resolve(window.EMBED_IMG[key]));
    imgCache[key] = new Promise((resolve) => {
      const tries = ['game/img/' + key + '.webp', 'assets/' + key + '.png', 'assets/' + key + '.jpg'];
      const next = () => {
        const url = tries.shift();
        if (!url) { console.warn('[그림 없음]', key); G.missing.add(key); resolve(G.placeholder(key)); return; }
        const im = new Image();
        im.onload = () => resolve(url);
        im.onerror = next;
        im.src = url;
      };
      next();
    });
    return imgCache[key];
  };
  G.missing = new Set();

  // ─────────── 그림이 아직 없을 때 띄우는 자리 그림 ───────────
  // 그림 파일이 올라오면 코드를 고치지 않아도 진짜 그림으로 바뀐다.
  const xml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const allEvidence = () => Object.values(DATA).filter((d) => d && d.증거).flatMap((d) => Object.values(d.증거));
  G.placeholder = (key) => {
    const [dir, file] = key.split('/');
    const font = 'font-family="Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif" text-anchor="middle"';
    let svg = '';
    if (dir === 'characters') {
      let who = file, expr = '';
      for (const [n, c] of Object.entries(DATA.인물)) {
        if (file.startsWith(c.파일 + '_')) {
          who = n;
          const e = file.slice(c.파일.length + 1);
          expr = (Object.entries(DATA.표정).find(([, v]) => v === e) || [e])[0];
        }
      }
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <g fill="rgba(18,22,38,.78)" stroke="rgba(232,184,74,.75)" stroke-width="6" stroke-dasharray="18 12">
          <circle cx="512" cy="350" r="130"/>
          <path d="M252 1024 C252 660 340 520 512 520 C684 520 772 660 772 1024 Z"/>
        </g>
        <rect x="192" y="70" width="640" height="130" rx="20" fill="rgba(8,12,26,.82)"/>
        <text x="512" y="138" ${font} font-size="60" font-weight="700" fill="#ffe29a">${xml(who)}${expr ? ' · ' + xml(expr) : ''}</text>
        <text x="512" y="186" ${font} font-size="36" fill="#f2ead4">그림 준비 중</text></svg>`;
    } else if (dir === 'backgrounds') {
      const bg = Object.entries(DATA.배경).find(([, b]) => b.그림 === key);
      const cut = !bg && (DATA.컷 || {})[key];
      const title = bg ? bg[0] : cut || file;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26324f"/><stop offset="1" stop-color="#0b0f1c"/></linearGradient></defs>
        <rect width="1536" height="1024" fill="url(#g)"/>
        <rect x="40" y="40" width="1456" height="944" fill="none" stroke="rgba(232,184,74,.5)" stroke-width="6" stroke-dasharray="24 16"/>
        ${bg
          ? `<g font-family="Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif" text-anchor="start">
               <text x="80" y="540" font-size="32" fill="#bfb49a">배경 준비 중</text>
               <text x="80" y="598" font-size="44" font-weight="700" fill="#ffe29a">${xml(title)}</text>
               <text x="80" y="640" font-size="26" fill="#bfb49a">${xml(file)}.png</text></g>`
          : `<text x="768" y="400" ${font} font-size="40" fill="#bfb49a">연출 그림 준비 중 · ${xml(file)}.png</text>
             <text x="768" y="480" ${font} font-size="64" font-weight="700" fill="#ffe29a">${xml(title)}</text>`}</svg>`;
    } else if (dir === 'evidence') {
      const ev = allEvidence().find((e) => e.그림 === key || e.확대 === key || e.자세히 === key);
      const name = ev ? ev.이름 + (ev.확대 === key || ev.자세히 === key ? ' (확대)' : '') : file;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
        <rect x="80" y="80" width="608" height="608" rx="24" fill="#e9dcc0" stroke="#8a6a3a" stroke-width="8" stroke-dasharray="22 14"/>
        <text x="384" y="370" ${font} font-size="${name.length > 12 ? 40 : name.length > 9 ? 48 : 60}" font-weight="700" fill="#3b2a0e">${xml(name)}</text>
        <text x="384" y="450" ${font} font-size="40" fill="#6b5634">그림 준비 중</text></svg>`;
    } else {
      return '';
    }
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
  G.isPlaceholder = (url) => typeof url === 'string' && url.startsWith('data:image/svg+xml');
  G.setImg = async (el, key) => {
    el.dataset.key = key || '';
    if (!key) { el.hidden = true; el.removeAttribute('src'); return; }
    const url = await G.loadImg(key);
    if (el.dataset.key !== key) return; // 그사이 다른 그림으로 바뀜
    if (!url) { el.hidden = true; return; }
    el.src = url;
    el.hidden = false;
  };
  // 다른 그림으로 바꿀 때 옛 그림이 잠깐 보이지 않게 먼저 지우고 새 그림을 불러온다 (확대, 컷, 사진 칸)
  G.swapImg = (el, key) => {
    if (el.dataset.key !== (key || '')) { el.removeAttribute('src'); el.hidden = true; }
    return G.setImg(el, key);
  };
  G.imgEl = (key, cls) => {
    const el = G.h('img', { class: cls || null, alt: '' });
    G.setImg(el, key);
    return el;
  };
  G.preload = (keys, onProgress) => {
    const list = [...new Set(keys.filter(Boolean))];
    let done = 0;
    return Promise.all(list.map((k) => G.loadImg(k).then(() => { done++; onProgress && onProgress(done, list.length); })));
  };

  // 인물 그림 이름
  G.charKey = (name, expr) => {
    const c = DATA.인물[name];
    if (!c) return null;
    const e = DATA.표정[expr || '기본'] || 'default';
    return 'characters/' + c.파일 + '_' + e;
  };

  // 얼굴만 동그랗게 잘라 보여 주기 (인물 이야기 카드, 힌트 창, 화면 밖 인물)
  G.applyFace = (el, name, expr) => {
    const c = DATA.인물[name];
    const key = G.charKey(name, expr);
    if (!c || !key) { el.style.backgroundImage = ''; return; }
    const [cx, cy, r] = c.얼굴 || [512, 260, 180];
    el.style.backgroundSize = (1024 / (2 * r)) * 100 + '%';
    el.style.backgroundPosition = ((cx - r) / (1024 - 2 * r)) * 100 + '% ' + ((cy - r) / (1024 - 2 * r)) * 100 + '%';
    el.style.backgroundRepeat = 'no-repeat';
    el.dataset.key = key;
    G.loadImg(key).then((url) => { if (el.dataset.key === key) el.style.backgroundImage = url ? 'url("' + url + '")' : ''; });
  };

  // ─────────── 설정 ───────────
  const SETTINGS_KEY = 'memory-court-settings';
  G.settings = { speed: '보통', bgm: 0.8, se: 0.9 };
  try { Object.assign(G.settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) {}
  G.saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); } catch (e) {} };

  // ─────────── 소리 ───────────
  // 소리 파일은 아직 없다. assets/audio/ 에 DATA.소리 표의 이름으로 파일을 넣으면 그대로 쓰인다.
  // 파일이 없으면 아무 소리 없이 넘어간다.
  // 파일 찾기: mp3 → ogg → wav → m4a 순서로 틀어 보고, 없는 파일은 기억해 두었다가 다시 찾지 않는다.
  const audioExt = {}; // path → 찾은 주소, 또는 false(없음)
  function playAudio(path, volume, loop) {
    return new Promise((resolve) => {
      if (audioExt[path] === false) { resolve(null); return; }
      const tries = audioExt[path] ? [audioExt[path]] : ['mp3', 'ogg', 'wav', 'm4a'].map((x) => 'assets/audio/' + path + '.' + x);
      const next = () => {
        const url = tries.shift();
        if (!url) { audioExt[path] = false; resolve(null); return; }
        const a = new Audio();
        a.loop = !!loop;
        a.volume = Math.max(0, Math.min(1, volume));
        a.addEventListener('error', next, { once: true });
        a.addEventListener('playing', () => { audioExt[path] = url; }, { once: true });
        a.src = url;
        a.play().then(() => resolve(a)).catch((e) => { if (e && e.name === 'NotAllowedError') resolve(a); });
      };
      next();
    });
  }
  // '조사 테마 (잔잔하게)' → { 이름: '조사 테마', 꾸밈: '잔잔하게' }
  function splitName(table, full) {
    if (table[full]) return { 이름: full, 꾸밈: null };
    const m = full.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (m && table[m[1]]) return { 이름: m[1], 꾸밈: m[2] };
    return { 이름: full, 꾸밈: null };
  }
  G.audio = {
    current: null, // 지금 BGM 이름
    el: null,
    baseVol: 1,
    playing: new Set(),
    async bgm(full) {
      if (full === '멈춤' || full === '없음' || /^없음/.test(full)) { this.stop(); this.current = null; return; }
      const { 이름, 꾸밈 } = splitName(DATA.소리.BGM, full);
      const path = DATA.소리.BGM[이름];
      const vol = (꾸밈 && DATA.소리.꾸밈음량[꾸밈]) || 0.8;
      if (this.current === 이름 && this.el) { this.baseVol = vol; this.el.volume = vol * G.settings.bgm; return; }
      this.stop();
      this.current = 이름;
      if (!path) { console.warn('[BGM 이름 없음]', full); return; }
      this.baseVol = vol;
      const a = await playAudio(path, vol * G.settings.bgm, true);
      if (!a) return;
      if (this.current !== 이름) { a.pause(); return; }
      this.el = a;
    },
    stop() { if (this.el) { this.el.pause(); this.el = null; } },
    refreshVolume() { if (this.el) this.el.volume = this.baseVol * G.settings.bgm; },
    async se(full) {
      if (full === '멈춤') { this.playing.forEach((a) => a.pause()); this.playing.clear(); return; }
      const { 이름, 꾸밈 } = splitName(DATA.소리.효과음, full);
      const path = DATA.소리.효과음[이름];
      if (!path) { console.warn('[효과음 이름 없음]', full); return; }
      const vol = (꾸밈 && DATA.소리.꾸밈음량[꾸밈]) || 0.85;
      const times = 꾸밈 && /땅!\s*땅!/.test(꾸밈) ? 2 : 1;
      for (let i = 0; i < times; i++) {
        const a = await playAudio(path, vol * G.settings.se, false);
        if (!a) return;
        this.playing.add(a);
        a.addEventListener('ended', () => this.playing.delete(a));
        if (i < times - 1) await G.sleep(420);
      }
    },
    // 계속 되풀이되는 효과음 (4화 시계방의 째깍 소리). 장소를 떠나면 stopLoop()로 멈춘다
    async loop(full) {
      if (this.loopName === full) return;
      this.stopLoop();
      this.loopName = full;
      const { 이름, 꾸밈 } = splitName(DATA.소리.효과음, full);
      const path = DATA.소리.효과음[이름];
      if (!path) { console.warn('[효과음 이름 없음]', full); return; }
      const vol = (꾸밈 && DATA.소리.꾸밈음량[꾸밈]) || 0.6;
      const a = await playAudio(path, vol * G.settings.se, true);
      if (!a) return;
      if (this.loopName !== full) { a.pause(); return; }
      this.loopEl = a;
    },
    stopLoop() { this.loopName = null; if (this.loopEl) { this.loopEl.pause(); this.loopEl = null; } },
    blip() {
      // 대사 글자음 (파일이 있을 때만)
      const path = DATA.소리.효과음['대사 글자음'];
      if (typeof audioExt[path] === 'string') playAudio(path, 0.35 * G.settings.se, false);
      else if (audioExt[path] === undefined && !this.probed) { this.probed = true; playAudio(path, 0, false); }
    },
  };

  // ─────────── 저장 ───────────
  // 한 파일짜리 게임 1·2(tools/build_single_html.mjs)는 한 컴퓨터에서 저장소를 함께 쓰므로 진행 저장 자리를 나눈다.
  // (🟩 기록과 해 본 화 목록은 게임 2의 기록 보관함과 기억 노트가 함께 보도록 나누지 않는다)
  const SAVE_KEY = 'memory-court-save' + (window.GAME_PART ? '-' + window.GAME_PART : '');
  G.store = {
    load() {
      try {
        // 나누기 전에 저장한 진행(memory-court-save)은 그 화가 든 게임 파일의 자리로 옮긴다
        const OLD = 'memory-court-save';
        const old = SAVE_KEY !== OLD && JSON.parse(localStorage.getItem(OLD) || 'null');
        const ep = old && DATA['ep' + old.화];
        if (ep && (ep.게임 || (ep.번호 <= 3 ? 1 : 2)) === window.GAME_PART) {
          if (!localStorage.getItem(SAVE_KEY)) localStorage.setItem(SAVE_KEY, JSON.stringify(old));
          localStorage.removeItem(OLD);
        }
        return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      } catch (e) { return null; }
    },
    write(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {} },
    clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
    // 🟩 선택 기록 모음 (6화 기록 보관함용): { '2': ['treatment_record'], … }
    green() { try { return JSON.parse(localStorage.getItem('memory-court-green') || '{}'); } catch (e) { return {}; } },
    // 한 번이라도 시작한 화 (기억 노트에서 2화를 했는지 볼 때 쓴다)
    played() { try { return JSON.parse(localStorage.getItem('memory-court-played') || '[]'); } catch (e) { return []; } },
    markPlayed(ep) {
      try { const p = this.played(); if (!p.includes(ep)) { p.push(ep); localStorage.setItem('memory-court-played', JSON.stringify(p)); } } catch (e) {}
    },
    addGreen(ep, id) {
      try {
        const g = this.green();
        g[ep] = g[ep] || [];
        if (!g[ep].includes(id)) g[ep].push(id);
        localStorage.setItem('memory-court-green', JSON.stringify(g));
      } catch (e) {}
    },
  };
})();
