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

// .png로 올라온 실제 사진 (보통 실제 사진은 .jpg). 증거 그림 크기(768)가 아니라 사진 크기로 줄인다
const PHOTO_PNG = new Set(['ep4_schindler']);

// 투명 배경 인물 그림인데 흰 배경이 조금 남은 것: 복사본에서만 지운다 (원본은 그대로)
//   아래: 이 높이(원본 그림의 y, 점 단위)보다 위쪽 머리 둘레만 본다. 셔츠·앞치마 끈처럼 몸 가장자리의 흰 부분은 건드리지 않게
//   거리: 투명한 곳에서 몇 점 안의 흰 점을 지울지 (기본 12), 밝기: 이보다 밝은 점만 (가장 어두운 색 성분 기준, 기본 175)
//   선: 지운 조각 바깥에 남는 가는 선도 지울지 (기본 지움. 머리카락 끝이 가는 그림은 false)
//   구멍: 팔과 몸, 다리 사이에 갇힌 아주 흰 틈(150점 이상, 평균 밝기 246 이상)도 지운다
//   테두리: 투명한 곳에 바로 붙은 반투명 점의 색을 안쪽 이웃 점의 색으로 바꾼다 (흰 배경이 비쳐 밝게 남은 가는 테두리 없애기)
const FRINGE = [
  [/^characters\/marta_cry\.png$/, { 아래: 395 }], // 4화 마르타 우는 모습: 머리 둘레의 흰 조각
  [/^characters\/becker_/, { 아래: 400 }], // 5화 베커: 머리 둘레
  [/^characters\/fritz_/, { 아래: 300 }], // 5화 프리츠: 머리 둘레
  [/^characters\/jakob_/, { 아래: 300 }], // 5화 야코프: 머리 둘레
  [/^characters\/david_/, { 아래: 330, 거리: 3, 밝기: 130, 선: false, 구멍: true, 테두리: true }], // 5화 다비드: 머리카락 끝의 밝은 테두리, 몸 둘레의 밝은 선, 팔과 몸 사이의 흰 틈
  [/^characters\/greycoat_silhouette\.png$/, { 아래: 0, 구멍: true }], // 5화 회색 외투의 남자: 두 다리 사이의 흰 틈
];
const fringeFor = (rel) => (FRINGE.find(([re]) => re.test(rel)) || [])[1];

