// 쓰기 활동: 게임이 끝난 뒤(또는 중간에) 학생이 생각을 고르고 쓰는 화면
// 답은 구글 시트로 보낼 수 있다 (my-game/settings.js 의 저장주소, 설치법은 docs/답_모으기_구글시트.md).
// 주소가 없으면 쓴 답을 화면에 보여 주고, 복사하거나 파일로 받을 수 있다. 어느 쪽이든 이 기기에도 남는다.
//
// { 쓰기: { 제목, 안내: [글…], 끝인사, 문항: [
//     { 종류: '증거', 이름, 질문 }                       모은 증거 가운데 하나 고르기
//     { 종류: '고르기', 이름, 질문, 보기: [...], 여러개, 풀이 }   보기 고르기 (풀이: 고른 뒤 보여 줄 글)
//     { 종류: '인물', 이름, 질문, 인물: [이름…] }         인물 얼굴 가운데 하나 고르기
//     { 종류: '한줄', 이름, 질문, 도움말, 최소 }           한 줄 쓰기
//     { 종류: '길게', 이름, 질문, 도움말, 최소 }           여러 줄 쓰기 (최소: 띄어쓰기 빼고 최소 글자 수)
//     { 종류: '답장', 이름, 보낸이, 메시지, 질문, 최소 }    잘못된 주장(메시지)에 증거 하나를 골라 답장 쓰기
// ] } }
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;

  // 구글 시트로 보내기 → 'ok' | 'sent'(보냈지만 확인은 못 함) | 'fail' | 'no-url'
  G.sendToSheet = async (row) => {
    const url = G.cfg.저장주소;
    if (!url) return 'no-url';
    const body = JSON.stringify(row);
    try {
      // text/plain 으로 보낸다 (application/json 이면 브라우저가 사전 요청을 보내는데 구글 앱스 스크립트가 받지 못한다)
      const res = await fetch(url, { method: 'POST', body, redirect: 'follow' });
      if (!res.ok) return 'fail';
      const j = await res.json().catch(() => ({}));
      return j.ok === false ? 'fail' : 'ok';
    } catch (e) {
      try { await fetch(url, { method: 'POST', body, mode: 'no-cors' }); return 'sent'; } catch (e2) { return 'fail'; }
    }
  };

  const count = (t) => String(t || '').replace(/\s/g, '').length;

  G.writing = (spec, opts = {}) => new Promise((finish) => {
    if (G.auto) { finish(); return; }
    G.box.hide();
    const items = G.list(spec.문항).filter((q) => q && (q.질문 || q.메시지));
    const title = spec.제목 || '쓰기 활동';
    // 증거 고르기 문항을 위해 이 화의 증거를 모두 쓸 수 있게 한다 (갱신이 끝난 설명으로)
    const evs = JSON.parse(JSON.stringify(G.ep.증거 || {}));
    for (const e of Object.values(evs)) { e.설명 = G.list(e.설명); for (const u of G.list(e.갱신)) e.설명 = u.방식 === '추가' ? e.설명.concat(G.list(u.설명)) : G.list(u.설명); }
    G.ev = evs;
    const pickable = Object.keys(evs).filter((id) => !G.kind(evs[id]).읽기전용);

    const scr = h('div', { class: 'screen solid note' });
    const panel = h('div', { class: 'panel' });
    scr.append(panel);
    $('#overlay').append(scr);
    const fields = G.list(G.cfg.학생정보);
    let who = {};
    let ans = items.map(() => null);

    const btn = (label, onclick, cls = 'ui-btn') => h('button', { class: cls, onclick }, label);
    const row = (...kids) => h('div', { class: 'row' }, ...kids);
    const q = (text, cls = 'q') => { const d = h('div', { class: cls }); d.innerHTML = G.mdBold(text); return d; };
    const page = (...kids) => { panel.innerHTML = ''; panel.scrollTop = 0; panel.append(h('h2', {}, title), ...kids.flat().filter(Boolean)); };
    const label = (it, i) => it.이름 || '문항 ' + (i + 1);

    function intro() {
      const box = h('div', { class: 'intro' });
      G.list(spec.안내).forEach((t) => box.append(q(t, 'p')));
      page(box, row(opts.바로 ? btn('돌아가기', () => { scr.remove(); finish(); }, 'ui-btn sub') : null, btn('시작하기', fields.length ? start : () => step(0))));
    }

    // 학생 정보 (설정의 학생정보: ['반', '번호', '이름']. 비우면 묻지 않는다)
    function start() {
      const inputs = fields.map((f) => {
        if (f === '반' || f === '번호') {
          const sel = h('select', { 'aria-label': f }, h('option', { value: '' }, f + ' 고르기'));
          for (let i = 1; i <= (f === '반' ? 15 : 40); i++) sel.append(h('option', { value: String(i) }, i + (f === '반' ? '반' : '번')));
          sel.value = who[f] || '';
          return sel;
        }
        return h('input', { class: 'text', type: 'text', maxlength: '20', placeholder: f, value: who[f] || '', autocomplete: 'off', 'aria-label': f });
      });
      const msg = h('div', { class: 'msg' });
      page(q(fields.join(', ') + '을(를) 넣어 주세요.'), h('div', { class: 'fields' }, inputs), msg, row(btn('다음', () => {
        if (inputs.some((el) => !el.value.trim())) { msg.textContent = '빈칸을 모두 채워 주세요.'; return; }
        fields.forEach((f, i) => { who[f] = inputs[i].value.trim(); });
        step(0);
      })));
    }

    function step(i) {
      if (i >= items.length) { save(); return; }
      const it = items[i];
      const msg = h('div', { class: 'msg' });
      const back = btn('이전', () => (i === 0 ? (fields.length ? start() : intro()) : step(i - 1)), 'ui-btn sub');
      const next = (ok, warn) => btn(i === items.length - 1 ? '저장하기' : '다음', () => { const w = ok(); if (w !== true) { msg.textContent = w || warn; return; } step(i + 1); });
      const head = [h('div', { class: 'prog' }, (i + 1) + ' / ' + items.length), q(it.질문)];

      if (it.종류 === '답장') {
        // 잘못된 주장에 증거를 들어 답장하기: 말풍선 → 증거 고르기 → 답장 쓰기
        const cur = ans[i] || (ans[i] = { 증거: null, 글: '' });
        const min = it.최소 || 10;
        const bubble = h('div', { class: 'bubble' }, h('b', {}, it.보낸이 || '친구'), h('span', {}, it.메시지 || ''));
        const pick = async () => { const id = await G.record.open({ present: true, pick: { 제목: '근거가 될 증거를 고르세요', 증거: pickable } }); if (id) cur.증거 = id; step(i); };
        const hd = [h('div', { class: 'prog' }, (i + 1) + ' / ' + items.length), bubble, q(it.질문 || '이 말에 **증거를 하나 골라** 답장을 써 주세요.')];
        if (!cur.증거 || !evs[cur.증거]) { page(...hd, row(btn('증거 고르기', pick)), msg, row(back)); return; }
        const inp = h('textarea', { class: 'text', rows: '4', maxlength: '400', placeholder: it.도움말 || '고른 증거를 근거로 답장을 써 주세요' });
        inp.value = cur.글 || '';
        const cnt = h('div', { class: 'cnt' });
        const upd = () => { cur.글 = inp.value; cnt.textContent = '글자 수: ' + count(inp.value) + ' (' + min + '자 이상)'; };
        inp.addEventListener('input', upd); upd();
        page(...hd, h('div', { class: 'picked small' }, G.renderCard(cur.증거), btn('다시 고르기', pick, 'ui-btn sub')), inp, cnt, msg,
          row(back, next(() => { cur.글 = inp.value.trim(); return count(cur.글) >= min ? true : '띄어쓰기를 빼고 ' + min + '글자 이상 써 주세요.'; })));
      } else if (it.종류 === '증거') {
        const pick = async () => { const id = await G.record.open({ present: true, pick: { 제목: '증거를 고르세요', 증거: pickable } }); if (id) ans[i] = id; step(i); };
        const kids = ans[i] && evs[ans[i]] ? [h('div', { class: 'picked' }, G.renderCard(ans[i])), row(btn('다시 고르기', pick, 'ui-btn sub'))] : [row(btn('증거 고르기', pick))];
        page(...head, ...kids, msg, row(back, next(() => !!ans[i], '증거를 하나 골라 주세요.')));
      } else if (it.종류 === '고르기' || it.종류 === '인물') {
        const multi = !!it.여러개;
        let cur = ans[i] == null ? [] : G.list(ans[i]);
        const opts2 = h('div', { class: it.종류 === '인물' ? 'faces' : 'opts' + (G.list(it.보기).some((t) => String(t).length > 12) ? ' col' : '') });
        const out = h('div');
        const draw = () => {
          opts2.innerHTML = '';
          const list = it.종류 === '인물' ? G.list(it.인물) : G.list(it.보기);
          list.forEach((v) => {
            const on = cur.includes(v);
            const click = () => { cur = multi ? (on ? cur.filter((x) => x !== v) : [...cur, v]) : [v]; ans[i] = multi ? cur : v; draw(); if (it.풀이) { out.innerHTML = ''; out.append(q(it.풀이, 'fb')); } };
            if (it.종류 === '인물') { const f = h('div', { class: 'face' }); G.applyFace(f, v, '기본'); opts2.append(h('button', { class: on ? 'on' : '', onclick: click }, f, h('b', {}, v))); }
            else opts2.append(btn(v, click, 'ui-btn' + (on ? ' on' : '')));
          });
        };
        draw();
        if (it.풀이 && cur.length) out.append(q(it.풀이, 'fb'));
        page(...head, multi ? q('여러 개 골라도 돼요.', 'q small') : null, opts2, out, msg, row(back, next(() => cur.length > 0, '하나 골라 주세요.')));
      } else {
        const long = it.종류 === '길게';
        const min = it.최소 || (long ? 10 : 1);
        const inp = long ? h('textarea', { class: 'text', rows: '5', maxlength: '600', placeholder: it.도움말 || '내 생각을 써 주세요' })
          : h('input', { class: 'text', type: 'text', maxlength: '120', placeholder: it.도움말 || '한 줄로 써 주세요', autocomplete: 'off' });
        inp.value = ans[i] || '';
        const cnt = h('div', { class: 'cnt' });
        const upd = () => { cnt.textContent = long ? '글자 수: ' + count(inp.value) + (min > 1 ? ' (' + min + '자 이상)' : '') : ''; };
        inp.addEventListener('input', upd); upd();
        page(...head, inp, cnt, msg, row(back, next(() => { ans[i] = inp.value.trim(); return count(ans[i]) >= min ? true : (min > 1 ? '띄어쓰기를 빼고 ' + min + '글자 이상 써 주세요.' : '답을 써 주세요.'); })));
        setTimeout(() => inp.focus(), 50);
      }
    }

    const shown = (it, v) => (v == null ? '' : it.종류 === '증거' ? (evs[v] ? evs[v].이름 : v) : Array.isArray(v) ? v.join(', ') : String(v));
    const makeRow = () => ({ 종류: title, 게임: G.cfg.제목, 화: G.ep.번호, 학생: fields.map((f) => [f, who[f] || '']),
      답: items.flatMap((it, i) => (it.종류 === '답장' ? [[label(it, i) + ' (증거)', shown({ 종류: '증거' }, (ans[i] || {}).증거)], [label(it, i), (ans[i] || {}).글 || '']] : [[label(it, i), shown(it, ans[i])]])) });
    const asText = (r) => [title, ...r.학생.map(([k, v]) => k + ': ' + v), '', ...r.답.map(([k, v]) => '■ ' + k + '\n' + v)].join('\n');
    function summary(r) {
      const box = h('div', { class: 'summary' });
      [...r.학생, ...r.답].forEach(([k, v]) => box.append(h('div', {}, h('b', {}, k + ': '), v)));
      return box;
    }
    let fails = 0;
    async function save() {
      const r = makeRow();
      G.store.addNote(Object.assign({ 시각: new Date().toISOString() }, r));
      page(q('저장하는 중…'));
      const res = await G.sendToSheet(r);
      const copy = btn('답 복사하기', async () => { try { await navigator.clipboard.writeText(asText(r)); copy.textContent = '복사했어요!'; } catch (e) { copy.textContent = '복사하지 못했어요'; } }, 'ui-btn sub');
      const file = btn('파일로 받기', () => {
        const a = h('a', { href: URL.createObjectURL(new Blob([asText(r)], { type: 'text/plain' })), download: 'answer' + r.학생.map((x) => x[1]).filter((v) => /^\d+$/.test(v)).map((v) => '-' + v).join('') + '.txt' });
        document.body.append(a); a.click(); a.remove();
      }, 'ui-btn sub');
      const endRow = row(btn('다시 쓰기', () => { fails = 0; step(0); }, 'ui-btn sub'), btn('끝내기', () => { scr.remove(); finish(); }));
      if (res === 'ok' || res === 'sent') { page(q(spec.끝인사 || '답을 저장했어요. 수고했어요!'), endRow); return; }
      if (res === 'no-url') { page(q(spec.끝인사 || '다 썼어요! 아래 답을 선생님께 보여 주거나 내 주세요.'), summary(r), row(copy, file), endRow); return; }
      fails++;
      page(q('저장하지 못했어요. 인터넷 연결을 확인하고 다시 보내 주세요.'), fails >= 2 ? summary(r) : null, row(btn('다시 보내기', save)), fails >= 2 ? row(copy, file) : null, fails >= 2 ? endRow : null);
    }

    intro();
  });
})();
