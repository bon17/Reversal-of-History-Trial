// 게임을 HTML 파일 하나로 묶는다 (엔진 + 내 데이터 + 그림 + 소리). 만들기 도우미(maker.html)와 tools/build.mjs 가 함께 쓴다.
//   KIT_EXPORT({ bundle, data, images, audio, flags }) → HTML 글
//   bundle: engine/bundle.js 의 KIT_BUNDLE { css, js, body }
//   data: { 게임: {…}, ep1: {…} } / images: { 'characters/sora_default': 'data:image/…' } / audio: { 'bgm/trial': 'data:audio/…' }
(function (root) {
  // HTML 안의 <script> 에 넣어도 안전하게: </script 와 <!-- 가 글자 그대로 들어가지 않게 바꾼다 (JSON 으로 읽으면 원래 글자로 돌아온다)
  const safe = (t) => String(t).replace(/<\/(script)/gi, '<\\/$1');
  const safeJson = (t) => safe(t).replace(/<!--/g, '<\\u0021--');
  function exportHtml({ bundle, data, images, audio, flags }) {
    const title = ((data.게임 || {}).제목 || '법정 추리 수업 게임').replace(/[<>&]/g, '');
    const json = (o) => safeJson(JSON.stringify(o || {}));
    return '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
      + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#000000">\n'
      + '<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
      + '<meta name="generator" content="법정 추리 수업 게임 키트 ' + (bundle.판 || '') + '">\n'
      + '<title>' + title + '</title>\n<style>\n' + bundle.css + '\n</style>\n</head>\n<body>\n' + bundle.body + '\n'
      // 이 묶음은 만들기 도우미가 다시 읽을 수 있다 ([게임 파일 불러오기])
      + '<script id="kit-data" type="application/json">' + json({ data, images: images || {}, audio: audio || {} }) + '</script>\n'
      + '<script>\nwindow.KIT_SINGLE = true;\nwindow.KIT_FLAGS = ' + JSON.stringify(flags || []) + ';\n'
      + '(function () { var p = JSON.parse(document.getElementById("kit-data").textContent); window.DATA = p.data; window.EMBED_IMG = p.images; window.EMBED_AUDIO = p.audio; })();\n</script>\n'
      + '<script>\n' + safe(bundle.js) + '\n</script>\n</body>\n</html>\n';
  }
  // 내보낸 HTML 에서 데이터를 다시 꺼낸다
  function importHtml(html) {
    const m = /<script id="kit-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
  }
  root.KIT_EXPORT = exportHtml;
  root.KIT_IMPORT = importHtml;
  if (typeof module !== 'undefined' && module.exports) module.exports = { exportHtml, importHtml };
})(typeof window !== 'undefined' ? window : globalThis);
