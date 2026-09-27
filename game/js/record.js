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

  // 카드 가운데 창에 들어갈 것: 증거 그림 / 인물 얼굴 / 글자
  G.cardInner = (id) => {
    const ev = G.ep.증거[id];
    if (ev.그림) return G.imgEl(ev.그림);
    if (ev.얼굴) { const f = h('div', { class: 'face' }); G.applyFace(f, ev.얼굴[0], ev.얼굴[1]); return f; }
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
    const ev = G.ep.증거[id];
    const frameKey = FRAME[ev.색] || FRAME.개념;
    const card = h('div', { class: 'card card-' + ({ 빨강: 'red', 파랑: 'blue', 초록: 'green', 개념: 'concept', 검찰: 'prosecution' }[ev.색] || 'concept') });
    card.append(G.imgEl(frameKey, 'frame'));
    const win = h('div', { class: 'win' + (ev.사진 ? ' photo' : '') });
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

  // ─────────── 법정 기록 ───────────
  // present: true 이면 증거를 골라 돌려준다 (없으면 null)
  G.record = {
    has: (id) => G.play.evidence.includes(id),
    open({ present = false } = {}) {
      return new Promise((resolve) => {
        const ov = document.getElementById('overlay');
        let tab = '증거';
        const scr = h('div', { class: 'screen record' });
        const close = (val) => { scr.remove(); G.closeTopOverlay = prevClose; resolve(val); };
        const prevClose = G.closeTopOverlay;
        G.closeTopOverlay = () => close(null);

        const head = h('div', { class: 'head' },
          h('h2', {}, present ? '제시할 증거를 고르세요' : '법정 기록'),
          h('button', { class: 'ui-btn sub', onclick: () => close(null) }, present ? '돌아가기' : '닫기'));
        const tabs = h('div', { class: 'tabs' });
        const grid = h('div', { class: 'grid' });
        const draw = () => {
          const all = G.play.evidence.map((id) => [id, G.ep.증거[id]]).filter(([, ev]) => ev);
          const evid = all.filter(([, ev]) => ev.색 !== '개념');
          const concept = all.filter(([, ev]) => ev.색 === '개념');
          tabs.innerHTML = '';
          tabs.append(
            h('button', { class: 'ui-btn' + (tab === '증거' ? ' on' : ''), onclick: () => { tab = '증거'; draw(); } }, '증거 (' + evid.length + ')'),
            h('button', { class: 'ui-btn' + (tab === '개념' ? ' on' : ''), onclick: () => { tab = '개념'; draw(); } }, '개념 카드 (' + concept.length + ')'));
          grid.innerHTML = '';
          const list = tab === '증거' ? evid : concept;
          if (!list.length) grid.append(h('div', { class: 'empty' }, '아직 없어요.'));
          for (const [id] of list) {
            const b = h('button', { class: 'item', 'aria-label': G.ep.증거[id].이름, onclick: () => detail(id) });
            b.append(G.renderCard(id));
            grid.append(b);
          }
        };
        const detail = (id) => {
          const ev = G.ep.증거[id];
          const d = h('div', { class: 'screen detail' });
          const shut = () => { d.remove(); G.closeTopOverlay = () => close(null); };
          G.closeTopOverlay = shut;
          const panel = h('div', { class: 'panel' });
          const info = h('div', { class: 'info' },
            h('h3', {}, ev.이름),
            h('div', { class: 'kind' }, G.kindNode(ev), ev.비고 ? ' · ' + ev.비고 : ''));
          const desc = h('div', { class: 'desc' });
          ev.설명.forEach((t) => { const p = h('p'); p.innerHTML = descHtml(t); desc.append(p); });
          info.append(desc);
          const row = h('div', { class: 'row' });
          if (ev.그림) row.append(h('button', { class: 'img-btn same', 'aria-label': '자세히 보기', onclick: () => zoom(id) }, G.imgEl('ui/btn_examine')));
          if (present && ev.색 !== '개념') row.append(h('button', { class: 'img-btn same', 'aria-label': '증거 제시', onclick: () => { d.remove(); close(id); } }, G.imgEl('ui/btn_present')));
          row.append(h('button', { class: 'same css', onclick: shut }, '닫기'));
          info.append(row);
          panel.append(G.renderCard(id), info);
          d.append(panel);
          d.addEventListener('click', (e) => { if (e.target === d) shut(); });
          scr.append(d);
        };
        const zoom = (id) => {
          const ev = G.ep.증거[id];
          const z = h('div', { class: 'screen zoom' });
          const back = G.closeTopOverlay;
          const shut = () => { z.remove(); G.closeTopOverlay = back; };
          G.closeTopOverlay = shut;
          const wrap = h('div', { class: 'wrap' });
          if (ev.사진) {
            // 실제 사진: 출처 표기 띠를 함께 띄운다
            const pb = h('div', { class: 'photo-box' });
            pb.append(G.imgEl(ev.그림), h('div', { class: 'caption' }, G.imgEl('ui/caption_source', 'caption-band'), h('span', { class: 'caption-text', style: 'font-size:clamp(11px,2.2vmin,20px)' }, ev.출처)));
            wrap.append(pb);
          } else {
            wrap.append(G.imgEl(ev.그림));
            wrap.addEventListener('click', () => wrap.classList.toggle('big'));
          }
          z.append(wrap, h('div', { class: 'bar' }, h('button', { class: 'ui-btn', onclick: shut }, '닫기')));
          scr.append(z);
        };
        scr.append(head, tabs, grid);
        ov.append(scr);
        draw();
      });
    },
  };
})();
