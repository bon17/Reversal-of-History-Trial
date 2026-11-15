# 법정 추리 수업 게임 키트

선생님이 자기 수업용 법정 추리 웹 게임을 만드는 키트다 (HTML, CSS, JavaScript. 설치할 것 없음).
이 폴더에서 일하는 AI 도구(Claude Code, Codex, Cursor 등)는 아래를 따른다.

1. **먼저 `ai/AI_지침.md` 와 `ai/데이터_형식.md` 를 읽는다.** 게임을 어떻게 설계하고 데이터를 어떻게 쓰는지 적혀 있다.
2. 선생님의 수업 설계가 없으면 `ai/수업_설계서.md` 의 항목을 **쉬운 말로 물어서** 채운다 (한 번에 3~5개씩).
3. 고치는 곳은 `my-game/settings.js` 와 `my-game/story1.js` (화가 늘면 `story2.js` …) 뿐이다. **`engine/` 은 고치지 않는다.**
4. 고친 뒤 `node tools/check.mjs --all` 로 점검한다. 오류와 주의가 없을 때까지 고친다.
5. 선생님에게는 `index.html` 을 두 번 눌러 해 보라고 안내한다. `index.html?teacher` 로 열면 장면을 골라 시작할 수 있다.
6. 엔진이나 `ai/` 문서를 고쳤다면 `node tools/build.mjs` 로 `engine/bundle.js`, `ai/guide.js` 를 다시 만든다 (만들기 도우미 `maker.html` 이 쓴다).

- 그림이 없어도 게임은 된다 (이모지 인물, 색 배경). 그림은 `my-game/images/` 에 넣는다 (`docs/그림_넣기.md`).
- 한 파일로 묶기: `node tools/build.mjs --html` → `dist/` 에 HTML 한 파일.
- 문서와 커밋 메시지는 쉬운 한국어로 쓴다.
