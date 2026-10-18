// 증거 카드와 법정 기록 화면
(function () {
  const G = window.G;
  const h = G.h;

  const FRAME = { 빨강: 'ui/card_red', 파랑: 'ui/card_blue', 초록: 'ui/card_green', 개념: 'ui/card_concept', 검찰: 'ui/card_prosecution' };
  const KIND = { 빨강: ['🟥', '피해 기록'], 파랑: ['🟦', '책임 기록'], 초록: ['🟩', '선택 기록'], 개념: ['', '개념 카드'], 검찰: ['', '검찰 측 증거'] };

  G.kindName = (ev) => (KIND[ev.색] || ['', ''])[1];
  G.kindLabel = (ev) => { const [g, t] = KIND[ev.색] || ['', '']; return (g ? g + ' ' : '') + t; };
  // 증거 알림 대사창 글: 첫 줄 = 이름 (비고), 다음 줄부터 대본의 설명
  G.evidenceText = (ev) => {
    const title = (KIND[ev.색][0] ? KIND[ev.색][0] + ' ' : '') + ev.이름 + (ev.비고 ? ' (' + ev.비고 + ')' : '');
    return title + '\n' + ev.설명.join('\n');
  };

  // 증거 그림 한 장. 겹침: 위에 겹쳐 그릴 그림 (3화 지도 위의 위안소 점). 채움(카드 칸만): 칸을 꽉 채우고 이 위치를 기준으로 자른다 (세로 사진의 얼굴이 보이게)
  // 실제 사진이 여러 장인 증거(5화 신발과 가방 더미): 법정 기록 칸, 큰 그림, 카드, 획득 알림에서는 사진을 모두 함께 보여 준다
  // (넓은 칸은 옆으로, 좁은 칸은 위아래로 나란히. 한 장씩 크게 보는 것은 [자세히 보기]의 [다음 사진])
  G.evImg = (ev, fill) => {
    if (ev.사진 && ev.뒤집기 && ev.뒤집기.그림.length > 1) return h('div', { class: 'ev-duo' }, h('div', { class: 'duo-in' }, ...ev.뒤집기.그림.map((k) => G.imgEl(k))));
    const main = G.imgEl(ev.그림);
    if (fill && ev.채움) { main.style.objectFit = 'cover'; main.style.objectPosition = ev.채움; }
    if (!ev.겹침) return main;
    return h('div', { class: 'ev-stack' }, main, G.imgEl(ev.겹침));
  };

  // 실제 사진의 출처 문구 (없으면 ''). 사진이 여러 장(뒤집기)이고 장마다 출처가 다르면 뒤집기.출처에서 그 장의 것을 고른다 (5화 신발 → 가방)
  G.sourceOf = (ev, key) => {
    const f = ev.뒤집기;
    if (f && f.출처) return f.출처[Math.max(0, f.그림.indexOf(key || ev.그림))] || '';
    return ev.출처 || '';
  };
  // 사진을 모두 함께 보여 줄 때(법정 기록, 획득 알림)의 출처: 장마다 다르면 모두 적는다 (5화 신발 → 가방: 두 곳)
  G.sourcesAll = (ev) => {
    const f = ev.뒤집기;
    if (f && f.출처) return [...new Set(f.출처.filter(Boolean))].join(' · ');
    return ev.출처 || '';
  };

  // 그림 없는 카드의 이름 글자: 줄을 나눌 곳을 정해 준다 (일본군/'위안부'처럼 띄어 쓰지 않는 이름도 두 줄로)
  G.wordName = (name) => name.replace("일본군'", "일본군\u200b'");

  // 카드 가운데 창에 들어갈 것: 증거 그림 / 인물 얼굴 / 글자
  G.cardInner = (id) => {
    const ev = G.ev[id];
    if (ev.그림) return G.evImg(ev, true);
    if (ev.얼굴) { const f = h('div', { class: 'face' }); G.applyFace(f, ev.얼굴[0], ev.얼굴[1], { whole: true }); return f; } // 네모난 칸: 머리 끝까지
    // 그림이 없는 카드(개념 카드 등): 대본의 설명 글을 작게 넣는다
    return h('div', { class: 'mini' }, ev.설명.join(' ').replace(/\*\*/g, ''));
  };
  // 🟥🟦🟩 → 보석 그림 (이모지 대신)
  G.kindNode = (ev) => {
    const [g, t] = KIND[ev.색] || ['', ''];
    const span = h('span');
    if (g) span.append(h('span', { class: 'gem gem-' + { '🟥': 'r', '🟦': 'b', '🟩': 'g' }[g] }));
    span.append(t);
    return span;
  };

  G.renderCard = (id) => {
    const ev = G.ev[id];
    const frameKey = FRAME[ev.색] || FRAME.개념;
    const card = h('div', { class: 'card card-' + ({ 빨강: 'red', 파랑: 'blue', 초록: 'green', 개념: 'concept', 검찰: 'prosecution' }[ev.색] || 'concept') });
    card.append(G.imgEl(frameKey, 'frame'));
    const win = h('div', { class: 'win' + (ev.사진 ? ' photo' : '') + (ev.그림 || ev.얼굴 ? '' : ' text') });
    win.append(G.cardInner(id));
    card.append(win);
    card.append(h('div', { class: 'nm' }, ev.이름));
    return card;
  };

  function descHtml(text) {
    // **강조** 만 살려서 보여 준다
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return esc.replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');
  }

  // ─────────── 법정 기록 (역전재판처럼: 위에 큰 증거 칸, 아래에 작은 칸 8개) ───────────
  // present: true 이면 증거를 골라 돌려준다 (없으면 null)
  // pick: { 제목, 증거: [id…] } 정해진 증거 가운데서 고를 때 (기억 노트). 개념 카드 칸은 없다
  const COLOR = { 빨강: 'red', 파랑: 'blue', 초록: 'green', 개념: 'concept', 검찰: 'prosecution' };
  const PER_PAGE = 8;
  let lastId = null; // 창을 다시 열면 마지막으로 본 증거를 골라 둔다

  // 작은 칸 안: 그림 / 얼굴 / 이름 글자
  function slotInner(ev) {
    if (ev.그림) return G.evImg(ev);
    if (ev.얼굴) { const f = h('div', { class: 'face' }); G.applyFace(f, ev.얼굴[0], ev.얼굴[1], { whole: true }); return f; } // 네모난 칸: 머리 끝까지
    return h('div', { class: 'word' }, G.wordName(ev.이름));
  }
  // 큰 그림 칸 안: 그림 / 얼굴 / 그림 없는 카드는 카드 모양 그대로
  function picInner(id) {
    const ev = G.ev[id];
    if (ev.그림) return G.evImg(ev);
    if (ev.얼굴) { const f = h('div', { class: 'face' }); G.applyFace(f, ev.얼굴[0], ev.얼굴[1], { whole: true }); return f; } // 네모난 칸: 머리 끝까지
    return G.renderCard(id);
  }
  // 설명이 칸보다 길면 글자를 조금씩 줄인다 (줄 간격에 맞춰 밑줄도 함께)
  function fitDesc(desc) {
    desc.style.fontSize = '';
    let size = parseFloat(getComputedStyle(desc).fontSize);
    const min = Math.max(11, size * 0.7);
    const set = () => { desc.style.fontSize = size + 'px'; desc.style.setProperty('--lh', size * 1.5 + 'px'); };
    set();
    for (let i = 0; i < 10 && desc.scrollHeight > desc.clientHeight + 1 && size > min; i++) { size = Math.max(min, size * 0.93); set(); }
  }

  G.record = {
    has: (id) => G.play.evidence.includes(id),
    open({ present = false, pick = null } = {}) {
      return new Promise((resolve) => {
        const ov = document.getElementById('overlay');
        const scr = h('div', { class: 'screen record' + (present ? ' presenting' : '') });
        const prevClose = G.closeTopOverlay;
        const prevKey = G.overlayKey;
        const close = (val) => { scr.remove(); G.closeTopOverlay = prevClose; G.overlayKey = prevKey; resolve(val); };
        G.closeTopOverlay = () => close(null);

        const all = (pick ? pick.증거 : G.play.evidence).map((id) => [id, G.ev[id]]).filter(([, ev]) => ev);
        const lists = { 증거: all.filter(([, ev]) => ev.색 !== '개념').map(([id]) => id), 개념: all.filter(([, ev]) => ev.색 === '개념').map(([id]) => id) };
        let tab = lists.개념.includes(lastId) ? '개념' : '증거';
        let sel = lists[tab].includes(lastId) ? lastId : lists[tab][0] || null;

        const rec = h('div', { class: 'rec' });
        const tabs = h('div', { class: 'tabs' });
        const head = h('div', { class: 'rhead' },
          h('h2', {}, pick ? pick.제목 : present ? '제시할 증거를 고르세요' : '법정 기록'), pick ? h('div', { class: 'tabs' }) : tabs,
          h('button', { class: 'ui-btn sub close', onclick: () => close(null) }, present ? '돌아가기' : '닫기'));
        const info = h('div', { class: 'rinfo' });
        const strip = h('div', { class: 'rstrip' });
        const btns = h('div', { class: 'rbtns' });
        rec.append(head, info, strip, btns);

        const drawTabs = () => {
          tabs.innerHTML = '';
          for (const [t, label] of [['증거', '증거'], ['개념', '개념 카드']]) {
            tabs.append(h('button', { class: 'ui-btn' + (tab === t ? ' on' : ''), onclick: () => { if (tab === t) return; tab = t; sel = lists[t][0] || null; draw(); } }, label + ' (' + lists[t].length + ')'));
          }
        };
        const drawInfo = () => {
          info.innerHTML = '';
          btns.innerHTML = '';
          if (!sel) { info.dataset.kind = ''; info.append(h('div', { class: 'empty' }, '아직 없어요.')); return; }
          const ev = G.ev[sel];
          info.dataset.kind = COLOR[ev.색] || 'concept';
          const pic = h('div', { class: 'pic' + (ev.그림 ? ' can-zoom' : '') + (ev.그림 || ev.얼굴 ? '' : ' card-pic') });
          pic.append(picInner(sel));
          if (ev.그림) pic.addEventListener('click', () => zoom(sel));
          const kind = h('div', { class: 'kd' }, G.kindNode(ev), ev.비고 ? ' · ' + ev.비고 : '');
          const desc = h('div', { class: 'rdesc' });
          ev.설명.forEach((t) => { const p = h('p'); p.innerHTML = descHtml(t); desc.append(p); });
          info.append(pic, h('div', { class: 'rside' }, h('div', { class: 'rname' }, h('div', { class: 'nm' }, ev.이름), kind), desc));
          const src = ev.사진 && G.sourcesAll(ev);
          if (src) {
            // 실제 사진: 출처 표기 띠를 함께 띄운다 (출처 문구가 없는 사진은 띠 없이)
            info.append(h('div', { class: 'src' }, G.imgEl('ui/caption_source', 'band'), h('span', {}, src)));
          }
          if (ev.그림) btns.append(h('button', { class: 'img-btn bb', 'aria-label': '자세히 보기', onclick: () => zoom(sel) }, G.imgEl('ui/btn_examine')));
          if (present && ev.색 !== '개념') btns.append(h('button', { class: 'img-btn bb', 'aria-label': '증거 제시', onclick: () => close(sel) }, G.imgEl('ui/btn_present')));
          fitDesc(desc);
        };
        const drawStrip = () => {
          strip.innerHTML = '';
          const list = lists[tab];
          const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
          const page = Math.max(0, Math.floor(list.indexOf(sel) / PER_PAGE));
          const go = (d) => { const np = (page + d + pages) % pages; sel = list[np * PER_PAGE]; draw(); };
          const slots = h('div', { class: 'slots' });
          for (let i = 0; i < PER_PAGE; i++) {
            const id = list[page * PER_PAGE + i];
            if (!id) { slots.append(h('div', { class: 'slot empty' })); continue; }
            const ev = G.ev[id];
            const b = h('button', { class: 'slot item k-' + (COLOR[ev.색] || 'concept') + (id === sel ? ' on' : ''), 'aria-label': ev.이름, onclick: () => { sel = id; draw(); } });
            b.append(slotInner(ev));
            slots.append(b);
          }
          strip.append(
            h('button', { class: 'arrow prev', 'aria-label': '앞 쪽', disabled: pages < 2 ? '' : null, onclick: () => go(-1) }, '◀'),
            slots,
            h('button', { class: 'arrow next', 'aria-label': '다음 쪽', disabled: pages < 2 ? '' : null, onclick: () => go(1) }, '▶'),
            h('div', { class: 'pg' }, pages > 1 ? (page + 1) + ' / ' + pages : ''));
        };
        const draw = () => { if (sel) lastId = sel; drawTabs(); drawStrip(); drawInfo(); };

        // ← → 로 칸 옮기기 (자세히 보기 화면이 떠 있을 때는 쉬기)
        G.overlayKey = (e) => {
          if (ov.lastElementChild !== scr || scr.querySelector('.zoom')) return false;
          const list = lists[tab];
          if (!list.length || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return false;
          const i = list.indexOf(sel) + (e.key === 'ArrowRight' ? 1 : -1);
          sel = list[(i + list.length) % list.length];
          draw();
          return true;
        };

        const zoom = (id) => {
          const ev = G.ev[id];
          const z = h('div', { class: 'screen zoom' });
          const back = G.closeTopOverlay;
          const shut = () => { z.remove(); G.closeTopOverlay = back; };
          G.closeTopOverlay = shut;
          const wrap = h('div', { class: 'wrap' });
          // 뒤집기: 그림 여러 장을 버튼으로 차례로 본다 (5화 금시계 앞면 → 뒷면, 신발 → 가방 사진)
          const faces = ev.뒤집기 ? ev.뒤집기.그림 : null;
          if (faces) G.preload(faces); // 넘겨 볼 그림을 미리 받는다 (처음 넘길 때 빈 칸이 오래 보이지 않게)
          let face = 0, faceImg = null, capText = null;
          if (ev.사진) {
            // 실제 사진: 출처 표기 띠를 함께 띄운다 (사진을 넘기면 그 사진의 출처로 바꾼다)
            const pb = h('div', { class: 'photo-box' });
            faceImg = G.imgEl(faces ? faces[0] : ev.그림);
            pb.append(faceImg);
            const src = G.sourceOf(ev, faces ? faces[0] : ev.그림);
            capText = h('span', { class: 'caption-text', style: 'font-size:clamp(11px,2.2vmin,20px)' }, src);
            const cap = h('div', { class: 'caption' }, G.imgEl('ui/caption_source', 'caption-band'), capText);
            cap.hidden = !src;
            pb.append(cap);
            wrap.append(pb);
          } else {
            if (ev.겹침) wrap.append(h('div', { class: 'photo-box' }, G.evImg(ev))); // 지도 + 점처럼 겹친 그림은 3:2 칸에 함께
            else if (faces) wrap.append((faceImg = G.imgEl(faces[0], 'flip-face')));
            else wrap.append(G.imgEl(ev.자세히 || ev.그림)); // 자세히: [자세히 보기]에서 따로 보여 줄 확대 그림 (4화 매각 기록의 서명)
            wrap.addEventListener('click', () => wrap.classList.toggle('big'));
          }
          // 확대해야 알 수 있는 단서: 확대하면 신중한의 생각이 아래에 나오고, 그 뒤로는 제시하면 정답이 된다 (4화 증언 3)
          // 면이 정해져 있으면 그 면을 볼 때 나온다 (5화 금시계 뒷면). 자막이 있으면 그림 아래에 함께 띄운다 ("J. Levi 1920")
          const hook = G.play.zoomHook;
          let shown = false;
          // 확대(또는 그 면을 본 것)는 보는 순간 인정한다. 생각 글은 조금 뒤에 띄운다 (창을 바로 닫아도 4화처럼 정답이 된다)
          const markDone = () => { if (!hook.done) { hook.done = true; G.log.push({ 이름: hook.대사.말, 글: hook.대사.대사 }); } };
          const showHook = () => {
            if (shown || !z.isConnected) return;
            shown = true;
            if (hook.자막) {
              const cap = h('div', { class: 'zoom-caption' }, ...hook.자막.map((t) => { const d = h('div'); d.innerHTML = G.mdBold(t); return d; }));
              z.insertBefore(cap, z.lastChild);
              requestAnimationFrame(() => cap.classList.add('on'));
            }
            const fc = h('div', { class: 'face' });
            G.applyFace(fc, hook.대사.말, hook.대사.표정);
            const line = h('div', { class: 'zoom-thought' }, fc, h('div', { class: 'tx' }, hook.대사.대사));
            z.insertBefore(line, z.lastChild);
            requestAnimationFrame(() => line.classList.add('on'));
          };
          const hookHere = hook && hook.증거 === id;
          const bar = h('div', { class: 'bar' });
          if (faces) {
            bar.append(h('button', {
              class: 'ui-btn flip-btn',
              onclick: async (e) => {
                e.stopPropagation();
                face = (face + 1) % faces.length;
                const f = face; // 빨리 두 번 눌러도 이번 누름의 면으로 처리한다
                faceImg.classList.add('turn');
                await G.sleep(260);
                if (face !== f) return;
                await G.swapImg(faceImg, faces[f]);
                if (face !== f) return; // 그림을 받는 사이에 또 눌렀으면 나중 누름이 처리한다 (출처 띠가 다른 사진 것으로 남지 않게)
                faceImg.classList.remove('turn');
                if (capText) { const s = G.sourceOf(ev, faces[f]); capText.textContent = s; capText.parentNode.hidden = !s; }
                if (hookHere && hook.면 === f) { markDone(); setTimeout(() => { if (face === hook.면) showHook(); }, 500); }
              },
            }, ev.뒤집기.버튼 || '뒤집기'));
          }
          bar.append(h('button', { class: 'ui-btn', onclick: shut }, '닫기'));
          z.append(wrap, bar);
          scr.append(z);
          if (hookHere && hook.면 == null) { markDone(); setTimeout(showHook, 900); }
        };
        scr.append(rec);
        // 그림을 먼저 받아 두고 창을 띄운다 (빈 칸만 있는 창이 잠깐 번쩍이지 않게). 오래 걸리면 1.2초 뒤에는 그냥 띄운다
        const keys = ['ui/btn_examine', 'ui/btn_present', 'ui/caption_source'];
        all.forEach(([, ev]) => { keys.push(ev.그림, ev.겹침, ev.자세히); if (ev.얼굴) keys.push(G.charKey(ev.얼굴[0], ev.얼굴[1])); });
        // 뒤집어 보는 그림은 [자세히 보기]를 열 때 받는다 (창을 여는 데 오래 걸리지 않게)
        Promise.race([G.preload(keys.filter(Boolean)), G.sleep(1200)]).then(() => { ov.append(scr); draw(); });
      });
    },
  };
})();
