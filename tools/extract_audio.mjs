// HTML 한 파일 게임 안에 넣어 둔 소리(window.EMBED_AUDIO)를 꺼내서 파일로 저장한다. tools/embed_audio.mjs 의 반대.
// 예전 HTML에만 들어 있는 소리를 새로 만든 HTML로 옮기거나, 저장소의 assets/audio/ 에 올릴 때 쓴다.
// 이 파일 하나만 있으면 저장소 없이도 돌아간다. 필요한 것은 Node.js뿐이다.
//
// 실행: node tools/extract_audio.mjs 게임.html [저장할폴더] [이름 …]
//   저장할폴더를 빼면 '꺼낸소리' 폴더에 저장한다. 폴더 안에 bgm/이름.mp3, se/이름.mp3 처럼 저장한다 (assets/audio/ 와 같은 구조).
//   이름을 주면 그것만 꺼낸다. 예: se/shout_holdit se/shout_objection se/shout_takethat
//   이름 없이 돌리면 들어 있는 소리를 모두 꺼내고 목록을 보여 준다.
import fs from 'node:fs';
import path from 'node:path';

const EXT = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'm4a' };

// html 글 → { 'se/shout_holdit': 'data:audio/mpeg;base64,…', … } (넣은 소리가 없으면 null)
export function embeddedAudioOf(html) {
  const m = html.match(/<script>window\.EMBED_AUDIO = ([\s\S]*?);<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [input, outArg, ...names] = process.argv.slice(2);
  if (!input) {
    console.log('실행: node tools/extract_audio.mjs 게임.html [저장할폴더] [이름 …]');
    process.exit(1);
  }
  const all = embeddedAudioOf(fs.readFileSync(input, 'utf8'));
  if (!all) {
    console.log('이 HTML에는 넣어 둔 소리(window.EMBED_AUDIO)가 없습니다.');
    process.exit(1);
  }
  console.log(`들어 있는 소리 ${Object.keys(all).length}개: ${Object.keys(all).join(', ')}`);
  const want = names.length ? names : Object.keys(all);
  const out = outArg || '꺼낸소리';
  let n = 0;
  for (const key of want) {
    if (!all[key]) { console.log(`  ※ ${key}: 이 HTML에 없음`); continue; }
    const [head, b64] = all[key].split(',');
    const type = head.slice(5).split(';')[0];
    const file = path.join(out, key + '.' + (EXT[type] || 'mp3'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    console.log(`  ${file} (${type}, ${(fs.statSync(file).size / 1024).toFixed(0)}KB)`);
    n++;
  }
  console.log(`${n}개를 ${out}/ 에 저장했습니다.`);
}
