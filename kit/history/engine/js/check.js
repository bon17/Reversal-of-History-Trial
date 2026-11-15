// 데이터 점검: 게임 데이터(DATA)를 읽어 문제를 쉬운 말로 알려 준다.
// 돌려주는 것: [{ 수준: '오류' | '주의' | '참고', 곳, 글, 도움 }]
//   오류: 게임이 멈추거나 풀 수 없게 되는 문제 (꼭 고친다)
//   주의: 실행은 되지만 뜻한 대로 보이지 않을 수 있는 것
//   참고: 더 좋게 만들 수 있는 것
// 게임(index.html)의 처음 화면, 만들기 도우미(maker.html), 명령줄(node tools/check.mjs)이 함께 쓴다.
(function (root) {
  const D = root.KIT_DEFAULTS || (typeof require !== 'undefined' ? require('./defaults.js') : null);
  const list = D.list;

  function check(DATA) {
    const out = [];
    const add = (수준, 곳, 글, 도움) => { if (!out.some((o) => o.곳 === 곳 && o.글 === 글)) out.push({ 수준, 곳, 글, 도움: 도움 || '' }); };
    DATA = DATA || {};
    const g = DATA.게임 || {};
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

    // ── 설정 ──
    if (!DATA.게임) add('주의', '설정', 'DATA.게임 설정이 없어요. 제목과 인물, 배경이 기본값으로 나와요.', 'settings.js 에 DATA.게임 = { 제목: …, 인물: { … }, 배경: { … } } 을 넣어 주세요.');
    else if (!g.제목) add('주의', '설정', '게임 제목(제목)이 없어요.', "DATA.게임 에 제목: '내 게임 제목' 을 넣어 주세요.");
    const 인물 = Object.assign({}, DATA.인물, g.인물);
    const 배경 = Object.assign({ '검은 화면': { 그림: null } }, DATA.배경, g.배경);
    const 표정 = Object.assign({}, D.EXPR, DATA.표정, g.표정);
    const 종류 = Object.assign({}, D.KINDS);
    for (const [k, v] of Object.entries(g.기록종류 || {})) 종류[k] = Object.assign({}, 종류[k], typeof v === 'string' ? { 이름: v } : v);
    const 자리 = Object.assign({}, D.SEATS, DATA.법정자리, g.법정자리);
    const 소리 = { BGM: Object.assign({}, (DATA.소리 || {}).BGM, (g.소리 || {}).BGM), 효과음: Object.assign({}, D.SOUNDS.효과음, (DATA.소리 || {}).효과음, (g.소리 || {}).효과음) };
    const soundKnown = (table, name) => !name || name === '멈춤' || /^없음/.test(name) || table[name] || table[String(name).replace(/\s*\([^)]*\)\s*$/, '')];

    for (const [n, c] of Object.entries(인물)) {
      if (!isObj(c)) { add('오류', '설정 > 인물 「' + n + '」', '인물 정보는 { 자리: …, 이모지: … } 모양이어야 해요.'); continue; }
      if (c.자리 && !자리[c.자리]) add('주의', '설정 > 인물 「' + n + '」', "자리 '" + c.자리 + "' 는 없는 자리예요. 증언대로 나와요.", '쓸 수 있는 자리: ' + Object.keys(자리).filter((k) => k !== '전경').join(', '));
      if (c.얼굴 && !(Array.isArray(c.얼굴) && c.얼굴.length === 3 && c.얼굴.every((x) => typeof x === 'number'))) add('주의', '설정 > 인물 「' + n + '」', '얼굴은 [가운데 x, 가운데 y, 반지름] 숫자 세 개여야 해요.');
      if (c.파일 && /[^A-Za-z0-9_\-]/.test(c.파일)) add('주의', '설정 > 인물 「' + n + '」', "파일 이름 '" + c.파일 + "' 에 영어·숫자·밑줄이 아닌 글자가 있어요. 기기에 따라 그림을 못 찾을 수 있어요.", '파일 이름은 영어 소문자와 숫자로 써 주세요. 예: sora');
    }
    for (const k of ['주인공', '조수']) if (g[k] && !인물[g[k]]) add('주의', '설정', k + " '" + g[k] + "' 이(가) 인물 표에 없어요.");
    if (typeof g.테마 === 'string' && !D.THEMES[g.테마]) add('주의', '설정', "테마 '" + g.테마 + "' 는 없어요. 기본 테마로 나와요.", '쓸 수 있는 테마: ' + Object.keys(D.THEMES).join(', '));
    if (g.화선택 && !['자유', '코드', '순서'].includes(g.화선택)) add('주의', '설정', "화선택은 '자유', '코드', '순서' 가운데 하나여야 해요.");
    if (g.저장주소 && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(g.저장주소)) add('주의', '설정', '저장주소가 구글 앱스 스크립트 웹 앱 주소(https://script.google.com/…/exec) 모양이 아니에요.');

    const realLines = {}; // 실존 인물(인물에 실존: true)이 한 대사 수
    // ── 화 ──
    const eps = Object.entries(DATA).filter(([, d]) => isObj(d) && d.막 !== undefined);
    if (!eps.length) { add('오류', '이야기', '이야기가 없어요.', 'story1.js 에 DATA.ep1 = { 번호: 1, 제목: …, 증거: { … }, 막: [ … ] } 을 넣어 주세요.'); return out; }
    const seenNo = {};
    for (const [key, ep] of eps) {
      const E = (ep.번호 != null ? '제' + ep.번호 + '화' : key);
      if (ep.번호 == null) add('오류', E, '번호가 없어요.', '번호: 1 처럼 화 번호를 넣어 주세요.');
      else if (seenNo[ep.번호]) add('오류', E, '번호 ' + ep.번호 + ' 이(가) ' + seenNo[ep.번호] + ' 와(과) 겹쳐요.');
      else seenNo[ep.번호] = key;
      if (!ep.제목) add('주의', E, '제목이 없어요.');
      if (!Array.isArray(ep.막) || !ep.막.length) { add('오류', E, '막이 없어요.', '막: [ { 이름: …, 내용: [ … ] } ] 모양으로 넣어 주세요.'); continue; }

      // 증거
      const evs = isObj(ep.증거) ? ep.증거 : {};
      if (ep.증거 && !isObj(ep.증거)) add('오류', E + ' > 증거', '증거는 { 이름표: { 이름: …, 설명: … }, … } 모양이어야 해요.');
      for (const [id, e] of Object.entries(evs)) {
        const W = E + ' > 증거 「' + id + '」';
        if (!isObj(e)) { add('오류', W, '증거 정보는 { 이름: …, 색: …, 설명: … } 모양이어야 해요.'); continue; }
        if (!e.이름) add('오류', W, '이름이 없어요.');
        if (e.색 && !종류[e.색]) add('주의', W, "색 '" + e.색 + "' 은(는) 기록 종류에 없어요. 파랑으로 나와요.", '쓸 수 있는 색: ' + Object.keys(종류).join(', '));
        if (!list(e.설명).length) add('주의', W, '설명이 없어요.');
        if (e.얼굴 && !(Array.isArray(e.얼굴) && 인물[e.얼굴[0]])) add('주의', W, '얼굴은 [인물 이름, 표정] 이고, 인물 표에 있는 이름이어야 해요.');
        if ((e.사진 || e.사료) && !e.출처) add('주의', W, '실제 사진·사료인데 출처가 없어요.', "출처: '○○박물관 소장' 처럼 어디서 가져왔는지 적어 주세요. 쓸 수 있는 자료인지도 확인해 주세요.");
      }
      const readOnly = (id) => { const e = evs[id]; return !!(e && (종류[e.색] || {}).읽기전용); };

      // 명령을 차례로 따라가며 본다 (have: 그때까지 얻은 증거)
      const have = new Set();
      const used = new Set();
      const updCount = {};
      let trial = false, sections = 0, ended = null, endedNoted = false;

      const person = (name, W, what) => {
        if (!name || /^\(.*\)$/.test(name) || /\(자막\)$/.test(name)) return;
        if (!인물[name]) add('주의', W, what + " '" + name + "' 이(가) 인물 표에 없어요. 이름만 나오고 그림은 나오지 않아요.", '이름을 잘못 썼는지 확인하거나, 설정의 인물 표에 더해 주세요.');
      };
      const expr = (e, W) => { if (e && !표정[e]) add('주의', W, "표정 '" + e + "' 은(는) 표정 표에 없어요. 기본 표정으로 나와요.", '쓸 수 있는 표정: ' + Object.keys(표정).join(', ')); };
      const evId = (id, W, what) => { if (!evs[id]) { add('오류', W, what + " '" + id + "' 은(는) 증거 표에 없어요.", '이 화의 증거: ' + (Object.keys(evs).join(', ') || '(없음)')); return false; } return true; };
      const strs = (v, W, what) => { if (!list(v).length || list(v).some((t) => typeof t !== 'string')) add('오류', W, what + ' 은(는) 글(따옴표로 감싼 문장)이나 글의 목록이어야 해요.'); };

      function answerOk(a, W, n, sts, gained) {
        if (!isObj(a)) { add('오류', W, '정답은 { 문장: 번호, 증거: 이름표 } 모양이어야 해요.'); return; }
        if (!(Number.isInteger(a.문장) && a.문장 >= 1 && a.문장 <= n)) add('오류', W, '정답의 문장 번호(' + a.문장 + ')가 1~' + n + ' 사이가 아니에요.');
        else if (a.수정후 && !(sts[a.문장 - 1] || {}).수정) add('오류', W, '수정후: true 인데 ' + a.문장 + '번 문장에 수정이 없어요.');
        if (!evId(a.증거, W, '정답 증거')) return;
        used.add(a.증거);
        if (readOnly(a.증거)) add('오류', W, "정답 증거 '" + a.증거 + "' 은(는) 읽기만 하는 카드(개념 카드)라서 제시할 수 없어요.", '색을 파랑 같은 다른 종류로 바꾸거나 다른 증거를 정답으로 해 주세요.');
        else if (!have.has(a.증거) && !gained.has(a.증거)) add('오류', W, "정답 증거 '" + a.증거 + "' 을(를) 이때까지 얻지 못해요. 학생이 풀 수 없어요.", '이 증언보다 앞에 { 증거획득: \'' + a.증거 + '\' } 을 넣어 주세요.');
      }

      function walk(cmds, W0) {
        list(cmds).forEach((c, i) => {
          const W = W0 + ' > ' + (i + 1) + '번째 명령';
          if (!isObj(c)) { add('오류', W, '명령은 { 이름: 값 } 모양이어야 해요.'); return; }
          const key = D.cmdKey(c);
          const v = c[key];
          if (ended && !endedNoted) { add('참고', W, "{ " + ended + " } 뒤에 있는 명령은 실행되지 않아요."); endedNoted = true; }
          if (!D.COMMANDS.includes(key)) {
            const hint = c.대사 !== undefined ? "대사만 있고 말하는 사람이 없어요. { 말: '이름', 대사: '…' } 로 써 주세요." : '쓸 수 있는 명령: ' + D.COMMANDS.join(', ');
            add('오류', W, "모르는 명령이에요: '" + key + "'", hint);
            return;
          }
          switch (key) {
            case '구간': sections++; break;
            case '말':
              if (typeof c.대사 !== 'string' || !c.대사.trim()) add('오류', W, "'" + v + "' 의 대사가 없어요.", "{ 말: '이름', 표정: '기본', 대사: '…' }");
              else if (c.대사.length > 160) add('참고', W, '대사가 길어요 (' + c.대사.length + '자). 화면에서는 저절로 여러 쪽으로 나뉘지만, 두 대사로 나누면 읽기 편해요.');
              person(v, W, '말하는 사람'); expr(c.표정, W);
              if (인물[v] && 인물[v].실존 && !인물[v].확인함) realLines[v] = (realLines[v] || 0) + 1;
              if (c.보기) { person(c.보기, W, '보기 인물'); expr(c.보기표정, W); }
              break;
            case '배경': if (!배경[v]) add('주의', W, "배경 '" + v + "' 이(가) 배경 표에 없어요. 이름만 적힌 자리 그림으로 나와요.", '설정의 배경 표에 더해 주세요. 지금 있는 배경: ' + Object.keys(배경).join(', ')); break;
            case 'BGM': if (!soundKnown(소리.BGM, v)) add('참고', W, "BGM '" + v + "' 이(가) 소리 표에 없어요. 소리 없이 넘어가요."); break;
            case '효과음': if (!soundKnown(소리.효과음, v)) add('참고', W, "효과음 '" + v + "' 이(가) 소리 표에 없어요. 소리 없이 넘어가요."); break;
            case '연출': if (!D.EFFECTS.includes(v)) add('주의', W, "연출 '" + v + "' 은(는) 없어요.", '쓸 수 있는 연출: ' + D.EFFECTS.join(', ')); break;
            case '대기': if (typeof v !== 'number') add('주의', W, '대기는 숫자(1000 = 1초)여야 해요.'); break;
            case '증거획득': if (evId(v, W, '얻을 증거')) have.add(v); break;
            case '증거갱신':
              if (evId(v, W, '갱신할 증거')) {
                updCount[v] = (updCount[v] || 0) + 1;
                if (list(evs[v].갱신).length < updCount[v]) add('주의', W, "증거 '" + v + "' 에 갱신 내용이 모자라요.", '증거에 갱신: [ { 방식: \'추가\', 설명: [ … ] } ] 을 넣어 주세요.');
                if (!have.has(v)) add('주의', W, "아직 얻지 않은 증거 '" + v + "' 을(를) 갱신해요.");
              }
              break;
            case '증거제출': if (v !== '$제시') evId(v, W, '제출할 증거'); break;
            case '증거보이기': list(v).forEach((id) => evId(id, W, '보여 줄 증거')); break;
            case '사진': if (v) evId(v, W, '사진으로 띄울 증거'); break;
            case '자막': case '안내창': case '종이': strs(v, W, key); break;
            case '외침': case '띠': if (typeof v !== 'string') add('오류', W, key + ' 은(는) 글이어야 해요.'); break;
            case '재판': if (v !== '시작' && v !== '끝') add('주의', W, "재판은 '시작' 또는 '끝' 이어야 해요."); trial = v === '시작'; break;
            case '보이기': case '등장': person(v, W, key + ' 인물'); expr(c.표정, W); break;
            case '기록카드': if (!isObj(v) || !list(v.문단 || v.글).length) add('오류', W, '기록카드는 { 제목: …, 문단: [ … ] } 모양이어야 해요.'); break;
            case '표': if (!isObj(v) || !list(v.머리).length || !list(v.줄).length) add('오류', W, '표는 { 머리: [칸…], 줄: [[칸…], …] } 모양이어야 해요.'); break;
            case '연표': if (!isObj(v) || !list(v.줄).length) add('오류', W, "연표는 { 제목, 줄: [['1861년', '일어난 일'], …] } 모양이어야 해요."); break;
            case '선택지': {
              const opts = list(v);
              if (!opts.length || opts.some((o) => !isObj(o) || typeof o.글 !== 'string')) { add('오류', W, "선택지는 [ { 글: '…', 정답: true }, { 글: '…', 결과: [ … ] } ] 모양이어야 해요."); break; }
              const hasAnswer = opts.some((o) => o.정답);
              opts.forEach((o, k) => {
                if (hasAnswer && !o.정답 && !list(o.결과).length) add('주의', W, "오답 선택지 '" + o.글 + "' 을(를) 골랐을 때 보여 줄 결과가 없어요. 아무 반응 없이 다시 묻게 돼요.");
                walk(o.결과, W + ' > 선택지 ' + (k + 1));
              });
              break;
            }
            case '조사파트': {
              const places = list(isObj(v) ? v.장소 : null);
              if (!places.length) { add('오류', W, '조사파트에 장소가 없어요.', "조사파트: { 장소: [ { 이름: …, 배경: …, 도착: [ … ], 포인트: [ … ] } ], 마무리: [ … ] }"); break; }
              const names = places.map((l) => l && l.이름);
              places.forEach((l, k) => {
                const WL = W + ' > 장소 「' + ((l && l.이름) || k + 1) + '」';
                if (!isObj(l) || !l.이름) { add('오류', WL, '장소에 이름이 없어요.'); return; }
                if (!배경[l.배경 || l.이름]) add('주의', WL, "배경 '" + (l.배경 || l.이름) + "' 이(가) 배경 표에 없어요. 자리 그림으로 나와요.");
                if (!list(l.도착).length && !list(l.포인트).length) add('주의', WL, '도착 대화도 조사 포인트도 없는 장소예요.');
                list(l.열림).forEach((nm) => { if (!names.includes(nm)) add('오류', WL, "열림에 적은 장소 '" + nm + "' 이(가) 없어요. 이 장소에 갈 수 없게 돼요."); });
                walk(l.도착, WL + ' > 도착');
                list(l.포인트).forEach((pt, m) => {
                  const WP = WL + ' > 포인트 「' + ((pt && pt.이름) || m + 1) + '」';
                  if (!isObj(pt) || !pt.이름) { add('오류', WP, '조사 포인트에 이름이 없어요.'); return; }
                  const p = pt.위치;
                  if (p && !(Array.isArray(p) && p.length === 4 && p.every((x) => typeof x === 'number'))) add('주의', WP, '위치는 [왼쪽 x, 위 y, 너비, 높이] 숫자 네 개여야 해요. 지금은 자동으로 놓여요.');
                  else if (p && (p[0] < 0 || p[1] < 0 || p[0] + p[2] > 1536 || p[1] + p[3] > 1024)) add('주의', WP, '위치가 화면(가로 1536, 세로 1024) 밖으로 나가요.');
                  else if (p && p[1] + p[3] / 2 > 800) add('참고', WP, '돋보기가 화면 아래쪽에 있어요. 가로 화면에서는 안내 글에 가릴 수 있으니 조금 위로 올리면 좋아요.');
                  if (!list(pt.내용).length) add('주의', WP, '조사했을 때 나올 내용이 없어요.');
                  walk(pt.내용, WP);
                });
              });
              walk(v.마무리, W + ' > 마무리');
              break;
            }
            case '증언': {
              const T = v;
              if (!isObj(T)) { add('오류', W, '증언은 { 제목, 증인, 문장: [ … ], 정답: [ … ], 정답장면: [ … ] } 모양이어야 해요.'); break; }
              const WT = W + ' > 증언 「' + (T.제목 || '') + '」';
              if (!T.증인 || !인물[T.증인]) add('오류', WT, "증인 '" + (T.증인 || '') + "' 이(가) 인물 표에 없어요.");
              expr(T.표정, WT);
              const sts = list(T.문장).map((s) => (typeof s === 'string' ? { 글: s } : s));
              const n = sts.length;
              if (!n) { add('오류', WT, '증언 문장이 없어요.'); break; }
              if (!trial) add('참고', WT, "{ 재판: '시작' } 이 앞에 없어서 신뢰도 칸이 보이지 않고, 틀려도 줄지 않아요.");
              // 추궁에서 얻는 증거는 이 증언의 정답으로 쓸 수 있다 (학생이 추궁하면 얻으므로)
              const before = new Set(have);
              walk(T.증언후, WT + ' > 증언후');
              walk(T.반대심문전, WT + ' > 반대심문전');
              sts.forEach((s, k) => {
                const WS = WT + ' > ' + (k + 1) + '번 문장';
                if (!isObj(s) || typeof s.글 !== 'string' || !s.글.trim()) { add('오류', WS, "문장에 글이 없어요. { 글: '…', 추궁: [ … ] }"); return; }
                if (!list(s.추궁).length && T.추궁정답 !== k + 1) add('참고', WS, '추궁했을 때 나올 대화(추궁)가 없어요. 기본 대답이 나와요.');
                walk(s.추궁, WS + ' > 추궁');
                if (s.수정) { if (!isObj(s.수정) || typeof s.수정.글 !== 'string') add('오류', WS, "수정은 { 글: '바뀐 문장', 뒤: [ … ] } 모양이어야 해요."); else walk(s.수정.뒤, WS + ' > 수정 뒤'); }
                if (s.추가) strs(s.추가, WS, '추가');
              });
              const gained = new Set([...have].filter((x) => !before.has(x)));
              const stages = T.단계 ? list(T.단계) : [{ 정답: T.정답, 정답장면: T.정답장면, 힌트: T.힌트 }];
              if (T.추궁정답 != null) {
                if (!(Number.isInteger(T.추궁정답) && T.추궁정답 >= 1 && T.추궁정답 <= n)) add('오류', WT, '추궁정답(' + T.추궁정답 + ')이 1~' + n + ' 사이가 아니에요.');
                walk(T.정답장면, WT + ' > 정답장면');
              } else {
                stages.forEach((st, k) => {
                  const WG = stages.length > 1 ? WT + ' > ' + (k + 1) + '단계' : WT;
                  walk(st.앞, WG + ' > 앞');
                  if (!list(st.정답).length) add('오류', WG, '정답이 없어요. 이 증언을 넘어갈 수 없어요.', "정답: [ { 문장: 2, 증거: '증거이름표' } ]");
                  list(st.정답).forEach((a) => answerOk(a, WG + ' > 정답', n, sts, gained));
                  if (!list(st.정답장면).length) add('주의', WG, '정답을 맞혔을 때 나올 장면(정답장면)이 없어요.');
                  if (!st.힌트) add('주의', WG, '힌트가 없어요. 두 번 틀린 학생이 도움을 받을 수 없어요.', "힌트: { 말: '조수 이름', 표정: '생각', 대사: '…' }");
                  else if (isObj(st.힌트)) { person(st.힌트.말, WG + ' > 힌트', '힌트를 주는 사람'); if (typeof st.힌트.대사 !== 'string') add('오류', WG + ' > 힌트', '힌트에 대사가 없어요.'); }
                  walk(st.정답장면, WG + ' > 정답장면');
                });
              }
              list(T.보조정답).forEach((a, k) => { if (isObj(a)) { evId(a.증거, WT + ' > 보조정답 ' + (k + 1), '증거'); walk(a.장면, WT + ' > 보조정답 ' + (k + 1)); } });
              for (const k of ['일반오답', '피해오답']) if (Array.isArray(T[k])) walk(T[k], WT + ' > ' + k);
              break;
            }
            case '반격': {
              const steps = list(isObj(v) && v.단계 ? v.단계 : v);
              if (!steps.length) { add('오류', W, '반격에 단계가 없어요.', "반격: { 단계: [ { 주장: { 말, 대사 }, 정답: ['증거'], 정답장면: [ … ], 힌트: … } ] }"); break; }
              steps.forEach((st, k) => {
                const WG = W + ' > 반격 ' + (k + 1) + '단계';
                if (!isObj(st)) { add('오류', WG, '단계는 { 주장, 정답, 정답장면 } 모양이어야 해요.'); return; }
                walk(st.앞, WG + ' > 앞');
                if (!st.주장 && !list(st.앞).some((x) => x && x.말)) add('주의', WG, '반박할 주장(주장)이 없어요. 바로 앞 대사가 주장으로 나와요.');
                if (st.주장) { if (!isObj(st.주장) || typeof st.주장.대사 !== 'string') add('오류', WG, "주장은 { 말: '이름', 표정: …, 대사: '…' } 모양이어야 해요."); else { person(st.주장.말, WG + ' > 주장', '말하는 사람'); expr(st.주장.표정, WG + ' > 주장'); } }
                if (!list(st.정답).length) add('오류', WG, '정답이 없어요. 넘어갈 수 없어요.', "정답: ['증거이름표']");
                list(st.정답).forEach((id) => {
                  if (!evId(id, WG + ' > 정답', '정답 증거')) return;
                  used.add(id);
                  if (readOnly(id)) add('오류', WG + ' > 정답', "정답 증거 '" + id + "' 은(는) 읽기만 하는 카드라서 제시할 수 없어요.");
                  else if (!have.has(id)) add('오류', WG + ' > 정답', "정답 증거 '" + id + "' 을(를) 이때까지 얻지 못해요. 학생이 풀 수 없어요.", "앞에 { 증거획득: '" + id + "' } 을 넣어 주세요.");
                });
                if (!st.힌트) add('주의', WG, '힌트가 없어요.');
                if (!list(st.정답장면).length) add('주의', WG, '정답을 맞혔을 때 나올 장면(정답장면)이 없어요.');
                walk(st.정답장면, WG + ' > 정답장면');
                list(st.따로오답).forEach((o) => { if (isObj(o)) walk(o.장면, WG + ' > 따로오답'); });
              });
              break;
            }
            case '쓰기': {
              if (!isObj(v) || !list(v.문항).length) { add('오류', W, "쓰기는 { 제목, 안내: [ … ], 문항: [ { 종류, 이름, 질문 }, … ] } 모양이어야 해요."); break; }
              list(v.문항).forEach((q, k) => {
                const WQ = W + ' > 쓰기 ' + (k + 1) + '번 문항';
                if (isObj(q) && q.종류 === '답장') { if (typeof q.메시지 !== 'string') add('오류', WQ, "답장 문항에는 반박할 말(메시지)이 있어야 해요. { 종류: '답장', 이름, 보낸이, 메시지 }"); if (!q.이름) add('참고', WQ, '이름이 없어요.'); return; }
                if (!isObj(q) || typeof q.질문 !== 'string') { add('오류', WQ, '문항에 질문이 없어요.'); return; }
                if (!D.WRITE_TYPES.includes(q.종류)) add('오류', WQ, "문항 종류 '" + q.종류 + "' 은(는) 없어요.", '쓸 수 있는 종류: ' + D.WRITE_TYPES.join(', '));
                if (q.종류 === '고르기' && list(q.보기).length < 2) add('오류', WQ, '고르기 문항에는 보기가 두 개 이상 있어야 해요.');
                if (q.종류 === '인물') { if (!list(q.인물).length) add('오류', WQ, '인물 문항에는 인물 목록이 있어야 해요.'); list(q.인물).forEach((nm) => person(nm, WQ, '고를 인물')); }
                if (!q.이름) add('참고', WQ, "이름이 없어요. 구글 시트의 열 이름이 '문항 " + (k + 1) + "' 로 들어가요.");
              });
              break;
            }
            case '다음화': case '끝': ended = key; break;
          }
        });
      }

      for (const k of ['일반', '피해']) if (ep.오답 && ep.오답[k]) walk(ep.오답[k], E + ' > 오답 > ' + k);
      ep.막.forEach((act, a) => {
        const W = E + ' > ' + (a + 1) + '막' + (act && act.이름 ? ' 「' + act.이름 + '」' : '');
        if (!isObj(act) || !Array.isArray(act.내용)) { add('오류', W, "막은 { 이름: '…', 내용: [ 명령, … ] } 모양이어야 해요."); return; }
        if (!act.이름) add('참고', W, '막 이름이 없어요. 이어하기 버튼에 이름이 나오지 않아요.');
        walk(act.내용, W);
      });

      if (!sections) add('참고', E, "저장 지점({ 구간: '이름' })이 하나도 없어요. 장면이 바뀌는 곳마다 넣으면 그 자리부터 이어할 수 있어요.");
      for (const id of Object.keys(evs)) if (!have.has(id)) add('참고', E + ' > 증거 「' + id + '」', '이 증거를 얻는 곳({ 증거획득 })이 없어요.');
    }
    for (const [n, k] of Object.entries(realLines)) add('주의', '설정 > 인물 「' + n + '」', "실존 인물 '" + n + "' 의 대사가 " + k + '개 있어요. 실제 기록에 있는 말인지, 지어낸 말이 아닌지 확인해 주세요.', '확인을 마쳤으면 인물에 확인함: true 를 적으면 이 알림이 사라져요. 지어낸 대사는 가상 인물에게 맡기거나 { 인용: … } 으로 실제 기록만 보여 주세요.');
    const order = { 오류: 0, 주의: 1, 참고: 2 };
    return out.sort((a, b) => order[a.수준] - order[b.수준]);
  }

  root.KIT_CHECK = check;
  if (root.G) root.G.check = check;
  if (typeof module !== 'undefined' && module.exports) module.exports = check;
})(typeof window !== 'undefined' ? window : globalThis);
