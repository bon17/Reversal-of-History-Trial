/**
 * 법정 추리 수업 게임 키트: 쓰기 활동 답 모으기 (구글 앱스 스크립트)
 *
 * 하는 일: 게임의 쓰기 활동에서 학생이 [저장하기]를 누르면, 답 한 건을 이 구글 시트에 한 줄로 덧붙인다.
 *   - 시트 탭 이름 = 쓰기 활동의 제목 (예: 탐구 노트)
 *   - 첫 줄(열 이름) = 제출 시각, 학생 정보(반, 번호, 이름), 문항의 이름. 처음 답이 들어올 때 저절로 만들어진다.
 *
 * 설치 (자세한 그림 설명: docs/답_모으기_구글시트.md)
 *  1. 구글 시트를 새로 하나 만든다.
 *  2. [확장 프로그램 → Apps Script]를 열고, 이 파일 내용을 모두 붙여 넣고 저장한다.
 *  3. [배포 → 새 배포 → 유형: 웹 앱]  실행 사용자: 나  /  액세스 권한이 있는 사용자: 모든 사용자  → [배포]
 *  4. 나온 웹 앱 주소(…/exec)를 게임의 my-game/settings.js 의 저장주소 에 넣는다.
 *  5. 이 스크립트를 고친 뒤에는 [배포 관리 → 수정 → 새 버전]으로 다시 배포해야 반영된다 (주소는 그대로).
 *
 * 학생 정보는 선생님의 구글 시트에만 쌓인다. 시트의 공유 설정을 '제한됨'으로 두고, 학기가 끝나면 지운다.
 */

var MAX = 1000; // 칸마다 글자 수 제한

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 줄바꿈을 없애고 길이를 자른다. =, +, -, @ 로 시작하는 글은 시트가 수식으로 읽지 않게 앞에 ' 를 붙인다.
function clean_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').slice(0, max || MAX);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// 저장: 본문은 JSON 글 (게임은 text/plain 으로 보낸다)
// { 종류: '탐구 노트', 게임: '…', 화: 1, 학생: [['반','3'],['번호','12'],['이름','…']], 답: [['문항 이름','답'], …] }
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var data = JSON.parse(e.postData.contents);
    var name = String(data.종류 || '답').replace(/[\[\]\*\?\/\\:]/g, ' ').slice(0, 60) || '답';
    var pairs = [].concat(data.학생 || [], data.답 || []).filter(function (p) { return p && p.length === 2; }).slice(0, 60);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var head = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [];
    if (!head.length) head = ['제출 시각'];
    // 새 문항이 생겼으면 열을 뒤에 더한다 (이미 들어온 답은 그대로 둔다)
    pairs.forEach(function (p) { var k = clean_(p[0], 80); if (head.indexOf(k) < 0) head.push(k); });
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    var row = head.map(function () { return ''; });
    row[0] = new Date();
    pairs.forEach(function (p) { row[head.indexOf(clean_(p[0], 80))] = clean_(p[1]); });
    sh.appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 주소를 브라우저로 열었을 때: 잘 설치됐는지 알려 준다
function doGet() {
  return json_({ ok: true, 안내: '잘 설치됐어요. 이 주소를 게임 설정의 저장주소 에 넣으세요.' });
}
