"""6화 증거 그림 4장에 글자를 다시 넣는다 (반제 회의록, 명령서 조사 결과, 헝가리 유대인 수송 기록, 한나의 취재 수첩).

이 4장은 그림을 만들 때 제목이 거부되어 빈 칸으로 받은 뒤 글자를 넣은 것이다.
처음 넣은 글자(커밋 b977d44)는 종이 기울기와 맞지 않고 선 위에 겹쳐서 다시 넣었다.

- 글자 없는 원본: 커밋 0b96cd3의 assets/evidence/*.png (1254×1254, 흰 바탕)
- 투명 처리와 크기·자리: 커밋 b977d44의 같은 그림 (1024×1024). 원본을 같은 자리·크기로 옮기고 이 그림의 알파를 그대로 쓴다
- 글자: 게임 글꼴(game/fonts/RIDIBatang.otf)을 종이 기울기만큼 돌려 곱하기로 찍는다 (종이 결이 비치게)

실행: python3 tools/evidence_text_ep6.py      → assets/evidence/ 의 4장을 다시 만든다. 그 뒤 node tools/make_webp.mjs
글자나 자리를 바꾸려면 아래 JOBS 표를 고친다. 자리는 1024 그림의 (가로, 세로) 가운데, 각도는 반시계 방향(도).
"""
import io, subprocess, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'game', 'fonts', 'RIDIBatang.otf')
ORIG, ALPHA = '0b96cd3', 'b977d44'
INK = (40, 28, 20)
PENCIL = (78, 78, 86)

# (글, 크기, 각도, 가운데, 색, 굵기, 진하기)
JOBS = {
    'ep6_wannsee': {'text': [
        ('반제 회의록', 62, 7.8, (478, 236), INK, 1, 235),        # 위 점선 테두리와 첫 겹줄 사이
        ('1942년 1월 20일', 30, 8.0, (478, 340), INK, 0, 225),    # 두 겹줄 사이
    ]},
    'ep6_order_search_result': {'text': [
        ('명령서 조사 결과', 54, 9.0, (468, 206), INK, 1, 235),
        ('한 장도 발견되지 않았다', 30, 9.3, (470, 262), INK, 0, 225),  # 겹줄 위
    ]},
    'ep6_hungary_transport': {'erase': [(566, 271), (758, 240), (764, 276), (571, 307)],  # 오른쪽 위 상자 안의 자리표시 줄
        'text': [
        ('헝가리 유대인 수송 기록', 42, 9.8, (456, 196), INK, 1, 235),
        ('1944', 25, 9.0, (456, 238), INK, 0, 225),
        ('약 43만 명', 30, 8.6, (664, 274), INK, 1, 235),         # 상자 안
    ]},
    'ep6_hanna_notebook': {'soften': 0.6, 'text': [
        ('1961 예루살렘', 30, 12.0, (642, 192), PENCIL, 0, 215),  # 오른쪽 쪽 위 여백 (연필)
    ]},
}

def git_png(rev, name):
    data = subprocess.run(['git', 'show', f'{rev}:assets/evidence/{name}.png'], cwd=ROOT, capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(data))

def bbox(mask):
    ys, xs = np.where(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def base(name):
    o = git_png(ORIG, name).convert('RGB'); c = git_png(ALPHA, name).convert('RGBA')
    oa = np.array(o).astype(int); ca = np.array(c)
    ox0, oy0, ox1, oy1 = bbox(oa.min(axis=2) < 235); cx0, cy0, cx1, cy1 = bbox(ca[:, :, 3] > 128)
    s = min((cx1 - cx0) / (ox1 - ox0), (cy1 - cy0) / (oy1 - oy0))
    crop = o.crop((ox0, oy0, ox1, oy1)).resize((round((ox1 - ox0) * s), round((oy1 - oy0) * s)), Image.LANCZOS)
    rgb = Image.new('RGB', c.size, (255, 255, 255)); rgb.paste(crop, (cx0, cy0))
    return Image.fromarray(np.dstack([np.array(rgb), ca[:, :, 3]]).astype('uint8'), 'RGBA')

def layer(txt, size, angle, center, color, bold, alpha, W):
    f = ImageFont.truetype(FONT, size)
    l, t, r, b = f.getbbox(txt, stroke_width=bold)
    lay = Image.new('RGBA', (r - l + 8, b - t + 8), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((4 - l, 4 - t), txt, font=f, fill=color + (alpha,), stroke_width=bold, stroke_fill=color + (alpha,))
    lay = lay.rotate(angle, resample=Image.BICUBIC, expand=True)
    full = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    full.alpha_composite(lay, (int(center[0] - lay.width / 2), int(center[1] - lay.height / 2)))
    return full

def ink(img, lay, soften):
    lay = lay.filter(ImageFilter.GaussianBlur(soften))
    b = np.array(img).astype(float); L = np.array(lay).astype(float)
    a = (L[:, :, 3:4] / 255.0) * (b[:, :, 3:4] > 0)
    b[:, :, :3] = b[:, :, :3] * (1 - a) + (b[:, :, :3] * L[:, :, :3] / 255.0) * a
    return Image.fromarray(b.clip(0, 255).astype('uint8'), 'RGBA')

def erase(img, poly, dark_delta=35, grow=2):
    b = np.array(img).astype(float); H, W = b.shape[:2]
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(poly, fill=255); inside = np.array(m) > 0
    lum = b[:, :, :3].mean(axis=2); dark = inside & (lum < np.median(lum[inside]) - dark_delta)
    dark = np.array(Image.fromarray((dark * 255).astype('uint8')).filter(ImageFilter.MaxFilter(2 * grow + 1))) > 0
    good = (~dark) & inside
    num = np.array(Image.fromarray((b[:, :, :3] * good[:, :, None]).astype('uint8')).filter(ImageFilter.GaussianBlur(9))).astype(float)
    den = np.array(Image.fromarray((good * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(9))).astype(float)[:, :, None] / 255.0
    fill = num / np.maximum(den, 1e-3) + np.random.default_rng(1).normal(0, 3.0, num.shape)
    b[:, :, :3][dark] = fill[dark]
    return Image.fromarray(b.clip(0, 255).astype('uint8'), 'RGBA')

if __name__ == '__main__':
    for name, job in JOBS.items():
        img = base(name)
        if 'erase' in job: img = erase(img, job['erase'])
        for (txt, size, angle, center, color, bold, alpha) in job['text']:
            img = ink(img, layer(txt, size, angle, center, color, bold, alpha, img.width), job.get('soften', 0.4))
        out = os.path.join(ROOT, 'assets', 'evidence', name + '.png')
        img.save(out, optimize=True)
        print('만듦', os.path.relpath(out, ROOT))
