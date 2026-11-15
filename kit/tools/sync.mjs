// 두 판을 맞추기:  node tools/sync.mjs          범용판(general)의 공통 파일을 역사판(history)에 복사하고 두 판의 묶음을 다시 만든다
//                node tools/sync.mjs --check   두 판의 공통 파일이 같은지만 확인한다 (다르면 실패)
// 엔진, 만들기 도우미, 공통 문서는 general/ 이 원본이다. history/ 의 같은 파일은 직접 고치지 않는다.
// 판마다 다른 것: README.md, my-game/, ai/form.json, docs/ 의 판 전용 문서, (역사판) ai/역사_추가_지침.md
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = path.join(kit, 'general'), H = path.join(kit, 'history');
const SHARED = ['index.html', 'maker.html', 'CLAUDE.md', 'AGENTS.md', '.gitignore', '.github', 'engine', 'tools', 'ai/데이터_형식.md',
  'docs/처음_시작하기.md', 'docs/그림_넣기.md', 'docs/학생에게_나눠주기.md', 'docs/답_모으기_구글시트.md'];
const GENERATED = ['engine/bundle.js']; // 판마다 따로 만드는 파일
const check = process.argv.includes('--check');
let diff = 0;

function files(p, rel = '') {
  if (!existsSync(p)) return [];
  if (!statSync(p).isDirectory()) return [rel];
  return readdirSync(p).flatMap((f) => files(path.join(p, f), rel ? rel + '/' + f : f));
}
for (const item of SHARED) {
  for (const f of files(path.join(G, item), '').map((r) => (r ? item + '/' + r : item))) {
    if (GENERATED.includes(f)) continue;
    const a = readFileSync(path.join(G, f));
    const to = path.join(H, f);
    const same = existsSync(to) && a.equals(readFileSync(to));
    if (same) continue;
    diff++;
    if (check) console.log('다름: ' + f);
    else { mkdirSync(path.dirname(to), { recursive: true }); writeFileSync(to, a); console.log('복사: ' + f); }
  }
}
// 이용 조건 문서는 맨 위의 것이 원본이다. 두 판에 똑같이 넣는다 (폴더 하나만 가져가도 조건이 함께 가게)
for (const f of ['LICENSE', '이용_안내.md']) for (const dir of [G, H]) {
  const a = readFileSync(path.join(kit, f)), to = path.join(dir, f);
  if (existsSync(to) && a.equals(readFileSync(to))) continue;
  diff++;
  if (check) console.log('다름: ' + path.basename(dir) + '/' + f); else { writeFileSync(to, a); console.log('복사: ' + path.basename(dir) + '/' + f); }
}
// 역사판의 AI 지침 = 공통 지침 + 역사 수업용 추가 지침
const guide = readFileSync(path.join(G, 'ai/AI_지침.md'), 'utf8').trimEnd() + '\n\n---\n\n' + readFileSync(path.join(H, 'ai/역사_추가_지침.md'), 'utf8');
const gp = path.join(H, 'ai/AI_지침.md');
if (!existsSync(gp) || readFileSync(gp, 'utf8') !== guide) { diff++; if (check) console.log('다름: ai/AI_지침.md (역사판)'); else { writeFileSync(gp, guide); console.log('만듦: history/ai/AI_지침.md'); } }

if (check) { console.log(diff ? '두 판이 맞지 않아요. node tools/sync.mjs 를 실행해 주세요.' : '두 판의 공통 파일이 같아요.'); process.exit(diff ? 1 : 0); }
for (const dir of [G, H]) { rmSync(path.join(dir, 'dist'), { recursive: true, force: true }); process.stdout.write(path.basename(dir) + ': ' + execFileSync('node', [path.join(dir, 'tools/build.mjs')], { encoding: 'utf8' })); }
