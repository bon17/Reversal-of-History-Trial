// 기본값 표: 게임(core.js), 점검(check.js), 만들기 도우미(maker.html)가 함께 쓴다.
// 여기 적힌 것은 my-game/settings.js 에서 바꾸거나 더할 수 있다.
(function (root) {
  const D = {};

  // 표정 이름(한글) → 그림 파일 뒷부분. 인물 그림 파일 이름은 "파일_표정.png" (예: sora_smile.png)
  D.EXPR = {
    '기본': 'default', '미소': 'smile', '웃음': 'smile', '놀람': 'surprised', '생각': 'think', '당황': 'flustered',
    '진지': 'serious', '슬픔': 'sad', '분노': 'angry', '화남': 'angry', '자신감': 'confident', '결의': 'determined',
    '걱정': 'worried', '안도': 'relieved', '비웃음': 'smirk', '겁먹음': 'scared', '엄숙': 'stern', '감사': 'grateful',
    '난처함': 'awkward', '미안함': 'sorry', '무표정': 'blank', '지침': 'tired', '뒷모습': 'back',
  };
  // 그림이 없을 때 자리 그림의 얼굴로 쓰는 이모지
  D.EXPR_EMOJI = {
    default: '🙂', smile: '😊', surprised: '😲', think: '🤔', flustered: '😳', serious: '😐', sad: '😢', angry: '😠',
    confident: '😎', determined: '😤', worried: '😟', relieved: '😌', smirk: '😏', scared: '😨', stern: '🧐',
    grateful: '🥹', awkward: '😅', sorry: '😔', blank: '😶', tired: '😩', back: '👤',
  };
  // 법정 자리: 말하는 사람의 자리로 화면이 바뀐다. 그림 이름은 my-game/images/ 기준 (없으면 자리 그림)
  D.SEATS = {
    '변호인석': { 배경: 'backgrounds/court_defense', 책상: 'backgrounds/court_defense_desk' },
    '검사석': { 배경: 'backgrounds/court_prosecution', 책상: 'backgrounds/court_prosecution_desk' },
    '증언대': { 배경: 'backgrounds/court_witness', 책상: 'backgrounds/court_witness_desk' },
    '피고석': { 배경: 'backgrounds/court_defendant', 책상: 'backgrounds/court_defendant_desk' },
    '재판장석': { 배경: 'backgrounds/court_judge', 책상: null },
    '전경': { 배경: 'backgrounds/court_wide', 책상: null },
  };
  // 기록 종류: 증거 카드의 색. 이름과 성격을 수업에 맞게 바꿀 수 있다
  //   오답벌칙없음: 잘못 제시해도 신뢰도가 줄지 않는다 / 제시연출: '차분'(음악이 멈추고 화면이 차분해짐), '빛'(화면에 빛이 번짐)
  //   읽기전용: 제시할 수 없고 읽기만 하는 카드 (용어 풀이)
  D.KINDS = {
    파랑: { 이름: '증거', 표시: '🟦', 색: '#3d6fd6' },
    빨강: { 이름: '피해 기록', 표시: '🟥', 색: '#c9412f', 오답벌칙없음: true, 제시연출: '차분' },
    초록: { 이름: '선택 기록', 표시: '🟩', 색: '#3fa45b', 제시연출: '빛' },
    노랑: { 이름: '자료', 표시: '🟨', 색: '#d9a520' },
    보라: { 이름: '기록', 표시: '🟪', 색: '#8a5cd6' },
    개념: { 이름: '개념 카드', 표시: '', 색: '#e8b84a', 읽기전용: true },
  };
  // 색 테마: [바탕, 포인트]
  D.THEMES = {
    '남색금빛': ['#13224a', '#e8b84a'], '칠판': ['#1d4536', '#f0e2a8'], '노을': ['#4a2238', '#ffb86b'],
    '바다': ['#0f4658', '#9fe3ff'], '먹빛': ['#2b2b30', '#e6e2d6'], '숲': ['#243b22', '#c9e27a'],
  };
  D.FONTS = {
    '명조': '"RIDIBatang", "Noto Serif KR", "AppleMyungjo", "Batang", "바탕", serif',
    '고딕': '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif',
  };
  // 엔진이 스스로 내는 효과음 이름 (my-game/audio/ 에 이 파일이 있으면 소리가 난다)
  D.SOUNDS = {
    BGM: {},
    효과음: {
      '증거 획득음': 'se/evidence_get', '증거 제출음': 'se/evidence_present', '증거 갱신음': 'se/evidence_update', '증언 수정음': 'se/testimony_update',
      '신뢰도 감소음': 'se/penalty', '대사 글자음': 'se/text_blip', '외침': 'se/shout', '망치 소리': 'se/gavel', '쾅': 'se/slam',
    },
    꾸밈음량: { '잔잔하게': 0.55, '낮게': 0.5, '조용하게': 0.45, '작게': 0.4, '아주 작게': 0.3, '크게': 1, '가장 크게': 1, '다시': 0.8 },
  };

  // 명령 이름 (ai/데이터_형식.md 와 같아야 한다)
  D.COMMANDS = ['구간', '배경', 'BGM', '효과음', '말', '대기', '인물숨기기', '연출', '컷', '자막', '외침', '띠', '증거획득', '증거갱신', '확대', '인용',
    '증거보이기', '증거제출', '선택지', '안내창', '보이기', '등장', '퇴장', '사진', '화제목', '부제목', '이름표', '종이', '재판', '판결', '기록카드', '표', '연표',
    '쓰기', '다음화', '끝', '증언', '반격', '조사파트'];
  D.EFFECTS = ['흔들림', '크게 흔들림', '반짝', '암전', '암전 끝', '휘청', '정적', '차분하게', '차분함 끝', '빛', '빛 끝', '비', '비 그침', '회상', '회상 끝', '어둡게', '밝게'];
  D.WRITE_TYPES = ['증거', '고르기', '인물', '한줄', '길게', '답장'];

  // 명령의 종류: 명령 이름 가운데 맨 먼저 적힌 것 (AI가 { 표정, 말, 대사 } 처럼 순서를 바꿔 써도 '말'로 알아본다)
  D.cmdKey = (c) => {
    const keys = Object.keys(c || {});
    return keys.find((k) => D.COMMANDS.includes(k)) || keys[0];
  };
  D.list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

  root.KIT_DEFAULTS = D;
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
