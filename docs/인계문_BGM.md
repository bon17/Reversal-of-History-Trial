# 「기억의 법정」 BGM 넣기 인계문

> 이 문서 하나만 읽으면 BGM 작업을 시작할 수 있게 썼다. 저장소가 없어도 된다. 마지막으로 고친 날: 2026-10-09
> 이번 작업: 선생님이 주는 **게임 HTML 파일**에 선생님이 주는 **음악 파일**을 BGM으로 넣어서 돌려준다.

---

## 0. 받는 것과 돌려줄 것

| 받는 것 (선생님이 올림) | 설명 |
|---|---|
| 이 인계문 | |
| `기억의_법정_게임1.html` | 게임 1 (1~3화). 그림이 모두 들어 있는 한 파일짜리 게임, 약 29.5MB |
| `기억의_법정_게임2.html` | 게임 2 (4화부터, 지금은 5화까지). 약 27.3MB |
| 음악 파일들 | 출처 링크나 라이선스 문구가 같이 오면 함께 기록한다 |

| 돌려줄 것 | 왜 |
|---|---|
| BGM을 넣은 HTML 파일 | 수업에 바로 쓴다 |
| 다듬은 음악 파일 (아래 2장의 파일 이름대로) | 6화를 넣어 HTML을 **다시 만들면 넣은 BGM이 사라진다.** 이 파일들을 저장소의 `assets/audio/bgm/`에 올려 두면 다시 만들 때 자동으로 들어간다 |
| 곡 목록 (테마, 파일 이름, 원곡 제목, 출처, 라이선스, 출처 표기 필요 여부) | 저작권 확인용. 선생님이 저장소 `assets/audio/출처.md`로 올린다 |

---

## 1. 게임 소개 (곡 고를 때 알아야 할 것)

- 중학교 2학년 역사 수업용 법정 추리 게임이다. 「역전재판」의 구조(증언의 모순을 찾아 "이의 있음!")만 빌리고, 그림·음악·음성 같은 원작 저작물은 쓰지 않는다.
- 1부(게임 1)는 일제의 강제 동원, 포로감시원, 일본군 '위안부'를, 2부(게임 2)는 홀로코스트를 다룬다. 피해자의 증언과 실제 기록이 많이 나온다.
- 주인공은 신참 변호사 **신중한**, 조수는 기자 **한나**, 라이벌은 "그런 일은 없었다"고 우기는 망각의 검사 **레테**다.
- 피해 기록(🟥)을 증거로 내면 게임이 **음악을 멈추고** 화면을 차분하게 만든다. 슬픈 장면에서 음악이 감정을 과하게 끌어올리지 않게 하려는 연출이다.

---

## 2. BGM 10종

| 테마 | 파일 이름 | 대본에 적힌 쓰임 | 대본 등장 횟수 (1~6화) | 들어가는 게임 |
|---|---|---|---|---|
| 기억 테마 | `memory.mp3` | 역사 배경 설명, 피고 면회, 실제 역사 기록, 피해 증언. 대본 지시는 "잔잔한 피아노" | 44 | 1, 2 |
| 역전 테마 | `turnabout.mp3` | 정답 증거를 낸 뒤, 반격 (절정 장면 있음) | 35 | 1, 2 |
| 레테 테마 | `lethe.mp3` | 레테 등장, 레테의 주장 | 33 | 1, 2 |
| 심문 테마 (느림) | `testimony.mp3` | 증언, 반대 심문 | 22 | 1, 2 |
| 법정 개정 테마 | `court_open.mp3` | 개정, 판결 ("낮고 엄숙하게", "조용하게"로도 쓰임) | 19 | 1, 2 |
| 조사 테마 | `investigation.mp3` | 프롤로그, 조사, 휴정 | 14 | 1, 2 |
| 무죄 테마 | `not_guilty.mp3` | 판결, 에필로그 | 12 | 1, 2 |
| 증인 입장 테마 | `witness_enter.mp3` | 증인 등장 | 11 | 1, 2 |
| 진범 테마 | `culprit.mp3` | 진범의 정체가 드러난 뒤 | 8 | 1 (6화가 들어가면 2도) |
| 추궁 테마 (빠름) | `pursuit.mp3` | 추궁으로 몰아붙일 때 | 1 (1화만) | 1 |

- 기억, 역전, 레테 세 곡이 절반이 넘는다. 먼저 이 세 곡을 정한다.
- **기억 테마**는 피해 증언 장면에 가장 많이 나온다. 가장 신중하게 고르고, 오래 반복해 들어도 지치지 않는 곡이어야 한다.
- 추궁 테마는 한 번만 나온다. 곡이 없으면 넣지 않아도 된다 (그 자리는 조용히 넘어간다).
- 곡이 없는 테마는 그 장면에서 소리 없이 넘어간다. 게임이 멈추거나 오류가 나지 않는다.

