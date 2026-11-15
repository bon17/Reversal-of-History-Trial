// AI가 써 준 게임 데이터(글)를 읽는다. 코드를 실행하지 않고 글자만 읽어서 데이터로 바꾸므로 안전하고,
// 틀린 곳이 있으면 몇 번째 줄인지 쉬운 말로 알려 준다. 만들기 도우미(maker.html)가 쓴다.
//
//   KIT_PARSE(글) → { data: { 게임: {…}, ep1: {…} }, errors: [{ 줄, 글, 도움 }] }
//
// 읽을 수 있는 것: DATA.게임 = { … };  DATA.ep1 = { … };  (앞뒤의 설명 글과 ``` 는 무시한다)
//   { 이름: 값 }, [ … ], '글', "글", `글`, 숫자, true, false, null, // 주석, /* 주석 */, 마지막 쉼표
(function (root) {
  class ParseError extends Error { constructor(msg, pos, help) { super(msg); this.pos = pos; this.help = help || ''; } }

  function parseValue(src, start) {
    let i = start;
    const n = src.length;
    const fail = (msg, help, at = i) => { throw new ParseError(msg, at, help); };
    const CUT = 'AI의 답이 중간에 끊긴 것 같아요. AI에게 "끊긴 곳부터 이어서 써 줘"라고 한 뒤, 이어진 글을 붙여서 다시 넣어 주세요.';
    function ws() {
      for (;;) {
        const c = src[i];
        if (c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '﻿' || c === ' ') i++;
        else if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; }
        else if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) fail('/* 로 시작한 주석이 */ 로 끝나지 않았어요.'); i = e + 2; }
        else return;
      }
    }
    const show = (c) => (c === undefined ? '글의 끝' : "'" + src.slice(i, i + 12).split('\n')[0] + "'");
    function str() {
      const q = src[i], at = i;
      i++;
      let out = '';
      for (;;) {
        if (i >= n) fail('따옴표(' + q + ')로 시작한 글이 닫히지 않았어요.', '글 끝에 같은 따옴표를 넣어 주세요. ' + CUT, at);
        const c = src[i];
        if (c === q) { i++; return out; }
        if (c === '\n' && q !== '`') fail('따옴표(' + q + ')로 시작한 글이 같은 줄에서 닫히지 않았어요.', "글 안에 같은 따옴표가 들어 있으면 다른 따옴표로 감싸 주세요. 예: \"그 사람은 '범인'이 아니야\"", at);
        if (c === '\\') {
          const d = src[i + 1];
          i += 2;
          if (d === 'n') out += '\n'; else if (d === 't') out += '\t'; else if (d === 'r') out += '';
          else if (d === 'u') { out += String.fromCharCode(parseInt(src.slice(i, i + 4), 16)); i += 4; }
          else if (d === '\n') out += ''; else out += d;
          continue;
        }
        if (c === '$' && q === '`' && src[i + 1] === '{') fail('` ` 안의 ${ } 는 읽을 수 없어요.', '보통 따옴표로 쓴 글로 바꿔 주세요.');
        out += c; i++;
      }
    }
    function value() {
      ws();
      const c = src[i];
      if (c === undefined) fail('값이 와야 할 자리에서 글이 끝났어요.', CUT);
      let v;
      if (c === '{') v = obj();
      else if (c === '[') v = arr();
      else if (c === "'" || c === '"' || c === '`') {
        v = str();
        for (;;) { ws(); if (src[i] === '+') { i++; ws(); if (!"'\"`".includes(src[i] || 'x')) fail("+ 뒤에는 따옴표로 감싼 글이 와야 해요."); v += str(); } else break; } // '가' + '나'
      } else {
        const m = /^(-?\d+(\.\d+)?([eE][-+]?\d+)?|true|false|null|undefined)(?![\w$¡-￿])/.exec(src.slice(i, i + 40));
        if (!m) fail('값이 와야 하는데 ' + show(c) + ' 이(가) 나왔어요.', "글은 따옴표로 감싸야 해요. 예: 대사: '안녕'");
        i += m[0].length;
        v = m[0] === 'true' ? true : m[0] === 'false' ? false : m[0] === 'null' || m[0] === 'undefined' ? null : Number(m[0]);
      }
      return v;
    }
    function obj() {
      const at = i;
      i++;
      const o = {};
      for (;;) {
        ws();
        const c = src[i];
        if (c === undefined) fail('{ 로 시작한 묶음이 } 로 닫히지 않았어요.', CUT, at);
        if (c === '}') { i++; return o; }
        let key;
        if (c === "'" || c === '"') key = str();
        else {
          const m = /^[\w$¡-￿]+/.exec(src.slice(i, i + 80));
          if (!m) fail('이름(예: 말, 대사)이 와야 하는데 ' + show(c) + ' 이(가) 나왔어요.', '앞 줄 끝에 쉼표(,)가 빠졌거나 괄호가 맞지 않는지 확인해 주세요.');
          key = m[0]; i += key.length;
        }
        ws();
        if (src[i] !== ':') fail("'" + key + "' 뒤에 쌍점(:)이 와야 하는데 " + show(src[i]) + ' 이(가) 나왔어요.', '이름: 값 모양으로 써 주세요. 앞에 쉼표(,)가 빠졌을 수도 있어요.');
        i++;
        o[key] = value();
        ws();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === '}') { i++; return o; }
        if (src[i] === undefined) fail('{ 로 시작한 묶음이 } 로 닫히지 않았어요.', CUT, at);
        fail("쉼표(,)나 } 가 와야 하는데 " + show(src[i]) + ' 이(가) 나왔어요.', '바로 앞 값의 끝에 쉼표(,)를 넣어 주세요.');
      }
    }
    function arr() {
      const at = i;
      i++;
      const a = [];
      for (;;) {
        ws();
        if (src[i] === undefined) fail('[ 로 시작한 목록이 ] 로 닫히지 않았어요.', CUT, at);
        if (src[i] === ']') { i++; return a; }
        a.push(value());
        ws();
        if (src[i] === ',') { i++; continue; }
        if (src[i] === ']') { i++; return a; }
        if (src[i] === undefined) fail('[ 로 시작한 목록이 ] 로 닫히지 않았어요.', CUT, at);
        fail('쉼표(,)나 ] 가 와야 하는데 ' + show(src[i]) + ' 이(가) 나왔어요.', '바로 앞 값의 끝에 쉼표(,)를 넣어 주세요.');
      }
    }
    const v = value();
    return { value: v, end: i };
  }

  const lineOf = (src, pos) => src.slice(0, Math.max(0, pos)).split('\n').length;

  function parse(text) {
    let src = String(text || '').replace(/\r\n?/g, '\n');
    const errors = [];
    const data = {};
    // 채팅에서 복사한 글: ``` 로 감싼 코드 묶음이 있으면 그 안만 읽는다
    const blocks = [];
    src.replace(/```[^\n]*\n([\s\S]*?)(```|$)/g, (m, body) => { blocks.push(body); return ''; });
    if (blocks.length && blocks.some((b) => /DATA\s*\.|^\s*\{/.test(b))) src = blocks.filter((b) => /DATA\s*\.|^\s*\{/.test(b)).join('\n');

    const re = /(?:window\s*\.\s*)?DATA\s*(?:\.\s*([\w$¡-￿]+)|\[\s*['"]([^'"]+)['"]\s*\])\s*=(?!=)/g;
    let m, found = 0;
    while ((m = re.exec(src))) {
      const key = m[1] || m[2];
      let j = re.lastIndex;
      // window.DATA = window.DATA || {} 는 건너뛴다
      const rest = src.slice(j, j + 40);
      if (/^\s*(window\s*\.\s*)?DATA\b/.test(rest)) continue;
      found++;
      try {
        const r = parseValue(src, j);
        data[key] = r.value;
        re.lastIndex = r.end;
      } catch (e) {
        if (!(e instanceof ParseError)) throw e;
        const line = lineOf(src, e.pos);
        errors.push({ 줄: line, 글: 'DATA.' + key + ' 을(를) 읽다가 ' + line + '번째 줄에서 멈췄어요: ' + e.message, 도움: e.help, 보기: src.split('\n')[line - 1] || '' });
        break;
      }
    }
    if (!found) {
      // DATA.… = 없이 { … } 만 붙여 넣은 경우
      const k = src.search(/\{/);
      if (k >= 0) {
        try {
          const v = parseValue(src, k).value;
          if (v && v.막) data['ep' + (v.번호 || 1)] = v;
          else if (v && (v.제목 || v.인물)) data.게임 = v;
          else if (v && typeof v === 'object') Object.assign(data, v);
          found = 1;
        } catch (e) {
          if (!(e instanceof ParseError)) throw e;
          const line = lineOf(src, e.pos);
          errors.push({ 줄: line, 글: line + '번째 줄에서 멈췄어요: ' + e.message, 도움: e.help, 보기: src.split('\n')[line - 1] || '' });
        }
      }
      if (!found && !errors.length) errors.push({ 줄: 1, 글: '게임 데이터를 찾지 못했어요.', 도움: 'AI의 답에서 DATA.게임 = { … } 와 DATA.ep1 = { … } 이 들어 있는 부분을 모두 복사해 붙여 넣어 주세요.', 보기: '' });
    }
    return { data, errors, source: src };
  }

  // 데이터 → 파일에 넣을 글 (settings.js, story1.js 모양)
  function stringify(data) {
    const head = 'window.DATA = window.DATA || {};\n';
    const one = (k) => 'DATA.' + k + ' = ' + JSON.stringify(data[k], null, 2) + ';\n';
    const keys = Object.keys(data);
    return {
      settings: data.게임 ? head + '\n' + one('게임') : '',
      stories: keys.filter((k) => k !== '게임' && data[k] && data[k].막).map((k) => ({ key: k, 번호: data[k].번호, text: head + '\n' + one(k) })),
      all: head + '\n' + keys.map(one).join('\n'),
    };
  }

  root.KIT_PARSE = parse;
  root.KIT_STRINGIFY = stringify;
  if (typeof module !== 'undefined' && module.exports) module.exports = { parse, stringify };
})(typeof window !== 'undefined' ? window : globalThis);
