// 이야기 실행기: 막 → 명령을 차례로 실행한다. 증언과 반대 심문, 반격, 조사, 저장과 이어하기
// 명령 하나는 { 이름: 값, … } 모양이고, 맨 앞에 적은 이름이 명령의 종류다. 전체 목록은 ai/데이터_형식.md
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;

  class Restart { constructor(index) { this.index = index; } }
  class Quit {}

  const P = (G.play = {
    evidence: [], // 지금까지 얻은 증거
    gauge: 5, act: 0, idx: 0,
    section: 0, // 지금 구간(저장 지점)의 명령 번호
    explore: null, presented: null, upd: {}, zoomed: new Set(),
    cardsAfterLine: false, running: false,
  });
  // 문제 기록: 실행하다 만난 문제를 모아 둔다 (점검 도구가 읽는다)
  G.problems = [];
  const problem = (msg, c) => { console.warn('[게임 데이터]', msg, c || ''); G.problems.push({ 글: msg, 화: G.ep && G.ep.번호, 막: P.act, 명령: P.idx }); };

  // ─────────── 버튼 ───────────
  const controls = $('#controls'), choicesEl = $('#choices');
  const textBtn = (label, onclick, cls) => h('button', { class: 'ui-btn act ' + (cls || ''), onclick }, label);
  function clearControls() { controls.innerHTML = ''; controls.hidden = true; controls.className = ''; G.input.onKey = null; G.onStageTap = null; }

  // 선택지: 고른 번호를 돌려준다
  G.choose = (labels) => new Promise((resolve) => {
    choicesEl.innerHTML = '';
    labels.forEach((t, i) => choicesEl.append(h('button', { class: 'ui-btn', onclick: () => { choicesEl.hidden = true; choicesEl.innerHTML = ''; resolve(i); } }, t)));
    choicesEl.hidden = false;
  });

  // ─────────── 명령 실행 ───────────
  async function runList(list) { for (const c of G.list(list)) await exec(c); }
  G.runList = runList;

  // 기록 종류의 연출: 그 사람이 말하는 동안만 두고, 다른 사람이 말하면 걷는다
  function liftMood(name) {
    if (name === G.cfg.주인공) return;
    if (G.seatOf(name) === '피고석') return;
    if (G.scene.calm) G.stage.calm(false);
    G.stage.glow(false);
  }

  async function line(c) {
    liftMood(c.말);
    // 보기: 말하는 사람 대신 다른 인물을 화면에 두고, 말하는 사람은 작은 얼굴로 보여 준다
    if (c.보기) { G.stage.showChar(c.보기, c.보기표정); G.box.face(c.말, c.표정); }
    else if ((G.scene.overlayFaces || G.scene.photoFaces) && G.who(c.말)) G.box.face(c.말, c.표정); // 그림이 화면을 덮고 있을 때
    else G.stage.speaker(c.말, c.표정);
    await G.box.say({ 이름: c.말, 글: c.대사 });
    P.lastLine = c;
    if (P.cardsAfterLine) { G.stage.hideCards(); P.cardsAfterLine = false; }
  }

  const SHOUT_OLD = { '잠깐': '추궁', '이의 있음': '제시', '받아라': '제시' };
  const shoutText = (k) => G.cfg.외침[k] || G.cfg.외침[SHOUT_OLD[k]] || k;

  async function exec(c) {
    if (P.quit) throw new Quit();
    if (!c || typeof c !== 'object') return;
    const key = G.cmdKey(c); // 명령의 종류 (명령 이름 가운데 맨 먼저 적힌 것)
    const v = c[key];
    switch (key) {
      case '구간': P.section = P.idx; G.stage.calm(false); G.stage.glow(false); save(); return;
      case '배경': G.stage.setBackground(v, c); G.box.hide(); return;
      case 'BGM':
        if (v && v !== '멈춤' && !/^없음/.test(v)) { G.stage.calm(false); G.stage.glow(false); }
        G.audio.bgm(v); return;
      case '효과음':
        if (c.반복) { if (v === '멈춤') G.audio.stopLoop(); else G.audio.loop(v); return; }
        G.audio.se(v);
        if (/^쾅/.test(v)) { G.stage.flash(); if (/크게/.test(v)) G.stage.shake(true); }
        return;
      case '말': await line(c); return;
      case '대기': await G.sleep(+v || 0); return;
      case '인물숨기기': G.stage.hideChar(true); G.box.hide(); return;
      case '연출': await effect(v); return;
      case '컷': G.stage.cut(v); return; // 장면 위에 그림 한 장 (null 이면 치운다)
      case '자막': await G.stage.subtitle(v, c); return;
      case '외침': await G.stage.shout(shoutText(v)); return;
      case '띠': await G.stage.banner(v); return;
      case '증거획득': if (!G.ev[v]) { problem('없는 증거를 얻으려 했어요: ' + v, c); return; } gain(v); await G.stage.evidencePopup(v); return;
      case '증거갱신': {
        if (!G.ev[v]) { problem('없는 증거를 갱신하려 했어요: ' + v, c); return; }
        P.upd[v] = (P.upd[v] || 0) + 1;
        G.ev = buildEvidence(P.upd);
        save();
        await G.stage.evidencePopup(v, { updated: true });
        return;
      }
      case '확대': G.box.hide(); G.stage.closeup(v, { faces: c.얼굴 }); if (v) await G.sleep(c.대기 || 1200); return;
      // 인용: 실제 기록이나 증언을 그대로 옮긴 글 (지어낸 대사와 구분해서 보여 준다). 출처를 함께 적는다
      case '인용': G.stage.speaker(null); await G.box.say({ 이름: c.이름 || '기록', 글: '“' + v + '”' + (c.출처 ? '\n― ' + c.출처 : ''), cls: 'quote' }); return;
      case '증거보이기': G.stage.showCards(G.list(v)); P.cardsAfterLine = true; return;
      case '증거제출': {
        const id = v === '$제시' ? P.presented : v;
        if (!G.ev[id]) { problem('없는 증거를 제출하려 했어요: ' + id, c); return; }
        const fx = G.kind(G.ev[id]).제시연출;
        if (fx) G.audio.bgm('멈춤');
        if (fx === '차분') G.stage.calm(true);
        if (fx === '빛') G.stage.glow(true);
        G.audio.se('증거 제출음');
        G.stage.showCards([id], { center: true, slow: !!fx });
        P.cardsAfterLine = true;
        await G.sleep(fx ? 1600 : 500);
        return;
      }
      case '선택지': {
        const opts = G.list(v);
        const hasAnswer = opts.some((o) => o.정답);
        for (;;) {
          const k = G.auto ? Math.max(0, opts.findIndex((o) => o.정답)) : await G.choose(opts.map((o) => o.글));
          const o = opts[k];
          await runList(o.결과);
          if (o.정답 || !hasAnswer) return; // 정답이 없는 선택지(의견 고르기)는 무엇을 골라도 넘어간다
        }
      }
      case '안내창': await G.box.say({ 글: G.list(v).join('\n'), skin: 'tutorial', 제목: c.제목 }); return;
      case '보이기': G.box.hide(); G.stage.showChar(v, c.표정); await G.sleep(c.대기 || 1000); return;
      case '등장': G.box.hide(); G.stage.showChar(v, c.표정, { fadeIn: true }); await G.sleep(1800); return;
      case '퇴장': G.box.hide(); await G.stage.exit(); return;
      case '사진': G.stage.photo(v); if (v) await G.sleep(1800); return;
      case '화제목': G.box.hide(); await G.screens.episodeTitle(); return;
      case '부제목': G.box.hide(); await G.screens.partTitle(G.list(v)); return;
      case '이름표': await G.stage.nameTag(v); return;
      case '종이': await G.stage.paper(v, c); return;
      case '재판': G.scene.trial = v === '시작'; G.stage.gauge(G.scene.trial); if (G.scene.trial) { P.gauge = G.cfg.신뢰도.칸; G.stage.updateGauge(); } return;
      case '판결': await G.stage.verdict(v || '무죄'); return;
      case '기록카드': await G.screens.infoCard(v); return;
      case '표': await G.screens.table(v); return;
      case '연표': await G.screens.timeline(v); return;
      case '쓰기': G.store.clear(); await G.writing(v); return;
      case '다음화': G.store.markCleared(G.ep.번호); await G.screens.nextEpisode(v); throw new Quit();
      case '끝': G.store.markCleared(G.ep.번호); G.store.clear(); await G.screens.ending(v); throw new Quit();
      case '증언': await testimony(v); return;
      case '반격': await counter(v); return;
      case '조사파트': await explore(v); return;
      default: problem('모르는 명령이에요: ' + key, c);
    }
  }

  async function effect(name) {
    switch (name) {
      case '흔들림': G.stage.shake(false); return;
      case '크게 흔들림': G.stage.shake(true); await G.sleep(800); return;
      case '반짝': G.stage.flash(); await G.sleep(700); return;
      case '암전': G.stage.cut(null); G.stage.blackout(true); await G.sleep(900); return;
      case '암전 끝': G.stage.blackout(false); await G.sleep(500); return;
      case '휘청': G.stage.wobble(); await G.sleep(700); return;
      case '정적': G.box.hide(); await G.sleep(1800); return;
      case '차분하게': G.stage.calm(true); return;
      case '차분함 끝': G.stage.calm(false); return;
      case '빛': G.stage.glow(true); return;
      case '빛 끝': G.stage.glow(false); return;
      case '비': G.stage.rain(true); return;
      case '비 그침': G.stage.rain(false); return;
      case '회상': G.stage.recall(true); return;
      case '회상 끝': G.stage.recall(false); return;
      case '어둡게': G.stage.dark(true); return;
      case '밝게': G.stage.dark(false); return;
      default: problem('모르는 연출이에요: ' + name);
    }
  }

  function gain(id) {
    if (!P.evidence.includes(id)) P.evidence.push(id);
    updateTopbar();
  }

  // 증거 갱신: 대본 순서대로 설명을 바꾸거나(교체) 덧붙인다(추가)
  function buildEvidence(upd) {
    const ev = JSON.parse(JSON.stringify(G.ep.증거 || {}));
    for (const e of Object.values(ev)) e.설명 = G.list(e.설명);
    for (const [id, n] of Object.entries(upd || {})) {
      const e = ev[id];
      if (!e || !e.갱신) continue;
      for (const u of G.list(e.갱신).slice(0, n)) {
        e.설명 = u.방식 === '추가' ? e.설명.concat(G.list(u.설명)) : G.list(u.설명);
        if (u.그림) e.그림 = u.그림;
        if (u.이름) e.이름 = u.이름;
      }
    }
    return ev;
  }

  // ─────────── 신뢰도 ───────────
  async function penalty() {
    P.gauge = Math.max(0, P.gauge - 1);
    G.audio.se('신뢰도 감소음');
    G.stage.shake(false);
    G.stage.updateGauge(P.gauge);
    save();
    await G.sleep(500);
  }

  // 오답 장면: 증언에 적은 것 → 화 데이터의 오답 표 → 기본 문장
  function wrongScene(spec, soft) {
    const o = G.ep.오답 || {};
    let s = soft ? spec.피해오답 || spec.부드러운오답 : spec.일반오답;
    if (s === '일반') s = o.일반; else if (s === '피해') s = o.피해;
    if (!s) s = soft ? o.피해 || o.부드러운 || o.일반 : o.일반;
    return s || [{ 말: '', 대사: soft ? '(이 기록은 지금 이 말과는 이어지지 않는 것 같아. 다른 곳에서 꼭 쓰일 거야.)' : '(이 증거는 지금 이 말과 맞지 않는 것 같아. 다시 생각해 보자.)' }];
  }
  // 오답: 일반 증거는 신뢰도 1칸 감소, 벌칙 없는 기록(오답벌칙없음)은 부드러운 안내. 두 번째부터 힌트
  async function wrongAnswer(spec, evId, state) {
    const soft = !!G.kind(G.ev[evId]).오답벌칙없음;
    if (!soft && !spec.튜토리얼 && G.scene.trial) await penalty();
    await runList(wrongScene(spec, soft));
    state.wrong++;
    if (G.scene.trial && P.gauge <= 0) {
      await G.screens.trialPostponed();
      P.gauge = G.cfg.신뢰도.칸;
      throw new Restart(P.section);
    }
    if (state.wrong >= 2) await showHint(spec.힌트);
  }
  async function showHint(hint) {
    if (!hint) return;
    if (typeof hint === 'string') hint = { 말: G.cfg.조수, 대사: hint };
    const who = hint.말 || G.cfg.조수;
    G.box.face(G.who(who) ? who : null, hint.표정);
    await G.box.say({ 이름: who, 글: hint.대사, skin: 'hint' });
    G.box.face(null);
  }

  // ─────────── 증언과 반대 심문 ───────────
  // 증언을 한 문장씩 넘겨 보면서 [더 묻기](추궁)로 캐묻고, 모순되는 문장에서 [증거 제시]를 한다
  const strip = (t) => String(t).replace(/[〔〕]/g, '');
  const stOf = (s) => (typeof s === 'string' ? { 글: s } : s);

  async function testimony(T) {
    const sts = G.list(T.문장).map(stOf);
    const n = sts.length;
    const revised = {};
    let state = { wrong: 0 };
    // 단계: 한 증언에서 정답을 차례로 여러 번 찾을 때. 없으면 한 단계
    const stages = T.단계 ? G.list(T.단계) : [{ 정답: T.정답, 정답장면: T.정답장면, 힌트: T.힌트 }];
    let stageNo = 0;
    const answers = () => G.list(stages[stageNo].정답);
    P.cx = { T, sts, stages, revised, stage: () => stageNo }; // 점검 도구와 자동 시험이 읽는다
    if (!G.who(T.증인)) problem('증언의 증인이 인물 표에 없어요: ' + T.증인);

    G.stage.speaker(T.증인, T.표정);
    await G.stage.banner(G.cfg.말.증언시작 + (T.제목 ? ' · ' + T.제목 : ''), 1700);
    for (const st of sts) {
      G.stage.speaker(T.증인, T.표정);
      await G.box.say({ 이름: T.증인, 글: strip(st.글) });
    }
    await runList(T.증언후);
    await runList(T.반대심문전);

    // 자동으로 풀기 (교사용 건너뛰기, 점검): 정답 문장으로 가서 정답 증거를 낸다
    const autoAct = (i) => {
      if (T.추궁정답) return i === T.추궁정답 - 1 ? 'press' : 'next';
      const a = answers()[0];
      if (!a) return 'press';
      if (a.문장 - 1 !== i) return 'next';
      if (a.수정후 && !revised[i]) return 'press';
      return 'present';
    };

    let i = 0, guard = 0;
    for (;;) {
      if (G.auto && guard++ > 200) { problem('증언 「' + (T.제목 || '') + '」을 자동으로 풀 수 없어요. 정답을 확인해 주세요.'); return; }
      const st = sts[i];
      const text = revised[i] || st.글;
      G.stage.speaker(T.증인, T.표정);
      G.box.showStatic({ 이름: T.증인, 글: text, cls: 'cross-text' });
      const act = G.auto ? autoAct(i) : await crossAction((i + 1) + ' / ' + n, T);
      if (act === 'prev') { i = (i - 1 + n) % n; continue; }
      if (act === 'next') { i = (i + 1) % n; continue; }
      if (act === 'press') {
        if (revised[i] && st.수정) { await runList(st.수정.뒤 || [{ 말: '', 대사: '(이 문장은 이미 캐물었어.)' }]); if (G.auto) i = (i + 1) % n; continue; }
        if (!G.list(st.추궁).some((c) => c.외침)) await G.stage.shout(G.cfg.외침.추궁, 650);
        await runList(st.추궁 || [{ 말: T.증인, 표정: T.표정, 대사: '…더 드릴 말씀이 없습니다.' }]);
        // 추궁으로 증언이 더해지는 문장
        if (st.추가 && !revised[i]) {
          revised[i] = st.글;
          for (const t of G.list(st.추가)) { G.stage.speaker(T.증인, T.표정); await stamp(); await G.box.say({ 이름: T.증인, 글: t, cls: 'cross-text' }); }
        }
        if (T.추궁정답 === i + 1) { await runList(T.정답장면); return; }
        // 추궁하면 증언이 바뀌는 문장
        if (st.수정 && !revised[i]) {
          G.audio.se('증언 수정음');
          revised[i] = st.수정.글;
          G.stage.speaker(T.증인, T.표정);
          G.box.showStatic({ 이름: T.증인, 글: revised[i], cls: 'cross-text' });
          await stamp();
          await G.box.say({ 이름: T.증인, 글: revised[i], cls: 'cross-text' });
          await runList(st.수정.뒤);
        } else if (G.auto) i = (i + 1) % n;
        continue;
      }
      // 증거 제시
      let ev;
      if (G.auto) {
        ev = answers()[0].증거;
        if (!P.evidence.includes(ev)) { problem('증언 「' + (T.제목 || '') + '」의 정답 증거(' + ev + ')를 아직 얻지 못한 상태예요. 그 앞에 증거획득이 있어야 해요.'); gain(ev); }
        P.zoomed.add(ev);
      } else ev = await G.record.open({ present: true });
      if (!ev) continue;
      const stage = stages[stageNo];
      const hit = answers().find((a) => a.문장 - 1 === i && a.증거 === ev && (!a.수정후 || revised[i]));
      // 확대해야 알 수 있는 정답을 확대하기 전에 냈다: 벌칙 없이 힌트
      if (hit && hit.확대후 && !P.zoomed.has(ev)) { await showHint(stage.힌트 || '이 증거를 [자세히 보기]로 살펴보면 뭔가 보일 것 같아.'); continue; }
      if (hit) {
        P.presented = ev;
        const bgmBefore = G.audio.current;
        await runList(stage.정답장면);
        stageNo++;
        if (stageNo >= stages.length) return;
        // 다음 단계: 반대 심문으로 돌아간다
        state = { wrong: 0 };
        G.stage.calm(false); G.stage.glow(false); G.stage.hideCards(); P.cardsAfterLine = false;
        if (bgmBefore) G.audio.bgm(bgmBefore);
        await runList(stages[stageNo].앞);
        continue;
      }
      // 보조 정답: 틀린 것은 아니지만 결정적이지 않은 증거. 장면을 보여 주고 벌칙 없이 돌아간다
      const sub = G.list(T.보조정답).find((a) => a.문장 - 1 === i && a.증거 === ev);
      if (sub) { P.presented = ev; await runList(sub.장면); G.stage.calm(false); continue; }
      await wrongAnswer(Object.assign({}, T, { 힌트: stage.힌트 }), ev, state);
    }
  }

  async function stamp() {
    const s = h('div', { class: 'stamp' }, '수정');
    $('#big').append(s);
    await G.sleep(1100);
    s.remove();
  }

  function crossAction(label, T) {
    return new Promise((resolve) => {
      clearControls();
      const done = (v) => { clearControls(); resolve(v); };
      controls.append(
        textBtn(G.cfg.버튼.추궁, () => done('press'), 'press'),
        h('div', { class: 'grow' }),
        h('button', { class: 'arrow prev', 'aria-label': '이전 문장', onclick: () => done('prev') }, '◀'),
        h('div', { class: 'count' }, T.제목 ? h('small', {}, '증언 「' + T.제목 + '」') : null, label),
        h('button', { class: 'arrow next', 'aria-label': '다음 문장', onclick: () => done('next') }, '▶'),
        h('div', { class: 'grow' }),
        textBtn(G.cfg.버튼.제시, () => done('present'), 'present'));
      controls.hidden = false;
      G.input.onKey = (e) => {
        if (e.key === 'ArrowLeft') { done('prev'); return true; }
        if (e.key === 'ArrowRight') { done('next'); return true; }
        return false;
      };
      G.onStageTap = () => { done('next'); return true; }; // 대사창을 누르면 다음 문장
    });
  }

  // ─────────── 반격: 상대의 주장에 증거만 골라 반박한다 (증언 없이) ───────────
  async function counter(C) {
    for (const [k, step] of G.list(C.단계 || C).entries()) {
      if (k > 0) { G.stage.calm(false); G.stage.glow(false); G.stage.hideCards(); P.cardsAfterLine = false; }
      const state = { wrong: 0 };
      P.ct = step;
      await runList(step.앞);
      // 주장 대사: 따로 적지 않으면 바로 앞에 나온 대사
      const claim = step.주장 || [...G.list(step.앞)].reverse().find((c) => c.말) || P.lastLine || { 말: '', 대사: '' };
      const right = G.list(step.정답);
      for (;;) {
        G.stage.speaker(claim.말, claim.표정);
        G.box.showStatic({ 이름: claim.말, 글: claim.대사 });
        let ev;
        if (G.auto) {
          ev = right[0];
          if (!P.evidence.includes(ev)) { problem('반격의 정답 증거(' + ev + ')를 아직 얻지 못한 상태예요.'); gain(ev); }
        } else {
          await new Promise((resolve) => {
            clearControls();
            if (step.질문) controls.append(h('span', { class: 'help' }, step.질문));
            controls.append(h('div', { class: 'grow' }), textBtn(G.cfg.버튼.제시, () => { clearControls(); resolve(); }, 'only'));
            controls.hidden = false;
          });
          ev = await G.record.open({ present: true });
        }
        if (!ev) continue;
        if (right.includes(ev)) { P.presented = ev; await runList(step.정답장면); break; }
        const own = G.list(step.따로오답).find((o) => o.증거 === ev); // 이 증거를 내면 공통 오답 대신 이 장면이 나온다
        await wrongAnswer({ 일반오답: own ? own.장면 : C.일반오답, 피해오답: own ? own.장면 : C.피해오답, 힌트: step.힌트 }, ev, state);
      }
    }
  }

  // ─────────── 조사 파트: 장소를 골라 돋보기를 눌러 조사한다 ───────────
  async function explore(X) {
    const places = G.list(X.장소);
    places.forEach((l) => { l.도착 = G.list(l.도착); l.포인트 = G.list(l.포인트); });
    const prog = (P.explore = P.explore || { 도착: {}, 조사: {} });
    const key = (loc, pt) => loc.이름 + '/' + pt.이름;
    const complete = (loc) => prog.도착[loc.이름] && loc.포인트.every((pt) => prog.조사[key(loc, pt)]);
    // 열림: 이 장소들을 다 조사해야 갈 수 있다
    const isOpen = (loc) => !loc.열림 || G.list(loc.열림).every((n) => { const l = places.find((x) => x.이름 === n); return !l || complete(l); });
    const single = places.length === 1;
    const music = (loc) => loc.음악 || X.음악;
    const restoreMusic = (loc) => { if (!music(loc)) return; G.stage.calm(false); G.audio.bgm(music(loc)); };
    let cur = null;
    while (!places.every(complete)) {
      if (!cur) {
        G.box.hide();
        const open = places.filter(isOpen);
        if (!open.length) { problem('조사 파트에서 갈 수 있는 장소가 없어요. 열림 조건을 확인해 주세요.'); break; }
        const k = single ? 0 : G.auto ? open.findIndex((l) => !complete(l)) : await G.choose(open.map((l) => l.이름 + (complete(l) ? '  ✓ 조사 완료' : '')));
        cur = open[Math.max(0, k)];
        G.stage.setBackground(cur.배경 || cur.이름);
        G.scene.exploring = cur.이름;
        if (cur.환경음) G.audio.loop(cur.환경음); else G.audio.stopLoop();
        restoreMusic(cur);
      }
      if (!prog.도착[cur.이름]) {
        await runList(cur.도착);
        prog.도착[cur.이름] = true;
        save();
        if (places.every(complete)) break;
        if (cur.포인트.length) restoreMusic(cur);
      }
      if (!cur.포인트.length || (G.auto && complete(cur))) { cur = null; continue; } // 이야기만 듣는 곳은 바로 장소 고르기로
      G.box.hide();
      G.stage.hideChar(true);
      const act = G.auto ? cur.포인트.find((pt) => !prog.조사[key(cur, pt)]) : await exploreIdle(cur, prog, key, single);
      if (act === 'move') { cur = null; continue; }
      await runList(act.내용);
      prog.조사[key(cur, act)] = true;
      save();
      restoreMusic(cur);
    }
    G.audio.stopLoop();
    clearControls();
    $('#hotspots').innerHTML = '';
    await runList(X.마무리);
    P.explore = null;
    G.scene.exploring = null;
  }

  function exploreIdle(loc, prog, key, noMove) {
    return new Promise((resolve) => {
      const hs = $('#hotspots');
      hs.innerHTML = '';
      const done = (v) => { hs.innerHTML = ''; clearControls(); resolve(v); };
      loc.포인트.forEach((pt, i) => {
        // 위치: [왼쪽 x, 위 y, 너비, 높이] (배경 1536×1024 기준). 적지 않으면 화면에 고르게 놓는다
        const [x, y, w, hh] = Array.isArray(pt.위치) && pt.위치.length === 4 ? pt.위치 : [120 + (i % 4) * 340, 180 + Math.floor(i / 4) * 300, 280, 240];
        hs.append(h('button', {
          class: 'hotspot' + (prog.조사[key(loc, pt)] ? ' done' : ''), 'aria-label': pt.이름,
          style: `left:${(x / 1536) * 100}%;top:${(y / 1024) * 100}%;width:${(w / 1536) * 100}%;height:${(hh / 1024) * 100}%`,
          onclick: () => done(pt),
        }, h('span', { class: 'mag' }, '🔍'), h('span', { class: 'label' }, pt.이름)));
      });
      clearControls();
      controls.classList.add('low');
      controls.append(h('span', { class: 'help' }, loc.이름 + ' · 돋보기를 눌러 조사하세요'), h('div', { class: 'grow' }),
        noMove ? null : textBtn(G.cfg.버튼.이동, () => done('move'), 'move'));
      controls.hidden = false;
    });
  }

  // ─────────── 저장과 이어하기 ───────────
  function saveData() {
    return { 화: G.ep.번호, 막: P.act, 명령: P.section, 증거: P.evidence.slice(), 갱신: Object.assign({}, P.upd), 신뢰도: P.gauge, 조사: P.explore, 시각: Date.now() };
  }
  function save() { if (P.running && !G.auto) G.store.write(saveData()); }

  // 명령 목록을 속까지 훑는다 (조사 파트, 증언 속 장면까지)
  function walk(list, fn) {
    for (const c of G.list(list)) {
      if (!c || typeof c !== 'object') continue;
      fn(c);
      for (const v of Object.values(c)) {
        if (Array.isArray(v)) walk(v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)), fn);
        else if (v && typeof v === 'object') for (const vv of Object.values(v)) if (Array.isArray(vv)) walk(vv.filter((x) => x && typeof x === 'object'), fn);
      }
    }
  }
  G.walk = walk;
  // 그 자리까지 얻었을 증거와 증거 갱신 단계를 모은다 (화 코드로 중간부터 시작할 때)
  function collectEvidence(uptoAct, uptoIdx) {
    const out = [], upd = {};
    const take = (c) => {
      if (c.증거획득 && !out.includes(c.증거획득)) out.push(c.증거획득);
      if (c.증거갱신) upd[c.증거갱신] = (upd[c.증거갱신] || 0) + 1;
    };
    G.ep.막.forEach((act, a) => {
      if (a > uptoAct) return;
      const list = a < uptoAct ? G.list(act.내용) : G.list(act.내용).slice(0, uptoIdx);
      walk(list, (c) => { take(c); if (c.장소) G.list(c.장소).forEach((l) => walk([...G.list(l.도착), ...G.list(l.포인트).flatMap((p) => G.list(p.내용))], take)); });
    });
    return { list: out.filter((id) => (G.ep.증거 || {})[id]), upd };
  }
  // 막의 처음부터 idx 전까지를 훑어서 화면 상태(배경, 음악, 재판 중인지)를 되살린다
  function restoreScene(uptoAct, uptoIdx) {
    let bg = null, bgOpt = {}, bgm = null, trial = false;
    G.ep.막.forEach((act, a) => {
      if (a > uptoAct) return;
      const list = a < uptoAct ? G.list(act.내용) : G.list(act.내용).slice(0, uptoIdx);
      for (const c of list) {
        if (!c) continue;
        if (c.배경) { bg = c.배경; bgOpt = c; }
        if (c.BGM) bgm = c.BGM;
        if (c.재판) trial = c.재판 === '시작';
      }
    });
    G.stage.setBackground(bg || '검은 화면', bgOpt);
    G.box.hide();
    G.scene.trial = trial;
    G.stage.gauge(trial);
    G.audio.bgm(bgm || '멈춤');
  }

  // 그 막에 나오는 그림을 미리 받는다
  function imagesOfAct(a) {
    const keys = new Set();
    const act = G.ep.막[a];
    if (!act) return [];
    const C = G.cfg;
    walk(act.내용, (c) => {
      if (c.배경 && C.배경[c.배경]) { keys.add(C.배경[c.배경].그림); keys.add(C.배경[c.배경].책상); }
      if (c.말 && G.who(c.말)) { keys.add(G.charKey(c.말, c.표정)); const seat = C.법정자리[G.seatOf(c.말)]; if (seat) { keys.add(seat.배경); keys.add(seat.책상); } }
      for (const k of ['보이기', '등장', '증인']) if (c[k] && G.who(c[k])) keys.add(G.charKey(c[k], c.표정));
      if (c.보기) keys.add(G.charKey(c.보기, c.보기표정));
      if (c.증거획득 && G.ev[c.증거획득]) keys.add(G.ev[c.증거획득].그림);
      if (typeof c.컷 === 'string') keys.add(c.컷);
      if (typeof c.확대 === 'string') keys.add(c.확대);
    });
    return [...keys].filter(Boolean);
  }

  function updateTopbar() { $('#btn-record').hidden = !P.running || !P.evidence.length; }
  G.updateTopbar = updateTopbar;

  // 게임 시작: from = { 막, 명령, 증거, 신뢰도, 조사 } (없으면 처음부터)
  G.startGame = async (from = {}) => {
    const ep = G.ep;
    P.act = from.막 || 0;
    P.idx = from.명령 || 0;
    P.section = P.idx;
    P.upd = {};
    G.ev = buildEvidence({});
    const got = collectEvidence(P.act, P.idx);
    P.evidence = from.증거 ? from.증거.filter((id) => G.ev[id]) : got.list;
    P.upd = from.증거 ? Object.assign({}, from.갱신 || {}) : got.upd;
    G.ev = buildEvidence(P.upd);
    P.gauge = from.신뢰도 || G.cfg.신뢰도.칸;
    P.explore = from.조사 || null;
    P.zoomed = new Set();
    P.quit = false;
    P.running = true;
    G.log.length = 0;
    restoreScene(P.act, P.idx);
    updateTopbar();
    save();
    try {
      for (let a = P.act; a < ep.막.length; a++) {
        P.act = a;
        const list = G.list(ep.막[a].내용);
        const startIdx = a === (from.막 || 0) ? P.idx : 0;
        await G.preload(imagesOfAct(a));
        G.preload(imagesOfAct(a + 1)); // 다음 막은 뒤에서 미리 받기
        if (a === 0 && startIdx === 0 && ep.제목화면 !== false) await G.screens.episodeTitle();
        let i = startIdx;
        while (i < list.length) {
          P.idx = i;
          try {
            await exec(list[i]);
            i++;
          } catch (err) {
            if (err instanceof Quit) throw err;
            if (err instanceof Restart) { // 재판 연기 → 그 구간의 처음부터 다시
              clearControls(); G.box.hide(); $('#hotspots').innerHTML = ''; $('#big').innerHTML = ''; choicesEl.hidden = true;
              restoreScene(a, err.index);
              G.stage.updateGauge();
              i = err.index;
              continue;
            }
            // 명령 하나가 잘못되어도 게임이 멈추지 않게 건너뛴다
            problem('명령을 실행하다 문제가 생겨 건너뛰었어요: ' + (err && err.message), list[i]);
            console.error(err);
            i++;
          }
        }
        P.explore = null;
        from = {};
      }
      // 이야기가 끝났는데 { 끝 } 이나 { 다음화 } 가 없으면 끝 화면을 띄운다
      G.store.markCleared(ep.번호);
      G.store.clear();
      await G.screens.ending();
    } catch (err) {
      if (!(err instanceof Quit)) { console.error(err); throw err; }
    } finally {
      P.running = false;
      updateTopbar();
      if (G.onGameEnd) G.onGameEnd();
    }
  };
})();
