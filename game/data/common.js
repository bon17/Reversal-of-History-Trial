// 여러 화에서 함께 쓰는 표: 인물, 표정, 법정 자리, 배경, 소리
// 그림 이름은 assets/ 폴더 기준 (확장자 없이). 게임은 game/img/ 의 WebP를 먼저 쓰고, 없으면 assets/ 원본을 쓴다.
window.DATA = window.DATA || {};

// 게임 설정
DATA.설정 = {
  // 기억 노트·반박문 답을 저장할 GAS 웹 앱 주소 (…/exec). 만드는 법: docs/게임_실행_안내.md 11장 "기억 노트 저장"
  // 비워 두면 답을 저장하지 않고, 쓴 답을 화면에 보여 준다 (이 기기에도 남는다).
  GAS주소: 'https://script.google.com/macros/s/AKfycbyDkyQdQyQiJjaT4aM4iseZtuM69UOr0DphhaXkNJbMauw_zUmQvGFk7eDK0jKQzk1J/exec',
};

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
  '굳음': 'stiff', '피고석 포즈': 'defendant', '실루엣': 'silhouette', '우는 모습': 'cry',
  '분노에 가까운 진지': 'serious', // 3화 에필로그의 신중한: 진지한 얼굴 그림을 쓴다
};

// 인물: 파일 앞부분, 법정에서 서는 자리, 얼굴 그림 자르는 곳 [가운데 x, 가운데 y, 반지름] (1024×1024 기준)
// 머리: 머리 꼭대기의 y (1024×1024 기준. 표정 그림들의 가운데값, 증거 카드에 쓰는 표정이 더 높으면 그 값). 증거 카드처럼 네모난 칸에서는 얼굴을 넓게 잘라 머리 끝까지 보여 준다
// 화면밖: 법정 밖에서는 화면에 서지 않고 작은 얼굴로만 표시 (역전재판처럼 주인공 시점)
DATA.인물 = {
  '신중한': { 파일: 'junghan', 자리: '변호인석', 얼굴: [560, 250, 170], 머리: 32, 화면밖: true },
  '한나':   { 파일: 'hanna',   자리: '변호인석', 얼굴: [560, 270, 170], 머리: 69 },
  '레테':   { 파일: 'lethe',   자리: '검사석',   얼굴: [600, 250, 180], 머리: 26 },
  '재판장': { 파일: 'judge',   자리: '재판장석', 얼굴: [512, 240, 200], 머리: 46 },
  '김석진': { 파일: 'seokjin', 자리: '피고석',   얼굴: [565, 290, 170], 머리: 10 },
  '이봉수': { 파일: 'bongsu',  자리: '증언대',   얼굴: [520, 250, 180], 머리: 20 },
  '박만수': { 파일: 'mansu',   자리: '증언대',   얼굴: [530, 240, 170], 머리: 14 },
  '오카다': { 파일: 'okada',   자리: '증언대',   얼굴: [540, 250, 170], 머리: 13 },
  '사토':   { 파일: 'sato',    자리: '증언대',   얼굴: [540, 230, 170], 머리: 18 },
  '모리':   { 파일: 'mori',    자리: '증언대',   얼굴: [540, 230, 170], 머리: 14 },
  // 2화
  '박영수':     { 파일: 'youngsu',  자리: '피고석', 얼굴: [512, 238, 165], 머리: 21 },
  '최동식':     { 파일: 'dongsik',  자리: '증언대', 얼굴: [512, 255, 170], 머리: 20 },
  '웨스트 대위': { 파일: 'west',     자리: '증언대', 얼굴: [512, 210, 175], 머리: 20 },
  '해리스 상병': { 파일: 'harris',   자리: '증언대', 얼굴: [512, 240, 170], 머리: 35 },
  '야마모토':   { 파일: 'yamamoto', 자리: '증언대', 얼굴: [512, 240, 175], 머리: 11 },
  // 3화
  '하야시':     { 파일: 'hayashi',  자리: '피고석', 얼굴: [560, 220, 160], 머리: 29 },
  '기무라':     { 파일: 'kimura',   자리: '증언대', 얼굴: [512, 210, 165], 머리: 31 },
  '오노 교수':  { 파일: 'ono',      자리: '증언대', 얼굴: [525, 210, 150], 머리: 35 },
  '다나카':     { 파일: 'tanaka',   자리: '증언대', 얼굴: [512, 190, 155], 머리: 37 },
  // 4화
  '마르타':        { 파일: 'marta',     자리: '피고석', 얼굴: [512, 200, 150], 머리: 34 },
  '슈나이더':      { 파일: 'schneider', 자리: '증언대', 얼굴: [512, 250, 150], 머리: 33 },
  '슈바르츠 부인': { 파일: 'schwarz',   자리: '증언대', 얼굴: [512, 180, 150], 머리: 14 },
  // 5화
  '다비드':  { 파일: 'david',  자리: '피고석', 얼굴: [512, 182, 145], 머리: 18 },
  '베커':    { 파일: 'becker', 자리: '증언대', 얼굴: [512, 172, 150], 머리: 19 },
  '프리츠':  { 파일: 'fritz',  자리: '증언대', 얼굴: [512, 182, 150], 머리: 11 },
  '야코프':  { 파일: 'jakob',  자리: '증언대', 얼굴: [512, 172, 150], 머리: 11 },
  '회색 외투의 남자': { 파일: 'greycoat', 자리: '증언대', 얼굴: [512, 150, 120] }, // 말하지 않는다. 야코프의 이야기 동안 실루엣으로만 선다
};

