// 판 고르기: 게임 2(4~6화, 1~3화를 한 반)와 단독판(4~6화만 하는 판, window.GAME_PART = 3)이 같은 화 데이터를 함께 쓴다.
// 대본: docs/대본/단독판_평범한_사람들.md (단독판에서 바뀌는 곳만 적은 대본)
//
// 화 데이터(game/data/epN.js)에 이렇게 적는다.
//   단독판: { … }   이 칸들을 단독판에서만 바꿔 넣는다. 예: { 말: '한나', 대사: '1부와 다른 점이…', 단독판: { 대사: '전쟁 뒤 독일에서는…' } }
//   판: '단독'       목록(막, 명령, 몽타주의 한 줄 …)이나 증거 표의 한 칸을 단독판에만 둔다
//   판: '게임2'      단독판에서는 뺀다 (게임 2와 사이트 전체판에는 그대로 있다)
// 게임은 데이터를 다 읽은 뒤 이 파일에서 한 번 바꿔 두고 시작한다. 그 뒤로는 판을 따로 따지지 않는다.
// 도구(tools/check_script.mjs, build_single_html.mjs …)도 데이터를 읽은 뒤 applyEdition(DATA, 단독판인가)을 부른다.
(function () {
  const W = typeof window !== 'undefined' ? window : globalThis;

  function keep(x, solo) {
    if (!x || typeof x !== 'object' || Array.isArray(x) || x.판 == null) return true;
    if (x.판 !== '단독' && x.판 !== '게임2') console.warn('[판 이름을 모름]', x.판, x);
    return (x.판 === '단독') === solo;
  }

  function walk(o, solo) {
    if (Array.isArray(o)) {
      for (let i = o.length - 1; i >= 0; i--) {
        if (!keep(o[i], solo)) { o.splice(i, 1); continue; }
        walk(o[i], solo);
      }
      return;
    }
    if (!o || typeof o !== 'object') return;
    if (Object.prototype.hasOwnProperty.call(o, '단독판')) {
      const over = o.단독판;
      delete o.단독판;
      if (solo) Object.assign(o, over);
    }
    if (Object.prototype.hasOwnProperty.call(o, '판') && keep(o, solo)) delete o.판;
    for (const k of Object.keys(o)) {
      if (!keep(o[k], solo)) { delete o[k]; continue; }
      walk(o[k], solo);
    }
  }

  W.applyEdition = function (DATA, solo) {
    if (!DATA || DATA.__판) return DATA;
    for (const k of Object.keys(DATA)) if (/^ep\d+$/.test(k)) walk(DATA[k], !!solo);
    Object.defineProperty(DATA, '__판', { value: solo ? '단독' : '게임2' });
    return DATA;
  };

  // 브라우저: 화 데이터를 다 읽은 뒤(index.html에서 data 다음, core.js 앞) 바로 바꾼다
  if (typeof document !== 'undefined' && W.DATA) W.applyEdition(W.DATA, W.GAME_PART === 3);
})();
