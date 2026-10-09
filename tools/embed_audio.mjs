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