### 곡을 고를 때 지킬 것
- 역전재판 원작 OST나 그것을 편곡한 곡은 쓰지 않는다. 로열티 프리 음원이나 직접 녹음한 것만 쓴다.
- 6화의 히틀러 장면에는 웅장한 음악을 쓰지 않는다. 행진곡풍, 영웅적인 곡도 피한다.
- 곡마다 출처와 라이선스를 기록한다. 출처를 밝혀야 하는 곡이면 선생님께 알린다.
- Claude는 소리를 직접 듣지 못한다. 템포, 장조/단조, 세기 변화 같은 측정값으로 어울리는 테마를 추천하고, 최종 결정은 선생님이 직접 들어 보고 한다. 소리만으로 원작 OST인지 가려낼 수는 없으니 출처를 함께 받는다.

---

## 3. 게임이 소리를 트는 방식 (HTML 안의 코드)

- 게임은 대본의 테마 이름을 파일 이름으로 바꿔서(`'기억 테마'` → `bgm/memory`) 튼다. 이름 표는 HTML 안의 `DATA.소리.BGM`에 있다.
- 소리를 찾는 순서: ① HTML 안에 넣은 소리(`window.EMBED_AUDIO`) → ② HTML 옆 폴더의 `assets/audio/bgm/memory.mp3` (그다음 .ogg, .wav, .m4a). 둘 다 없으면 조용히 넘어간다.
- BGM은 **끝나면 처음부터 반복**한다. 그래서 곡의 끝이 처음으로 자연스럽게 이어져야 한다.
- 대본의 꾸밈말은 같은 파일을 음량만 바꿔 튼다. 기본 0.8, 잔잔하게 0.55, 낮게 0.5, 조용하게 0.45, 낮고 엄숙하게 0.5, 절정 1. 여기에 학생이 ⚙에서 고른 음악 크기(기본 0.8)를 곱한다.
- "멈춤", "없음"이면 음악을 멈춘다. 🟥 피해 기록과 🟩 선택 기록을 제시할 때도 멈춘다.
- 브라우저 규칙 때문에 소리는 학생이 처음 화면에서 버튼을 한 번 누른 뒤부터 난다.

---

## 4. 작업 순서

### ① 곡 판별
- `ffprobe`로 길이, 형식, 채널, 비트레이트를 본다.
- `pip install librosa`로 템포(BPM), 장조/단조 추정, 세기 변화(조용하다가 커지는지)를 본다. 스펙트로그램 그림을 만들어 보면 악기 구성과 곡의 흐름을 짐작할 수 있다.
- 2장의 표와 견주어 어느 테마에 맞는지 추천하고, 이유를 선생님께 짧게 설명한다.

### ② 다듬기 (ffmpeg)
- 앞뒤 무음을 자른다.
- 반복할 때 끝과 처음이 튀지 않는지 본다. 튀면 반복하기 좋은 지점에서 자르고 끝을 아주 짧게 페이드한다.
- 모든 곡의 크기를 맞춘다. 예: `loudnorm=I=-18:TP=-1.5:LRA=11` (게임이 꾸밈말로 음량을 따로 줄이므로 원본은 같은 크기여야 한다).
- mp3로 저장한다. 파일 크기를 줄여야 하면 모노 64~96kbps, 길이 1~2분 반복 구간으로 줄인다 (5장).

### ③ HTML에 넣기
- 다듬은 파일을 `bgm/` 폴더에 2장의 파일 이름대로 모은다. 예: `소리/bgm/memory.mp3`
- 7장의 `embed_audio.mjs`를 파일로 저장하고 돌린다 (Node.js만 있으면 된다).

```
node embed_audio.mjs 기억의_법정_게임1.html 소리 기억의_법정_게임1_BGM.html
node embed_audio.mjs 기억의_법정_게임2.html 소리2 기억의_법정_게임2_BGM.html
```

- 이 도구는 폴더에 있는 소리를 모두 넣는다. 게임 2에는 쓰지 않는 `pursuit.mp3`(그리고 6화가 들어가기 전까지는 `culprit.mp3`)를 뺀 폴더를 따로 만들어 넣으면 용량을 아낄 수 있다.
- 이 기능이 생기기 전에 만든 HTML이면 도구가 소리 코드도 함께 고친다. "자동으로 고칠 수 없습니다"가 나오면 HTML 안의 `function playAudio(` 부분을 직접 보고 같은 방식(`window.EMBED_AUDIO`를 먼저 찾기)으로 고친다.
- 다시 돌리면 전에 넣은 소리를 지우고 새로 넣는다. 곡을 바꿀 때는 처음 받은 HTML이나 BGM을 넣은 HTML 어느 쪽에 돌려도 된다.

