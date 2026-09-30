// 기억 노트: 게임 1(1~3화)이 끝난 뒤 쓰는 활동 화면 (기획서 11장)
// 답은 GAS 웹 앱으로 구글 시트에 저장한다 (기획서 13장). 주소는 game/data/common.js 의 DATA.설정.GAS주소
// 주소가 없거나 저장에 실패하면, 쓴 답을 화면에 그대로 보여 주어 답이 사라지지 않게 한다.
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;

  const REASONS = ['처음 알았다', '슬펐다', '화가 났다', '놀라웠다', '억울했다'];
  // [인물, 설명, 나온 화]
  const CULPRITS = [['오카다', '탄광 감독관', 1], ['사토', '광업소장', 1], ['모리', '차관', 1], ['야마모토', '중위', 2], ['다나카', '소좌', 3]];
  const THINK = ['맞다, 어쩔 수 없었을 것 같다', '잘 모르겠다', '아니다, 다르게 할 수 있었다'];
  const LOCAL_KEY = 'memory-court-notes'; // 이 기기에도 답을 남겨 둔다 (저장 실패 대비)

  // 1~3화 증거 (갱신이 끝난 설명). 화마다 이름이 겹치지 않게 "화:이름"으로 부른다. 해 본 화의 증거만 넣는다.
  function evidenceOf(played) {
    const out = {};
    for (const n of [1, 2, 3]) {
      const ep = DATA['ep' + n];
      if (!ep || !played.includes(n)) continue;
      for (const [id, e0] of Object.entries(ep.증거)) {
        if (e0.색 === '개념' || e0.표시전용) continue;
        const e = JSON.parse(JSON.stringify(e0));
        for (const u of e.갱신 || []) e.설명 = u.방식 === '추가' ? e.설명.concat(u.설명) : u.설명.slice();
        out[n + ':' + id] = e;
      }
    }
    return out;
  }

  async function send(row) {
    const url = (DATA.설정 || {}).GAS주소;
    if (!url) return 'no-url';
    try {
      // text/plain 으로 보낸다 (application/json 이면 브라우저가 사전 요청을 보내는데 GAS가 받지 못한다)
      const res = await fetch(url, { method: 'POST', body: JSON.stringify(row), redirect: 'follow' });
      if (!res.ok) return 'fail';
      const j = await res.json().catch(() => ({}));
      return j.ok === false ? 'fail' : 'ok';
    } catch (e) {
      return 'fail';
    }
  }

  // [끝내기]를 누르면 끝난다 (그 뒤 게임 2 예고로 이어진다)
  G.memoryNote = (spec) => new Promise((finish) => {
    G.box.hide();
    // 게임 1은 1화부터 하므로 1화와 3화는 늘 넣는다. 2화는 건너뛸 수 있어서, 한 기록이 있을 때만 넣는다 (기획서 11장)
    const played = [...new Set([...G.store.played(), 1, 3])];
    const evs = evidenceOf(played);
    G.ev = evs; // 증거 카드와 법정 기록 화면이 이 증거들을 쓰게 한다
    const ov = $('#overlay');
    const scr = h('div', { class: 'screen solid note' });
    const panel = h('div', { class: 'panel' });
    scr.append(panel);
    ov.append(scr);
    let who = { 반: '', 번호: '', 이름: '' };
    let a;

    const btn = (label, onclick, cls = 'ui-btn') => h('button', { class: cls, onclick }, label);
    const row = (...kids) => h('div', { class: 'row' }, ...kids);
    const q = (html) => { const d = h('div', { class: 'q' }); d.innerHTML = G.mdBold(html); return d; };
    const page = (...kids) => { panel.innerHTML = ''; panel.scrollTop = 0; panel.append(h('h2', {}, '기억 노트'), ...kids); };
    const textInput = (ph, val) => h('input', { class: 'text', type: 'text', maxlength: '100', placeholder: ph, value: val || '', autocomplete: 'off' });

    // 안내 (대본의 [활동 화면] 글)
    function intro() {
      const box = h('div', { class: 'intro' });
      spec.안내.forEach((t) => { const p = h('p'); p.innerHTML = G.mdBold(t); box.append(p); });
      page(box, row(btn('기억 노트 쓰기', start)));
    }

    // 0. 반, 번호, 이름
    function start() {
      a = { 증거: null, 이유버튼: [], 이유한줄: '', 잘못한사람: null, 잘못: '', 벌: null, 선택: null, 이유: '' };
      const cls = h('select', { 'aria-label': '반' }, h('option', { value: '' }, '반 고르기'));
      for (let i = 1; i <= 5; i++) cls.append(h('option', { value: String(i) }, i + '반'));
      const num = h('select', { 'aria-label': '번호' }, h('option', { value: '' }, '번호 고르기'));
      for (let i = 1; i <= 32; i++) num.append(h('option', { value: String(i) }, i + '번'));
      cls.value = who.반; num.value = who.번호;
      const name = textInput('이름', who.이름);
      name.maxLength = 20;
      const msg = h('div', { class: 'msg' });
      const next = () => {
        if (!cls.value || !num.value || !name.value.trim()) { msg.textContent = '반, 번호, 이름을 모두 넣어 주세요.'; return; }
        who = { 반: cls.value, 번호: num.value, 이름: name.value.trim() };
        step1();
      };
      page(q('기억 노트를 쓸 차례예요. 반과 번호, 이름을 넣어 주세요.'),
        h('div', { class: 'fields' }, cls, num, h('div', { class: 'wide' }, name)), msg, row(btn('다음', next)));
    }

    // 1. 가장 기억에 남는 증거 제시
    async function pickEvidence() {
      const id = await G.record.open({ present: true, pick: { 제목: '기억에 남는 증거를 고르세요', 증거: Object.keys(evs) } });
      if (id) { a.증거 = id; }
      step1();
    }
    function step1() {
      const kids = [q('1부에서 가장 기억에 남는 증거를 **제시**해 주세요.')];
      if (a.증거) {
        kids.push(h('div', { class: 'picked' }, G.renderCard(a.증거)));
        kids.push(row(btn('다시 고르기', pickEvidence, 'ui-btn sub'), btn('다음', step1b)));
      } else kids.push(row(btn('증거 고르기', pickEvidence)));
      page(...kids);
    }

    // 1-2. 왜 기억에 남았나요? (여러 개 고르기 + 한 줄 더 쓰기는 선택)
    function step1b() {
      const opts = h('div', { class: 'opts' });
      const draw = () => {
        opts.innerHTML = '';
        REASONS.forEach((r) => opts.append(btn(r, () => { a.이유버튼 = a.이유버튼.includes(r) ? a.이유버튼.filter((x) => x !== r) : [...a.이유버튼, r]; draw(); }, 'ui-btn' + (a.이유버튼.includes(r) ? ' on' : ''))));
      };
      draw();
      const msg = h('div', { class: 'msg' });
      page(q('왜 기억에 남았나요? (여러 개 골라도 돼요)'), opts, msg,
        row(btn('이전', step1, 'ui-btn sub'), btn('다음', () => {
          if (!a.이유버튼.length) { msg.textContent = '하나 이상 골라 주세요.'; return; }
          step2();
        })));
    }

    // 2. 진짜 잘못한 사람 (2화를 하지 않았으면 야마모토는 나오지 않는다)
    function step2() {
      const faces = h('div', { class: 'faces' });
      const msg = h('div', { class: 'msg' });
      const draw = () => {
        faces.innerHTML = '';
        for (const [name, role, ep] of CULPRITS) {
          if (!played.includes(ep)) continue;
          const f = h('div', { class: 'face' });
          G.applyFace(f, name, '기본');
          faces.append(h('button', { class: a.잘못한사람 === name ? 'on' : '', onclick: () => { a.잘못한사람 = name; draw(); } }, f, h('b', {}, name), h('small', {}, role)));
        }
      };
      draw();
      page(q('1부에서 **진짜 잘못한 사람**은 누구일까요? 한 명을 골라 주세요.'), faces, msg,
        row(btn('이전', step1b, 'ui-btn sub'), btn('다음', () => { if (!a.잘못한사람) { msg.textContent = '한 명을 골라 주세요.'; return; } step2b(); })));
    }

    // 2-2. 그 사람의 잘못 (한 줄 쓰기, 필수)
    function step2b() {
      const inp = textInput('예: ～을 시켰다, ～을 숨겼다', a.잘못);
      const msg = h('div', { class: 'msg' });
      page(q('이 사람이 한 잘못을 한 줄로 써 주세요.'), inp, msg,
        row(btn('이전', step2, 'ui-btn sub'), btn('다음', () => { if (!inp.value.trim()) { msg.textContent = '한 줄을 써 주세요.'; return; } a.잘못 = inp.value.trim(); step2c(); })));
      setTimeout(() => inp.focus(), 50);
    }

    // 2-3. 실제로 벌을 받았을까? 고르면 바로 알려 준다
    function step2c() {
      const opts = h('div', { class: 'opts' });
      const out = h('div');
      const choose = (v) => {
        a.벌 = v;
        opts.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.textContent === v));
        out.innerHTML = '';
        const fb = h('div', { class: 'fb' });
        fb.innerHTML = G.mdBold("받지 않았어요. 1부의 진범들은 아무도 벌을 받지 않았어요. 그래서 1부의 판결은 **'미결'**, 아직 끝나지 않은 사건이에요.");
        out.append(fb, row(btn('다음', step3)));
      };
      ['받았다', '받지 않았다'].forEach((v) => opts.append(btn(v, () => choose(v))));
      page(q('이 사람은 실제로 벌을 받았을까요?'), opts, out, row(btn('이전', step2b, 'ui-btn sub')));
    }

    // 3. "어쩔 수 없었다" (정답을 알려 주지 않는다)
    function step3() {
      const opts = h('div', { class: 'opts col' });
      const msg = h('div', { class: 'msg' });
      const draw = () => { opts.innerHTML = ''; THINK.forEach((t) => opts.append(btn(t, () => { a.선택 = t; draw(); }, 'ui-btn' + (a.선택 === t ? ' on' : '')))); };
      draw();
      page(q("진범들은 모두 **'어쩔 수 없었다'**고 말했어요. 여러분 생각은 어때요?"), opts, msg,
        row(btn('이전', step2c, 'ui-btn sub'), btn('다음', () => { if (!a.선택) { msg.textContent = '하나를 골라 주세요.'; return; } step3b(); })));
    }

    // 3-2. 이유 (한 줄 쓰기, 필수)
    function step3b() {
      const inp = textInput('한 줄로 써 주세요', a.이유);
      const msg = h('div', { class: 'msg' });
      page(q('왜 그렇게 생각했나요? 한 줄이면 충분해요.'), inp, msg,
        row(btn('이전', step3, 'ui-btn sub'), btn('저장하기', () => { if (!inp.value.trim()) { msg.textContent = '한 줄을 써 주세요.'; return; } a.이유 = inp.value.trim(); save(); })));
      setTimeout(() => inp.focus(), 50);
    }

    // 저장
    const noteRow = () => ({
      종류: '기억노트', 반: who.반, 번호: who.번호, 이름: who.이름, 화2: played.includes(2) ? '했음' : '안 함',
      증거: evs[a.증거] ? evs[a.증거].이름 : '', 이유버튼: a.이유버튼.join(', '), 이유한줄: a.이유한줄,
      잘못한사람: a.잘못한사람, 잘못: a.잘못, 벌: a.벌, 선택: a.선택, 이유: a.이유,
    });
    function summary(r) {
      const box = h('div', { class: 'summary' });
      [['반·번호·이름', r.반 + '반 ' + r.번호 + '번 ' + r.이름], ['기억에 남은 증거', r.증거], ['기억에 남은 이유', r.이유버튼 + (r.이유한줄 ? ' / ' + r.이유한줄 : '')],
        ['잘못한 사람', r.잘못한사람], ['그 사람의 잘못', r.잘못], ['벌을 받았을까', r.벌], ['어쩔 수 없었다', r.선택], ['이유', r.이유]]
        .forEach(([k, v]) => box.append(h('div', {}, h('b', {}, k + ': '), v)));
      return box;
    }
    let fails = 0;
    async function save() {
      const r = noteRow();
      try { const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); all.push(Object.assign({ 시각: new Date().toISOString() }, r)); localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(-200))); } catch (e) {}
      page(q('저장하는 중…'));
      const res = await send(r);
      // 다시 쓰기: 반·번호·이름은 그대로 두고 처음부터 다시 쓴다 (다시 저장하면 가장 최근 것이 쓰인다)
      const endRow = row(btn('다시 쓰기', () => { fails = 0; start(); }, 'ui-btn sub'), btn('끝내기', () => { scr.remove(); finish(); }));
      if (res === 'ok') {
        page(q('기억 노트를 저장했어요. 정답은 없어요. 게임 2가 끝나면 다시 물어볼게요.'), endRow);
        return;
      }
      if (res === 'no-url') {
        page(q('저장할 곳(구글 시트 주소)이 아직 정해지지 않아서, 이 기기에만 남겼어요. 선생님께 이 화면을 보여 주세요.'), summary(r), endRow);
        return;
      }
      fails++;
      page(q('저장하지 못했어요. 인터넷 연결을 확인하고 다시 보내 주세요.'), fails >= 2 ? summary(r) : '', row(btn('다시 보내기', save)), fails >= 2 ? endRow : '');
    }

    intro();
  });
})();