// 폴더와 파일별 크기 규칙: max = 가장 긴 변의 최대 크기 (null이면 그대로), q = 품질(0~1)
function ruleFor(rel) {
  const [dir, file] = rel.split('/');
  const name = file.replace(/\.[^.]+$/, '');
  if (dir === 'characters' && name.startsWith('ref_')) return null; // 전신 기준 그림은 게임에서 안 씀
  if (dir === 'backgrounds') return { max: null, q: 0.82 };
  if (dir === 'characters') return { max: 1024, q: 0.85, clearBg: true, fringe: fringeFor(rel) }; // clearBg: 흰 배경 그대로 올라온 인물은 복사본에서 배경을 지운다 (아래)
  if (dir === 'evidence') {
    if (/\.jpe?g$/i.test(file) || PHOTO_PNG.has(name)) return { max: 1536, q: 0.85 }; // 실제 사진 (화면 너비 1536보다 크게 둘 필요가 없다)
    if (/_(closeup|zoom|map|front|back|icons)$/.test(name)) return { max: 1536, q: 0.85 }; // 화면 가득 띄우는 확대 그림과 지도 (5화 금시계 앞·뒷면, 지도 위 사람 아이콘)
    if (/^ep5_.*_dots$/.test(name)) return { max: 1536, q: 0.85 }; // 5화 수용소 분포도의 이름 적힌 점 그림: 지도 위에 화면 가득 겹친다 (3화 점 그림은 게임 1 크기 때문에 그대로 768)
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
  // 지문: 원본 + 크기·품질 (흰 배경 지우기는 투명한 원본에는 아무것도 하지 않으므로 지문에 넣지 않는다. 이미 만든 인물 복사본을 다시 만들지 않게)
  // 흰 테두리 조각 지우기(fringe)는 정해 둔 그림만 하므로, 그 그림만 지문에 넣어 다시 만들게 한다
  const hash = crypto.createHash('sha1').update(buf).update(JSON.stringify(rule.fringe ? { max: rule.max, q: rule.q, fringe: rule.fringe } : { max: rule.max, q: rule.q })).digest('hex').slice(0, 16);
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
const clearedList = [];
for (const t of todo) {
  const mime = /\.png$/i.test(t.rel) ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${t.buf.toString('base64')}`;
  const res = await page.evaluate(async ({ dataUrl, max, q, clearBg, fringe }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    let w = img.naturalWidth, h = img.naturalHeight;
    if (max && Math.max(w, h) > max) {
      const s = max / Math.max(w, h);
      w = Math.round(w * s); h = Math.round(h * s);
    }
    // 인물 그림인데 배경이 흰색 그대로 올라온 것(네 귀퉁이가 불투명한 흰색): 복사본에서만 흰 배경을 지운다. 원본은 그대로 둔다.
    // 가장자리와 이어진 흰 부분, 그리고 팔과 몸 사이에 갇힌 넓고 아주 흰 틈(300점 이상)만 지운다. 셔츠는 흰색이어도 색이 조금 섞여 있어서 남는다.
    let cleared = false;
    let src = img;
    if (clearBg) {
      const W = img.naturalWidth, H = img.naturalHeight;
      const full = document.createElement('canvas');
      full.width = W; full.height = H;
      const fx = full.getContext('2d', { willReadFrequently: true });
      fx.drawImage(img, 0, 0);
      const id = fx.getImageData(0, 0, W, H);
      const d = id.data, N = W * H;
      const minc = (p) => Math.min(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
      const corner = [0, W - 1, (H - 1) * W, N - 1].every((p) => d[p * 4 + 3] > 250 && minc(p) >= 240);
      if (corner) {
        cleared = true;
        const cand = new Uint8Array(N);
        for (let p = 0; p < N; p++) {
          const mn = minc(p), mx = Math.max(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
          if (d[p * 4 + 3] > 0 && mn >= 236 && mx - mn <= 14) cand[p] = 1;
        }
        const seen = new Uint8Array(N), clear = new Uint8Array(N), stack = new Int32Array(N);
        for (let s = 0; s < N; s++) {
          if (!cand[s] || seen[s]) continue;
          let top = 0, sum = 0, border = false;
          const members = [];
          stack[top++] = s; seen[s] = 1;
          while (top) {
            const p = stack[--top];
            members.push(p); sum += minc(p);
            const x = p % W, y = (p - x) / W;
            if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true;
            if (x > 0 && cand[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[top++] = p - 1; }
            if (x < W - 1 && cand[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[top++] = p + 1; }
            if (y > 0 && cand[p - W] && !seen[p - W]) { seen[p - W] = 1; stack[top++] = p - W; }
            if (y < H - 1 && cand[p + W] && !seen[p + W]) { seen[p + W] = 1; stack[top++] = p + W; }
          }
          if (border || (members.length >= 300 && sum / members.length >= 247)) for (const p of members) clear[p] = 1;
        }
        // 지운 곳 바로 옆(2점 안)의 밝은 점은 반쯤 투명하게 하고 흰 기운을 빼서, 테두리에 흰 띠가 남지 않게 한다
        const near = new Uint8Array(N);
        for (let p = 0; p < N; p++) {
          if (!clear[p]) continue;
          const x = p % W, y = (p - x) / W;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < W && ny < H) near[ny * W + nx] = 1;
          }
        }
        for (let p = 0; p < N; p++) {
          if (clear[p]) { d[p * 4 + 3] = 0; continue; }
          if (!near[p]) continue;
          const L = minc(p);
          if (L < 200) continue;
          const a = Math.min(1, (255 - L) / 55);
          if (a < 0.05) { d[p * 4 + 3] = 0; continue; }
          for (let k = 0; k < 3; k++) d[p * 4 + k] = Math.max(0, Math.min(255, Math.round((d[p * 4 + k] - 255 * (1 - a)) / a)));
          d[p * 4 + 3] = Math.round(Math.min(d[p * 4 + 3], a * 255));
        }
        fx.putImageData(id, 0, 0);
        src = full;
      }
    }
    // 남은 흰 배경 지우기 (FRINGE에 적은 그림만)
    // 1) 투명한 곳에서 '거리' 점 안에 있는 밝은 점(아래 높이보다 위쪽)을 지운다
    // 2) 그 조각 바깥에 남는 3점 이하 두께의 가는 선도 함께 지운다 (투명한 곳과 지운 곳 사이에 낀 선. 선: false 이면 안 함)
    // 3) 구멍: 몸 안쪽에 갇힌 아주 흰 틈을 지운다
    // 4) 지운 곳 바로 옆 점은 조금 투명하게 해서 끝이 매끄럽게 한다
    let fringed = 0;
    if (fringe) {
      const W = img.naturalWidth, H = img.naturalHeight, N = W * H;
      const full = document.createElement('canvas');
      full.width = W; full.height = H;
      const fx = full.getContext('2d', { willReadFrequently: true });
      fx.drawImage(src, 0, 0);
      const id = fx.getImageData(0, 0, W, H);
      const d = id.data;
      // 맨해튼 거리: 각 점에서 가장 가까운 '표시된 점'까지의 거리 (표시된 점은 0)
      const distTo = (marked) => {
        const D = new Int32Array(N);
        const BIG = 1 << 29;
        for (let p = 0; p < N; p++) D[p] = marked[p] ? 0 : BIG;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const p = y * W + x;
          if (x > 0 && D[p - 1] + 1 < D[p]) D[p] = D[p - 1] + 1;
          if (y > 0 && D[p - W] + 1 < D[p]) D[p] = D[p - W] + 1;
        }
        for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
          const p = y * W + x;
          if (x < W - 1 && D[p + 1] + 1 < D[p]) D[p] = D[p + 1] + 1;
          if (y < H - 1 && D[p + W] + 1 < D[p]) D[p] = D[p + W] + 1;
        }
        return D;
      };
      const transp = new Uint8Array(N);
      for (let p = 0; p < N; p++) transp[p] = d[p * 4 + 3] < 20 ? 1 : 0;
      const dT = distTo(transp);
      const clear = new Uint8Array(N);
      const limit = Math.min(H, fringe.아래);
      const band = fringe.거리 || 12, bright = fringe.밝기 || 175;
      for (let y = 0; y < limit; y++) for (let x = 0; x < W; x++) {
        const p = y * W + x;
        const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
        const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
        if (d[p * 4 + 3] > 0 && !transp[p] && dT[p] <= band && mn > bright && mx - mn < 45) clear[p] = 1;
      }
      // 가는 선: 남는 불투명한 부분(keep)을 2점 깎았다가 2점 붙였을 때 사라지는 곳 가운데, 지운 곳에서 4점 안에 있는 것
      const notKeep = new Uint8Array(N);
      for (let p = 0; p < N; p++) notKeep[p] = transp[p] || clear[p] ? 1 : 0;
      const dEdge = distTo(notKeep);
      const eroded = new Uint8Array(N);
      for (let p = 0; p < N; p++) eroded[p] = dEdge[p] > 2 ? 1 : 0;
      const dEr = distTo(eroded);
      const dClear = distTo(clear);
      if (fringe.선 !== false) for (let p = 0; p < N; p++) {
        if (notKeep[p] || dEr[p] <= 2) continue;
        if (Math.floor(p / W) < limit + 4 && dClear[p] <= 4) clear[p] = 2;
      }
      if (fringe.구멍) {
        // 아주 흰 점들의 덩어리 가운데, 투명한 곳에 닿지 않고(몸 안쪽에 갇힘) 크고 아주 흰 것
        const seen = new Uint8Array(N), stack = new Int32Array(N);
        const vw = (p) => {
          const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
          const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
          return d[p * 4 + 3] > 0 && !transp[p] && !clear[p] && mn >= 238 && mx - mn <= 14;
        };
        for (let s0 = 0; s0 < N; s0++) {
          if (seen[s0] || !vw(s0)) continue;
          let top = 0, sum = 0, touch = false;
          const members = [];
          stack[top++] = s0; seen[s0] = 1;
          while (top) {
            const p = stack[--top];
            members.push(p);
            sum += Math.min(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
            if (dT[p] <= 1) touch = true;
            const x = p % W;
            for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
              if (q < 0 || q >= N || seen[q] || !vw(q)) continue;
              seen[q] = 1; stack[top++] = q;
            }
          }
          if (!touch && members.length >= 150 && sum / members.length >= 246) for (const p of members) clear[p] = 3;
        }
      }
      const dClear2 = distTo(clear);
      for (let p = 0; p < N; p++) {
        if (clear[p]) { d[p * 4 + 3] = 0; fringed++; continue; }
        if (dClear2[p] === 1 && d[p * 4 + 3] > 0) d[p * 4 + 3] = Math.round(d[p * 4 + 3] * 0.6);
      }
      if (fringe.테두리) {
        // 반투명 가장자리 점: 이웃 8점 가운데 가장 불투명한 점의 색을 가져온다 (투명도는 그대로)
        const src2 = new Uint8ClampedArray(d);
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          const p = y * W + x, a0 = src2[p * 4 + 3];
          if (a0 === 0 || a0 >= 250 || dT[p] > 1) continue;
          let best = -1, ba = a0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const q = p + dy * W + dx;
            if (src2[q * 4 + 3] > ba) { ba = src2[q * 4 + 3]; best = q; }
          }
          if (best < 0) continue;
          for (let k = 0; k < 3; k++) d[p * 4 + k] = src2[best * 4 + k];
          fringed++;
        }
      }
      fx.putImageData(id, 0, 0);
      src = full;
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    return { w, h, src: [img.naturalWidth, img.naturalHeight], cleared, fringed, url: c.toDataURL('image/webp', q) };
  }, { dataUrl, max: t.rule.max, q: t.rule.q, clearBg: !!t.rule.clearBg, fringe: t.rule.fringe || null });
  const out = Buffer.from(res.url.split(',')[1], 'base64');
  fs.mkdirSync(path.dirname(t.outFull), { recursive: true });
  fs.writeFileSync(t.outFull, out);
  manifest[t.rel] = { hash: t.hash, webp: t.outRel, size: [res.w, res.h], source: res.src };
  before += t.buf.length; after += out.length;
  console.log(`${t.rel}  ${(t.buf.length / 1024).toFixed(0)}KB → ${(out.length / 1024).toFixed(0)}KB  (${res.w}×${res.h})${res.cleared ? '  ※ 흰 배경을 지움 (원본은 그대로)' : ''}${res.fringed ? `  ※ 남은 흰 배경 ${res.fringed}점을 지움 (원본은 그대로)` : ''}`);
  if (res.cleared) clearedList.push(t.rel);
}
await browser.close();

// 원본이 지워진 그림의 기록은 정리한다
for (const rel of Object.keys(manifest)) {
  if (!fs.existsSync(path.join(SRC, rel))) delete manifest[rel];
}
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log(`\n${todo.length}장 변환: ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`);
if (clearedList.length) console.log(`흰 배경을 지운 인물 그림 ${clearedList.length}장 (원본 assets/ 는 그대로. 투명한 원본을 올리면 다시 만들 때 원본을 그대로 쓴다): ${clearedList.join(', ')}`);
