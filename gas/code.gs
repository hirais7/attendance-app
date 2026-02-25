/**
 * 究極安定版：出退勤・課題報告システム
 * ※ appendRowハックにより、退勤時の即時反映を強制します
 */

const LINE_CHANNEL_ACCESS_TOKEN = 'YOZ7UftinQaO3OyBDaloYu4cXzhYtLzmqBzAGNvCIJRg7h+DoqsX0n6OXdfOFZ9vI7/+VIOKgdWLHJ6yBmeAi6kPqz4+FZ3vpHQTBEAQSHA81c9tQLH/8oP8UUyRpnHxvmJ0QlaAjZWiraJeO38tBgdB04t89/1O/w1cDnyilFU=';
const LINE_GROUP_ID = 'C5a5b36e27a78ed6cfbb74839a8a9d04e';
const SPREADSHEET_ID = '19_2PnWEyRxKqv-g8k1uDhBjC9TdRe2R1aLi8o1lZXa8';

// シート名
const SHEET_RECORDS = '打刻記録';
const SHEET_COMPLETION = '課題完了記録';

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  const traineeId = String(params.traineeId || '').trim();
  const traineeName = String(params.traineeName || '').trim();
  const appUrl = params.appUrl;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const recordSheet = ss.getSheetByName(SHEET_RECORDS);
  const completionSheet = ss.getSheetByName(SHEET_COMPLETION);

  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd');
  const timeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm');

  try {
    if (action === 'clockIn') {
      recordSheet.appendRow([dateStr, traineeId, traineeName, timeStr, '', '']);
    } 
    else if (action === 'clockOut') {
      const data = recordSheet.getDataRange().getValues();
      const searchId = traineeId.toLowerCase();
      let rowIndex = -1;

      for (let i = data.length - 1; i >= 1; i--) {
        const cellId = String(data[i][1] || '').trim().toLowerCase();
        const cellOut = String(data[i][4] || '').trim();
        if (cellId === searchId && cellOut === '') {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex !== -1) {
        // 出勤時刻の取得
        const rawIn = data[rowIndex - 1][3];
        const inStr = (rawIn instanceof Date) ? Utilities.formatDate(rawIn, 'Asia/Tokyo', 'HH:mm') : String(rawIn);
        const dur = calculateDuration(inStr, timeStr);
        
        // セルの更新
        recordSheet.getRange(rowIndex, 5).setValue(timeStr);
        recordSheet.getRange(rowIndex, 6).setValue(dur);
        
        // ★重要：即時反映を強制するためのappend/deleteハック★
        recordSheet.appendRow(["", "", "", "", "", ""]);
        recordSheet.deleteRow(recordSheet.getLastRow());
      } else {
        // 出勤データがない場合はエラーにせず新規追加（確実に記録を残す）
        recordSheet.appendRow([dateStr, traineeId, traineeName, "(出勤不明)", timeStr, ""]);
      }
    } 
    else if (action === 'complete') {
      const dateTimeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
      completionSheet.appendRow([dateTimeStr, traineeId, traineeName, appUrl, '提出済み']);
    }

    // キャッシュをフラッシュ
    SpreadsheetApp.flush();
    
    // LINE通知
    const lineMsg = action === 'clockIn' ? `【出勤】\n${traineeName}\n${timeStr}` :
                    action === 'clockOut' ? `【退勤】\n${traineeName}\n${timeStr}` :
                    `【課題完了】\n${traineeName}`;
    sendLineMessage(lineMsg);

    return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function sendLineMessage(message) {
  const url = 'https://api.line.me/v2/bot/message/push';
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify({ to: LINE_GROUP_ID, messages: [{ type: 'text', text: message }] })
  };
  try { UrlFetchApp.fetch(url, options); } catch (e) {}
}

function calculateDuration(start, end) {
  if (!start || !end || !start.includes(':')) return '-';
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMin < 0) diffMin += 1440;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}