// 대본 반대 심문 표에서 줄여 쓴 이름 → 인물 이름
DATA.별칭 = { '해리스': '해리스 상병' };

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
  // 2화
  '정글 속 철도 공사장': { 그림: 'backgrounds/ep2_railway_jungle' },
  '감시원 숙소':         { 그림: 'backgrounds/ep2_guard_barracks' },
  '포로 막사':           { 그림: 'backgrounds/ep2_pow_barracks' },
  '수용소 사무실':       { 그림: 'backgrounds/ep2_camp_office' },
  // 3화
  '신문사 편집국':       { 그림: 'backgrounds/ep3_newsroom' },
  '도서관 자료실':       { 그림: 'backgrounds/ep3_library_archive' },
  '텅 빈 기억의 법정':   { 그림: 'backgrounds/court_empty_dark' },
  '법정 문 쪽 (어둡게)': { 그림: 'backgrounds/court_witness', 어둡게: true }, // 증언대 너머 법정 문. 1부 마무리에서 세 사람이 문 밖으로 걸어 나간다
  // 4화
  '기억의 법정 기록실 (벽에 커다란 세계 지도)': { 그림: 'backgrounds/archive_worldmap' },
  '새벽의 골목, 작은 빵집': { 그림: 'backgrounds/ep4_bakery_street_dawn' },
  '빵집 다락방':         { 그림: 'backgrounds/ep4_attic' },
  '어두운 다락방':       { 그림: 'backgrounds/ep4_attic_dark' },
  '빵집 뒤편 부엌':      { 그림: 'backgrounds/ep4_bakery_kitchen' },
  '옆집 시계방':         { 그림: 'backgrounds/ep4_clock_shop' },
  '빵집 건너편 거리':    { 그림: 'backgrounds/ep4_street_across' },
  // 5화
  '난민 수용소 막사':     { 그림: 'backgrounds/ep5_refugee_barracks' },
  '오래된 시계점':        { 그림: 'backgrounds/ep5_becker_shop_last' }, // 가운데 진열장에 시계 수집품이 들어간 그림 (선생님이 다시 그림. 예전 ep5_becker_shop은 진열장이 비어 있었다)
  '전쟁 뒤의 난민 수용소': { 그림: 'backgrounds/ep5_refugee_camp_outside' },
  '난민 수용소 사무실':   { 그림: 'backgrounds/ep5_refugee_office' },
  '피고석 (어둡게)':      { 그림: 'backgrounds/court_defendant', 책상: 'backgrounds/court_defendant_desk' }, // 증언 듣기: 법정 밖 배경으로 두어 다비드만 비추고, 재판장은 얼굴로
  '검은 화면':           { 그림: null },
};

