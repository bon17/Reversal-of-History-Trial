# kit/ : 법정 추리 수업 게임 키트

「기억의 법정」의 엔진을 다른 선생님들이 자기 수업용 게임을 만드는 데 쓸 수 있게 만든 키트다. 판이 두 개다.

- `general/` 범용판, `history/` 역사판. 폴더 하나가 그대로 내려받아 쓰는 키트다.
- **엔진(`engine/`), `index.html`, `maker.html`, `tools/`, 공통 문서는 `general/` 이 원본이다.** `history/` 의 같은 파일은 직접 고치지 않는다.
  고친 뒤 `node tools/sync.mjs` 를 실행한다 (저장소 안에서 키트 폴더가 `kit/` 아래에 있으면 `node kit/tools/sync.mjs`) (역사판에 복사 + 두 판의 `engine/bundle.js`, `ai/guide.js`, `ai/수업_설계서.md` 다시 만들기).
- 판마다 다른 것: `README.md`, `my-game/`(예시 게임), `ai/form.json`(설계서 양식), 역사판의 `ai/역사_추가_지침.md`, `docs/역사_수업_도움말.md`, `examples/`, `example-memory-court.html`.
  역사판의 `ai/AI_지침.md` 는 범용판 지침 + `역사_추가_지침.md` 로 만들어지는 파일이다.
- 데이터 형식을 바꾸면 `engine/js/defaults.js`(명령 목록), `engine/js/check.js`(점검), `ai/데이터_형식.md` 를 함께 고친다.
- 시험: `node tools/test.cjs` (두 판 맞춤 확인, 데이터 점검, 글 읽기 시험, 예시 게임 끝까지 자동 실행, 만들기 도우미로 내보내기).
- 원작 「기억의 법정」에서 가져온 것은 엔진과 **제1화의 이야기와 그림**(`history/examples/memory-court-ep1/`, 원작자 허락)뿐이다.
  원작의 2~6화 대본과 그림, 화면 그림(버튼, 말풍선), 글꼴, 교과서와 기관의 사진은 넣지 않는다.
- 다른 회사 게임의 이름, 인물, 그림, 음악, 유명한 대사, 화면 디자인을 넣지 않는다. 버튼과 외침은 코드로 그리는 키트의 것만 쓴다.
- 이용 조건: CC BY-NC-SA 4.0, 원작자 표시는 BONSSAM (`LICENSE`, `이용_안내.md`. 이 두 파일은 맨 위의 것이 원본이고 `sync.mjs` 가 두 판에 복사한다).
- 문서와 커밋 메시지는 쉬운 한국어로 쓴다.
