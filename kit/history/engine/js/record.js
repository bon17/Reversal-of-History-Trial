// 증거 카드와 사건 기록 화면 (모은 증거를 보고, 고르고, 제시한다)
(function () {
  const G = window.G;
  const h = G.h;

  // 대사창에 띄우는 증거 알림 글: 첫 줄 = 이름 (비고), 다음 줄부터 설명
  G.evidenceText = (ev) => {
    const k = G.kind(ev);
    return (k.표시 ? k.표시 + ' ' : '') + ev.이름 + (ev.비고 ? ' (' + ev.비고 + ')' : '') + '\n' + G.list(ev.설명).join('\n');
  };
  const descHtml = (t) => G.esc(t).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');

  // 증거의 그림 칸: 그림 / 인물 얼굴 / (둘 다 없으면) 이름 글자
  function evPic(ev, id) {
    if (ev.얼굴) { const f = h('div', { class: 'face' }); G.applyFace(f, ev.얼굴[0], ev.얼굴[1]); return f; }
    if (ev.그림 || G.kind(ev).읽기전용 !== true) return G.imgEl(ev.그림 || 'evidence/' + id);
    return h('div', { class: 'word' }, ev.이름);
  }

  // 증거 카드 (화면에 띄우는 카드)
  G.renderCard = (id) => {
    const ev = G.ev[id];
    const kk = G.kindKey(G.kindOf(ev));
    const card = h('div', { class: 'card k-' + kk + (G.kind(ev).읽기전용 ? ' readonly' : ''), style: '--kc:' + (G.kind(ev).색 || '#e8b84a') });
    card.append(h('div', { class: 'kd' }, G.kind(ev).이름), h('div', { class: 'win' }, evPic(ev, id)), h('div', { class: 'nm' }, ev.이름));
    return card;
  };

  // ─────────── 사건 기록 ───────────
  // present: true 이면 증거를 골라 돌려준다 (닫으면 null)
  // pick: { 제목, 증거: [id…] } 정해진 증거 가운데서 고를 때 (쓰기 활동)
  const PER_PAGE = 8;
  let lastId = null;

  G.record = {
    has: (id) => G.play.evidence.includes(id),
    open({ present = false, pick = null } = {}) {
      return new Promise((resolve) => {
        const ov = document.getElementById('overlay');
        const scr = h('div', { class: 'screen record' + (present ? ' presenting' : '') });
        const prevClose = G.closeTopOverlay, prevKey = G.overlayKey;
        const close = (val) => { scr.remove(); G.closeTopOverlay = prevClose; G.overlayKey = prevKey; document.getElementById('app').classList.remove('rec-open'); resolve(val); };
        G.closeTopOverlay = () => close(null);
        document.getElementById('app').classList.add('rec-open');

        const all = (pick ? pick.증거 : G.play.evidence).filter((id) => G.ev[id]);
        const readOnly = (id) => !!G.kind(G.ev[id]).읽기전용;
        const lists = { 증거: all.filter((id) => !readOnly(id)), 개념: all.filter(readOnly) };
        let tab = lists.개념.includes(lastId) ? '개념' : '증거';
        if (!lists[tab].length) tab = lists.증거.length ? '증거' : '개념';
        let sel = lists[tab].includes(lastId) ? lastId : lists[tab][0] || null;

        const tabs = h('div', { class: 'tabs' });
        const info = h('div', { class: 'rinfo' });
        const strip = h('div', { class: 'rstrip' });
        const btns = h('div', { class: 'rbtns' });
        const rec = h('div', { class: 'rec' },
          h('div', { class: 'rhead' }, h('h2', {}, pick ? pick.제목 : present ? G.cfg.말.제시제목 : G.cfg.말.기록제목), tabs,
            h('button', { class: 'ui-btn sub close', onclick: () => close(null) }, present ? '돌아가기' : '닫기')),
          info, strip, btns);

        const drawTabs = () => {
          tabs.innerHTML = '';
          if (!lists.개념.length) return;
          for (const [t, label] of [['증거', '증거'], ['개념', G.cfg.기록종류.개념.이름]]) {
            tabs.append(h('button', { class: 'ui-btn' + (tab === t ? ' on' : ''), onclick: () => { if (tab === t) return; tab = t; sel = lists[t][0] || null; draw(); } }, label + ' (' + lists[t].length + ')'));
          }
        };
        const drawInfo = () => {
          info.innerHTML = '';
          btns.innerHTML = '';
          if (!sel) { info.className = 'rinfo'; info.append(h('div', { class: 'empty' }, '아직 없어요.')); return; }
          const ev = G.ev[sel];
          info.className = 'rinfo k-' + G.kindKey(G.kindOf(ev));
          info.style.setProperty('--kc', G.kind(ev).색 || '#e8b84a');
          const zoomable = !!(ev.그림 || ev.자세히) || (!ev.얼굴 && !readOnly(sel));
          const pic = h('div', { class: 'pic' + (zoomable ? ' can-zoom' : '') }, evPic(ev, sel));
          if (zoomable) pic.addEventListener('click', () => zoom(sel));
          const kd = h('div', { class: 'kd' });
          kd.innerHTML = G.mdBold((G.kind(ev).표시 ? G.kind(ev).표시 + ' ' : '') + G.kind(ev).이름 + (ev.비고 ? ' · ' + ev.비고 : ''));
          const desc = h('div', { class: 'rdesc' });
          G.list(ev.설명).forEach((t) => { const p = h('p'); p.innerHTML = descHtml(t); desc.append(p); });
          // 정보: { 누가: …, 언제: … } 처럼 사료를 따져 볼 때 필요한 것을 표로 보여 준다
          if (ev.정보 && typeof ev.정보 === 'object') desc.append(h('div', { class: 'meta' }, Object.entries(ev.정보).map(([k, v]) => h('div', {}, h('b', {}, k), String(v)))));
          if (ev.출처) desc.append(h('p', { class: 'src' }, '출처: ' + ev.출처));
          info.append(pic, h('div', { class: 'rside' }, h('div', { class: 'rname' }, h('div', { class: 'nm' }, ev.이름), kd), desc));
          if (zoomable) btns.append(h('button', { class: 'ui-btn sub', onclick: () => zoom(sel) }, G.cfg.버튼.자세히));
          if (present && (pick || !readOnly(sel))) btns.append(h('button', { class: 'ui-btn act', onclick: () => close(sel) }, pick ? '이 증거 고르기' : G.cfg.버튼.제시));
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
            slots.append(h('button', { class: 'slot item k-' + G.kindKey(G.kindOf(ev)) + (id === sel ? ' on' : ''), style: '--kc:' + (G.kind(ev).색 || '#e8b84a'), 'aria-label': ev.이름, title: ev.이름, onclick: () => { sel = id; draw(); } }, evPic(ev, id)));
          }
          strip.append(
            h('button', { class: 'arrow prev', 'aria-label': '앞 쪽', disabled: pages < 2 ? '' : null, onclick: () => go(-1) }, '◀'),
            slots,
            h('button', { class: 'arrow next', 'aria-label': '다음 쪽', disabled: pages < 2 ? '' : null, onclick: () => go(1) }, '▶'),
            h('div', { class: 'pg' }, pages > 1 ? (page + 1) + ' / ' + pages : ''));
        };
        const draw = () => { if (sel) lastId = sel; drawTabs(); drawStrip(); drawInfo(); };

        // ← → 로 칸 옮기기
        G.overlayKey = (e) => {
          if (ov.lastElementChild !== scr || scr.querySelector('.zoom')) return false;
          const list = lists[tab];
          if (!list.length || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return false;
          const i = list.indexOf(sel) + (e.key === 'ArrowRight' ? 1 : -1);
          sel = list[(i + list.length) % list.length];
          draw();
          return true;
        };

        // 자세히 보기: 그림을 크게 (누르면 두 배로)
        const zoom = (id) => {
          const ev = G.ev[id];
          const z = h('div', { class: 'screen zoom' });
          const back = G.closeTopOverlay;
          const shut = () => { z.remove(); G.closeTopOverlay = back; };
          G.closeTopOverlay = shut;
          const wrap = h('div', { class: 'wrap' }, G.imgEl(ev.자세히 || ev.그림 || 'evidence/' + id));
          wrap.addEventListener('click', () => wrap.classList.toggle('big'));
          z.append(wrap, h('div', { class: 'bar' }, ev.출처 ? h('span', { class: 'src' }, '출처: ' + ev.출처) : null, h('button', { class: 'ui-btn', onclick: shut }, '닫기')));
          scr.append(z);
          // 확대해야 알 수 있는 단서 (증언의 정답에 확대후: true 가 있을 때): 확대한 것을 적어 둔다
          if (G.play.zoomed) G.play.zoomed.add(id);
        };
        scr.append(rec);
        ov.append(scr);
        draw();
      });
    },
  };
})();