// 연출 컷 이름 (그림이 없을 때 자리 그림에 쓰는 이름)
DATA.컷 = {
  'backgrounds/cut_ep1_miners_silhouette': '갱도 속 광부 실루엣',
  'backgrounds/cut_ep2_pow_line_rain': '빗속에 침목을 나르는 포로 행렬',
  'backgrounds/cut_ep2_scabbard_closeup': '야마모토 군도 칼집 끝의 둥근 쇠 장식',
  'backgrounds/cut_ep2_handshake': '해리스와 박영수의 악수',
  'backgrounds/cut_ep3_newspaper_desk': '책상 위 신문 1면',
  'backgrounds/cut_ep3_reporter_silhouette': '수화기를 내려놓고 머리를 감싼 기자 실루엣',
  'backgrounds/cut_ep3_cane_drop': '다나카의 지팡이가 바닥에 떨어짐',
  'backgrounds/cut_ep4_map_eastasia': '동아시아 지도',
  'backgrounds/cut_ep4_map_world': '세계 지도 (추축국)',
  'backgrounds/cut_ep4_window_shadows_last': '2층 창문 (그림자 없음)',
  'backgrounds/cut_ep4_levi_family_photo': '레비 가족사진',
  'backgrounds/cut_ep4_s_compare': '밀고 편지의 S와 슈나이더 서명의 S',
  'backgrounds/cut_ep5_search_silhouette': '막사에서 가방을 뒤지는 경찰 실루엣',
  'backgrounds/cut_ep5_watch_in_blanket': '담요에 싸인 금시계',
  'backgrounds/cut_ep5_becker_hand_watch': '회중시계를 귀에 댄 베커의 손',
};

// 소리: 대본의 이름 → 파일 (assets/audio/ 아래, 확장자 없이).
// 파일은 아직 없다. 같은 이름으로 .mp3 (또는 .ogg, .wav) 파일을 넣으면 바로 소리가 난다.
DATA.소리 = {
  BGM: {
    '법정 개정 테마': 'bgm/court_open',
    '심문 테마 (느림)': 'bgm/testimony',
    '심문 테마 (느림, 낮게)': 'bgm/testimony',
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
    // 2화
    '빗소리': 'se/rain',
    '망치로 침목 박는 소리': 'se/sleeper_hammer',
    '호루라기': 'se/whistle',
    '누군가 쓰러지는 소리': 'se/fall',
    '선택 기록 획득음': 'se/green_get',
    '증거 갱신음': 'se/evidence_update',
    // 3화
    '전화벨이 끊임없이 울린다': 'se/phone_ring',
    '지팡이 떨어지는 소리': 'se/cane_drop',
    '멀리서 기차 바퀴 소리': 'se/train',
    '기차 바퀴 소리가 조금 가까워진다': 'se/train',
    '기차 소리가 멀어진다': 'se/train',
    // 4화
    '구두 소리': 'se/shoes',
    '멀리서 자동차 엔진 소리': 'se/car_engine',
    '군홧발 소리': 'se/boots',
    '문을 세게 두드리는 소리': 'se/door_knock_hard',
    '문이 부서지는 소리': 'se/door_break',
    '계단을 뛰어오르는 발소리': 'se/stairs_run',
    '누군가 우는 소리': 'se/crying',
    '수많은 시계의 째깍 소리': 'se/clocks_ticking',
    '수많은 시계의 째깍 소리가 한꺼번에 멈춘다': 'se/clocks_stop',
    '커튼 닫히는 소리': 'se/curtain',
    '문이 쾅 닫히는 소리': 'se/door_slam',
    '나무 판자 들어 올리는 소리': 'se/plank_lift',
    '발소리': 'se/footsteps',
    '종이 넘기는 소리': 'se/paper',
    // 5화
    '문 열리는 소리': 'se/door_open',
    '가방 뒤지는 소리': 'se/bag_rummage',
    '가게 문 종소리': 'se/shop_bell',
    '서류 넘기는 소리': 'se/paper', // 4화 종이 넘기는 소리와 같은 파일
    '회중시계 째깍 소리': 'se/watch_tick',
    '시계의 째깍 소리': 'se/watch_tick',
    '급한 발소리': 'se/footsteps_hurry',
  },
  // 이름 뒤 괄호 속 꾸밈말 → 음량 (0~1). 따로 된 음악 파일이 생기면 위 표에 이름을 더하면 된다.
  꾸밈음량: {
    '잔잔하게': 0.55, '낮게': 0.5, '조용하게': 0.45, '낮고 엄숙하게': 0.5, '절정': 1, '다시': 0.8,
    '크게': 1, '가장 크게': 1, '튜토리얼에서는 약하게': 0.35,
    '느림, 낮게': 0.5, '초록빛 연출': 0.9,
    '아주 작게': 0.3, '다시, 아주 작게': 0.3, '아주 작게, 반복': 0.3,
    '작게': 0.4, '하나만, 작게': 0.4,
  },
};
