// 게임용 WebP 복사본 만들기
// 원본 assets/ 그림은 읽기만 하고, 줄인 복사본을 game/img/ 에 같은 폴더 구조로 저장한다.
// 이미 만든 그림은 원본이 바뀌었을 때만 다시 만든다 (game/img/_manifest.json 에 원본 지문을 기록).
//
// 실행: node tools/make_webp.mjs          (바뀐 그림만)
//       node tools/make_webp.mjs --all    (전부 다시)
// 필요한 것: Node.js 와 Playwright(크롬 엔진). 그림 변환은 크롬 안에서 한다.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'assets');
const OUT = path.join(ROOT, 'game', 'img');
const MANIFEST = path.join(OUT, '_manifest.json');
const FORCE = process.argv.includes('--all');

// 폴더와 파일별 크기 규칙: max = 가장 긴 변의 최대 크기 (null이면 그대로), q = 품질(0~1)
function ruleFor(rel) {
  const [dir, file] = rel.split('/');
  const name = file.replace(/\.[^.]+$/, '');
  if (dir === 'characters' && name.startsWith('ref_')) return null; // 전신 기준 그림은 게임에서 안 씀
  if (dir === 'backgrounds') return { max: null, q: 0.82 };
  if (dir === 'characters') return { max: 1024, q: 0.85 };
  if (dir === 'evidence') {
    if (/\.jpe?g$/i.test(file)) return { max: 1536, q: 0.85 }; // 실제 사진 (화면 너비 1536보다 크게 둘 필요가 없다)
    if (/_(closeup|zoom|map)$/.test(name)) return { max: 1536, q: 0.85 }; // 화면 가득 띄우는 확대 그림과 지도
    return { max: 768, q: 0.86 };
  }
  if (dir === 'ui') {
    if (/^(btn_|icon_|cursor_|gauge_candle_|stamp_)/.test(name)) return { max: 384, q: 0.9 };
    if (/^card_/.test(name)) return { max: 640, q: 0.88 };
    return { max: null, q: 0.8 }; // 외침, 판결 글자, 제목 등 큰 그림. HTML 한 파일이 30MB 안에 들도록 조금 줄였다
  }
  return null;
}

function listImages(dir, base = '') {
  const out = [];
  for (const f of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, f);
    const rel = base ? `${base}/${f}` : f;
    if (fs.statSync(full).isDirectory()) out.push(...listImages(full, rel));
    else if (/\.(png|jpe?g)$/i.test(f)) out.push(rel);
  }
  return out;
}

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req('playwright'); } catch {}
  const globalRoot = execSync('npm root -g').toString().trim();
  return req(path.join(globalRoot, 'playwright'));
}

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const todo = [];
for (const rel of listImages(SRC)) {
  const rule = ruleFor(rel);
  if (!rule) continue;
  const buf = fs.readFileSync(path.join(SRC, rel));
  const hash = crypto.createHash('sha1').update(buf).update(JSON.stringify(rule)).digest('hex').slice(0, 16);
  const outRel = rel.replace(/\.(png|jpe?g)$/i, '.webp');
  const outFull = path.join(OUT, outRel);
  if (!FORCE && manifest[rel]?.hash === hash && fs.existsSync(outFull)) continue;
  todo.push({ rel, outRel, outFull, rule, hash, buf });
}

if (!todo.length) {
  console.log('바뀐 그림이 없습니다. 모두 최신입니다.');
  process.exit(0);
}

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');

let before = 0, after = 0;
for (const t of todo) {
  const mime = /\.png$/i.test(t.rel) ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${t.buf.toString('base64')}`;
  const res = await page.evaluate(async ({ dataUrl, max, q }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    let w = img.naturalWidth, h = img.naturalHeight;
    if (max && Math.max(w, h) > max) {
      const s = max / Math.max(w, h);
      w = Math.round(w * s); h = Math.round(h * s);
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return { w, h, src: [img.naturalWidth, img.naturalHeight], url: c.toDataURL('image/webp', q) };
  }, { dataUrl, max: t.rule.max, q: t.rule.q });
  const out = Buffer.from(res.url.split(',')[1], 'base64');
  fs.mkdirSync(path.dirname(t.outFull), { recursive: true });
  fs.writeFileSync(t.outFull, out);
  manifest[t.rel] = { hash: t.hash, webp: t.outRel, size: [res.w, res.h], source: res.src };
  before += t.buf.length; after += out.length;
  console.log(`${t.rel}  ${(t.buf.length / 1024).toFixed(0)}KB → ${(out.length / 1024).toFixed(0)}KB  (${res.w}×${res.h})`);
}
await browser.close();

// 원본이 지워진 그림의 기록은 정리한다
for (const rel of Object.keys(manifest)) {
  if (!fs.existsSync(path.join(SRC, rel))) delete manifest[rel];
}
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log(`\n${todo.length}장 변환: ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`);
