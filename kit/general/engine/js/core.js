// 기본 도구: 설정 읽기, 그림 불러오기(없으면 자리 그림), 소리, 저장
// 이 폴더(engine/)는 고치지 않아도 된다. 내 게임은 my-game/ 폴더의 파일만 고치면 된다.
(function () {
  const G = (window.G = window.G || {});
  window.DATA = window.DATA || {};

  G.KIT = { 이름: '법정 추리 수업 게임 키트', 판: '1.0.0' };

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
  G.sleep = (ms) => new Promise((r) => setTimeout(r, G.fast ? Math.min(ms, 30) : ms));
  G.nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  G.list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  G.esc = esc;

  // ─────────── 기본값 (engine/js/defaults.js) ───────────
  const { EXPR, EXPR_EMOJI, SEATS, KINDS, THEMES, FONTS, SOUNDS } = window.KIT_DEFAULTS;
  G.cmdKey = window.KIT_DEFAULTS.cmdKey;

  // ─────────── 설정 읽기 ───────────
  // my-game/settings.js 의 DATA.게임 을 읽어 기본값과 합친다. 빠진 칸은 기본값으로 채운다.
  function hex(c) { const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c || '').trim()); if (!m) return null; let s = m[1]; if (s.length === 3) s = s.replace(/./g, '$&$&'); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); }
  function mix(a, b, t) { const A = hex(a) || [19, 34, 74], B = hex(b) || [0, 0, 0]; return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  G.mix = mix;
  function hashColor(name) { let x = 0; for (const ch of String(name)) x = (x * 31 + ch.codePointAt(0)) >>> 0; const hue = x % 360; return 'hsl(' + hue + ',45%,42%)'; }

  G.setup = () => {
    const g = DATA.게임 || {};
    const merge2 = (base, add) => { const o = {}; for (const k of Object.keys(base)) o[k] = Object.assign({}, base[k]); for (const [k, v] of Object.entries(add || {})) o[k] = Object.assign({}, o[k] || {}, typeof v === 'string' ? { 이름: v } : v); return o; };
    const C = (G.cfg = {
      제목: g.제목 || '나의 법정 추리 게임', 부제: g.부제 || '', 만든이: g.만든이 || '', 아이디: g.아이디 || '',
      주인공: g.주인공 || null, 조수: g.조수 || null,
      외침: Object.assign({ 추궁: '잠깐만요!', 제시: '반박합니다!' }, g.외침),
      버튼: Object.assign({ 추궁: '더 묻기', 제시: '증거 제시', 기록: '사건 기록', 이동: '장소 이동', 자세히: '자세히 보기' }, g.버튼),
      말: Object.assign({ 증언시작: '증언 시작', 재판연기: '재판 연기', 힌트: '힌트', 알아두기: '알아두기', 새기록: '새 기록!', 갱신: '기록 갱신!', 기록제목: '사건 기록', 제시제목: '제시할 증거를 고르세요' }, g.말),
      신뢰도: Object.assign({ 칸: 5, 이름: '신뢰도', 아이콘: '' }, g.신뢰도),
      기록종류: merge2(KINDS, g.기록종류),
      표정: Object.assign({}, EXPR, DATA.표정, g.표정),
      인물: Object.fromEntries(Object.entries(Object.assign({}, DATA.인물, g.인물)).map(([n, c]) => [n, Object.assign({}, c)])),
      배경: Object.assign({ '검은 화면': { 그림: null } }, DATA.배경, g.배경),
      법정자리: merge2(SEATS, Object.assign({}, DATA.법정자리, g.법정자리)),
      소리: {
        BGM: Object.assign({}, SOUNDS.BGM, (DATA.소리 || {}).BGM, (g.소리 || {}).BGM),
        효과음: Object.assign({}, SOUNDS.효과음, (DATA.소리 || {}).효과음, (g.소리 || {}).효과음),
        꾸밈음량: Object.assign({}, SOUNDS.꾸밈음량, (DATA.소리 || {}).꾸밈음량, (g.소리 || {}).꾸밈음량),
      },
      저장주소: g.저장주소 || (DATA.설정 || {}).GAS주소 || '',
      학생정보: g.학생정보 || ['반', '번호', '이름'],
      자리그림: g.자리그림 === '실루엣' ? '실루엣' : '이모지', // 그림이 없을 때 인물 자리 그림: '이모지'(표정 이모지 얼굴) 또는 '실루엣'(차분한 그림자)
      화선택: g.화선택 || '자유', // '자유': 처음 화면에서 화를 고른다 / '코드': 선생님이 알려 준 코드를 넣는다 / '순서': 앞 화를 끝내야 다음 화
      처음화면그림: g.처음화면그림 || null,
    });
    for (const [n, c] of Object.entries(C.인물)) { if (!c.자리) c.자리 = '증언대'; if (!c.파일) c.파일 = 'char_' + n; }
    for (const k of Object.keys(C.배경)) if (typeof C.배경[k] === 'string') C.배경[k] = { 그림: C.배경[k] };
    // 테마: 이름 또는 { 바탕, 포인트, 글꼴 }
    const t = typeof g.테마 === 'string' ? { 이름: g.테마 } : g.테마 || {};
    const preset = THEMES[t.이름] || THEMES['남색금빛'];
    const base = hex(t.바탕) ? t.바탕 : preset[0], point = hex(t.포인트) ? t.포인트 : preset[1];
    C.테마색 = { 바탕: base, 포인트: point };
    const root = document.documentElement.style;
    root.setProperty('--navy', mix(base, '#ffffff', 0.06));
    root.setProperty('--navy-deep', mix(base, '#000000', 0.45));
    root.setProperty('--navy-black', mix(base, '#000000', 0.78));
    root.setProperty('--gold', point);
    root.setProperty('--gold-light', mix(point, '#ffffff', 0.55));
    root.setProperty('--gold-dark', mix(point, '#000000', 0.45));
    root.setProperty('--on-gold', mix(base, '#000000', 0.6));
    root.setProperty('--font', FONTS[t.글꼴] || FONTS[g.글꼴] || FONTS['고딕']);
    for (const [k, v] of Object.entries(C.기록종류)) root.setProperty('--k-' + G.kindKey(k), v.색 || '#e8b84a');
    document.title = C.제목;
    STORE = 'kit-' + (C.아이디 || C.제목).replace(/\s+/g, '_');
    try { Object.assign(G.settings, JSON.parse(localStorage.getItem(STORE + '-settings') || '{}')); } catch (e) {}
    return C;
  };
  // 기록 종류 이름 → css 에 쓸 수 있는 글자 (빨강 → red …)
  const KIND_KEYS = { 빨강: 'red', 파랑: 'blue', 초록: 'green', 노랑: 'yellow', 보라: 'purple', 개념: 'concept' };
  G.kindKey = (k) => KIND_KEYS[k] || 'x' + Array.from(String(k)).map((c) => c.codePointAt(0).toString(36)).join('');
  G.kindOf = (ev) => { const K = G.cfg.기록종류; return K[ev && ev.색] ? ev.색 : '파랑'; };
  G.kind = (ev) => G.cfg.기록종류[G.kindOf(ev)];

  // 모든 화 (my-game/story1.js … 의 DATA.ep1 …): 번호 순서
  G.episodes = () => Object.values(DATA).filter((d) => d && Array.isArray(d.막) && d.번호 != null).sort((a, b) => a.번호 - b.번호);

  // ─────────── 글 꾸미기 ───────────
  // **강조** 는 굵게, 🟥🟦🟩🟨🟪 는 작은 색 네모로 (기기 글꼴에 따라 깨지지 않게)
  const GEM = { '🟥': '빨강', '🟦': '파랑', '🟩': '초록', '🟨': '노랑', '🟪': '보라' };
  G.GEM = GEM;
  G.gemHtml = (ch, more = '') => '<span class="gem' + more + '" style="background:var(--k-' + G.kindKey(GEM[ch]) + ')"></span>';
  G.mdBold = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/🟥|🟦|🟩|🟨|🟪/gu, (m) => G.gemHtml(m));

  // ─────────── 그림 ───────────
  // key 예: 'characters/detective_smile'. 한 파일 게임은 파일 안의 그림(EMBED_IMG)을, 폴더 게임은 my-game/images/ 를 쓴다.
  // 그림이 없으면 자리 그림(이모지 얼굴, 색 배경)을 대신 띄운다. 나중에 그림 파일을 넣으면 코드를 고치지 않아도 바뀐다.
  G.imgBase = 'my-game/images/';
  const imgCache = {};
  G.missing = new Set();
  function findImg(key) {
    if (imgCache[key]) return imgCache[key];
    const E = window.EMBED_IMG;
    if (E && E[key]) return (imgCache[key] = Promise.resolve(E[key]));
    if (window.KIT_SINGLE) return (imgCache[key] = Promise.resolve(null)); // 한 파일 게임: 밖에서 찾지 않는다
    imgCache[key] = new Promise((resolve) => {
      const tries = ['.webp', '.png', '.jpg', '.svg'].map((x) => G.imgBase + key + x);
      const next = () => {
        const url = tries.shift();
        if (!url) { resolve(null); return; }
        const im = new Image();
        im.onload = () => resolve(url);
        im.onerror = next;
        im.src = url;
      };
      next();
    });
    return imgCache[key];
  }
  G.loadImg = async (key) => {
    if (!key || typeof key !== 'string') return '';
    const url = await findImg(key);
    if (url) return url;
    // 인물 그림: 그 표정 그림이 없으면 기본 표정 그림을 쓴다
    const m = /^characters\/(.+)_([a-z0-9_]+)$/i.exec(key);
    if (m && m[2] !== 'default') {
      const who = Object.values(G.cfg.인물).find((c) => key.startsWith('characters/' + c.파일 + '_'));
      if (who) { const d = await findImg('characters/' + who.파일 + '_default'); if (d) return d; }
    }
    G.missing.add(key);
    return G.placeholder(key);
  };

  // ─────────── 자리 그림 (그림이 없을 때) ───────────
  const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const FONT = 'font-family="Noto Sans KR, Malgun Gothic, Apple SD Gothic Neo, sans-serif"';
  const EMOJI = 'font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"';
  function charPlaceholder(file) {
    let name = file, c = {}, e = 'default';
    for (const [n, cc] of Object.entries(G.cfg.인물)) if (file.startsWith(cc.파일 + '_') || file === cc.파일) { name = n; c = cc; e = file.slice(cc.파일.length + 1) || 'default'; }
    const color = c.색 || hashColor(name);
    const body = 'M222 1024 C222 640 340 470 512 470 C684 470 802 640 802 1024 Z';
    const open = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.12)"/><stop offset="1" stop-color="rgba(0,0,0,.5)"/></linearGradient></defs>
      <path d="${body}" fill="${color}"/><path d="${body}" fill="url(#b)"/><path d="${body}" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="8"/>`;
    const badge = c.이모지 ? `<circle cx="512" cy="640" r="84" fill="rgba(255,255,255,.92)" stroke="rgba(0,0,0,.3)" stroke-width="6"/><text x="512" y="644" ${EMOJI} font-size="108" text-anchor="middle" dominant-baseline="central">${esc(c.이모지)}</text>` : '';
    // 실루엣: 표정 없이 차분한 그림자 (무거운 주제에 어울린다). 뒷모습도 같은 모양
    if (G.cfg.자리그림 === '실루엣' || e === 'back') {
      return open + `<circle cx="512" cy="270" r="176" fill="${color}"/><circle cx="512" cy="270" r="176" fill="url(#b)"/><circle cx="512" cy="270" r="176" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="8"/>
        ${e === 'back' ? '' : `<rect x="312" y="560" width="400" height="92" rx="46" fill="rgba(8,12,26,.78)"/><text x="512" y="608" ${FONT} font-size="${name.length > 5 ? 44 : 56}" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">${esc(name)}</text>`}</svg>`;
    }
    return open + `<circle cx="512" cy="270" r="180" fill="#ffd66e" stroke="rgba(0,0,0,.35)" stroke-width="8"/>
      <text x="512" y="270" ${EMOJI} font-size="368" text-anchor="middle" dominant-baseline="central">${EXPR_EMOJI[e] || EXPR_EMOJI.default}</text>${badge}</svg>`;
  }
  function courtPlaceholder(seat, desk) {
    const wall = { '변호인석': '#3b4a6b', '검사석': '#6b3b45', '증언대': '#4a5560', '피고석': '#5a5046', '재판장석': '#4a3f5e', '전경': '#3f4658' }[seat] || '#454b5a';
    const wood = '#7a5230', woodDark = '#4f3520';
    if (desk) {
      const shape = seat === '증언대' ? `<rect x="418" y="770" width="700" height="254" rx="14" fill="${wood}" stroke="${woodDark}" stroke-width="10"/><rect x="418" y="770" width="700" height="34" fill="${woodDark}"/>`
        : seat === '피고석' ? `<rect x="0" y="800" width="1536" height="26" fill="${woodDark}"/>${[...Array(13)].map((_, i) => `<rect x="${40 + i * 120}" y="826" width="26" height="198" fill="${wood}"/>`).join('')}`
        : `<rect x="0" y="790" width="1536" height="234" fill="${wood}"/><rect x="0" y="790" width="1536" height="30" fill="${woodDark}"/>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">${shape}</svg>`;
    }
    const wide = seat === '전경' ? `<rect x="518" y="330" width="500" height="250" rx="10" fill="${wood}" stroke="${woodDark}" stroke-width="8"/><rect x="60" y="640" width="430" height="150" rx="10" fill="${wood}" stroke="${woodDark}" stroke-width="8"/><rect x="1046" y="640" width="430" height="150" rx="10" fill="${wood}" stroke="${woodDark}" stroke-width="8"/><rect x="648" y="640" width="240" height="130" rx="10" fill="${woodDark}"/><text x="768" y="250" ${EMOJI} font-size="150" text-anchor="middle">⚖️</text>` : '';
    const bench = seat === '재판장석' ? `<rect x="0" y="700" width="1536" height="324" fill="${wood}"/><rect x="0" y="700" width="1536" height="36" fill="${woodDark}"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
      <defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="#14161f"/></linearGradient></defs>
      <rect width="1536" height="1024" fill="url(#w)"/>
      ${[...Array(7)].map((_, i) => `<rect x="${i * 256 - 6}" y="0" width="12" height="1024" fill="rgba(0,0,0,.14)"/>`).join('')}
      <rect x="0" y="860" width="1536" height="164" fill="rgba(0,0,0,.28)"/>${wide}${bench}
      <text x="1490" y="70" ${FONT} font-size="34" fill="rgba(255,255,255,.4)" text-anchor="end">${esc(seat)}</text></svg>`;
  }
  G.placeholder = (key) => {
    const [dir, file] = [key.slice(0, key.indexOf('/')), key.slice(key.indexOf('/') + 1)];
    if (dir === 'characters') return svgUrl(charPlaceholder(file));
    if (dir === 'backgrounds') {
      for (const [seat, z] of Object.entries(G.cfg.법정자리)) { if (z.배경 === key) return svgUrl(courtPlaceholder(seat, false)); if (z.책상 === key) return svgUrl(courtPlaceholder(seat, true)); }
      const found = Object.entries(G.cfg.배경).find(([, b]) => b.그림 === key || b.책상 === key);
      if (found && found[1].책상 === key) return ''; // 앞그림(책상)은 없으면 그리지 않는다
      const name = found ? found[0] : file, b = found ? found[1] : {};
      const cols = Array.isArray(b.색) ? b.색 : [b.색 || hashColor(name), '#0b0f1c'];
      return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cols[0]}"/><stop offset="1" stop-color="${cols[1] || '#0b0f1c'}"/></linearGradient></defs>
        <rect width="1536" height="1024" fill="url(#g)"/>
        <text x="768" y="430" ${EMOJI} font-size="430" text-anchor="middle" dominant-baseline="central" opacity=".5">${esc(b.이모지 || '')}</text>
        <rect x="0" y="800" width="1536" height="224" fill="rgba(0,0,0,.3)"/>
        <text x="60" y="90" ${FONT} font-size="44" font-weight="700" fill="rgba(255,255,255,.75)">${esc(name)}</text></svg>`);
    }
    if (dir === 'evidence') {
      // 지금 하는 화의 증거를 먼저 찾는다. 그림 이름을 적지 않은 증거는 'evidence/증거이름' 으로 찾는다
      const eps = [G.ep, ...G.episodes()].filter(Boolean);
      const all = eps.flatMap((d) => Object.entries(d.증거 || {}));
      const ev = (all.find(([id, e]) => e.그림 === key || e.자세히 === key || (!e.그림 && 'evidence/' + id === key)) || [])[1];
      const name = ev ? ev.이름 : file;
      const size = name.length > 12 ? 44 : name.length > 8 ? 56 : 68;
      return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
        <rect x="64" y="64" width="640" height="640" rx="28" fill="#efe4c8" stroke="#8a6a3a" stroke-width="10"/>
        <text x="384" y="300" ${EMOJI} font-size="260" text-anchor="middle" dominant-baseline="central">${esc((ev && ev.아이콘) || '📄')}</text>
        <text x="384" y="590" ${FONT} font-size="${size}" font-weight="700" fill="#3b2a0e" text-anchor="middle">${esc(name)}</text></svg>`);
    }
    return '';
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
  // 다른 그림으로 바꿀 때 옛 그림이 잠깐 보이지 않게 먼저 지우고 새 그림을 불러온다
  G.swapImg = (el, key) => {
    if (el.dataset.key !== (key || '')) { el.removeAttribute('src'); el.hidden = true; }
    return G.setImg(el, key);
  };
  G.imgEl = (key, cls) => { const el = G.h('img', { class: cls || null, alt: '' }); G.setImg(el, key); return el; };
  G.preload = (keys, onProgress) => {
    const list = [...new Set(keys.filter((k) => k && typeof k === 'string'))];
    let done = 0;
    return Promise.all(list.map((k) => G.loadImg(k).then(() => { done++; onProgress && onProgress(done, list.length); })));
  };

  // 인물 찾기. 화 데이터의 인물(G.ep.인물)에 적은 칸은 그 화에서만 바뀐다
  G.who = (name) => {
    const base = G.cfg.인물[name];
    const over = G.ep && G.ep.인물 && G.ep.인물[name];
    return over ? Object.assign({}, base, over) : base;
  };
  G.seatOf = (name) => (G.who(name) || {}).자리;
  G.charKey = (name, expr) => {
    const c = G.who(name);
    if (!c) return null;
    return 'characters/' + c.파일 + '_' + (G.cfg.표정[expr || '기본'] || 'default');
  };
  // 얼굴만 동그랗게 잘라 보여 주기 (대사창 옆 얼굴, 힌트 창, 증거 카드)
  // 인물.얼굴 = [가운데 x, 가운데 y, 반지름] (그림 1024×1024 기준). 적지 않으면 자리 그림의 얼굴 자리를 쓴다
  G.applyFace = (el, name, expr) => {
    const c = G.who(name);
    const key = G.charKey(name, expr);
    if (!c || !key) { el.style.backgroundImage = ''; return; }
    el.dataset.key = key;
    G.loadImg(key).then((url) => {
      if (el.dataset.key !== key) return;
      const [cx, cy, r] = (!G.isPlaceholder(url) && c.얼굴) || [512, 270, 200];
      el.style.backgroundSize = (1024 / (2 * r)) * 100 + '%';
      el.style.backgroundPosition = ((cx - r) / (1024 - 2 * r)) * 100 + '% ' + ((cy - r) / (1024 - 2 * r)) * 100 + '%';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundImage = url ? 'url("' + url + '")' : '';
    });
  };

  // ─────────── 설정(학생이 바꾸는 것) ───────────
  let STORE = 'kit';
  G.settings = { speed: '보통', bgm: 0.8, se: 0.9 };
  G.saveSettings = () => { try { localStorage.setItem(STORE + '-settings', JSON.stringify(G.settings)); } catch (e) {} };

  // ─────────── 소리 ───────────
  // my-game/audio/ 에 설정의 소리 표에 적은 이름으로 파일을 넣으면 소리가 난다. 파일이 없으면 조용히 넘어간다.
  G.audioBase = 'my-game/audio/';
  const audioExt = {}; // path → 찾은 주소, 또는 false(없음)
  function embeddedAudio(path) {
    const E = window.EMBED_AUDIO;
    if (!E || !E[path]) return null;
    if (E[path].startsWith('data:')) {
      const [head, b64] = E[path].split(',');
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      E[path] = URL.createObjectURL(new Blob([bytes], { type: head.slice(5).split(';')[0] }));
    }
    return E[path];
  }
  function playAudio(path, volume, loop) {
    return new Promise((resolve) => {
      if (!path || audioExt[path] === false) { resolve(null); return; }
      const inFile = embeddedAudio(path);
      if (!inFile && window.KIT_SINGLE) { audioExt[path] = false; resolve(null); return; }
      const tries = audioExt[path] ? [audioExt[path]] : inFile ? [inFile] : ['mp3', 'ogg', 'wav', 'm4a'].map((x) => G.audioBase + path + '.' + x);
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
  // '조사 음악 (잔잔하게)' → { 이름: '조사 음악', 꾸밈: '잔잔하게' }
  function splitName(table, full) {
    if (table[full]) return { 이름: full, 꾸밈: null };
    const m = String(full).match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (m && table[m[1]]) return { 이름: m[1], 꾸밈: m[2] };
    return { 이름: full, 꾸밈: null };
  }
  G.audio = {
    current: null, el: null, baseVol: 1, playing: new Set(),
    async bgm(full) {
      if (!full || full === '멈춤' || /^없음/.test(full)) { this.stop(); this.current = null; return; }
      const { 이름, 꾸밈 } = splitName(G.cfg.소리.BGM, full);
      const path = G.cfg.소리.BGM[이름];
      const vol = (꾸밈 && G.cfg.소리.꾸밈음량[꾸밈]) || 0.8;
      if (this.current === 이름 && this.el) { this.baseVol = vol; this.el.volume = vol * G.settings.bgm; return; }
      this.stop();
      this.current = 이름;
      if (!path) return;
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
      const { 이름, 꾸밈 } = splitName(G.cfg.소리.효과음, full);
      const path = G.cfg.소리.효과음[이름];
      if (!path) return;
      const vol = (꾸밈 && G.cfg.소리.꾸밈음량[꾸밈]) || 0.85;
      const a = await playAudio(path, vol * G.settings.se, false);
      if (!a) return;
      this.playing.add(a);
      a.addEventListener('ended', () => this.playing.delete(a));
    },
    // 계속 되풀이되는 효과음 (빗소리 등). stopLoop()로 멈춘다
    async loop(full) {
      if (this.loopName === full) return;
      this.stopLoop();
      this.loopName = full;
      const { 이름, 꾸밈 } = splitName(G.cfg.소리.효과음, full);
      const path = G.cfg.소리.효과음[이름];
      if (!path) return;
      const a = await playAudio(path, ((꾸밈 && G.cfg.소리.꾸밈음량[꾸밈]) || 0.6) * G.settings.se, true);
      if (!a) return;
      if (this.loopName !== full) { a.pause(); return; }
      this.loopEl = a;
    },
    stopLoop() { this.loopName = null; if (this.loopEl) { this.loopEl.pause(); this.loopEl = null; } },
    blip() { // 대사 글자음 (파일이 있을 때만)
      const path = G.cfg.소리.효과음['대사 글자음'];
      if (typeof audioExt[path] === 'string') playAudio(path, 0.35 * G.settings.se, false);
      else if (audioExt[path] === undefined && !this.probed) { this.probed = true; playAudio(path, 0, false); }
    },
  };

  // ─────────── 저장 (이 기기의 브라우저에 남는다) ───────────
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(STORE + k) || 'null') ?? d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(STORE + k, JSON.stringify(v)); } catch (e) {} };
  G.store = {
    load: () => read('-save', null),
    write: (data) => write('-save', data),
    clear() { try { localStorage.removeItem(STORE + '-save'); } catch (e) {} },
    // 끝까지 한 화 (화선택이 '순서'일 때 다음 화를 연다)
    cleared: () => read('-cleared', []),
    markCleared(n) { const c = this.cleared(); if (!c.includes(n)) { c.push(n); write('-cleared', c); } },
    notes: () => read('-notes', []),
    addNote(row) { const all = this.notes(); all.push(row); write('-notes', all.slice(-200)); },
  };
})();
