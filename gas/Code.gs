/**
 * 기억의 법정: 쓰기 활동 답 저장 (구글 앱스 스크립트)
 *
 * 하는 일 (기획서 13장)
 *  1. 저장 (POST): 기억 노트(게임 1 뒤)나 반박문(게임 2 뒤) 답 한 건을 해당 시트에 한 줄로 덧붙인다.
 *  2. 불러오기 (GET): 반, 번호, 이름이 모두 맞는 학생의 가장 최근 기억 노트 3번 답(고른 것, 이유)만 돌려준다.
 *  3. 요약: 저장할 때마다 「요약」 시트를 다시 센다. 반마다 "어쩔 수 없었다" 세 답의 수 (이름은 나오지 않는다).
 *
 * 설치
 *  1. 구글 시트를 하나 만들고 [확장 프로그램 → Apps Script]에 이 파일 내용을 모두 붙여 넣고 저장한다.
 *  2. [배포 → 새 배포 → 유형: 웹 앱] 실행 사용자: 나 / 액세스 권한이 있는 사용자: 모든 사용자.
 *  3. 나온 웹 앱 주소(…/exec)를 게임의 game/data/common.js 의 DATA.설정.GAS주소 에 넣는다.
 *  4. 이 스크립트를 고친 뒤에는 [배포 관리 → 수정 → 새 버전]으로 다시 배포해야 반영된다 (주소는 그대로).
 *
 * [실행] 버튼은 위쪽 함수 목록에서 「setup」을 고른 뒤 한 번만 누른다. 시트 탭 세 개(기억노트, 반박문, 요약)가 생긴다.
 * doPost, doGet 은 직접 실행하지 않는다. 게임이 답을 보낼 때 저절로 불린다 (직접 실행하면 보낸 답이 없어서 오류가 난다).
 * 시트에 학생 답이 쌓이는 것은 게임에 주소를 넣은 뒤, 학생이 기억 노트를 저장할 때부터다.
 */

// 편집기에서 한 번 실행: 시트 세 개를 만들고 첫 줄에 열 이름을 쓴다 (이미 있는 시트는 그대로 둔다)
function setup() {
  sheet_('기억노트');
  sheet_('반박문');
  var sum = sheet_('요약');
  if (sum.getLastRow() === 0) updateSummary_();
}

var SHEETS = {
  기억노트: ['제출 시각', '반', '번호', '이름', '2화 여부', '기억에 남은 증거', '기억에 남은 이유(버튼)', '기억에 남은 이유(한 줄)',
    '잘못한 사람', '그 사람의 잘못', '벌을 받았을까', '어쩔 수 없었다(선택)', '어쩔 수 없었다(이유)'],
  반박문: ['제출 시각', '반', '번호', '이름', '기억 노트 선택(불러온 값)', '지금 선택', '지금 이유', '고른 메시지', '제시한 증거', '답장 빈칸 1', '답장 빈칸 2'],
};
// 게임이 보내는 칸 이름 (시트 열 순서대로, 제출 시각 뒤부터)
var FIELDS = {
  기억노트: ['반', '번호', '이름', '화2', '증거', '이유버튼', '이유한줄', '잘못한사람', '잘못', '벌', '선택', '이유'],
  반박문: ['반', '번호', '이름', '불러온선택', '선택', '이유', '메시지', '증거', '빈칸1', '빈칸2'],
};
var THINK = ['맞다, 어쩔 수 없었을 것 같다', '잘 모르겠다', '아니다, 다르게 할 수 있었다'];
var MAX = 100; // 칸마다 글자 수 제한

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (SHEETS[name]) sh.appendRow(SHEETS[name]);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(v) {
  return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').slice(0, MAX);
}

// 저장: 본문은 JSON 문자열 (게임은 text/plain 으로 보낸다)
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var data = JSON.parse(e.postData.contents);
    var kind = data.종류;
    if (!FIELDS[kind]) return json_({ ok: false, error: '모르는 종류' });
    var row = [new Date()].concat(FIELDS[kind].map(function (k) { return clean_(data[k]); }));
    sheet_(kind).appendRow(row);
    updateSummary_();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 불러오기: ?반=1&번호=3&이름=홍길동 → 그 학생의 가장 최근 기억 노트 3번 답만
function doGet(e) {
  var p = (e && e.parameter) || {};
  var cls = clean_(p['반']), num = clean_(p['번호']), name = clean_(p['이름']);
  if (!cls || !num || !name) return json_({ ok: false, error: '반, 번호, 이름이 필요해요' });
  var values = sheet_('기억노트').getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    var r = values[i];
    if (String(r[1]) === cls && String(r[2]) === num && String(r[3]) === name) {
      return json_({ ok: true, 선택: r[11], 이유: r[12] });
    }
  }
  return json_({ ok: true, 없음: true });
}

// 요약: 반마다 "어쩔 수 없었다" 세 답의 수. 같은 학생이 여러 번 냈으면 가장 최근 것만 센다.
function latestChoices_(name, choiceCol) {
  var values = sheet_(name).getDataRange().getValues();
  var latest = {};
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    latest[r[1] + '|' + r[2] + '|' + r[3]] = { 반: String(r[1]), 선택: r[choiceCol] };
  }
  var count = {};
  Object.keys(latest).forEach(function (k) {
    var v = latest[k];
    count[v.반] = count[v.반] || [0, 0, 0];
    var j = THINK.indexOf(v.선택);
    if (j >= 0) count[v.반][j]++;
  });
  return count;
}

function updateSummary_() {
  var before = latestChoices_('기억노트', 11);
  var after = latestChoices_('반박문', 5);
  var classes = Object.keys(before).concat(Object.keys(after)).filter(function (v, i, a) { return a.indexOf(v) === i; })
    .sort(function (a, b) { return Number(a) - Number(b); });
  var rows = [['반', '게임 1 뒤: ' + THINK[0], '게임 1 뒤: ' + THINK[1], '게임 1 뒤: ' + THINK[2],
    '게임 2 뒤: ' + THINK[0], '게임 2 뒤: ' + THINK[1], '게임 2 뒤: ' + THINK[2]]];
  classes.forEach(function (c) {
    var b = before[c] || [0, 0, 0], a = after[c] || [0, 0, 0];
    rows.push([c + '반'].concat(b, a));
  });
  var sh = sheet_('요약');
  sh.clearContents();
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}
