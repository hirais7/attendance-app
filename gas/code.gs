/**
 * Google Apps Script (GAS) for Attendance Tracking App
 * 
 * Features:
 * - doPost: Handle attendance and completion reports from the web app.
 * - LINE Notification: Send messages to the specified LINE group.
 * - Spreadsheet Recording: Save data to designated sheets.
 */

const LINE_CHANNEL_ACCESS_TOKEN = 'YOZ7UftinQaO3OyBDaloYu4cXzhYtLzmqBzAGNvCIJRg7h+DoqsX0n6OXdfOFZ9vI7/+VIOKgdWLHJ6yBmeAi6kPqz4+FZ3vpHQTBEAQSHA81c9tQLH/8oP8UUyRpnHxvmJ0QlaAjZWiraJeO38tBgdB04t89/1O/w1cDnyilFU=';
const LINE_GROUP_ID = 'C5a5b36e27a78ed6cfbb74839a8a9d04e';
const SPREADSHEET_ID = '19_2PnWEyRxKqv-g8k1uDhBjC9TdRe2R1aLi8o1lZXa8';

// Spreadsheet Sheet Names
const SHEET_TRAINEE = '研修生マスタ';
const SHEET_RECORDS = '打刻記録';
const SHEET_COMPLETION = '課題完了記録';

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  const traineeId = params.traineeId;
  const traineeName = params.traineeName;
  const appUrl = params.appUrl;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const recordSheet = ss.getSheetByName(SHEET_RECORDS);
  const masterSheet = ss.getSheetByName(SHEET_TRAINEE);
  const completionSheet = ss.getSheetByName(SHEET_COMPLETION);

  const now = new Date();
  const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd');
  const timeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm');

  let result = { success: true };

  try {
    console.log(`Action: ${action}, ID: ${traineeId}, Name: ${traineeName}`);
    
    if (action === 'clockIn') {
      try {
        recordSheet.appendRow([dateStr, traineeId, traineeName, timeStr, '', '']);
        console.log('Clock-in recorded successfully');
      } catch (e) {
        console.error('Failed to append clock-in row: ' + e.message);
        throw e;
      }
      sendLineMessage(`【出勤】\n${traineeName}\n${dateStr} ${timeStr}`);
    } 
    else if (action === 'clockOut') {
      const data = recordSheet.getDataRange().getValues();
      let rowIndex = -1;
      
      console.log(`Searching for last clock-in record for ${traineeId}...`);
      for (let i = data.length - 1; i >= 1; i--) {
        const cellTraineeId = String(data[i][1] || '').trim().toLowerCase();
        const searchId = String(traineeId || '').trim().toLowerCase();
        const cellClockOut = String(data[i][4] || '').trim();
        
        if (cellTraineeId === searchId && cellClockOut === '') {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex !== -1) {
        console.log(`Found record at row ${rowIndex}`);
        const clockInTimeStr = data[rowIndex - 1][3];
        const clockOutTimeStr = timeStr;
        const durationStr = calculateDuration(clockInTimeStr, clockOutTimeStr);
        
        recordSheet.getRange(rowIndex, 5).setValue(clockOutTimeStr);
        recordSheet.getRange(rowIndex, 6).setValue(durationStr);
        
        // Force immediate reflection in the spreadsheet
        SpreadsheetApp.flush();
        
        console.log('Clock-out updated successfully and flushed');
        sendLineMessage(`【退勤】\n${traineeName}\n出勤：${clockInTimeStr}\n退勤：${clockOutTimeStr}\n勤務：${durationStr}`);
      } else {
        console.warn('No active clock-in found for: ' + searchId);
        throw new Error('出勤記録が見つかりません。本日まだ「出勤」していないか、既に「退勤」済みです。');
      }
    } 
    else if (action === 'complete') {
      const dateTimeStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
      completionSheet.appendRow([dateTimeStr, traineeId, traineeName, appUrl, '提出済み']);
      
      // Force immediate reflection
      SpreadsheetApp.flush();
      
      console.log('Completion report recorded and flushed');
      sendLineMessage(`【🎉課題完了報告🎉】\n研修生：${traineeName}（${traineeId}）\n完了：${dateTimeStr}\n\nアプリURL:\n${appUrl}\n\n確認をお願いします！`);
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('Error in doPost: ' + err.message);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message, stack: err.stack })).setMimeType(ContentService.MimeType.JSON);
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
    payload: JSON.stringify({
      to: LINE_GROUP_ID,
      messages: [{ type: 'text', text: message }]
    })
  };
  UrlFetchApp.fetch(url, options);
}

function calculateDuration(start, end) {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  
  let diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMin < 0) diffMin += 24 * 60; // Over Midnight handling (simplistic)
  
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;
  
  if (hours > 0) {
    return `${hours}時間${minutes}分`;
  } else {
    return `${minutes}分`;
  }
}
