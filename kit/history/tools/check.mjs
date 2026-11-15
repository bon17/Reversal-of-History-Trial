// 명령줄 점검: node tools/check.mjs  (my-game 폴더의 데이터를 점검한다)
// 브라우저에서는 maker.html 의 [점검]이 같은 일을 한다.
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.argv.slice(2).find((a) => !a.startsWith('--')) || 'my-game');
const require = createRequire(import.meta.url);
globalThis.KIT_DEFAULTS = require(path.join(root, 'engine/js/defaults.js'));
const check = require(path.join(root, 'engine/js/check.js'));

const ctx = { window: {}, console };
ctx.window.DATA = ctx.DATA = {};
vm.createContext(ctx);
const files = readdirSync(dir).filter((f) => /^(settings|story\d+)\.js$/.test(f)).sort();
for (const f of files) {
  try { vm.runInContext('var DATA = window.DATA;\n' + readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.log('[오류] ' + f + ': 파일을 읽을 수 없어요 (' + e.message + ')'); process.exitCode = 1; }
}
const issues = check(ctx.window.DATA);
const show = process.argv.includes('--all') ? issues : issues.filter((i) => i.수준 !== '참고');
for (const i of show) console.log('[' + i.수준 + '] ' + i.곳 + '\n    ' + i.글 + (i.도움 ? '\n    → ' + i.도움 : ''));
const n = (k) => issues.filter((i) => i.수준 === k).length;
console.log('\n점검 끝: 오류 ' + n('오류') + ', 주의 ' + n('주의') + ', 참고 ' + n('참고') + ' (' + files.join(', ') + ')');
if (n('오류')) process.exitCode = 1;
