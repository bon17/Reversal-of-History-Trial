// 선생님 창: 비밀번호를 넣으면 재판 공략 가이드를 보여 준다 (게임 1은 1~3화, 게임 2는 4~6화)
// 공략은 game/data/teacher_guide.js 에 암호화되어 들어 있다 (tools/build_teacher_guide.mjs 로 만든다).
// 비밀번호가 맞아야 풀리므로, 게임 파일 안에는 비밀번호도 정답도 글자 그대로 들어 있지 않다.
// 처음 화면 오른쪽 위 [선생님] 단추와 설정 창의 [선생님 창] 단추로 연다.
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;
  const ov = $('#overlay');
  const PART = window.GAME_PART || 0;
  const PART_NAME = { 1: '게임 1 · 제1화~제3화', 2: '게임 2 · 제4화~제6화' };

  // 한글 자판인 채로 친 비밀번호를 영문 자판 글자로 바꾼다 (두벌식). 예: ㅗㅑㄴ새교 → history
  const KEY = {
    ㄱ: 'r', ㄲ: 'R', ㄴ: 's', ㄷ: 'e', ㄸ: 'E', ㄹ: 'f', ㅁ: 'a', ㅂ: 'q', ㅃ: 'Q', ㅅ: 't', ㅆ: 'T', ㅇ: 'd', ㅈ: 'w', ㅉ: 'W', ㅊ: 'c', ㅋ: 'z', ㅌ: 'x', ㅍ: 'v', ㅎ: 'g',
    ㅏ: 'k', ㅐ: 'o', ㅑ: 'i', ㅒ: 'O', ㅓ: 'j', ㅔ: 'p', ㅕ: 'u', ㅖ: 'P', ㅗ: 'h', ㅘ: 'hk', ㅙ: 'ho', ㅚ: 'hl', ㅛ: 'y', ㅜ: 'n', ㅝ: 'nj', ㅞ: 'np', ㅟ: 'nl', ㅠ: 'b', ㅡ: 'm', ㅢ: 'ml', ㅣ: 'l',
    ㄳ: 'rt', ㄵ: 'sw', ㄶ: 'sg', ㄺ: 'fr', ㄻ: 'fa', ㄼ: 'fq', ㄽ: 'ft', ㄾ: 'fx', ㄿ: 'fv', ㅀ: 'fg', ㅄ: 'qt',
  };
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  function qwerty(s) {
    let out = '';
    for (const ch of s) {
      const i = ch.charCodeAt(0) - 0xac00;
      if (i >= 0 && i < 11172) out += KEY[CHO[Math.floor(i / 588)]] + KEY[JUNG[Math.floor((i % 588) / 28)]] + (i % 28 ? KEY[JONG[i % 28]] : '');
      else out += KEY[ch] || ch;
    }
    return out;
  }
  // tools/build_teacher_guide.mjs 의 norm 과 같아야 한다 (대소문자, 띄어쓰기는 가리지 않는다)
  const normPw = (s) => qwerty(String(s || '')).toLowerCase().replace(/\s+/g, '');

  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const pages = {}; // 한 번 푼 공략 (새로 고침하기 전까지만 기억한다)
  const urls = {}; // 새 창, 파일 저장에 쓰는 주소 (새 창을 새로 고쳐도 보이게 지우지 않는다)
  const urlOf = (p) => urls[p] || (urls[p] = URL.createObjectURL(new Blob([pages[p]], { type: 'text/html;charset=utf-8' })));

  // 비밀번호로 공략을 푼다. 틀리면 'wrong', 이 브라우저에서 못 풀면 'nocrypto'
  async function unlock(pw) {
    const T = window.TEACHER_GUIDE;
    if (!T || !T.parts) throw new Error('noguide');
    const subtle = window.crypto && window.crypto.subtle;
    if (!subtle) throw new Error('nocrypto');
    const base = await subtle.importKey('raw', new TextEncoder().encode(normPw(pw)), 'PBKDF2', false, ['deriveKey']);
    const key = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(T.salt), iterations: T.iter }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const want = PART ? [String(PART)] : Object.keys(T.parts);
    const got = {};
    for (const p of want) {
      if (!T.parts[p]) continue;
      try {
        got[p] = new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(T.parts[p].iv) }, key, unb64(T.parts[p].data)));
      } catch (e) {
        throw new Error('wrong');
      }
    }
    if (!Object.keys(got).length) throw new Error('noguide');
    Object.assign(pages, got);
  }

  // 창 하나를 띄우고, Esc로 닫을 수 있게 한다 (설정 창 위에 열려도 닫으면 설정 창의 Esc가 돌아온다)
  function openTop(el, onClose) {
    const prev = G.closeTopOverlay;
    const close = () => { el.remove(); G.closeTopOverlay = prev; if (onClose) onClose(); };
    G.closeTopOverlay = close;
    ov.append(el);
    return close;
  }

  // ─────────── 비밀번호 넣기 ───────────
  function passwordScreen() {
    const input = h('input', {
      class: 'code-input text', type: 'password', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
      maxlength: '40', placeholder: '비밀번호', 'aria-label': '선생님 비밀번호',
    });
    const msg = h('div', { class: 'msg', role: 'status' });
    const okBtn = h('button', { class: 'ui-btn', onclick: () => go() }, '열기');
    let busy = false;
    const go = async () => {
      if (busy) return;
      if (!input.value.trim()) { msg.textContent = '비밀번호를 넣어 주세요.'; input.focus(); return; }
      busy = true; okBtn.disabled = true; msg.textContent = '여는 중…';
      try {
        await unlock(input.value);
        close();
        viewer();
      } catch (e) {
        msg.textContent = {
          wrong: '비밀번호가 맞지 않아요.',
          nocrypto: '이 브라우저에서는 열 수 없어요. 크롬, 엣지, 사파리의 새 버전에서 열어 주세요.',
          noguide: '이 게임 파일에는 공략 가이드가 들어 있지 않아요.',
        }[e.message] || '열지 못했어요. (' + e.message + ')';
        input.select();
      }
      busy = false; okBtn.disabled = false;
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    const s = h('div', { class: 'screen teacher-login', onclick: (e) => { if (e.target === s) close(); } },
      h('div', { class: 'panel' },
        h('h2', {}, '선생님 창'),
        h('p', { class: 't-what' }, '재판 공략 가이드', h('br'), PART ? PART_NAME[PART] : '게임 1 · 게임 2'),
        h('p', { class: 't-how' }, '비밀번호를 넣으면 볼 수 있어요.'),
        input, msg,
        h('div', { class: 'row' },
          h('button', { class: 'ui-btn sub', onclick: () => close() }, '닫기'),
          okBtn)));
    const close = openTop(s);
    setTimeout(() => input.focus(), 50);
  }

  // ─────────── 공략 보기 ───────────
  // 게임 안 창(iframe)으로 보여 주고, [새 창에서 열기]와 [파일로 저장]으로 다른 창에서도 볼 수 있게 한다
  function viewer() {
    const parts = Object.keys(pages).sort();
    let cur = parts[0];
    const frame = h('iframe', { class: 'guide-frame', title: '재판 공략 가이드', sandbox: 'allow-scripts' });
    const title = h('div', { class: 't-title' });
    const msg = h('div', { class: 't-msg', role: 'status' });
    const seg = h('div', { class: 'seg', hidden: parts.length < 2 });
    const show = (p) => {
      cur = p;
      title.textContent = '재판 공략 가이드 · ' + (PART_NAME[p] || '게임 ' + p);
      frame.srcdoc = pages[p];
      seg.innerHTML = '';
      parts.forEach((q) => seg.append(h('button', { class: 'ui-btn' + (q === cur ? ' on' : ''), onclick: () => show(q) }, PART_NAME[q] ? PART_NAME[q].replace(' · ', ' ') : '게임 ' + q)));
      msg.textContent = '';
    };
    const openWindow = () => {
      const w = window.open(urlOf(cur), '_blank');
      msg.textContent = w ? '' : '새 창이 막혔어요. 브라우저의 팝업 차단을 풀거나 [파일로 저장]을 써 주세요.';
    };
    const save = () => {
      const a = h('a', { href: urlOf(cur), download: '기억의_법정_공략' + (PART_NAME[cur] ? '_게임' + cur : '') + '.html' });
      document.body.append(a);
      a.click();
      a.remove();
      msg.textContent = '파일을 받았어요. 받은 파일을 열면 인터넷 창에서 볼 수 있어요.';
    };
    const s = h('div', { class: 'screen teacher-view' },
      h('div', { class: 't-bar' },
        title, seg,
        h('div', { class: 't-btns' },
          h('button', { class: 'ui-btn sub', onclick: openWindow }, '새 창에서 열기'),
          h('button', { class: 'ui-btn sub', onclick: save }, '파일로 저장'),
          h('button', { class: 'ui-btn', onclick: () => close() }, '닫기'))),
      msg, frame);
    const close = openTop(s);
    show(cur);
  }

  G.teacher = {
    open() {
      if (Object.keys(pages).length) viewer();
      else passwordScreen();
    },
  };
})();
