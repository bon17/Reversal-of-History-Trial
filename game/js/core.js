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
  G.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  G.nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // ─────────── 그림 ───────────
  // key 예: 'characters/okada_arrogant'. game/img/…webp → assets/…png → assets/…jpg 순서로 찾는다.
  const imgCache = {};
  G.loadImg = (key) => {
    if (!key) return Promise.resolve('');
    if (imgCache[key]) return imgCache[key];
    imgCache[key] = new Promise((resolve) => {
      const tries = ['game/img/' + key + '.webp', 'assets/' + key + '.png', 'assets/' + key + '.jpg'];
      const next = () => {
        const url = tries.shift();
        if (!url) { console.warn('[그림 없음]', key); G.missing.add(key); resolve(''); return; }
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
  G.setImg = async (el, key) => {
    el.dataset.key = key || '';
    if (!key) { el.hidden = true; el.removeAttribute('src'); return; }
    const url = await G.loadImg(key);
    if (el.dataset.key !== key) return; // 그사이 다른 그림으로 바뀜
    if (!url) { el.hidden = true; return; }
    el.src = url;
    el.hidden = false;
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
    blip() {
      // 대사 글자음 (파일이 있을 때만)
      const path = DATA.소리.효과음['대사 글자음'];
      if (typeof audioExt[path] === 'string') playAudio(path, 0.35 * G.settings.se, false);
      else if (audioExt[path] === undefined && !this.probed) { this.probed = true; playAudio(path, 0, false); }
    },
  };

  // ─────────── 저장 ───────────
  const SAVE_KEY = 'memory-court-save';
  G.store = {
    load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } },
    write(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {} },
    clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
  };
})();