### ④ 확인
- 크롬에서 HTML을 더블클릭해 열고 [처음부터]로 들어가 음악이 나는지 듣는다.
- 자동으로 확인하려면 Playwright(크롬)를 `--autoplay-policy=no-user-gesture-required`로 띄워 HTML을 연 뒤 아래를 실행한다. `src`가 `blob:`이고 `paused`가 `false`, `currentTime`이 늘어나면 된다.

```js
await G.audio.bgm('기억 테마 (잔잔하게)');
await new Promise((r) => setTimeout(r, 700));
({ src: G.audio.el && G.audio.el.src.slice(0, 5), paused: G.audio.el && G.audio.el.paused, t: G.audio.el && G.audio.el.currentTime, vol: G.audio.el && G.audio.el.volume })
// → { src: 'blob:', paused: false, t: 0.6쯤, vol: 0.44 (= 0.55 × 0.8) }
```

---

## 5. 파일 크기 (먼저 선생님께 확인할 것)

- HTML을 게임 1, 게임 2 두 파일로 나눈 이유는 **"한 파일이 30MB를 넘으면 보낼 수 없어서"**였다. 그런데 게임 1 HTML은 이미 **29.5MB**라서 BGM을 넣으면 30MB를 넘는다.
- 소리는 HTML 안에 글자(base64)로 들어가서 원래 파일보다 약 1.33배 커진다.

| 넣는 방식 (10곡 기준) | 곡 하나 | HTML이 늘어나는 양 | 게임 1 HTML |
|---|---|---|---|
| 스테레오 128kbps, 2분 | 약 1.9MB | 약 25MB | 약 55MB |
| 모노 96kbps, 1분 30초 | 약 1.1MB | 약 14MB | 약 44MB |
| 모노 64kbps, 1분 | 약 0.5MB | 약 6MB | 약 36MB |

선생님께 물어보고 정한다.
1. **30MB를 넘어도 되면** (구글 드라이브, USB처럼 크기 제한이 없는 방법으로 나눠 준다면): 음질을 너무 낮추지 말고 그대로 넣는다. 모노 96kbps 정도면 충분하다.
2. **30MB를 꼭 지켜야 하면**: BGM을 넣을 자리가 거의 없다 (게임 1은 약 0.5MB). 그림 화질을 낮추거나 게임 1을 다시 나누어야 하는데, 이건 저장소에서 HTML을 다시 만드는 일이라 이번 세션에서는 하지 않고 선생님께 알린다.
3. **HTML과 소리 폴더를 함께 나눠 주기**: HTML 옆에 `assets/audio/bgm/memory.mp3`처럼 폴더를 두면 HTML을 고치지 않아도 소리가 난다. 다만 폴더째 옮겨야 하고, 구글 드라이브 미리 보기처럼 파일 하나만 여는 방법으로는 소리가 나지 않는다.

---

## 6. 더 필요하면 (저장소)

- 공개 저장소: https://github.com/bon17/Reversal-of-History-Trial (최신 통합 브랜치 `claude/sleepy-clarke-xeirvc`)
- 대본: `docs/대본/`, 기획서: `docs/기획서.md`, 소리 파일 이름 전체 표(효과음 포함): `docs/게임_실행_안내.md` 5장
- 저장소에서는 `assets/audio/bgm/`에 mp3를 넣고 `node tools/build_single_html.mjs`를 돌리면, 게임마다 쓰는 BGM만 골라 HTML에 넣는다.
- 효과음(`assets/audio/se/`)도 같은 방식으로 넣을 수 있다. 이번 작업은 BGM만 한다.

---

## 7. embed_audio.mjs (그대로 저장해서 쓴다)

저장소의 `tools/embed_audio.mjs`와 같은 파일이다.

