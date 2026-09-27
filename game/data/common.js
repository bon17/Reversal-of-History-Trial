// 여러 화에서 함께 쓰는 표: 인물, 표정, 법정 자리, 배경, 소리
// 그림 이름은 assets/ 폴더 기준 (확장자 없이). 게임은 game/img/ 의 WebP를 먼저 쓰고, 없으면 assets/ 원본을 쓴다.
window.DATA = window.DATA || {};

// 표정 한글 → 파일 이름 (스프라이트 목록 2-2 표)
DATA.표정 = {
  '기본': 'default', '생각': 'think', '놀람': 'surprised', '자신감': 'confident', '당황': 'flustered',
  '결의': 'determined', '진지': 'serious', '안도': 'relieved', '거만': 'arrogant', '친절함': 'kind',
  '옅은 미소': 'faint_smile', '뒷모습': 'back', '칼집 가리기': 'hide_scabbard',
  '슬픔': 'sad', '미소': 'smile', '걱정': 'worried', '비웃음': 'smirk', '분노': 'angry', '엄숙': 'stern',
  '겁먹음': 'scared', '감사': 'grateful', '온화함': 'gentle', '냉랭함': 'frosty', '불안': 'nervous',
  '이의 있음 포즈': 'objection', '시계를 귀에 댐': 'watch_ear',
  '무너짐': 'breakdown', '냉정': 'cold', '오만': 'haughty', '무표정': 'blank', '괴로움': 'anguish',
  '지침': 'tired', '난처함': 'awkward', '미안함': 'sorry', '생각에 잠김': 'pensive', '경계': 'wary',
  '굳음': 'stiff', '피고석 포즈': 'defendant', '실루엣': 'silhouette',
};

// 인물: 파일 앞부분, 법정에서 서는 자리, 얼굴 그림 자르는 곳 [가운데 x, 가운데 y, 반지름] (1024×1024 기준)
// 화면밖: 법정 밖에서는 화면에 서지 않고 작은 얼굴로만 표시 (역전재판처럼 주인공 시점)
DATA.인물 = {
  '신중한': { 파일: 'junghan', 자리: '변호인석', 얼굴: [560, 250, 170], 화면밖: true },
  '한나':   { 파일: 'hanna',   자리: '변호인석', 얼굴: [560, 270, 170] },
  '레테':   { 파일: 'lethe',   자리: '검사석',   얼굴: [600, 250, 180] },
  '재판장': { 파일: 'judge',   자리: '재판장석', 얼굴: [512, 240, 200] },
  '김석진': { 파일: 'seokjin', 자리: '피고석',   얼굴: [565, 290, 170] },
  '이봉수': { 파일: 'bongsu',  자리: '증언대',   얼굴: [520, 250, 180] },
  '박만수': { 파일: 'mansu',   자리: '증언대',   얼굴: [530, 240, 170] },
  '오카다': { 파일: 'okada',   자리: '증언대',   얼굴: [700, 230, 180] },
  '사토':   { 파일: 'sato',    자리: '증언대',   얼굴: [540, 230, 170] },
  '모리':   { 파일: 'mori',    자리: '증언대',   얼굴: [540, 230, 170] },
};

// 법정 자리: 배경과 책상 앞그림
DATA.법정자리 = {
  '변호인석': { 배경: 'backgrounds/court_defense',    책상: 'backgrounds/court_defense_desk' },
  '검사석':   { 배경: 'backgrounds/court_prosecution', 책상: 'backgrounds/court_prosecution_desk' },
  '증언대':   { 배경: 'backgrounds/court_witness',    책상: 'backgrounds/court_witness_desk' },
  '피고석':   { 배경: 'backgrounds/court_defendant',  책상: 'backgrounds/court_defendant_desk' },
  '재판장석': { 배경: 'backgrounds/court_judge',      책상: null },
  '전경':     { 배경: 'backgrounds/court_wide',       책상: null },
};

// 배경 이름(대본의 [배경] 이름) → 그림. 법정: true 이면 말하는 사람 자리로 화면이 자동으로 바뀐다.
DATA.배경 = {
  '역사관 지하 계단':    { 그림: 'backgrounds/museum_stairs' },
  '기억의 법정 입구':    { 그림: 'backgrounds/court_entrance' },
  '기억의 법정 (전경)':  { 그림: 'backgrounds/court_wide', 법정: true },
  '기억의 법정':         { 그림: 'backgrounds/court_wide', 법정: true },
  '해저 탄광 갱도':      { 그림: 'backgrounds/ep1_mine_tunnel' },
  '기억의 법정 기록실':  { 그림: 'backgrounds/archive_room' },
  '면회실':              { 그림: 'backgrounds/visiting_room', 책상: 'backgrounds/visiting_room_desk' },
  '광부 숙소':           { 그림: 'backgrounds/ep1_miners_room' },
  '무너진 3번 갱도 입구': { 그림: 'backgrounds/ep1_collapsed_shaft' },
  '광업소 사무실':       { 그림: 'backgrounds/ep1_mine_office' },
  '법정 대기실':         { 그림: 'backgrounds/waiting_room' },
  '법정 앞 복도':        { 그림: 'backgrounds/court_hallway' },
  '검은 화면':           { 그림: null },
};

// 소리: 대본의 이름 → 파일 (assets/audio/ 아래, 확장자 없이).
// 파일은 아직 없다. 같은 이름으로 .mp3 (또는 .ogg, .wav) 파일을 넣으면 바로 소리가 난다.
DATA.소리 = {
  BGM: {
    '법정 개정 테마': 'bgm/court_open',
    '심문 테마 (느림)': 'bgm/testimony',
    '추궁 테마 (빠름)': 'bgm/pursuit',
    '역전 테마': 'bgm/turnabout',
    '조사 테마': 'bgm/investigation',
    '레테 테마': 'bgm/lethe',
    '증인 입장 테마': 'bgm/witness_enter',
    '진범 테마': 'bgm/culprit',
    '기억 테마': 'bgm/memory',
    '무죄 테마': 'bgm/not_guilty',
  },
  효과음: {
    '무거운 문 열리는 소리': 'se/door_heavy',
    '곡괭이 소리': 'se/pickaxe',
    '물 떨어지는 소리': 'se/water_drip',
    '나무 삐걱거리는 소리': 'se/wood_creak',
    '갱도 붕괴음': 'se/collapse',
    '증거 획득음': 'se/evidence_get',
    '증거 제출음': 'se/evidence_present',
    '망치 소리': 'se/gavel',
    '외침 "잠깐!"': 'se/shout_holdit',
    '외침 "이의 있음!"': 'se/shout_objection',
    '외침 "받아라!"': 'se/shout_takethat',
    '증언 수정음': 'se/testimony_update',
    '쾅': 'se/slam',
    '방청석 웅성거림': 'se/crowd_murmur',
    '방청석 박수': 'se/applause',
    '신뢰도 감소음': 'se/penalty',
    '법정 문 열리는 소리': 'se/door_court',
    '느린 발소리': 'se/footsteps_slow',
    '대사 글자음': 'se/text_blip',
  },
  // 이름 뒤 괄호 속 꾸밈말 → 음량 (0~1). 따로 된 음악 파일이 생기면 위 표에 이름을 더하면 된다.
  꾸밈음량: {
    '잔잔하게': 0.55, '낮게': 0.5, '조용하게': 0.45, '낮고 엄숙하게': 0.5, '절정': 1, '다시': 0.8,
    '크게': 1, '가장 크게': 1, '튜토리얼에서는 약하게': 0.35,
  },
};
