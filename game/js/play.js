// 대본 실행기: 막 → 명령을 차례로 실행. 반대 심문, 레테의 반격, 조사 파트, 저장과 이어하기
(function () {
  const G = window.G;
  const $ = G.$, h = G.h;

  class Restart { constructor(index) { this.index = index; } }
  class Quit {}

  const P = (G.play = {
    evidence: [],
    gauge: 5,
    act: 0,
    idx: 0,
    section: 0, // 지금 구간(저장 지점)의 명령 번호
    explore: null, // 조사 진행 상황
    presented: null, // 방금 제시한 증거
    upd: {}, // 증거 갱신 단계 { 증거: 몇 번 갱신됐는지 }
    cardsAfterLine: false,
    running: false,
  });

  // ─────────── 버튼 ───────────
  const controls = $('#controls'), choicesEl = $('#choices');
  function imgButton(key, label, onclick, cls = 'act-btn') {
    return h('button', { class: 'img-btn ' + cls, 'aria-label': label, onclick }, G.imgEl(key));
  }
  function clearControls() { controls.innerHTML = ''; controls.hidden = true; controls.className = ''; G.input.onKey = null; G.onStageTap = null; }

  // 선택지: 고른 번호를 돌려준다
  G.choose = (labels) => new Promise((resolve) => {
    choicesEl.innerHTML = '';
    labels.forEach((t, i) => choicesEl.append(h('button', { class: 'ui-btn', onclick: () => { choicesEl.hidden = true; choicesEl.innerHTML = ''; resolve(i); } }, t)));
    choicesEl.hidden = false;
  });

  // ─────────── 명령 실행 ───────────
  async function runList(list) {
    for (const c of list || []) await exec(c);
  }
  G.runList = runList;

  function oops(kind) { return kind === '일반' ? G.ep.오답.일반 : kind === '피해' ? G.ep.오답.피해 : kind; }

  // 🟥 차분한 화면과 🟩 초록빛은 기록을 내놓은 신중한(과 자기 이야기를 하는 피고)이 말하는 동안만 둔다.
  // 한나, 레테, 증인, 재판장처럼 다른 사람이 말하기 시작하면 그 대사부터 천천히 걷힌다 (흐려졌다가 다시 밝아지게)
  function liftMood(name) {
    if (name === '신중한') return;
    const c = DATA.인물[name];
    if (c && c.자리 === '피고석') return;
    if (G.scene.calm) G.stage.calm(false);
    G.stage.green(false);
  }

  async function line(c) {
    liftMood(c.말);
    // 보기: 말하는 사람 대신 다른 인물을 화면에 두고, 말하는 사람은 작은 얼굴로 보여 준다
    if (c.보기) { G.stage.showChar(c.보기, c.보기표정); G.box.face(c.말, c.표정); }
    else if ((G.scene.overlayFaces || G.scene.photoFaces) && DATA.인물[c.말]) G.box.face(c.말, c.표정); // 지도·사진이 화면을 덮고 있을 때
    else G.stage.speaker(c.말, c.표정);
    await G.box.say({ 이름: c.말, 글: c.대사, cls: c.cls });
    if (P.cardsAfterLine) { G.stage.hideCards(); P.cardsAfterLine = false; }
  }

  async function exec(c) {
    if (P.quit) throw new Quit();
    const key = Object.keys(c)[0];
    switch (key) {
      case '구간': P.section = P.idx; G.stage.calm(false); G.stage.green(false); checkpoint(); return;
      case '배경': G.stage.setBackground(c.배경, c); G.box.hide(); return;
      case 'BGM':
        if (!['멈춤', '없음'].includes(c.BGM) && !/^없음/.test(c.BGM)) { G.stage.calm(false); G.stage.green(false); }
        G.audio.bgm(c.BGM); return;
      case '효과음':
        if (c.반복) { if (c.효과음 === '멈춤') G.audio.stopLoop(); else G.audio.loop(c.효과음); return; } // 계속 되풀이되는 소리 ({ 효과음: '멈춤', 반복: true } 로 멈춘다)
        G.audio.se(c.효과음);
        if (/^쾅/.test(c.효과음)) { G.stage.flash(); if (/가장 크게|크게/.test(c.효과음)) G.stage.shake(true); }
        return;
      case '말': await line(c); return;
      case '대기': await G.sleep(c.대기); return;
      case '인물숨기기': G.stage.hideChar(true); G.box.hide(); return;
      case '연출': await effect(c.연출); return;
      case '컷':
        if (c.그림없음) console.info('[그림 없음, 빈 자리로 둠]', c.그림없음);
        G.stage.cut(c.컷); return;
      case '자막': await G.stage.subtitle(c.자막, c); return;
      case '기록글': await G.stage.subtitle(c.기록글, c); return; // 실제 역사 기록 화면의 글 (검은 화면)
      case '지도점': G.box.hide(); await G.stage.mapDots(c.지도점, G.ep.지도점, { faces: c.얼굴 }); return;
      case '숫자화면': await G.stage.numbers(c.숫자화면); return;
      case '뒷모습': await G.stage.walkAway(c.뒷모습); return;
      case '기억노트': G.store.clear(); P.running = false; updateTopbar(); await G.memoryNote(c.기억노트); return;
      case '끝': await G.input.waitAdvance(); location.reload(); throw new Quit(); // 게임 1 끝: 누르면 처음 화면으로
      case '외침': await shout(c.외침); return;
      case '띠': G.box.hide(); await G.stage.big({ '레테의 반격': 'ui/banner_lethe_counter', '레테의 주장': 'ui/banner_lethe_claim', '증언 듣기': 'ui/banner_listen', '휴정': 'ui/banner_recess', '최종 변론': 'ui/banner_closing' }[c.띠], 'slide', 1900); return;
      case '증거획득': gain(c.증거획득); await G.stage.evidencePopup(c.증거획득); return;
      case '증거갱신': {
        const id = c.증거갱신;
        P.upd[id] = (P.upd[id] || 0) + 1;
        G.ev = buildEvidence(P.upd);
        save();
        await G.stage.evidencePopup(id, { updated: true });
        return;
      }
      case '확대': G.box.hide(); G.stage.closeup(c.확대, { faces: c.얼굴 }); if (c.확대) { if (c.번쩍) G.stage.flash(); await G.sleep(c.대기 || 1200); } return;
      case '인용': G.stage.speaker(null); await G.box.say({ 이름: c.이름 || '', 표시이름: c.이름 || '', 글: c.인용, cls: 'quote' }); return;
      case '증거보이기': G.stage.showCards(c.증거보이기); P.cardsAfterLine = true; return;
      case '증거제출': {
        const id = c.증거제출 === '$제시' ? P.presented : c.증거제출;
        const red = G.ev[id].색 === '빨강';
        const green = G.ev[id].색 === '초록';
        if (red) { G.audio.bgm('멈춤'); G.stage.calm(true); } // 🟥 피해 기록: 음악을 멈추고 화면을 차분하게
        if (green) { G.audio.bgm('멈춤'); G.stage.green(true); } // 🟩 선택 기록: 초록빛이 번진다
        G.stage.showCards([id], { center: true, slow: red || green });
        P.cardsAfterLine = true;
        await G.sleep(red || green ? 1600 : 500);
        return;
      }
      case '선택지': {
        for (;;) {
          const k = await G.choose(c.선택지.map((o) => o.글));
          const o = c.선택지[k];
          if (o.정답 || c.선택지.length === 1) return;
          await runList(o.결과);
        }
      }
      case '안내창': await G.box.say({ 글: c.안내창.join('\n'), skin: 'tutorial', 제목: c.제목, 건너뛰기: c.건너뛰기 }); return;
      case '보이기':
        G.box.hide();
        G.stage.showChar(c.보이기, c.표정);
        await G.sleep(c.대기 || 1000); return;
      case '등장':
        G.box.hide();
        G.stage.showChar(c.등장, c.표정, { fadeIn: true });
        await G.sleep(1800); return;
      case '퇴장':
        G.box.hide();
        await G.stage.exit(c.퇴장 === '모두' ? null : c.퇴장, c.뒷모습); return;
      // 그림: 그 증거의 다른 사진 (5화 신발 → 가방). 다가가기: 사진에 천천히 다가간다 (클로즈업)
      // 카드치우기: 바로 앞에 제시한 증거 카드를 치우고 사진을 띄운다 (카드가 사진의 글자를 가리지 않게)
      case '사진':
        if (c.카드치우기) { G.stage.hideCards(); P.cardsAfterLine = false; }
        G.stage.photo(c.사진, { faces: c.얼굴, key: c.그림, push: c.다가가기 }); if (c.사진) await G.sleep(1800); return;
      // ── 4화에서 더한 연출 ──
      case '화제목': G.box.hide(); await G.screens.episodeTitle(); return; // 화 제목을 맨 앞이 아닌 자리에 띄울 때
      case '부제목': G.box.hide(); await G.screens.partTitle(c.부제목); return; // 게임 2 타이틀, 제2부 제목
      case '지난기록': G.box.hide(); await G.screens.pastRecords(c.지난기록); return;
      case '보관함': await G.stage.drawer(c.보관함); return; // 🟩 기록을 기록 보관함에 넣는다
      case '회상얼굴': await G.stage.recallFaces(c.회상얼굴); return;
      case '지도넓히기': await G.stage.mapZoomOut(c.지도넓히기); return;
      case '불길': G.box.hide(); await G.stage.fires(); return;
      case '창문그림자': await G.stage.windowShadows(c.창문그림자); return;
      case '이름표': await G.stage.nameTag(c.이름표); return;
      case '사진컷': G.stage.heldPhoto(c.사진컷, { object: c.물건 }); if (c.사진컷) await G.sleep(1400); return; // 물건: 액자 없이 물건 그림만 (5화 은식기 꾸러미)
      case '겹치기': await G.stage.overlap(c.겹치기, c.옮김); return;
      // ── 5화에서 더한 연출 ──
      // 나란히겹치기, 아이콘지도: 화면 가득 띄우므로 앞에 제시한 증거 카드는 치운다
      case '나란히겹치기': G.stage.hideCards(); P.cardsAfterLine = false; await G.stage.sideBySide(c.나란히겹치기); return; // 두 그림 속 같은 글자(번호)를 나란히 띄웠다가 겹친다
      case '아이콘지도': G.stage.hideCards(); P.cardsAfterLine = false; await G.stage.iconMap(c.아이콘지도); return; // 지도 위 사람 아이콘 셋 중 둘이 사라진다
      case '훑어보기': await G.stage.pan(c.훑어보기); return; // 그림 한 장을 크게 띄우고 몇 곳을 차례로 확대한다
      case '종이': await G.stage.paper(c.종이, c); return;
      case '재판': G.scene.trial = c.재판 === '시작'; G.stage.gauge(G.scene.trial); if (G.scene.trial) { P.gauge = 5; G.stage.updateGauge(); } return;
      case '판결': await verdict(); return;
      case '기록카드': await G.screens.historyCard(c.기록카드); return;
      case '다음화': await G.screens.nextEpisode(c.다음화); throw new Quit();
      case '증언': await testimony(c.증언); return;
      case '반격': await counter(c.반격); return;
      case '조사파트': await explore(c.조사파트); return;
      default: console.warn('[모르는 명령]', c);
    }
  }

  async function effect(name) {
    switch (name) {
      case '흔들림': G.stage.shake(false); return;
      case '재판장 놀람': { // 재판장이 놀라는 얼굴을 잠깐 보여 주고, 보던 인물로 돌아간다 (대사 없음)
        const [name, expr] = [G.scene.char, G.scene.expr];
        G.box.hide();
        G.stage.showChar('재판장', '놀람');
        await G.sleep(1100);
        if (name && name !== '재판장') G.stage.showChar(name, expr);
        return;
      }
      case '크게 흔들림': G.stage.shake(true); await G.sleep(800); return;
      case '반짝': G.stage.flash(); await G.sleep(700); return; // 5화 오프닝: 담요 속 금시계가 반짝인다
      case '암전': G.stage.cut(null); G.stage.blackout(true); await G.sleep(900); return;
      case '휘청': G.stage.wobble(); await G.sleep(700); return;
      case '정적': G.box.hide(); await G.sleep(1800); return;
      case '차분하게': G.stage.calm(true); return; // 🟥 피해 기록 연출: 화면이 어두워지고 차분해진다
      case '차분함 끝': G.stage.calm(false); return;
      case '비': G.stage.rain(true); return;
      case '비 그침': G.stage.rain(false); return;
      case '회상': G.stage.recall(true); return; // 화면 가장자리가 흐려진다
      case '회상 끝': G.stage.recall(false); return;
      case '어둡게': G.stage.dark(true); G.listening = true; updateTopbar(); return;
      case '밝게': G.stage.dark(false); G.listening = false; updateTopbar(); return;
      case '듣기': G.listening = true; updateTopbar(); return; // 증언 듣기: 화면은 그대로 두고 법정 기록 버튼만 숨긴다 (배경이 이미 어두울 때)
      case '듣기 끝': G.listening = false; updateTopbar(); return;
      default: console.warn('[모르는 연출]', name);
    }
  }

  const SHOUT = {
    '이의 있음': ['ui/shout_objection', '외침 "이의 있음!"'],
    '잠깐': ['ui/shout_holdit', '외침 "잠깐!"'],
    '받아라': ['ui/shout_takethat', '외침 "받아라!"'],
    '이의 있음 초록': ['ui/shout_objection_green', '외침 "이의 있음!"'],
  };
  async function shout(kind, ms = 950) {
    const [img, se] = SHOUT[kind];
    G.box.hide();
    G.audio.se(se);
    G.stage.shake(false);
    await G.stage.big(img, 'pop', ms);
  }

  function gain(id) {
    if (!P.evidence.includes(id)) P.evidence.push(id);
    // 🟩 선택 기록은 6화의 기록 보관함에서 다시 쓰므로 화와 상관없이 따로 모아 둔다
    if (G.ev[id] && G.ev[id].색 === '초록') G.store.addGreen(G.ep.번호, id);
    updateTopbar();
  }

  // 증거 갱신: 대본 순서대로 설명을 바꾸거나(교체) 덧붙인다(추가)
  // 가져오기: 다른 화의 증거를 그대로 빌려 쓴다 (4화의 1부 🟩 기록). 글을 복사하지 않아서 그 화를 고치면 함께 바뀐다
  function evidenceSource() {
    const src = {};
    for (const [id, e] of Object.entries(G.ep.증거)) {
      const from = e.가져오기 && DATA[e.가져오기] && DATA[e.가져오기].증거[e.원래 || id];
      src[id] = e.가져오기 ? (from || { 이름: id, 색: '초록', 설명: [] }) : e;
    }
    return src;
  }
  function buildEvidence(upd) {
    const ev = JSON.parse(JSON.stringify(evidenceSource()));
    for (const [id, n] of Object.entries(upd || {})) {
      const e = ev[id];
      if (!e || !e.갱신) continue;
      for (const u of e.갱신.slice(0, n)) e.설명 = u.방식 === '추가' ? e.설명.concat(u.설명) : u.설명.slice();
    }
    return ev;
  }

  async function verdict() {
    G.box.hide();
    const big = $('#big');
    const a = G.imgEl('ui/text_not_guilty_1', 'verdict-l');
    const b = G.imgEl('ui/text_not_guilty_2', 'verdict-r');
    await G.preload(['ui/text_not_guilty_1', 'ui/text_not_guilty_2', 'ui/text_not_guilty']);
    big.append(a); G.stage.shake(false); G.stage.flash();
    await G.sleep(700);
    big.append(b); G.stage.shake(false); G.stage.flash();
    await G.sleep(900);
    const all = G.imgEl('ui/text_not_guilty', 'verdict-all');
    a.remove(); b.remove();
    big.append(all);
    await G.input.waitAdvance();
    all.remove();
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

  // 오답: 일반 증거는 신뢰도 1칸 감소, 🟥 피해 기록은 벌칙 없이 부드러운 안내. 두 번째부터 한나의 힌트.
  async function wrongAnswer(spec, evId, state) {
    const ev = G.ev[evId];
    const red = ev.색 === '빨강';
    if (!red && !spec.튜토리얼) await penalty();
    await runList(oops(red ? spec.피해오답 : spec.일반오답));
    state.wrong++;
    if (P.gauge <= 0) {
      await G.screens.trialPostponed();
      P.gauge = 5;
      throw new Restart(P.section);
    }
    if (state.wrong >= 2) await showHint(spec.힌트);
  }
  async function showHint(hint) {
    if (!hint) return;
    G.box.face(hint.말, hint.표정);
    await G.box.say({ 이름: hint.말, 글: hint.대사, skin: 'hint' });
    G.box.face(null);
  }

  // ─────────── 증언과 반대 심문 ───────────
  function strip(t) { return t.replace(/[〔〕]/g, ''); }

  async function testimony(T) {
    const n = T.문장.length;
    const revised = {};
    let state = { wrong: 0 };
    // 단계: 한 증언에서 정답을 차례로 여러 번 찾는다 (4화 증언 3: 4번 → 3번). 없으면 한 단계
    const stages = T.단계 || [{ 정답: T.정답, 정답장면: T.정답장면, 힌트: T.힌트 }];
    let stageNo = 0;
    // 표정: 단계마다 반대 심문 때의 증인 표정을 바꿀 수 있다 (5화 증언 3의 2단계: 베커가 시계를 귀에 댄 채)
    const expr = () => stages[stageNo].표정 || T.표정;
    // 확대: 이 단계에서 [자세히 보기]로 이 증거를 확대하면 대사가 나오고, 그 뒤에야 정답이 된다 (4화 매각 기록)
    // 면: 뒤집어 볼 수 있는 증거는 이 면을 봐야 한다 (5화 금시계 뒷면). 자막: 그때 그림 아래에 띄우는 글
    const setZoomHook = () => { const z = stages[stageNo].확대; P.zoomHook = z ? { 증거: z.증거, 면: z.면, 대사: z.대사, 자막: z.자막, done: false } : null; };
    setZoomHook();
    // 증언 개시
    G.stage.speaker(T.증인, T.표정);
    G.box.hide();
    await G.stage.big('ui/text_testimony_start', 'fadehold', 1700);
    for (const st of T.문장) {
      G.stage.speaker(T.증인, T.표정);
      await G.box.say({ 이름: T.증인, 글: strip(st.낭독 || st.글) }); // 낭독: 처음 들려줄 때의 글이 반대 심문 문장보다 길 때 (4화)
    }
    await runList(T.증언후);
    await runList(T.반대심문전);

    let i = 0;
    for (;;) {
      const st = T.문장[i];
      const text = revised[i] || st.글;
      G.stage.speaker(T.증인, expr());
      G.box.showStatic({ 이름: T.증인, 글: text, cls: 'cross-text', glow: !!(st.반짝임 && !revised[i]) });
      const act = await crossAction(i, n, T);
      if (act === 'prev') { i = (i - 1 + n) % n; continue; }
      if (act === 'next') { i = (i + 1) % n; continue; }
      if (act === 'press') {
        if (revised[i] && st.수정) { await runList(st.수정.뒤); continue; }
        // 추궁할 때마다 "잠깐!" (대본에 이미 외침이 있는 추궁은 한 번만)
        if (!(st.추궁 || []).some((c) => c.외침)) await shout('잠깐', 650);
        // 단계 표정이 있으면 추궁에 대한 증인의 대답도 그 표정으로 (5화 증언 3의 2단계: 시계를 귀에 댄 채 대답한다)
        const sx = stages[stageNo].표정;
        await runList(sx ? (st.추궁 || []).map((c) => (c.말 === T.증인 ? Object.assign({}, c, { 표정: sx }) : c)) : st.추궁);
        // 추궁으로 증언이 더해지는 문장 (2화 증언 1)
        if (st.추가 && !revised[i]) {
          revised[i] = st.글;
          for (const t of st.추가) {
            G.stage.speaker(T.증인, expr());
            G.box.showStatic({ 이름: T.증인, 글: t, cls: 'cross-text' });
            await stamp();
            await G.box.say({ 이름: T.증인, 글: t, cls: 'cross-text' });
          }
        }
        if (T.추궁정답 === i + 1) { P.zoomHook = null; await runList(T.정답장면); return; }
        if (st.수정 && !revised[i]) {
          G.audio.se('증언 수정음');
          revised[i] = st.수정.글;
          G.stage.speaker(T.증인, expr());
          G.box.showStatic({ 이름: T.증인, 글: revised[i], cls: 'cross-text' });
          await stamp();
          await G.box.say({ 이름: T.증인, 글: revised[i], cls: 'cross-text' });
          await runList(st.수정.뒤);
        }
        continue;
      }
      if (act === 'present') {
        const ev = await G.record.open({ present: true });
        if (!ev) continue;
        const stage = stages[stageNo];
        const hit = (stage.정답 || []).find((a) => a.문장 - 1 === i && a.증거 === ev && (!a.수정후 || revised[i]));
        // 확대해야 하는 정답을 확대하기 전에 냈다: 벌칙 없이 그 단계의 힌트
        if (hit && hit.확대후 && !(P.zoomHook && P.zoomHook.done)) { await showHint(stage.힌트); continue; }
        if (hit) {
          P.presented = ev;
          const bgmBefore = G.audio.current;
          await runList(stage.정답장면);
          stageNo++;
          if (stageNo >= stages.length) { P.zoomHook = null; return; }
          // 다음 단계: 반대 심문으로 돌아간다 (음악도 반대 심문 음악으로)
          state = { wrong: 0 };
          G.stage.calm(false);
          G.stage.green(false);
          G.stage.hideCards();
          P.cardsAfterLine = false;
          if (bgmBefore) G.audio.bgm(bgmBefore);
          await runList(stages[stageNo].앞);
          setZoomHook();
          continue;
        }
        // 보조 정답: 반론 장면을 보여 주고 신뢰도는 줄이지 않은 채 반대 심문으로 돌아간다 (단계: 그 단계에서만)
        const sub = (T.보조정답 || []).find((a) => a.문장 - 1 === i && a.증거 === ev && (!a.단계 || a.단계 === stageNo + 1));
        if (sub) {
          const bgmBefore = G.audio.current;
          P.presented = ev;
          await runList(sub.장면);
          G.stage.calm(false);
          if (bgmBefore) G.audio.bgm(bgmBefore); // 반대 심문 음악으로 돌아간다
          continue;
        }
        await wrongAnswer(Object.assign({}, T, { 힌트: stage.힌트 }), ev, state);
      }
    }
  }

  async function stamp() {
    const s = G.imgEl('ui/stamp_updated', 'stamp');
    $('#big').append(s);
    await G.sleep(1200);
    s.remove();
  }

  function crossAction(i, n, T) {
    return new Promise((resolve) => {
      clearControls();
      const done = (v) => { clearControls(); resolve(v); };
      controls.append(
        imgButton('ui/btn_press', '추궁', () => done('press'), 'act-btn press'),
        h('div', { class: 'grow' }),
        h('button', { class: 'arrow prev', 'aria-label': '이전 문장', onclick: () => done('prev') }, '◀'),
        h('div', { class: 'count' }, h('small', {}, '증언 「' + T.제목 + '」'), (i + 1) + ' / ' + n),
        h('button', { class: 'arrow next', 'aria-label': '다음 문장', onclick: () => done('next') }, '▶'),
        h('div', { class: 'grow' }),
        imgButton('ui/btn_present', '증거 제시', () => done('present'), 'act-btn present'));
      controls.hidden = false;
      G.input.onKey = (e) => {
        if (e.key === 'ArrowLeft') { done('prev'); return true; }
        if (e.key === 'ArrowRight') { done('next'); return true; }
        return false;
      };
      G.onStageTap = () => { done('next'); return true; }; // 대사창을 누르면 다음 문장
    });
  }

  // ─────────── 레테의 반격: 증언 없이 증거만 고른다 ───────────
  async function counter(C) {
    for (const [k, step] of C.단계.entries()) {
      // 다음 단계로 넘어갈 때 앞 단계의 🟥 차분한 화면, 🟩 초록빛, 카드를 걷는다 (반대 심문의 단계와 같게)
      if (k > 0) { G.stage.calm(false); G.stage.green(false); G.stage.hideCards(); P.cardsAfterLine = false; }
      const state = { wrong: 0 };
      await runList(step.앞);
      const claim = [...step.앞].reverse().find((c) => c.말); // 주장 대사 (그 뒤에 안내창이 붙을 수 있다)
      for (;;) {
        G.stage.speaker(claim.말, claim.표정);
        G.box.showStatic({ 이름: claim.말, 글: claim.대사 });
        await new Promise((resolve) => {
          clearControls();
          if (step.질문) controls.append(h('span', { class: 'help' }, step.질문)); // 예: 이름 말고 이 사람을 가리키는 단서는?
          controls.append(h('div', { class: 'grow' }), imgButton('ui/btn_present', '증거 제시', () => { clearControls(); resolve(); }, 'act-btn only'));
          controls.hidden = false;
        });
        const ev = await G.record.open({ present: true });
        if (!ev) continue;
        if (ev === step.정답) { P.presented = ev; await runList(step.정답장면); break; }
        // 따로오답: 이 증거를 내면 공통 오답 대신 이 장면이 나온다 (5화 「암시장」의 🟥 번호 문신). 벌칙은 증거 색대로
        const own = (step.따로오답 || []).find((o) => o.증거 === ev);
        await wrongAnswer({ 일반오답: own ? own.장면 : C.일반오답, 피해오답: own ? own.장면 : C.피해오답, 힌트: step.힌트 }, ev, state);
      }
    }
  }

  // ─────────── 조사 파트 ───────────
  async function explore(X) {
    const prog = (P.explore = P.explore || { 도착: {}, 조사: {} });
    const key = (loc, pt) => loc.이름 + '/' + pt.이름;
    const complete = (loc) => prog.도착[loc.이름] && loc.포인트.every((pt) => prog.조사[key(loc, pt)]);
    // 열림: 이 장소들을 다 조사해야 갈 수 있다 (4화)
    const isOpen = (loc) => !loc.열림 || loc.열림.every((n) => complete(X.장소.find((l) => l.이름 === n)));
    const single = X.장소.length === 1; // 한 곳짜리 짧은 조사 (4화 휴정): 장소 고르기 없이 바로
    // 음악: 조사 파트의 음악. 적어 두면 장소마다 그 장소의 음악(장소.음악, 없으면 이것)으로 바꾸고, 조사 포인트를 본 뒤에도 되돌린다
    const music = (loc) => loc.음악 || X.음악;
    const restoreMusic = (loc) => { if (!X.음악) return; G.stage.calm(false); G.audio.bgm(music(loc)); };
    let cur = null;
    while (!X.장소.every(complete)) {
      if (!cur) {
        G.box.hide();
        const open = X.장소.filter(isOpen);
        const k = single ? 0 : await G.choose(open.map((l) => l.이름 + (complete(l) ? '  ✓ 조사 완료' : '')));
        cur = open[k];
        // 조사배경: 도착 대화는 배경에서 하고, 조사 포인트는 이 배경에서 찾는다 (5화 난민 수용소: 바깥 → 사무실)
        G.stage.setBackground(prog.도착[cur.이름] && cur.조사배경 ? cur.조사배경 : cur.배경);
        G.scene.exploring = cur.이름;
        if (cur.환경음) G.audio.loop(cur.환경음); else G.audio.stopLoop(); // 시계방의 째깍 소리처럼 그 장소에서만 나는 소리
        restoreMusic(cur);
      }
      if (!prog.도착[cur.이름]) {
        await runList(cur.도착);
        prog.도착[cur.이름] = true;
        save();
        if (X.장소.every(complete)) break;
        if (cur.조사배경) G.stage.setBackground(cur.조사배경);
        if (cur.포인트.length) restoreMusic(cur); // 도착 대화에서 🟥 기록으로 음악이 멈췄으면 조사할 때 다시 튼다 (5화 난민 수용소)
      }
      // 조사 포인트가 없는 장소(이야기만 듣는 곳)는 바로 장소 고르기로 돌아간다
      if (!cur.포인트.length) { cur = null; continue; }
      G.box.hide();
      G.stage.hideChar(true);
      const act = await exploreIdle(cur, prog, key, single);
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
      for (const pt of loc.포인트) {
        const [x, y, w, hh] = pt.위치;
        const b = h('button', {
          class: 'hotspot' + (prog.조사[key(loc, pt)] ? ' done' : ''), 'aria-label': pt.이름,
          style: `left:${(x / 1536) * 100}%;top:${(y / 1024) * 100}%;width:${(w / 1536) * 100}%;height:${(hh / 1024) * 100}%`,
          onclick: () => done(pt),
        }, h('span', { class: 'mag' }, G.imgEl('ui/cursor_magnifier')),
          G.missing.has((DATA.배경[loc.조사배경 || loc.배경] || {}).그림) ? h('span', { class: 'label' }, pt.이름) : null);
        hs.append(b);
      }
      clearControls();
      controls.classList.add('low');
      controls.append(
        h('span', { class: 'help' }, loc.이름 + ' · 돋보기를 눌러 조사하세요'),
        h('div', { class: 'grow' }),
        noMove ? null : imgButton('ui/btn_move', '장소 이동', () => done('move'), 'act-btn move'));
      controls.hidden = false;
    });
  }

  // ─────────── 저장과 이어하기 ───────────
  function saveData() {
    return { 화: G.ep.번호, 막: P.act, 명령: P.section, 증거: P.evidence.slice(), 갱신: Object.assign({}, P.upd), 신뢰도: P.gauge, 조사: P.explore, 시각: Date.now() };
  }
  function save() { if (P.running) G.store.write(saveData()); }
  function checkpoint() { save(); }

  // 막의 처음부터 idx 전까지를 훑어서 화면 상태(배경, 음악, 재판 중인지)를 되살린다
  function walk(list, fn) {
    for (const c of list || []) {
      fn(c);
      for (const v of Object.values(c)) {
        if (Array.isArray(v)) walk(v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)), fn);
        else if (v && typeof v === 'object') {
          for (const vv of Object.values(v)) if (Array.isArray(vv)) walk(vv.filter((x) => x && typeof x === 'object'), fn);
        }
      }
    }
  }
  // 막의 처음부터 시작할 때, 그 앞까지 얻었을 증거와 증거 갱신 단계를 모은다
  function collectEvidence(uptoAct, uptoIdx) {
    const out = [], upd = {};
    const take = (c) => {
      if (c.증거획득 && !out.includes(c.증거획득)) out.push(c.증거획득);
      if (c.증거갱신) upd[c.증거갱신] = (upd[c.증거갱신] || 0) + 1;
    };
    G.ep.막.forEach((act, a) => {
      if (a > uptoAct) return;
      const list = a < uptoAct ? act.내용 : act.내용.slice(0, uptoIdx);
      walk(list, (c) => {
        take(c);
        if (c.장소) c.장소.forEach((l) => walk([...l.도착, ...l.포인트.flatMap((p) => p.내용)], take));
      });
    });
    return { list: out, upd };
  }
  function restoreScene(uptoAct, uptoIdx) {
    let bg = null, bgOpt = {}, bgm = null, trial = false;
    G.ep.막.forEach((act, a) => {
      if (a > uptoAct) return;
      const list = a < uptoAct ? act.내용 : act.내용.slice(0, uptoIdx);
      for (const c of list) {
        if (c.배경) { bg = c.배경; bgOpt = c; }
        if (c.BGM) bgm = c.BGM;
        if (c.재판) trial = c.재판 === '시작';
      }
    });
    G.stage.dark(false);
    G.listening = false;
    G.stage.setBackground(bg || '검은 화면', bgOpt);
    G.box.hide();
    G.scene.trial = trial;
    G.stage.gauge(trial);
    if (bgm) G.audio.bgm(bgm); else G.audio.bgm('멈춤');
  }

  function imagesOfAct(a) {
    const keys = new Set();
    const act = G.ep.막[a];
    if (!act) return [];
    walk(act.내용, (c) => {
      if (c.배경 && DATA.배경[c.배경]) { keys.add(DATA.배경[c.배경].그림); keys.add(DATA.배경[c.배경].책상); }
      if (c.말 && DATA.인물[c.말]) {
        keys.add(G.charKey(c.말, c.표정));
        const seat = DATA.법정자리[DATA.인물[c.말].자리];
        if (seat) { keys.add(seat.배경); keys.add(seat.책상); }
      }
      if (c.보이기) keys.add(G.charKey(c.보이기, c.표정));
      if (c.보기) keys.add(G.charKey(c.보기, c.보기표정)); // 말하는 사람 대신 화면에 세우는 인물 (5화 회색 외투의 남자)
      if (c.등장) keys.add(G.charKey(c.등장, c.표정));
      if (c.증인) keys.add(G.charKey(c.증인, c.표정));
      if (c.증거획득 && G.ev[c.증거획득]) { keys.add(G.ev[c.증거획득].그림); keys.add(G.ev[c.증거획득].겹침); }
      if (c.컷) keys.add(c.컷);
      if (typeof c.확대 === 'string') keys.add(c.확대); // 증언 단계의 확대({ 증거, 대사 })는 그림이 아니다
      if (c.지도점) keys.add(c.지도점);
      if (c.사진 && G.ev[c.사진]) keys.add(G.ev[c.사진].그림);
      if (Array.isArray(c.뒷모습)) c.뒷모습.forEach((w) => keys.add(G.charKey(w.인물, '뒷모습')));
      if (c.부제목) keys.add('ui/title_part_bg');
      if (c.지난기록) c.지난기록.forEach((k) => { keys.add(G.charKey(k.피고[0], k.피고[1])); k.진범.forEach(([n, e]) => keys.add(G.charKey(n, e))); });
      if (c.회상얼굴) c.회상얼굴.forEach(([n, e]) => keys.add(G.charKey(n, e)));
      if (c.보관함) c.보관함.forEach((id) => G.ev[id] && keys.add(G.ev[id].그림));
      if (c.지도넓히기) { keys.add(c.지도넓히기.처음); keys.add(c.지도넓히기.전체); }
      if (c.창문그림자) { keys.add(c.창문그림자.바탕); c.창문그림자.그림자.forEach((k) => keys.add(k)); }
      if (c.사진컷) keys.add(c.사진컷);
      if (c.겹치기) keys.add(c.겹치기);
      if (c.증거보이기) c.증거보이기.forEach((id) => G.ev[id] && keys.add(G.ev[id].그림));
      if (c.조사배경 && DATA.배경[c.조사배경]) keys.add(DATA.배경[c.조사배경].그림); // 조사 장소(walk가 장소 하나씩 넘긴다)의 조사배경
      // 5화 연출 그림
      if (typeof c.그림 === 'string') keys.add(c.그림);
      if (c.나란히겹치기) c.나란히겹치기.forEach((p) => keys.add(p.그림));
      if (c.아이콘지도) { keys.add(c.아이콘지도.지도); keys.add(c.아이콘지도.아이콘); }
      if (c.훑어보기) keys.add(c.훑어보기.그림);
      if (c.지도점 && G.ep.지도점 && G.ep.지도점.겹침) keys.add(G.ep.지도점.겹침);
    });
    return [...keys].filter(Boolean);
  }

  function updateTopbar() {
    $('#btn-record').hidden = !P.running || G.listening || !P.evidence.length;
  }
  G.updateTopbar = updateTopbar;

  // 게임 시작: from = { 막, 명령, 증거, 신뢰도, 조사 } (없으면 처음부터)
  G.startGame = async (from = {}) => {
    const ep = G.ep;
    G.store.markPlayed(ep.번호);
    P.act = from.막 || 0;
    P.idx = from.명령 || 0;
    P.section = P.idx;
    const got = collectEvidence(P.act, P.idx);
    P.evidence = from.증거 ? from.증거.slice() : got.list;
    P.upd = from.증거 ? Object.assign({}, from.갱신 || {}) : got.upd;
    G.ev = buildEvidence(P.upd);
    P.gauge = from.신뢰도 || 5;
    P.explore = from.조사 || null;
    P.quit = false;
    P.running = true;
    G.log.length = 0;
    restoreScene(P.act, P.idx);
    if (G.scene.trial) G.stage.updateGauge();
    updateTopbar();
    save();
    try {
      for (let a = P.act; a < ep.막.length; a++) {
        P.act = a;
        const act = ep.막[a];
        const startIdx = a === from.막 ? P.idx : 0;
        await G.preload(imagesOfAct(a));
        G.preload(imagesOfAct(a + 1)); // 다음 막은 뒤에서 미리 받기
        // 제N화 제목은 맨 처음에만. 제목화면: false 인 화(4화)는 대본의 자리({ 화제목 })에 띄운다
        if (a === 0 && startIdx === 0 && ep.제목화면 !== false) await G.screens.episodeTitle();
        let i = startIdx;
        while (i < act.내용.length) {
          P.idx = i;
          try {
            await exec(act.내용[i]);
            i++;
          } catch (err) {
            if (!(err instanceof Restart)) throw err;
            // 재판 연기 → 그 증언의 처음부터 다시
            clearControls();
            G.box.hide();
            $('#hotspots').innerHTML = '';
            $('#big').innerHTML = '';
            choicesEl.hidden = true;
            restoreScene(a, err.index);
            G.stage.updateGauge();
            i = err.index;
          }
        }
        P.explore = null;
        from = {};
      }
    } catch (err) {
      if (!(err instanceof Quit)) { console.error(err); throw err; }
    } finally {
      P.running = false;
    }
  };

  G.currentAct = () => G.ep.막[P.act];
})();