```js
// HTML 한 파일 게임(tools/build_single_html.mjs로 만든 것)에 소리 파일을 넣는다.
// 넣은 소리는 window.EMBED_AUDIO 로 들어가고, 게임은 assets/audio/ 를 찾기 전에 이것부터 튼다.
// 이 기능이 생기기 전에 만든 HTML이면 소리 코드(game/js/core.js의 playAudio)도 함께 고친다.
// 이 파일 하나만 있으면 저장소 없이도 돌아간다. 필요한 것은 Node.js뿐이다.
//
// 실행: node tools/embed_audio.mjs 게임.html 소리폴더 [저장할파일.html]
//   소리폴더 안의 bgm/이름.mp3, se/이름.mp3 를 넣는다 (assets/audio/ 와 같은 구조, 이름은 docs/게임_실행_안내.md 5장).
//   .ogg .wav .m4a 도 된다. 저장할 파일을 빼면 게임.html 이름 뒤에 _소리 를 붙여 저장한다.
//   소리를 넣은 HTML에 다시 돌리면 전에 넣은 소리를 지우고 새로 넣는다.
import fs from 'node:fs';
import path from 'node:path';

export const AUDIO_TYPES = { mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4' };

// 소리폴더 → { 'bgm/memory': 파일 경로, … }
export function audioFiles(dir) {
  const out = {};
  for (const sub of ['bgm', 'se']) {
    const d = path.join(dir, sub);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).sort()) {
      const m = f.match(/^(.+)\.(mp3|ogg|wav|m4a)$/i);
      if (m) out[sub + '/' + m[1]] = path.join(d, f);
    }
  }
  return out;
}

// 예전 HTML의 소리 코드를 지금 core.js와 같게 고칠 때 쓰는 글
const OLD_TRIES = "const tries = audioExt[path] ? [audioExt[path]] : ['mp3', 'ogg', 'wav', 'm4a'].map((x) => 'assets/audio/' + path + '.' + x);";
const NEW_TRIES = "const inFile = embeddedAudio(path);\n      const tries = audioExt[path] ? [audioExt[path]] : inFile ? [inFile] : ['mp3', 'ogg', 'wav', 'm4a'].map((x) => 'assets/audio/' + path + '.' + x);";
const PLAY_FN = 'function playAudio(path, volume, loop) {';
const HOOK_FN = `// 한 파일짜리 게임은 소리도 파일 안에 넣을 수 있다 (window.EMBED_AUDIO: 'bgm/memory' → data: 주소, tools/embed_audio.mjs).
  // 처음 틀 때 blob 주소로 바꿔 둔다. 긴 data: 주소를 틀 때마다 다시 읽지 않게 하려는 것이다.
  function embeddedAudio(path) {
    const E = window.EMBED_AUDIO;
    if (!E || !E[path]) return null;
    if (E[path].startsWith('data:')) {
      const [head, b64] = E[path].split(',');
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      E[path] = URL.createObjectURL(new Blob([bytes], { type: head.slice(5).split(';')[0] }));
    }
    return E[path];
  }
  `;
const count = (s, sub) => s.split(sub).length - 1;

// html 글에 files({ 'bgm/memory': 파일 경로 })의 소리를 넣은 새 html 글을 돌려준다
export function embedAudio(html, files) {
  if (!html.includes('function embeddedAudio(')) {
    if (count(html, OLD_TRIES) !== 1 || count(html, PLAY_FN) !== 1) {
      throw new Error('이 HTML은 소리 코드가 예상과 달라서 자동으로 고칠 수 없습니다. (playAudio 함수를 찾지 못함)');
    }
    html = html.replace(PLAY_FN, () => HOOK_FN + PLAY_FN).replace(OLD_TRIES, () => NEW_TRIES);
  }
  html = html.replace(/<script>window\.EMBED_AUDIO = [\s\S]*?;<\/script>\n/, '');
  if (!Object.keys(files).length) return html;
  const embed = {};
  for (const [key, file] of Object.entries(files)) {
    const type = AUDIO_TYPES[path.extname(file).slice(1).toLowerCase()];
    embed[key] = 'data:' + type + ';base64,' + fs.readFileSync(file).toString('base64');
  }
  return html.replace('<script>', () => '<script>window.EMBED_AUDIO = ' + JSON.stringify(embed) + ';</script>\n<script>');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [input, dir, outArg] = process.argv.slice(2);
  if (!input || !dir) {
    console.log('실행: node tools/embed_audio.mjs 게임.html 소리폴더 [저장할파일.html]');
    process.exit(1);
  }
  const files = audioFiles(dir);
  const html = embedAudio(fs.readFileSync(input, 'utf8'), files);
  const out = outArg || input.replace(/(\.html?)?$/i, '_소리.html');
  fs.writeFileSync(out, html);
  const mb = fs.statSync(out).size / 1048576;
  console.log(`${out} 만듦: 소리 ${Object.keys(files).length}개 (${Object.keys(files).join(', ') || '없음'}), ${mb.toFixed(1)}MB${mb > 30 ? '  ※ 30MB가 넘습니다' : ''}`);
}
```
