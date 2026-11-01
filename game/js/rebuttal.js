// 반박문 쓰기 (학생에게는 "친구에게 답장하기"): 게임 2(6화)가 끝난 뒤 쓰는 활동 화면 (기획서 12장, 6화 대본 「반박문 쓰기」)
// 0. 반·번호·이름 → 기억 노트 불러오기 → 1. "어쩔 수 없었다" 다시 고르기 → 1-2. 이유 → 2. 단톡방 메시지 고르기 → 2-2. 증거 제시 → 2-3. 답장 틀 채우기 → 저장
// 메시지와 고를 수 있는 증거는 game/data/ep6.js 의 반박문 표. 저장과 세 답은 기억 노트(note.js)와 같은 것을 쓴다 (G.sendToSheet, G.THINK).
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;

  const LOCAL_KEY = 'memory-court-rebuttals'; // 이 기기에도 답을 남겨 둔다 (저장 실패 대비)
  const NOTE_KEY = 'memory-court-notes'; // 기억 노트를 쓴 기기에 남은 답 (구글 시트에서 못 불러올 때 쓴다)
  const FRIENDS = ['A', 'B', 'C', 'D']; // 단톡방 친구 (특정 메신저처럼 보이지 않게 이름 없이)

  // 반박문에서 고를 증거: 6화 증거 표에서 찾는다 (앞 화에서 빌려 온 것은 그 화의 증거). 설명은 갱신이 끝난 것으로
  function evidenceMap(ids) {
    const out = {};
    for (const id of ids) {
      const e0 = DATA.ep6.증거[id];
      const src = e0 && e0.가져오기 ? (DATA[e0.가져오기] || { 증거: {} }).증거[e0.원래 || id] : e0;
      if (!src) { console.warn('[반박문 증거 없음]', id); continue; }
      const e = JSON.parse(JSON.stringify(src));
      for (const u of e.갱신 || []) e.설명 = u.방식 === '추가' ? e.설명.concat(u.설명) : u.설명.slice();
      out[id] = e;
    }
    return out;
  }

  // 받침이 있으면 '을', 없으면 '를' ("나치 경제의 실체를", "네로 명령 (1945)을"). 괄호 속 연도와 따옴표는 빼고 본다
  function objJosa(name) {
    const t = String(name).replace(/\s*\([^)]*\)\s*$/, '').replace(/['"「」『』]/g, '').trim();
    const c = t.charCodeAt(t.length - 1);
    if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 ? '을' : '를';
    return '을(를)';
  }

  // 기억 노트 3번 답 불러오기: 구글 시트(반·번호·이름이 모두 맞을 때만 돌려준다) → 없으면 이 기기에 남은 기억 노트
  async function loadNote(who) {
    const url = (DATA.설정 || {}).GAS주소;
    if (url) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + new URLSearchParams({ 반: who.반, 번호: who.번호, 이름: who.이름 }), { signal: ctrl.signal, redirect: 'follow' });
        clearTimeout(timer);
        const j = await res.json();
        if (j && j.ok && !j.없음 && j.선택) return { 선택: String(j.선택), 이유: String(j.이유 || '') };
      } catch (e) { /* 인터넷이 없거나 막혔으면 이 기기의 기록을 본다 */ }
    }
    try {
      const all = JSON.parse(localStorage.getItem(NOTE_KEY) || '[]');
      const r = all.slice().reverse().find((x) => String(x.반) === who.반 && String(x.번호) === who.번호 && String(x.이름).trim() === who.이름);
      if (r && r.선택) return { 선택: r.선택, 이유: r.이유 || '' };
    } catch (e) {}
    return null;
  }

  // [끝내기]를 누르면 처음 화면으로 돌아간다. [다시 쓰기]는 반·번호·이름을 그대로 두고 1번부터 (다시 저장하면 가장 최근 것이 쓰인다),
  // [짝도 쓰기]는 반·번호·이름부터 다시 (한 기기를 둘이 쓸 때. 대본은 [짝도 쓰기] / [끝내기], 기획서 12장은 [다시 쓰기] / [끝내기])
  G.rebuttal = () => new Promise(() => {
    G.box.hide();
    G.listening = false;
    if (G.updateTopbar) G.updateTopbar();
    const THINK = G.THINK || ['맞다, 어쩔 수 없었을 것 같다', '잘 모르겠다', '아니다, 다르게 할 수 있었다'];
    const MSGS = (DATA.ep6 && DATA.ep6.반박문 && DATA.ep6.반박문.메시지) || [];
    const evs = evidenceMap([...new Set(MSGS.flatMap((m) => m.증거))]);
    G.ev = evs; // 증거 카드와 증거 고르기 화면이 이 증거들을 쓰게 한다
    const ov = $('#overlay');
    const scr = h('div', { class: 'screen solid note rebuttal' });
    const panel = h('div', { class: 'panel' });
    scr.append(panel);
    ov.append(scr);
    let who = { 반: '', 번호: '', 이름: '' };
    let note = null; // 불러온 기억 노트 3번 답
    let a;

    const btn = (label, onclick, cls = 'ui-btn') => h('button', { class: cls, onclick }, label);
    const row = (...kids) => h('div', { class: 'row' }, ...kids);
    const q = (html, cls = 'q') => { const d = h('div', { class: cls }); d.innerHTML = G.mdBold(html); return d; };
    const page = (...kids) => { panel.innerHTML = ''; panel.scrollTop = 0; panel.append(h('h2', {}, '친구에게 답장하기'), ...kids); };
    const textInput = (ph, val) => h('input', { class: 'text', type: 'text', maxlength: '100', placeholder: ph, value: val || '', autocomplete: 'off' });
    const bubble = (who2, text, mine) => h('div', { class: 'chat-line' + (mine ? ' mine' : '') },
      mine ? null : h('span', { class: 'av av' + FRIENDS.indexOf(who2) }), h('div', { class: 'chat-body' }, mine ? null : h('span', { class: 'who' }, '친구 ' + who2), h('span', { class: 'bubble' }, text)));

    // 0. 반, 번호, 이름 → 기억 노트 불러오기
    function start() {
      a = { 선택: null, 이유: '', 메시지: null, 증거: null, 빈칸1: '', 빈칸2: '' };
      note = null;
      const cls = h('select', { 'aria-label': '반' }, h('option', { value: '' }, '반 고르기'));
      for (let i = 1; i <= 5; i++) cls.append(h('option', { value: String(i) }, i + '반'));
      const num = h('select', { 'aria-label': '번호' }, h('option', { value: '' }, '번호 고르기'));
      for (let i = 1; i <= 32; i++) num.append(h('option', { value: String(i) }, i + '번'));
      cls.value = who.반; num.value = who.번호;
      const name = textInput('이름', who.이름);
      name.maxLength = 20;
      const msg = h('div', { class: 'msg' });
      const next = async () => {
        if (!cls.value || !num.value || !name.value.trim()) { msg.textContent = '반, 번호, 이름을 모두 넣어 주세요.'; return; }
        who = { 반: cls.value, 번호: num.value, 이름: name.value.trim() };
        page(q('기억 노트를 불러오는 중…'));
        note = await loadNote(who);
        step1();
      };
      page(q('반과 번호, 이름을 넣어 주세요.'), h('div', { class: 'fields' }, cls, num, h('div', { class: 'wide' }, name)), msg, row(btn('다음', next)));
    }

    // 1. 게임 1 뒤에 고른 답을 보여 주고, 지금 다시 고르게 한다 (정답은 알려 주지 않는다)
    function step1() {
      const opts = h('div', { class: 'opts col' });
      const msg = h('div', { class: 'msg' });
      const draw = () => { opts.innerHTML = ''; THINK.forEach((t) => opts.append(btn(t, () => { a.선택 = t; draw(); }, 'ui-btn' + (a.선택 === t ? ' on' : '')))); };
      draw();
      const before = note
        ? [q('게임 1을 마쳤을 때 나는 이렇게 생각했어요.'), h('div', { class: 'fb then' }, h('b', {}, note.선택), note.이유 ? h('div', {}, '이유: ' + note.이유) : null), q('지금 다시 고른다면?', 'q small')]
        : [h('div', { class: 'fb then' }, '기억 노트 기록이 없어요.'), q("진범들은 모두 **'어쩔 수 없었다'**고 말했어요. 지금 여러분 생각은 어때요?", 'q small')];
      page(...before, opts, msg,
        row(btn('이전', start, 'ui-btn sub'), btn('다음', () => { if (!a.선택) { msg.textContent = '하나를 골라 주세요.'; return; } step1b(); })));
    }

    // 1-2. 이유 (한 줄 쓰기, 필수)
    function step1b() {
      const inp = textInput('한 줄로 써 주세요', a.이유);
      const msg = h('div', { class: 'msg' });
      page(q('왜 그렇게 생각했나요?'), inp, msg,
        row(btn('이전', step1, 'ui-btn sub'), btn('다음', () => { if (!inp.value.trim()) { msg.textContent = '한 줄을 써 주세요.'; return; } a.이유 = inp.value.trim(); step2(); })));
      setTimeout(() => inp.focus(), 50);
    }

    // 2. 단톡방 메시지 하나 고르기
    function step2() {
      const box = h('div', { class: 'chat' }, h('div', { class: 'chat-head' }, '우리 반 단톡방'));
      const msg = h('div', { class: 'msg' });
      const draw = () => {
        box.querySelectorAll('.chat-pick').forEach((e) => e.remove());
        MSGS.forEach((m, i) => {
          const b = h('button', { class: 'chat-pick' + (a.메시지 === i ? ' on' : ''), 'aria-label': m.글, onclick: () => { if (a.메시지 !== i) { a.메시지 = i; a.증거 = null; } draw(); } }, bubble(FRIENDS[i], m.글));
          box.append(b);
        });
      };
      draw();
      page(q('친구가 단톡방에 이런 말을 올렸어요. 하나를 골라 답장해 보세요.'), box, msg,
        row(btn('이전', step1b, 'ui-btn sub'), btn('다음', () => { if (a.메시지 == null) { msg.textContent = '메시지 하나를 골라 주세요.'; return; } step2b(); })));
    }

    // 2-2. 이 말이 틀렸다는 증거 제시 (그 메시지에 맞는 증거만 보여 준다). 고르면 카드 내용이 옆에 펼쳐진다
    async function pickEvidence() {
      const ids = MSGS[a.메시지].증거.filter((id) => evs[id]);
      const id = await G.record.open({ present: true, pick: { 제목: '이 말이 틀렸다는 증거를 고르세요', 증거: ids } });
      if (id) a.증거 = id;
      step2b();
    }
    function step2b() {
      const m = MSGS[a.메시지];
      const kids = [h('div', { class: 'chat small' }, bubble(FRIENDS[a.메시지], m.글)), q('이 말이 틀렸다는 증거를 **제시**하세요.')];
      if (a.증거) {
        const ev = evs[a.증거];
        const desc = h('div', { class: 'ev-desc' }, h('div', { class: 'ev-name' }, ev.이름), ...ev.설명.map((t) => { const p = h('p'); p.innerHTML = G.mdBold(t); return p; }));
        kids.push(h('div', { class: 'ev-open' }, h('div', { class: 'picked' }, G.renderCard(a.증거)), desc));
        kids.push(row(btn('이전', step2, 'ui-btn sub'), btn('다시 고르기', pickEvidence, 'ui-btn sub'), btn('다음', step3)));
      } else kids.push(row(btn('이전', step2, 'ui-btn sub'), btn('증거 제시하기', pickEvidence)));
      page(...kids);
    }

    // 2-3. 답장 틀 채우기 (한 줄 쓰기 두 칸, 필수)
    function step3() {
      const m = MSGS[a.메시지];
      const ev = evs[a.증거];
      const in1 = textInput('증거가 보여 주는 사실', a.빈칸1);
      const in2 = textInput('내 생각', a.빈칸2);
      const msg = h('div', { class: 'msg' });
      const reply = h('div', { class: 'reply' },
        h('div', { class: 'r-line' }, '그 말은 사실이 아니야.'),
        h('div', { class: 'r-line' }, h('span', { class: 'r-ev' }, '〔' + ev.이름 + '〕'), objJosa(ev.이름) + ' 보면,'), in1,
        h('div', { class: 'r-line' }, '그러니까'), in2);
      page(h('div', { class: 'chat small' }, bubble(FRIENDS[a.메시지], m.글)), q('답장을 써 보세요. 빈칸 두 곳을 채워요.'), reply, msg,
        row(btn('이전', step2b, 'ui-btn sub'), btn('저장하기', () => {
          if (!in1.value.trim() || !in2.value.trim()) { msg.textContent = '빈칸 두 곳을 모두 채워 주세요.'; return; }
          a.빈칸1 = in1.value.trim(); a.빈칸2 = in2.value.trim();
          save();
        })));
      setTimeout(() => in1.focus(), 50);
    }

    // 저장
    const replyText = () => '그 말은 사실이 아니야. ' + evs[a.증거].이름 + objJosa(evs[a.증거].이름) + ' 보면, ' + a.빈칸1 + '. 그러니까 ' + a.빈칸2 + '.';
    const sheetRow = () => ({
      종류: '반박문', 반: who.반, 번호: who.번호, 이름: who.이름,
      불러온선택: note ? note.선택 : '기록 없음', 선택: a.선택, 이유: a.이유,
      메시지: MSGS[a.메시지].글, 증거: evs[a.증거].이름, 빈칸1: a.빈칸1, 빈칸2: a.빈칸2,
    });
    function summary(r) {
      const box = h('div', { class: 'summary' });
      [['반·번호·이름', r.반 + '반 ' + r.번호 + '번 ' + r.이름], ['게임 1 뒤의 선택', r.불러온선택], ['지금 선택', r.선택], ['지금 이유', r.이유],
        ['고른 메시지', r.메시지], ['제시한 증거', r.증거], ['답장', replyText()]]
        .forEach(([k, v]) => box.append(h('div', {}, h('b', {}, k + ': '), v)));
      return box;
    }
    let fails = 0;
    async function save() {
      const r = sheetRow();
      try { const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); all.push(Object.assign({ 시각: new Date().toISOString() }, r)); localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(-200))); } catch (e) {}
      page(q('저장하는 중…'));
      const res = G.sendToSheet ? await G.sendToSheet(r) : 'no-url';
      const chatEnd = h('div', { class: 'chat small' }, bubble(FRIENDS[a.메시지], MSGS[a.메시지].글), bubble('', replyText(), true));
      const endRow = row(
        btn('다시 쓰기', () => { fails = 0; a = { 선택: null, 이유: '', 메시지: null, 증거: null, 빈칸1: '', 빈칸2: '' }; step1(); }, 'ui-btn sub'),
        btn('짝도 쓰기', () => { fails = 0; who = { 반: '', 번호: '', 이름: '' }; start(); }, 'ui-btn sub'),
        btn('끝내기', () => { G.store.clear(); location.reload(); }));
      if (res === 'ok' || res === 'sent') {
        page(q('답장을 저장했어요. 이제 여러분이 **증인**이에요.'), chatEnd, endRow);
        return;
      }
      if (res === 'no-url') {
        page(q('저장할 곳(구글 시트 주소)이 아직 정해지지 않아서, 이 기기에만 남겼어요. 선생님께 이 화면을 보여 주세요.'), summary(r), endRow);
        return;
      }
      fails++;
      page(q('저장하지 못했어요. 인터넷 연결을 확인하고 다시 보내 주세요.'), fails >= 2 ? summary(r) : '', row(btn('다시 보내기', save)), fails >= 2 ? endRow : '');
    }

    start();
  });
})();
