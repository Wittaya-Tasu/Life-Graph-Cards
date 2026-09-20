// Promyan V9.5 confirmed-save companion. Not deployed automatically.
// Script Properties: SPREADSHEET_ID and SHEET_NAME (both required).
// Keep existing A:D: timestamp, name, dob, note. Reserve E:F for metadata.
// Set E1=request_id and F1=saved_at manually before deployment.
var PROMYAN_PROTOCOL = 'promyan-save-v1';
var PROMYAN_META_HEADERS = ['request_id','saved_at'];

function promyanJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function promyanConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {id:props.getProperty('SPREADSHEET_ID'), tab:props.getProperty('SHEET_NAME')};
}
function doGet(e) {
  if (!e || !e.parameter || e.parameter.action !== 'health') {
    return promyanJson_({protocol:PROMYAN_PROTOCOL, ok:false, code:'UNSUPPORTED_ACTION'});
  }
  // Read-only probe: no records, names or DOBs are returned.
  try {
    var config = promyanConfig_();
    if (!config.id || !config.tab) return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:true,ready:false,code:'NOT_CONFIGURED'});
    var sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.tab);
    if (!sheet) return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:true,ready:false,code:'SHEET_NOT_FOUND'});
    if (!promyanSchema_(sheet)) return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:true,ready:false,code:'SCHEMA_MISMATCH'});
    return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:true,ready:true});
  } catch (error) {
    return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,ready:false,code:'NOT_READY'});
  }
}
function promyanSchema_(sheet) {
  return sheet.getLastRow() >= 1 && JSON.stringify(sheet.getRange(1,5,1,2).getDisplayValues()[0]) === JSON.stringify(PROMYAN_META_HEADERS);
}

function promyanValidate_(p) {
  if (!p || p.protocol !== PROMYAN_PROTOCOL || p.action !== 'save'
      || typeof p.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(p.requestId)
      || typeof p.timestamp !== 'string' || p.timestamp.length > 50 || !isFinite(Date.parse(p.timestamp))) return false;
  if (['name','dob','note'].some(function(k){return typeof p[k] !== 'string';})) return false;
  return Boolean(p.name.trim() || p.dob.trim()) && p.name.length <= 200 && p.dob.length <= 200 && p.note.length <= 2000;
}
function promyanText_(value) {
  // Store user text as text, never as a spreadsheet formula.
  return /^[=+\-@\t\r\n']/.test(value) ? "'" + value : value;
}
function doPost(e) {
  var p, lock, acquired = false;
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 10000) return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,code:'INVALID_BODY'});
    p = JSON.parse(raw);
    if (!promyanValidate_(p)) return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,code:'INVALID_REQUEST'});
    var config = promyanConfig_();
    if (!config.id || !config.tab) return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,requestId:p.requestId,code:'NOT_CONFIGURED'});
    lock = LockService.getScriptLock();
    acquired = lock.tryLock(10000);
    if (!acquired) return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,requestId:p.requestId,code:'BUSY'});
    var book = SpreadsheetApp.openById(config.id);
    var sheet = book.getSheetByName(config.tab);
    if (!sheet) return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,requestId:p.requestId,code:'SHEET_NOT_FOUND'});
    // No automatic header changes or migration of historical records.
    if (!promyanSchema_(sheet)) {
      return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,requestId:p.requestId,code:'SCHEMA_MISMATCH'});
    }
    var last = sheet.getLastRow();
    var match = last > 1 ? sheet.getRange(2,5,last-1,1).createTextFinder(p.requestId).matchEntireCell(true).findNext() : null;
    var row, savedAt, status;
    if (match) {
      row = match.getRow();
      var existing = sheet.getRange(row,1,1,6).getDisplayValues()[0];
      if (JSON.stringify(existing.slice(0,4)) !== JSON.stringify([p.timestamp,p.name,p.dob,p.note])) {
        return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,requestId:p.requestId,code:'REQUEST_ID_CONFLICT'});
      }
      savedAt = existing[5]; status = 'duplicate';
      if (!savedAt || !isFinite(Date.parse(savedAt))) return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,requestId:p.requestId,code:'READBACK_FAILED'});
    } else {
      row = last + 1; savedAt = new Date().toISOString(); status = 'saved';
      var stored = [p.timestamp,p.name,p.dob,p.note,p.requestId,savedAt].map(promyanText_);
      sheet.getRange(row,1,1,6).setNumberFormat('@').setValues([stored]);
      SpreadsheetApp.flush();
    }
    // Success is returned ONLY after reading the row back and checking its data.
    var actual = sheet.getRange(row,1,1,6).getDisplayValues()[0];
    var expected = [p.timestamp,p.name,p.dob,p.note,p.requestId,savedAt];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,requestId:p.requestId,code:'READBACK_FAILED'});
    }
    return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:true,verified:true,requestId:p.requestId,status:status,row:row,savedAt:savedAt});
  } catch (error) {
    // Do not leak sheet identifiers or user data to a public response/log.
    return promyanJson_({protocol:PROMYAN_PROTOCOL,ok:false,requestId:p && p.requestId,code:'SAVE_NOT_CONFIRMED'});
  } finally {
    if (acquired) lock.releaseLock();
  }
}
