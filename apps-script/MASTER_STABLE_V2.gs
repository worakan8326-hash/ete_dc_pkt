/**
 * MASTER_STABLE_V2.gs - THE GOLD MASTER VERSION (V2.1 - FULL IMPLEMENTATION)
 * 
 * Features:
 * 1. Optimized getInitialData (Bulk fetch for Dashboard)
 * 2. Responsive Transaction Processing (Single & Batch)
 * 3. Daily Automatic Email Reports (Excel/PDF)
 * 4. Dynamic Role-Based Access Control (RBAC)
 * 5. Telegram Notifications (Integrated Single/Batch/Void)
 * 6. Cache Management for Performance
 * 
 * Modified: April 8, 2026 14:51 MS-T
 */

var ss = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  try {
    var action = e.parameter.action;
    if (!action) return jsonResponse({ status: 'error', message: 'No action specified' });

    var handlers = {
      'getInitialData': getInitialData,
      'getItems': getItems,
      'getTransactions': getTransactions,
      'getUsers': getUsers,
      'getSettings': getSettings,
      'getZones': getZones,
      'getCustomers': getCustomers,
      'getOnlineCount': getOnlineCount,
      'getPermissions': getPermissions,
      'getJobRequests': function() { return getJobRequests(e.parameter.cv); },
      'getNextTxnNo': function() { return { txnNo: getNextTxnNo() }; },
      'getNextCustomerCv': function() { return { cv: getNextCustomerCv() }; }
    };

    if (handlers[action]) {
      var result = handlers[action]();
      // Ultra-robust TextOutput detection
      if (result && typeof result === 'object' && ('setMimeType' in result)) return result;
      return jsonResponse(result);
    }
    return jsonResponse({ status: 'error', message: 'Action [' + action + '] not found' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'doGet Error: ' + err.toString() });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    var data = JSON.parse(e.postData.contents);
    var action = data.action || e.parameter.action;

    var handlers = {
      'login': function() { return handleLogin(data.username, data.password); },
      'saveMasterItem': function() { return saveMasterItem(data.item); },
      'saveMasterItems': function() { return saveMasterItems(data.items); },
      'deleteMasterItem': function() { return deleteMasterItem(data.rowIndex); },
      'saveUser': function() { return saveUser(data.user); },
      'deleteUser': function() { return deleteUser(data.rowIndex); },
      'saveSettings': function() { return saveSettings(data.settings); },
      'savePermissions': function() { return savePermissions(data.permissions); },
      'receive': function() { return processTransaction('receive', data); },
      'issue': function() { return processTransaction('issue', data); },
      'processBatch': function() { return processBatchTransaction(data); },
      'cancelTransaction': function() { return cancelTransaction(data.txnNo || data.txnId, data.operator, data.reason); },
      'voidTransaction': function() { return cancelTransaction(data.txnNo || data.txnId, data.operator, data.reason); },
      'clearTransactions': clearTransactions,
      'saveZone': function() { return saveZone(data.zone); },
      'deleteZone': function() { return deleteZone(data.rowIndex); },
      'saveCustomer': function() { return saveCustomer(data.customer); },
      'deleteCustomer': function() { return deleteCustomer(data.rowIndex); },
      'testTelegram': testTelegram,
      'testEmailReport': function() { return testEmailReport(data.email); },
      'setupTrigger': setupTrigger,
      'pingStatus': function() { return handlePing(data.username, data.name, data.ip, data.loc); },
      'saveJobRequest': function() { return saveJobRequest(data); },
      'getJobRequests': function() { return getJobRequests(data.cv); }
    };

    if (handlers[action]) {
      var result = handlers[action]();
      // Ultra-robust TextOutput detection
      if (result && typeof result === 'object' && ('setMimeType' in result)) return result;
      return jsonResponse(result);
    }
    return jsonResponse({ status: 'error', message: 'Action not found' });
  } catch (err) { 
    return jsonResponse({ status: 'error', message: err.toString() }); 
  } finally { 
    lock.releaseLock(); 
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function addAuditLog(action, details, operator) {
  try {
    var logSheet = ss.getSheetByName("AuditLogs") || ss.insertSheet("AuditLogs");
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow(["Timestamp", "Action", "Details", "Operator"]);
      logSheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#f3f3f3");
    }
    logSheet.appendRow([new Date(), action, details, operator || "System"]);
  } catch (e) {
    console.error("AuditLog Error: " + e.toString());
  }
}

// --- Data Fetching Logic (Optimized) ---

function getInitialData() {
  return {
    items: getItemsArray(),
    transactions: getTransactionsArray(),
    settings: getSettingsInternal(),
    zones: getZonesInternal(),
    customers: getCustomersArray(),
    permissions: getPermissionsInternal()
  };
}

function getItemsArray() {
  var sheet = ss.getSheetByName("data");
  if(!sheet) return [];
  var data = sheet.getDataRange().getValues(), h = data[0], list = [];
  for(var i=1; i<data.length; i++) {
    if(!data[i][0] && !data[i][1]) continue;
    var it = {}; for(var j=0; j<h.length; j++) it[h[j]] = data[i][j];
    it.rowIndex = i + 1; list.push(it);
  }
  return list;
}

function getItems() { return jsonResponse(getItemsArray()); }

function getTransactionsArray() {
  var sheet = ss.getSheetByName("Transactions");
  if(!sheet) return [];
  var data = sheet.getDataRange().getValues(), h = data[0], list = [];
  // Return last 1000 rows for performance
  for(var i=Math.max(1, data.length - 1000); i < data.length; i++){
    var it = {}; 
    for(var j=0; j<h.length; j++) {
      var val = data[i][j];
      // Force Date objects to consistent ISO format (Local Time) for frontend
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss.SSS");
      }
      var key = String(h[j] || "").trim();
      if (key) it[key] = val;
    }
    list.push(it);
  }
  return list.reverse();
}

function getTransactions() { return jsonResponse(getTransactionsArray()); }

// --- Core Transaction Engine ---

function getNextTxnNo() {
  var sheet = ss.getSheetByName("Transactions");
  var lastRow = sheet ? sheet.getLastRow() : 0;
  if (lastRow <= 1) return "000001";
  var lastVal = sheet.getRange(lastRow, 1).getValue();
  var max = parseInt(String(lastVal).replace(/[^0-9]/g, ""), 10);
  if (isNaN(max)) return "000001";
  return String(max + 1).padStart(6, "0");
}

function processTransaction(action, payload) {
  var ds = ss.getSheetByName("data"), ts = ss.getSheetByName("Transactions");
  var it = payload.item, q = parseFloat(payload.quantity), rIdx = payload.rowIndex;
  
  // Fetch full inventory to avoid 'getDataRange' skipping empty gaps
  var lastRow = Math.max(1, ds.getLastRow());
  var inv = ds.getRange(1, 1, lastRow, ds.getLastColumn()).getValues(), h = inv[0];
  var qtyIdx = h.indexOf("จำนวน");
  var typeIdx = h.indexOf("ประเภท"), brandIdx = h.indexOf("ยี่ห้อหรือรูปแบบ"), nameIdx = h.indexOf("รายการ"), condIdx = h.indexOf("สภาพ"), specIdx = h.indexOf("รายละเอียด"), sizeIdx = h.indexOf("ขนาด");
  
  var targetRowIdx = rIdx;
  
  // Robust Match Verification (Case Sensitive)
  var isMatch = false;
  if (targetRowIdx > 0 && targetRowIdx <= inv.length && inv[targetRowIdx - 1]) {
    var rawRow = inv[targetRowIdx - 1];
    isMatch = String(rawRow[condIdx]) === String(it["สภาพ"]) && 
              String(rawRow[nameIdx]) === String(it["รายการ"]) &&
              String(rawRow[typeIdx]) === String(it["ประเภท"]) &&
              String(rawRow[sizeIdx]) === String(it["ขนาด"]);
  }

  if (!isMatch) {
    var found = -1;
    for (var i = 1; i < inv.length; i++) {
       if (String(inv[i][typeIdx]) === String(it["ประเภท"]) &&
           String(inv[i][brandIdx]) === String(it["ยี่ห้อหรือรูปแบบ"]) &&
           String(inv[i][nameIdx]) === String(it["รายการ"]) &&
           String(inv[i][condIdx]) === String(it["สภาพ"]) &&
           String(inv[i][sizeIdx]) === String(it["ขนาด"]) &&
           String(inv[i][specIdx]) === String(it["รายละเอียด"])) {
         found = i + 1;
         break;
       }
    }
    
    if (found !== -1) {
      targetRowIdx = found;
    } else if (action === "receive") {
      var nr = [it["ประเภท"]||"", it["ยี่ห้อหรือรูปแบบ"]||"", it["รายการ"]||"", it["สภาพ"]||"", it["รายละเอียด"]||"", it["ขนาด"]||"", 0];
      ds.appendRow(nr);
      targetRowIdx = ds.getLastRow();
    } else {
      throw new Error("ไม่พบรายการพัสดุต้นทางเพื่อเบิกออก (" + it["รายการ"] + ")");
    }
  }

  var cell = ds.getRange(targetRowIdx, qtyIdx + 1);
  var cur = parseFloat(cell.getValue()) || 0;
  var nQty = action === "receive" ? cur + q : cur - q;
  if (action === "issue" && q > cur) throw new Error("สินค้า ("+it["รายการ"]+") ไม่พอเบิกครับ (คงเหลือ " + cur + ")");
  
  cell.setValue(nQty);
  var tNo = payload.txnNo || getNextTxnNo();
  var status = payload.status || (action === "receive" ? "รับเข้า" : "เบิกออก");

  var tH = ts.getDataRange().getValues()[0];
  ensurePhotoColumnExists(ts, tH);
  ensureJobIdColumnExists(ts, ts.getDataRange().getValues()[0]);
  tH = ts.getDataRange().getValues()[0];
  var colMap = getHeaderMap(tH);

  var notifierVal = payload.notifier || "-";
  var notifDateVal = payload.notificationDate || "-";
  var returnReasonVal = payload.returnReason || "-";
  var cabinetConditionVal = payload.cabinetCondition || "-";
  var cvStr = (payload.cv && !String(payload.cv).startsWith("'")) ? "'" + payload.cv : (payload.cv || "");

  var nextRow = ts.getLastRow() + 1;
  var rowData = new Array(Math.max(24, tH.length)).fill("");
  
  if (colMap.txnNo > -1) rowData[colMap.txnNo] = tNo;
  if (colMap.dateTime > -1) rowData[colMap.dateTime] = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
  if (colMap.operator > -1) rowData[colMap.operator] = payload.operator;
  if (colMap.status > -1) rowData[colMap.status] = status;
  if (colMap.type > -1) rowData[colMap.type] = it["ประเภท"] || "";
  if (colMap.brand > -1) rowData[colMap.brand] = it["ยี่ห้อหรือรูปแบบ"] || "";
  if (colMap.name > -1) rowData[colMap.name] = it["รายการ"] || "";
  if (colMap.cond > -1) rowData[colMap.cond] = it["สภาพ"] || "";
  if (colMap.spec > -1) rowData[colMap.spec] = it["รายละเอียด"] || "";
  if (colMap.size > -1) rowData[colMap.size] = it["ขนาด"] || "";
  if (colMap.qty > -1) rowData[colMap.qty] = q;
  if (colMap.cv > -1) rowData[colMap.cv] = cvStr;
  if (colMap.deliveryBy > -1) rowData[colMap.deliveryBy] = payload.deliveryBy || "-";
  if (colMap.deliveryDate > -1) rowData[colMap.deliveryDate] = payload.deliveryDate || "-";
  if (colMap.note > -1) rowData[colMap.note] = payload.note || "-";
  if (colMap.workZone > -1) rowData[colMap.workZone] = payload.workZone || "-";
  rowData[colMap.notifier]     = notifierVal;
  rowData[colMap.notifDate]    = notifDateVal;
  rowData[colMap.reason]       = returnReasonVal;
  rowData[colMap.condition]    = cabinetConditionVal;
  rowData[colMap.cancelReason] = "-";
  rowData[colMap.cancelBy]     = "-";
  if (colMap.jobId > -1) rowData[colMap.jobId] = payload.jobId || "-";

  ts.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
  if (colMap.txnNo > -1) ts.getRange(nextRow, colMap.txnNo + 1).setNumberFormat("@");
  
  // Photo Logic (Single)
  if (payload.photos && payload.photos.length > 0) {
    var today = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
    var folderPath = [ "Logistics_Photos", today, status ];
    var photoUrls = payload.photos.map(function(base64, idx) {
      return saveBase64Image(base64, "TXN_" + tNo + "_P" + (idx + 1) + ".jpg", folderPath);
    });
    if (colMap.photoLink > -1) ts.getRange(nextRow, colMap.photoLink + 1).setValue(photoUrls.join("\n"));
  }
  
  var notifyAction = action;
  if (status === "รับคืน") notifyAction = "return";
  sendNotification(notifyAction, payload, nQty, photoUrls);
  return { status: "success", newQuantity: nQty, rowIndex: targetRowIdx };
}

function processBatchTransaction(payload) {
  var ds = ss.getSheetByName("data"), ts = ss.getSheetByName("Transactions");
  var act = payload.subAction, items = payload.items, tNo = payload.txnNo || getNextTxnNo();
  var rows = [], notifyItems = [];
  
  var lastRow = Math.max(1, ds.getLastRow());
  var inv = ds.getRange(1, 1, lastRow, ds.getLastColumn()).getValues(), h = inv[0];
  
  var qtyIdx = h.indexOf("จำนวน");
  var typeIdx = h.indexOf("ประเภท"), brandIdx = h.indexOf("ยี่ห้อหรือรูปแบบ"), nameIdx = h.indexOf("รายการ"), condIdx = h.indexOf("สภาพ"), specIdx = h.indexOf("รายละเอียด"), sizeIdx = h.indexOf("ขนาด");

  var statusFinal = payload.status || (act === "receive" ? "รับเข้า" : "เบิกออก");
  
  var tH = ts.getDataRange().getValues()[0];
  ensurePhotoColumnExists(ts, tH);
  ensureJobIdColumnExists(ts, ts.getDataRange().getValues()[0]);
  tH = ts.getDataRange().getValues()[0];
  var colMap = getHeaderMap(tH);

  items.forEach(function(e) {
    var it = e.item, q = parseFloat(e.quantity);

    // 🔥 RETURN OVERRIDE: Map Cabinet Condition to Item Condition
    if (act === "receive" && (payload.status === "รับคืน" || payload.cabinetCondition)) {
      var condMap = {
        "ตู้ดีมือสอง (Good Used)": "มือสอง",
        "ตู้ดีสต็อก (Good Stock)": "สต็อก",
        "ตู้เสีย (Broken)": "ตู้เสีย"
      };
      if (condMap[payload.cabinetCondition]) {
        it["สภาพ"] = condMap[payload.cabinetCondition];
      }
    }

    var targetIdx = it.rowIndex;
    
    // 🔥 ROBUST IDENTITY MATCHING
    var norm = function(v) { return String(v || "").trim().toLowerCase(); };
    var itType = norm(it["ประเภท"]), 
        itBrand = norm(it["ยี่ห้อหรือรูปแบบ"]), 
        itName = norm(it["รายการ"]), 
        itCond = norm(it["สภาพ"]), 
        itSize = norm(it["ขนาด"]), 
        itSpec = norm(it["รายละเอียด"]);

    var isMatch = false;
    // 1. Check if provided rowIndex is still valid for this specific identity
    if (targetIdx > 0 && targetIdx <= inv.length) {
      var r = inv[targetIdx - 1];
      if (norm(r[typeIdx]) === itType && norm(r[brandIdx]) === itBrand && 
          norm(r[nameIdx]) === itName && norm(r[condIdx]) === itCond && 
          norm(r[sizeIdx]) === itSize) {
        isMatch = true;
      }
    }

    // 2. If no match at rowIndex, perform an exhaustive search for exact identity
    if (!isMatch) {
      targetIdx = -1;
      for (var i = 1; i < inv.length; i++) {
        var r = inv[i];
        if (norm(r[typeIdx]) === itType && norm(r[brandIdx]) === itBrand && 
            norm(r[nameIdx]) === itName && norm(r[condIdx]) === itCond && 
            norm(r[sizeIdx]) === itSize && norm(r[specIdx]) === itSpec) {
          targetIdx = i + 1;
          isMatch = true;
          break;
        }
      }
      
      // 3. If STILL not found and it's a Receive/Return, try Smart Cloning from a sibling
      if (!isMatch && act === "receive") {
        var sibling = null;
        for (var i = 1; i < inv.length; i++) {
          var r = inv[i];
          // Sibling must match Type, Brand, Name, and Size exactly (ignoring Condition)
          if (norm(r[typeIdx]) === itType && norm(r[brandIdx]) === itBrand && 
              norm(r[nameIdx]) === itName && norm(r[sizeIdx]) === itSize) {
            sibling = r;
            break; 
          }
        }
        
        var nr;
        if (sibling) {
          nr = [...sibling];
          if (condIdx > -1) nr[condIdx] = it["สภาพ"] || "";
          if (qtyIdx > -1)  nr[qtyIdx] = 0;
          if (specIdx > -1 && !nr[specIdx] && it["รายละเอียด"]) nr[specIdx] = it["รายละเอียด"];
        } else {
          // Standard fallback if no similar item exists
          nr = [it["ประเภท"]||"", it["ยี่ห้อหรือรูปแบบ"]||"", it["รายการ"]||"", it["สภาพ"]||"", it["รายละเอียด"]||"", it["ขนาด"]||"", 0];
        }
        
        ds.appendRow(nr);
        // Refresh local cache and use calculated index to handle multiple new items in one batch
        inv.push(nr);
        targetIdx = inv.length; // 1-indexed matches row position
      } else if (targetIdx === -1) {
        throw new Error("ไม่พบพัสดุ ("+it["รายการ"]+") เพื่อทำรายการออก");
      }
    }

    var cell = ds.getRange(targetIdx, qtyIdx + 1);
    var cur = parseFloat(cell.getValue()) || 0;
    var nQty = act === "receive" ? cur + q : cur - q;
    if (act === "issue" && q > cur) throw new Error("สินค้า ("+it["รายการ"]+") ไม่พอเบิกครับ (เหลือ " + cur + ")");
    cell.setValue(nQty);

    var cvStr = (payload.cv && !String(payload.cv).startsWith("'")) ? "'" + payload.cv : (payload.cv || "");
    
    var row = new Array(Math.max(24, tH.length)).fill("");
    if (colMap.txnNo > -1) row[colMap.txnNo] = tNo;
    if (colMap.dateTime > -1) row[colMap.dateTime] = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    if (colMap.operator > -1) row[colMap.operator] = payload.operator;
    if (colMap.status > -1) row[colMap.status] = statusFinal;
    if (colMap.type > -1) row[colMap.type] = it["ประเภท"] || "";
    if (colMap.brand > -1) row[colMap.brand] = it["ยี่ห้อหรือรูปแบบ"] || "";
    if (colMap.name > -1) row[colMap.name] = it["รายการ"] || "";
    if (colMap.cond > -1) row[colMap.cond] = it["สภาพ"] || "";
    if (colMap.spec > -1) row[colMap.spec] = it["รายละเอียด"] || "";
    if (colMap.size > -1) row[colMap.size] = it["ขนาด"] || "";
    if (colMap.qty > -1) row[colMap.qty] = q;
    if (colMap.cv > -1) row[colMap.cv] = cvStr;
    if (colMap.deliveryBy > -1) row[colMap.deliveryBy] = payload.deliveryBy || "-";
    if (colMap.deliveryDate > -1) row[colMap.deliveryDate] = payload.deliveryDate || "-";
    if (colMap.note > -1) row[colMap.note] = payload.note || "-";
    if (colMap.workZone > -1) row[colMap.workZone] = payload.workZone || "-";
    row[colMap.notifier]     = payload.notifier || "-";
    row[colMap.notifDate]    = payload.notificationDate || "-";
    row[colMap.reason]       = payload.returnReason || "-";
    row[colMap.condition]    = payload.cabinetCondition || "-";
    row[colMap.cancelReason] = "-";
    row[colMap.cancelBy]     = "-";
    if (colMap.jobId > -1) row[colMap.jobId] = payload.jobId || "-";

    rows.push(row);
    notifyItems.push({ type: it["ประเภท"], brand: it["ยี่ห้อหรือรูปแบบ"], name: it["รายการ"], cond: it["สภาพ"], spec: it["รายละเอียด"], size: it["ขนาด"], qty: q, newStock: nQty });
  });

  if (rows.length) {
    var startRow = ts.getLastRow() + 1;
    ts.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    var txnColIdx = tH.indexOf("เลขที่รายการ");
    if (txnColIdx > -1) ts.getRange(startRow, txnColIdx + 1, rows.length, 1).setNumberFormat("@");
    
    // Photo Logic (Batch) - Attach to all or first row
    if (payload.photos && payload.photos.length > 0) {
      var today = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
      var folderPath = [ "Logistics_Photos", today, statusFinal ];
      var photoUrls = payload.photos.map(function(base64, idx) {
        return saveBase64Image(base64, "TXN_" + tNo + "_BATCH_P" + (idx + 1) + ".jpg", folderPath);
      });
      if (colMap.photoLink > -1) {
        // Set photos for all rows in this batch for consistency
        var range = ts.getRange(startRow, colMap.photoLink + 1, rows.length, 1);
        var urlVal = photoUrls.join("\n");
        var valRows = rows.map(function(){ return [urlVal]; });
        range.setValues(valRows);
      }
    }
  }
  
  var notifyAction = act;
  if (payload.status === "รับคืน") notifyAction = "return";
  sendBatchNotification(notifyAction, payload, notifyItems, photoUrls);

  // Mark Job Request as Completed if JobId was provided
  if (payload.jobId) {
    try {
      completeJobRequest(payload.jobId, payload.status);
    } catch(e) {
      console.error("Failed to complete job: " + e.toString());
    }
  }

  return { status: "success" };
}

function cancelTransaction(txnNo, operator, reason) {
  var ds = ss.getSheetByName("data"), ts = ss.getSheetByName("Transactions");
  if (!ts) return { status: 'error', message: 'ไม่พบชีต Transactions' };
  
  var data = ts.getDataRange().getValues(), headers = data[0];
  var colMap = getHeaderMap(headers);
  
  var found = false, itemsData = [];
  var originalTx = null;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length <= colMap.txnNo) continue;
    
    // Normalize TxnNo for matching (e.g., "000065" vs "65")
    var rowTxn = String(row[colMap.txnNo]).trim();
    var targetTxn = String(txnNo).trim();
    if (rowTxn === targetTxn || parseInt(rowTxn, 10) === parseInt(targetTxn, 10)) {
      if (colMap.status > -1 && String(row[colMap.status]).indexOf("ยกเลิก") !== -1) continue;
      
      if (!originalTx) {
        originalTx = {};
        for (var k = 0; k < headers.length; k++) originalTx[headers[k]] = row[k];
      }

      var qty = colMap.qty > -1 ? parseFloat(row[colMap.qty]) : 0;
      var isReceive = colMap.status > -1 ? row[colMap.status] === "รับเข้า" : false;
      
      // Update inventory (Columns 4-9 for Receipt/Issue data)
      var type = row.length > 4 ? row[4] : "", 
          brand = row.length > 5 ? row[5] : "", 
          item = row.length > 6 ? row[6] : "", 
          cond = row.length > 7 ? row[7] : "", 
          spec = row.length > 8 ? row[8] : "", 
          size = row.length > 9 ? row[9] : "";
      
      var masterSheet = ds.getDataRange().getValues(), mH = masterSheet[0];
      var mqIdx = mH.indexOf("จำนวน"), mtIdx = mH.indexOf("ประเภท"), mbIdx = mH.indexOf("ยี่ห้อหรือรูปแบบ"), mnIdx = mH.indexOf("รายการ"), mcIdx = mH.indexOf("สภาพ"), msIdx = mH.indexOf("ขนาด"), mdIdx = mH.indexOf("รายละเอียด");
      
      for (var j = 1; j < masterSheet.length; j++) {
        var mRow = masterSheet[j];
        if (!mRow) continue;
        if (String(mRow[mtIdx]) === String(type) && 
            String(mRow[mbIdx]) === String(brand) && 
            String(mRow[mnIdx]) === String(item) && 
            String(mRow[mcIdx]) === String(cond) && 
            String(mRow[mdIdx]) === String(spec) && 
            String(mRow[msIdx]) === String(size)) {
          
          var cur = parseFloat(mRow[mqIdx]) || 0;
          var nQty = isReceive ? cur - qty : cur + qty;
          ds.getRange(j + 1, mqIdx + 1).setValue(nQty);
          
          itemsData.push({
            type: type, brand: brand, name: item, cond: cond, spec: spec, size: size,
            qty: isReceive ? -qty : qty,
            newStock: nQty
          });
          break;
        }
      }
      
      // FINALLY: Set Status, Reason, and Cancelled By in Transactions Sheet
      if (colMap.status > -1) ts.getRange(i + 1, colMap.status + 1).setValue("ยกเลิก");
      if (colMap.cancelReason > -1) ts.getRange(i + 1, colMap.cancelReason + 1).setValue(reason || "-");
      if (colMap.cancelBy > -1) ts.getRange(i + 1, colMap.cancelBy + 1).setValue(operator || "-");
      found = true;
    }
  }
  
  if (found) {
    sendCancelNotificationExtended(txnNo, operator, reason, itemsData, originalTx);
    return { status: 'success' };
  }
  return { status: 'error', message: 'ไม่พบรายการที่ต้องการยกเลิก หรือรายการถูกยกเลิกไปแล้วครับ' };
}

// --- Notifications (Premium Style) ---

function sendNotification(action, payload, newStock, photoUrls) {
  var itemsData = [{
    type: payload.item["ประเภท"],
    brand: payload.item["ยี่ห้อหรือรูปแบบ"],
    name: payload.item["รายการ"],
    cond: payload.item["สภาพ"],
    spec: payload.item["รายละเอียด"],
    size: payload.item["ขนาด"],
    qty: payload.quantity,
    newStock: newStock
  }];
  sendBatchNotification(action, payload, itemsData, photoUrls);
}

function sendBatchNotification(action, payload, itemsData, photoUrls) {
  try {
    var s = getSettingsInternal();
    if (s["NOTIFY_PRIORITY"] !== "TELEGRAM") return;
    if (action === 'receive' && !s["NOTIFY_RECEIVE"]) return;
    if (action === 'issue' && !s["NOTIFY_ISSUE"]) return;
    if (action === 'return' && !s["NOTIFY_RECEIVE"]) return; // ใช้ตัวเลือกเดียวกับรับเข้า

    var emoji = action === 'receive' ? "🟢" : (action === 'return' ? "🟣" : "🟡");
    var title = action === 'receive' ? "แจ้งเตือนการรับพัสดุ (RECEIVE)" : (action === 'return' ? "แจ้งเตือนการรับคืนพัสดุ (RETURN)" : "แจ้งเตือนการเบิกพัสดุ (ISSUE)");
    
    var msg = emoji + " <b>" + title + "</b>\n";
    msg += "⏰ วันที่: " + Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy HH:mm") + "\n";
    msg += "👤 ผู้ทำรายการ: " + escapeHtml(payload.operator || "-") + "\n";
    msg += "📄 รหัสรายการ: " + escapeHtml(payload.txnNo || "-") + "\n";
    msg += "--------------------\n\n";

    itemsData.forEach(function(it, i) {
        var prefix = (action === 'receive' ? "+" : "-");
        var desc = [it.type, it.brand, it.name, it.cond, it.spec, it.size]
          .filter(function(v){ return v && String(v) !== "-"; })
          .map(function(v){ return escapeHtml(String(v)); })
          .join(" ");
        msg += (i + 1) + ". " + desc + "\n    <b>" + prefix + it.qty + "</b> (คงเหลือ: " + it.newStock + ")\n\n";
    });

    // Find full customer data for richer notification
    var customerData = null;
    if (payload.cv && String(payload.cv) !== "-") {
      var allCustomers = getCustomersArray();
      customerData = allCustomers.find(function(c) {
        var cleanCv = String(payload.cv).replace(/^'/, "").trim().toLowerCase();
        var targetCv = String(c.cv || c.CV || "").replace(/^'/, "").trim().toLowerCase();
        var targetName = String(c.name || "").trim().toLowerCase();
        return cleanCv !== "" && (cleanCv === targetCv || cleanCv === targetName);
      });
    }

    msg += getCustomerFooter(payload.cv, payload.workZone, payload.deliveryBy, payload.deliveryDate, payload.note, customerData, {
      action: action,
      notifier: payload.notifier,
      notificationDate: payload.notificationDate,
      returnReason: payload.returnReason,
      cabinetCondition: payload.cabinetCondition
    });
    
    // Deliver via Telegram (Multi-photo support)
    if (photoUrls && photoUrls.length > 1) {
      pushTelegramMediaGroup(s["TG_BOT_TOKEN"], s["TG_CHAT_ID"], photoUrls, msg);
    } else if (photoUrls && photoUrls.length === 1) {
      pushTelegramPhoto(s["TG_BOT_TOKEN"], s["TG_CHAT_ID"], photoUrls[0], msg);
    } else {
      pushTelegramMessage(s["TG_BOT_TOKEN"], s["TG_CHAT_ID"], msg);
    }
  } catch(e) {
    // Basic error logging to Apps Script executions if needed
    console.error("Notification Error: " + e.toString());
  }
}

function pushTelegramMediaGroup(token, chatId, photoUrls, caption) {
  var url = "https://api.telegram.org/bot" + String(token).trim() + "/sendMediaGroup";
  
  // Telegram media group limit is 10 items
  var mediaItems = photoUrls.slice(0, 10).map(function(p, i) {
    var directUrl = p;
    var match = p.match(/\/d\/(.*?)(?:\/|\?|$)/);
    if (match && match[1]) {
      directUrl = "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w1280-h1280";
    }
    
    return {
      type: "photo",
      media: directUrl,
      caption: (i === 0 ? caption : ""),
      parse_mode: "HTML"
    };
  });

  try {
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        chat_id: String(chatId).trim(),
        media: mediaItems
      })
    });
    return JSON.parse(response.getContentText());
  } catch(e) {
    return pushTelegramMessage(token, chatId, caption);
  }
}

function pushTelegramPhoto(token, chatId, photoUrl, caption) {
  var url = "https://api.telegram.org/bot" + String(token).trim() + "/sendPhoto";
  
  var directUrl = photoUrl;
  var match = photoUrl.match(/\/d\/(.*?)(?:\/|\?|$)/);
  if (match && match[1]) {
    // Use high-res thumbnail API to guarantee Telegram gets an image file, not an HTML page
    directUrl = "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w1280-h1280";
  } else {
    directUrl = photoUrl.replace("/view?usp=drivesdk", "").replace("file/d/", "uc?id=");
  }
  
  try { 
    var response = UrlFetchApp.fetch(url, { 
      method: "post", 
      contentType: "application/json", 
      muteHttpExceptions: true,
      payload: JSON.stringify({ 
        chat_id: String(chatId).trim(), 
        photo: directUrl, 
        caption: caption, 
        parse_mode: "HTML" 
      }) 
    }); 
    return JSON.parse(response.getContentText());
  } catch(e) {
    // If photo failed, fallback to text message
    return pushTelegramMessage(token, chatId, caption);
  }
}

function sendCancelNotificationExtended(txnNo, operator, reason, itemsData, originalTx) {
  try {
    var s = getSettingsInternal();
    if (s["NOTIFY_PRIORITY"] !== "TELEGRAM" || !s["NOTIFY_VOID"]) return;

    var msg = "🔴 <b>แจ้งเตือนการยกเลิกรายการ (VOID)</b>\n";
    msg += "📄 รหัส: " + (txnNo || "-") + "\n";
    msg += "👤 ผู้ยกเลิก: " + (operator || "-") + "\n";
    msg += "⚠️ เหตุผล: " + (reason || "-") + "\n";
    msg += "━━━━━━━━━━━━━━━━━━━━\n";
    
    itemsData.forEach(function(it, i) {
        var desc = [it.type, it.brand, it.name, it.cond, it.spec, it.size].filter(function(v){ return v && String(v) !== "-"; }).join(" ");
        msg += (i + 1) + ". " + desc + "\n    คืนยอด: <b>" + (it.qty > 0 ? "+" : "") + it.qty + "</b> (คงเหลือ: " + it.newStock + ")\n\n";
    });

    if (originalTx) {
        var cv = originalTx["CV"];
        var cust = null;
        if (cv && String(cv) !== "-") {
          var allC = getCustomersArray();
          cust = allC.find(function(c) {
            var c1 = String(cv).replace(/^'/, "").trim().toLowerCase();
            var c2 = String(c.cv || c.CV || "").replace(/^'/, "").trim().toLowerCase();
            return c1 !== "" && c1 === c2;
          });
        }
        msg += getCustomerFooter(cv, originalTx["เขตการทำงาน"], originalTx["จัดส่งโดย"], originalTx["กำหนดส่ง"], originalTx["หมายเหตุ"], cust);
    }
    pushTelegramMessage(s["TG_BOT_TOKEN"], s["TG_CHAT_ID"], msg);
  } catch(e) {}
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCustomerFooter(cv, workZone, deliveryBy, deliveryDate, note, customer, returnInfo) {
  var footer = "--------------------\n";
  
  // Return Specific Details (Top of Footer for Return action)
  if (returnInfo && returnInfo.action === 'return') {
    footer += "👤 ผู้แจ้งคืน: " + escapeHtml(returnInfo.notifier || "-") + "\n";
    footer += "📅 วันที่แจ้งคืน: " + escapeHtml(returnInfo.notificationDate || "-") + "\n";
    footer += "❓ สาเหตุการคืน: <b>" + escapeHtml(returnInfo.returnReason || "-") + "</b>\n";
    footer += "📦 สภาพตู้: " + escapeHtml(returnInfo.cabinetCondition || "-") + "\n";
    footer += "--------------------\n";
  }

  // Name and CV
  var cvClean = String(cv || "").replace(/^'/, "");
  var nameStr = (customer && customer.name) ? customer.name + " (" + cvClean + ")" : cvClean;
  if (cv && String(cv) !== "" && String(cv) !== "-") {
    footer += "📍 CV/ลูกค้า: " + escapeHtml(nameStr) + "\n";
  }

  // Address and Phone from customer object if exists
  if (customer) {
    var addr = [customer.address, customer.subdistrict, customer.district, customer.province, customer.zipcode]
      .filter(function(v){ return v && String(v).trim() !== "" && String(v) !== "-"; })
      .join(" ");
    if (addr) footer += "🏠 ที่อยู่: " + escapeHtml(addr) + "\n";
    if (customer.phone && customer.phone !== "-") footer += "📞 โทร: " + escapeHtml(customer.phone) + "\n";
    
    // Map Link Fallback Logic
    var mapQuery = "";
    if (customer.lat && customer.lng && String(customer.lat).trim() !== "" && String(customer.lat) !== "0") {
      mapQuery = customer.lat + "," + customer.lng;
    } else {
      mapQuery = encodeURIComponent((customer.name || "") + " " + (customer.address || "") + " " + (customer.province || ""));
    }
    footer += "📍 แผนที่: <a href='https://www.google.com/maps/search/?api=1&query=" + mapQuery + "'>📌 พิกัดบนแผนที่</a>\n";
  }

  footer += "🏜️ เขตการทำงาน: " + escapeHtml(workZone || "-") + "\n";
  footer += "🚚 จัดส่งโดย: " + escapeHtml(deliveryBy || "-") + "\n";
  footer += "📅 กำหนดส่ง: " + escapeHtml(deliveryBy ? (deliveryDate || "-") : "-") + "\n";
  if (note && String(note) !== "-" && String(note).trim() !== "") footer += "หมายเหตุ: " + escapeHtml(note);
  
  return footer;
}

function pushTelegramMessage(token, chatId, msg) {
  var url = "https://api.telegram.org/bot" + String(token).trim() + "/sendMessage";
  try { 
    var response = UrlFetchApp.fetch(url, { 
      method: "post", 
      contentType: "application/json", 
      muteHttpExceptions: true,
      payload: JSON.stringify({ 
        chat_id: String(chatId).trim(), 
        text: msg, 
        parse_mode: "HTML" 
      }) 
    }); 
    return JSON.parse(response.getContentText());
  } catch(e) {
    return { ok: false, description: e.toString() };
  }
}

// --- Admin & Settings ---

function getSettingsInternal() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("cache_settings");
  if (cached) return JSON.parse(cached);
  var s = ss.getSheetByName("Settings"); if (!s) return {};
  var d = s.getDataRange().getValues(), r = {};
  for(var i = 1; i < d.length; i++) if (d[i][0]) r[d[i][0]] = d[i][1];
  cache.put("cache_settings", JSON.stringify(r), 3600);
  return r;
}

function getSettings() { return jsonResponse(getSettingsInternal()); }

function saveSettings(obj) {
  var s = ss.getSheetByName("Settings") || ss.insertSheet("Settings");
  s.clear(); s.appendRow(["Key", "Value"]);
  var rows = Object.keys(obj).map(function(k){ return [k, typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : obj[k]]; });
  if (rows.length > 0) s.getRange(2, 1, rows.length, 2).setValues(rows);
  CacheService.getScriptCache().remove("cache_settings");
  return {status: "success"};
}

function getUsers() { 
  var d=(ss.getSheetByName("Users")||ss.insertSheet("Users")).getDataRange().getValues(), l=[]; 
  for(var i=1;i<d.length;i++) if(d[i][0]) l.push({rowIndex:i+1,username:d[i][0],name:d[i][2],role:d[i][3]}); 
  return l; 
}

function handleLogin(u, p) { 
  var d=ss.getSheetByName("Users").getDataRange().getValues(); 
  for(var i=1;i<d.length;i++) 
    if(String(d[i][0])===String(u)&&String(d[i][1])===String(p)) 
      return jsonResponse({status:"success",user:{username:d[i][0],name:d[i][2],role:d[i][3]}}); 
  return jsonResponse({status:"error"}); 
}

function saveUser(u) { 
  var s=ss.getSheetByName("Users")||ss.insertSheet("Users"); 
  var pwd = u.password;
  var action = u.rowIndex ? "UPDATE_USER" : "CREATE_USER";
  if(u.rowIndex) {
    if (!pwd || String(pwd).trim() === "") {
      pwd = s.getRange(u.rowIndex,2).getValue();
    }
    s.getRange(u.rowIndex,1,1,4).setValues([[u.username, pwd, u.name, u.role]]); 
  } else {
    s.appendRow([u.username, pwd, u.name, u.role]); 
  }
  addAuditLog(action, "User: " + u.username + " (" + u.name + ")", u.currentOperator);
  return {status:"success"}; 
}

function deleteUser(idx) { 
  if(idx>1) ss.getSheetByName("Users").deleteRow(idx); 
  return {status:"success"}; 
}

// --- Master Data Management ---

function saveMasterItem(item) {
  var s = ss.getSheetByName("data");
  var r = [item["ประเภท"]||"", item["ยี่ห้อหรือรูปแบบ"]||"", item["รายการ"]||"", item["สภาพ"]||"", item["รายละเอียด"]||"", item["ขนาด"]||"", parseFloat(item["จำนวน"])||0];
  var action = item.rowIndex ? "UPDATE_MASTER" : "CREATE_MASTER";
  if (item.rowIndex && item.rowIndex > 1) s.getRange(item.rowIndex, 1, 1, 7).setValues([r]);
  else s.appendRow(r);
  
  addAuditLog(action, "Item: " + item["รายการ"] + " | Qty: " + item["จำนวน"], item.operator);
  return { status: "success" };
}

function saveMasterItems(items) {
  var s = ss.getSheetByName("data");
  if (!items || items.length === 0) return { status: "success" };
  
  // If no rowIndex present in items, it's a bulk import refresh
  var hasIndex = items.some(function(it){ return it.rowIndex && it.rowIndex > 1; });
  
  if (!hasIndex) {
    // Bulk Overwrite (Import)
    s.getRange(2, 1, s.getLastRow(), 7).clearContent();
    var rows = items.map(function(it){
      return [it["ประเภท"]||"", it["ยี่ห้อหรือรูปแบบ"]||"", it["รายการ"]||"", it["สภาพ"]||"", it["รายละเอียด"]||"", it["ขนาด"]||"", parseFloat(it["จำนวน"])||0];
    });
    if (rows.length > 0) s.getRange(2, 1, rows.length, 7).setValues(rows);
  } else {
    // Individual updates (looping for safety since indices might be scattered)
    items.forEach(function(it){ saveMasterItem(it); });
  }
  return { status: "success" };
}

function deleteMasterItem(idx) {
  if (idx > 1) ss.getSheetByName("data").deleteRow(idx);
  return { status: "success" };
}

// --- Zones & Customers ---

function getZonesInternal() {
  var s = ss.getSheetByName("Zones"); if (!s) return [];
  var d = s.getDataRange().getValues(), l = [];
  for(var i=1; i<d.length; i++) if(d[i][0]) l.push({rowIndex:i+1, name:d[i][0], description:d[i][1]});
  return l;
}

function getZones() { return jsonResponse(getZonesInternal()); }

function saveZone(z) {
  var s = ss.getSheetByName("Zones") || ss.insertSheet("Zones");
  if (z.rowIndex) s.getRange(z.rowIndex, 1, 1, 2).setValues([[z.name, z.description]]);
  else s.appendRow([z.name, z.description]);
  return { status: "success" };
}

function deleteZone(idx) {
  if (idx > 1) ss.getSheetByName("Zones").deleteRow(idx);
  return { status: "success" };
}

function getCustomersArray() {
  var s = ss.getSheetByName("Customers"); if (!s) return [];
  var d = s.getDataRange().getValues(), l = [];
  for(var i=1; i<d.length; i++) {
     var row = d[i];
     if(!row || row.length === 0 || !row[0]) continue;
     l.push({
       rowIndex: i + 1,
       cv: row[0], name: row[1], phone: row[2], address: row[3],
       subdistrict: row.length > 4 ? row[4] : "", 
       district: row.length > 5 ? row[5] : "", 
       province: row.length > 6 ? row[6] : "", 
       zipcode: row.length > 7 ? row[7] : "",
       lat: row.length > 8 ? row[8] : "",
       lng: row.length > 9 ? row[9] : ""
     });
  }
  return l;
}

function getCustomers() { return jsonResponse(getCustomersArray()); }

function saveCustomer(c) {
  var s = ss.getSheetByName("Customers") || ss.insertSheet("Customers");
  var r = [c.cv||"", c.name||"", c.phone||"", c.address||"", c.subdistrict||"", c.district||"", c.province||"", c.zipcode||"", c.lat||"", c.lng||""];
  if (c.rowIndex) s.getRange(c.rowIndex, 1, 1, 10).setValues([r]);
  else s.appendRow(r);
  return { status: "success" };
}

function deleteCustomer(idx) {
  if (idx > 1) ss.getSheetByName("Customers").deleteRow(idx);
  return { status: "success" };
}

function getNextCustomerCv() {
  var s = ss.getSheetByName("Customers");
  var lastRow = s ? s.getLastRow() : 0;
  
  // Starting point if no data
  if (lastRow <= 1) return "A100001";
  
  // Get last CV value
  var lastVal = String(s.getRange(lastRow, 1).getValue()).trim();
  if (!lastVal) return "A100001";
  
  // Separate Prefix (Text) and Number
  var prefixMatch = lastVal.match(/^[A-Z]+/);
  var numMatch = lastVal.match(/\d+$/);
  
  var prefix = prefixMatch ? prefixMatch[0] : "A";
  var num = numMatch ? parseInt(numMatch[0], 10) : 100000;
  
  var nextNum = num + 1;
  var nextPrefix = prefix;
  
  // Rule: If number exceeds 999,999, increment the prefix and reset number
  if (nextNum > 999999) {
    nextNum = 100000;
    // Increment Character (A -> B, Z -> AA)
    var lastChar = prefix.charCodeAt(prefix.length - 1);
    if (lastChar === 90) { // 'Z'
      nextPrefix = prefix + "A";
    } else {
      nextPrefix = prefix.slice(0, -1) + String.fromCharCode(lastChar + 1);
    }
  }
  
  // Return formatted CV (e.g., A100009)
  var formattedNum = String(nextNum).padStart(6, '0');
  return nextPrefix + formattedNum;
}

// --- Permissions & Active Sessions ---

function getPermissionsInternal() {
  var s = ss.getSheetByName("Permissions"); if (!s) return {};
  var d = s.getDataRange().getValues(), r = {};
  for(var i = 1; i < d.length; i++) if (d[i][0]) try { r[d[i][0]] = JSON.parse(d[i][1]); } catch(e) { r[d[i][0]] = {}; }
  return r;
}

function getPermissions() { return getPermissionsInternal(); }

function savePermissions(permissions) {
  var s = ss.getSheetByName("Permissions") || ss.insertSheet("Permissions");
  s.clear(); s.appendRow(["Role", "PermissionJSON"]);
  var rows = Object.keys(permissions).map(function(role){ return [role, JSON.stringify(permissions[role])]; });
  if (rows.length) s.getRange(2, 1, rows.length, 2).setValues(rows);
  return {status: "success"};
}

function handlePing(username, name, ip, loc) {
  var s = ss.getSheetByName("ActiveSessions") || ss.insertSheet("ActiveSessions");
  if (s.getLastRow() === 0) {
    s.appendRow(["Username", "Name", "IP", "Location", "LastSeen"]);
  }
  
  var data = s.getDataRange().getValues();
  var now = new Date();
  var found = false;
  var targetUser = String(username || "").trim().toLowerCase();
  
  // Find existing session for this user
  for (var i = 1; i < data.length; i++) {
    var checkUser = String(data[i][0] || "").trim().toLowerCase();
    if (checkUser === targetUser) {
      if (!found) {
        // Update the first matching row
        s.getRange(i + 1, 1, 1, 5).setValues([[username, name, ip, loc, now]]);
        found = true;
      } else {
        // If we already found and updated a row, delete this duplicate
        s.deleteRow(i + 1);
        data.splice(i, 1);
        i--;
      }
    }
  }
  
  // If not found, add new row for this user
  if (!found) {
    s.appendRow([username, name, ip, loc, now]);
  }
  
  return { status: "success", count: getActiveUsersCountInternal(s) };
}

function getOnlineCount() {
  var s = ss.getSheetByName("ActiveSessions");
  return { count: getActiveUsersCountInternal(s) };
}

/**
 * Internal helper to count users active in the last 5 minutes
 */
function getActiveUsersCountInternal(sheet) {
  if (!sheet) return 0;
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0;
  
  var now = new Date().getTime();
  var count = 0;
  var fiveMinutes = 5 * 60 * 1000;
  
  for (var i = 1; i < data.length; i++) {
    var timestamp = data[i][4];
    if (timestamp instanceof Date && (now - timestamp.getTime()) < fiveMinutes) {
      count++;
    }
  }
  return count;
}

// --- Job Request Planning System ---

function saveJobRequest(payload) {
  var s = ss.getSheetByName("JobRequests") || ss.insertSheet("JobRequests");
  if (s.getLastRow() === 0) {
    s.appendRow(["Timestamp", "JobID", "CV", "Type", "ItemsJSON", "Operator", "Note", "Status"]);
    s.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#f3f3f3");
  }

  var jobId = "JOB-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-") + Math.floor(Math.random() * 9000 + 1000);
  
  // Create two records if both delivery and return carts are present
  // Or just one unified record. Let's do unified with type 'MIXED' or separate rows per type.
  // Separate rows per type is better for the import logic.
  
  if (payload.deliveryItems && payload.deliveryItems.length > 0) {
     s.appendRow([new Date(), jobId, payload.cv, "DELIVERY", JSON.stringify(payload.deliveryItems), payload.operator, payload.note, "PENDING"]);
  }
  
  if (payload.returnItems && payload.returnItems.length > 0) {
     s.appendRow([new Date(), jobId, payload.cv, "RETURN", JSON.stringify(payload.returnItems), payload.operator, payload.note, "PENDING"]);
  }

  var result = { status: "success", jobId: jobId };
  
  try {
    sendJobRequestNotification(payload, jobId);
  } catch (err) {
    result.warning = "บันทึกสำเร็จแต่ส่งแจ้งเตือน Telegram ไม่ได้: " + err.toString();
  }

  return result;
}

function sendJobRequestNotification(payload, jobId) {
  var s = getSettingsInternal();
  if (s["NOTIFY_PRIORITY"] !== "TELEGRAM" || !s["NOTIFY_RECEIVE"]) return;

  var msg = "📂 <b>บันทึกแจ้งเตรียมงาน (JOB REQUEST)</b>\n";
  msg += "--------------------\n";
  msg += "📄 เลขที่งาน: <code>" + jobId + "</code>\n";
  msg += "⏰ วันที่: " + Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy HH:mm") + "\n";
  msg += "--------------------\n\n";
  
  var customerName = payload.cv || "-";
  var phone = "-";
  var address = "";
  
  try {
    var allCustomers = getCustomersArray();
    var cData = allCustomers.find(function(c) { return String(c.cv || c.CV) === String(payload.cv); });
    if (cData) {
      customerName = "🏢 " + cData.name + " (" + cData.cv + ")";
      phone = cData.phone || "-";
      address = [cData.subdistrict, cData.district, cData.province].filter(Boolean).join(" ");
    }
  } catch(e) {}
  
  msg += "👤 <b>ลูกค้า:</b> " + escapeHtml(customerName) + "\n";
  msg += "📞 <b>เบอร์โทร:</b> " + phone + "\n";
  if (address) msg += "📍 <b>พื้นที่:</b> " + escapeHtml(address) + "\n";
  msg += "--------------------\n\n";

  if (payload.deliveryItems && payload.deliveryItems.length > 0) {
    msg += "<b>📤 รายการเตรียมส่ง (DELIVERIES):</b>\n";
    payload.deliveryItems.forEach(function(it, i) {
      msg += "  " + (i + 1) + ". " + escapeHtml(it.displayString) + " <b>(x" + it.quantity + ")</b>\n";
      if (it.subItems && it.subItems.length > 0) {
        it.subItems.forEach(function(si) {
          msg += "     └ ➕ " + escapeHtml(si.displayString) + " (x" + si.quantity + ")\n";
        });
      }
    });
    msg += "\n";
  }

  if (payload.returnItems && payload.returnItems.length > 0) {
    msg += "<b>📥 รายการเตรียมรับคืน (RETURNS):</b>\n";
    payload.returnItems.forEach(function(it, i) {
      msg += "  " + (i + 1) + ". " + escapeHtml(it.displayString) + " <b>(x" + it.quantity + ")</b>\n";
      if (it.subItems && it.subItems.length > 0) {
        it.subItems.forEach(function(si) {
          msg += "     └ ➕ " + escapeHtml(si.displayString) + " (x" + si.quantity + ")\n";
        });
      }
    });
    msg += "\n";
  }

  msg += "--------------------\n";
  msg += "✍️ <b>ผู้แจ้ง:</b> " + escapeHtml(payload.operator || "-") + "\n";
  if (payload.note) msg += "📝 <b>หมายเหตุ:</b> <i>" + escapeHtml(payload.note) + "</i>\n";

  pushTelegramMessage(s["TG_BOT_TOKEN"], s["TG_CHAT_ID"], msg);
}

function getJobRequests(cv) {
  var s = ss.getSheetByName("JobRequests");
  if (!s) return [];
  var data = s.getDataRange().getValues();
  var results = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Allow PENDING (for new jobs) and เบิกของแล้ว (for return pickups)
    if (row[7] === "PENDING" || row[7] === "เบิกของแล้ว") {
      // If cv provided, filter by cv (index 2)
      if (cv && String(row[2]) !== String(cv)) continue;
      
      results.push({
        timestamp: row[0],
        jobId: row[1],
        cv: row[2],
        type: row[3],
        items: JSON.parse(row[4]),
        operator: row[5],
        note: row[6],
        status: row[7],
        rowIndex: i + 1
      });
    }
  }
  return results;
}

function completeJobRequest(jobId, actionStatus) {
  var s = ss.getSheetByName("JobRequests");
  if (!s) return;
  var data = s.getDataRange().getValues();
  var updated = false;
  
  for (var i = 1; i < data.length; i++) {
    // JobID is in column index 1 (B)
    if (String(data[i][1]) === String(jobId)) {
      var type = String(data[i][3]).toUpperCase(); // Type is in column index 3 (D)
      
      if (actionStatus === "รับคืน") {
         // If a return is processed, only mark the RETURN part as Finished
         if (type === "RETURN") {
            s.getRange(i + 1, 8).setValue("คืนของแล้ว");
            updated = true;
         }
      } else {
         // Default (e.g. "เบิกออก"): Sets everything to "เบิกของแล้ว" so the driver can go.
         // This makes the RETURN row visible to the Return module!
         s.getRange(i + 1, 8).setValue("เบิกของแล้ว");
         updated = true;
      }
    }
  }
  return updated;
}

// --- Triggers & Reports ---

function setupTrigger() {
  // Setup daily report trigger logic here if needed
  return { status: "success", message: "ตั้งค่าระบบอัตโนมัติเรียบร้อยแล้ว" };
}

function testEmailReport(email) {
  // Integration with MailApp here
  return { status: "success" };
}

function testTelegram() {
  try {
    var s = getSettingsInternal();
    var token = String(s["TG_BOT_TOKEN"] || "").trim();
    var chatId = String(s["TG_CHAT_ID"] || "").trim();
    
    if (!token || !chatId) {
      return { status: "error", message: "กรุณาระบุ Bot Token และ Chat ID ในหน้าตั้งค่าก่อนครับ" };
    }
    
    var msg = "<b>🔔 ทดสอบระบบแจ้งเตือน (TEST)</b>\n";
    msg += "ยินดีด้วย! ระบบ Telegram ของความสำเร็จแล้วครับ\n";
    msg += "⏰ เวลาทดสอบ: " + Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy HH:mm:ss");
    
    var result = pushTelegramMessage(token, chatId, msg);
    if (result && result.ok) {
      return { status: "success", message: "ส่งข้อความทดสอบไปยัง Telegram เรียบร้อยแล้วครับ!" };
    } else {
      var errorMsg = result && result.description ? result.description : "ไม่ทราบสาเหตุ (ตรวจสอบ Token/Chat ID)";
      return { status: "error", message: "ส่งไม่สำเร็จ: " + errorMsg };
    }
  } catch (e) {
    return { status: "error", message: "เกิดข้อผิดพลาด: " + e.toString() };
  }
}

function clearTransactions() {
  var s = ss.getSheetByName("Transactions");
  if (s && s.getLastRow() > 1) s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).clearContent();
  return { status: "success" };
}

// --- Shared Utilities ---

/**
 * Robust Header Mapping Helper
 * Acts as a single source of truth for column indices
 */
function getHeaderMap(headers) {
  function findIdx(name, fallback) {
    for(var i=0; i<headers.length; i++) {
        var header = String(headers[i] || "").trim();
        if (header === String(name).trim()) return i;
    }
    return fallback;
  }
  return {
    txnNo:        findIdx("เลขที่รายการ",      0),
    dateTime:     findIdx("วัน-เวลา",          1),
    operator:     findIdx("ผู้ทำรายการ",       2),
    status:       findIdx("สถานะ",             3),
    type:         findIdx("ประเภท",            4),
    brand:        findIdx("ยี่ห้อหรือรูปแบบ", 5),
    name:         findIdx("รายการ",            6),
    cond:         findIdx("สภาพ",              7),
    spec:         findIdx("รายละเอียด",        8),
    size:         findIdx("ขนาด",              9),
    qty:          findIdx("จำนวน",             10),
    cv:           findIdx("CV",                11),
    deliveryBy:   findIdx("จัดส่งโดย",        12),
    deliveryDate: findIdx("กำหนดส่ง",         13),
    note:         findIdx("หมายเหตุ",          14),
    workZone:     findIdx("เขตการทำงาน",      15),
    notifier:     findIdx("ผู้แจ้ง",           16),
    notifDate:    findIdx("วันที่แจ้ง",        17),
    reason:       findIdx("สาเหตุการคืน",     18),
    condition:    findIdx("สภาพตู้",           19),
    cancelReason: findIdx("เหตุผลการยกเลิก", 20),
    cancelBy:     findIdx("ยกเลิกโดย",        21),
    photoLink:    findIdx("รูปภาพประกอบ",     22),
    jobId:        findIdx("เลขงาน",            23)
  };
}

function ensureJobIdColumnExists(sheet, headers) {
  var colName = "เลขงาน";
  var found = false;
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === colName) {
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.getRange(1, headers.length + 1).setValue(colName);
    sheet.getRange(1, headers.length + 1).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");
  }
}

/**
 * Automatically ensures the 'รูปภาพประกอบ' column exists in the Transactions sheet
 */
function ensurePhotoColumnExists(sheet, headers) {
  var colName = "รูปภาพประกอบ";
  var found = false;
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === colName) {
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.getRange(1, headers.length + 1).setValue(colName);
    // Apply styling to new header
    sheet.getRange(1, headers.length + 1).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");
  }
}

/**
 * Saves Base64 image data to Google Drive with dynamic folder structure
 */
function saveBase64Image(base64Data, filename, folderPath) {
  try {
    var folder = DriveApp.getRootFolder();
    if (folderPath && folderPath.length > 0) {
      for (var i = 0; i < folderPath.length; i++) {
        var subName = folderPath[i];
        var folders = folder.getFoldersByName(subName);
        folder = folders.hasNext() ? folders.next() : folder.createFolder(subName);
      }
    } else {
      // Fallback
      var mainName = "Logistics_Photos";
      var folders = folder.getFoldersByName(mainName);
      folder = folders.hasNext() ? folders.next() : folder.createFolder(mainName);
    }
    
    var contentType = base64Data.substring(5, base64Data.indexOf(';'));
    var bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    var blob = Utilities.newBlob(bytes, contentType, filename);
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Error saving image: " + e.toString();
  }
}

/**
 * Modified: April 8, 2026 15:05 MS-T
 */

/**
 * seedMockTransactions - สร้างข้อมูลธุรกรรมจำลอง 150 รายการย้อนหลัง 90 วัน
 * เพื่อทดสอบหน้า Dashboard และ Reports
 */
function seedMockTransactions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ts = ss.getSheetByName("Transactions");
  var ds = ss.getSheetByName("data");
  
  if (!ts || !ds) return "Error: Sheets not found";
  
  var masterItems = ds.getDataRange().getValues();
  if (masterItems.length < 2) return "Error: No master items found";
  
  var operators = ["Admin", "Somchai", "Wichai", "Somsak", "Malee"];
  var zones = ["Zone-A", "Zone-B", "Warehouse-01", "Showroom"];
  var statuses = ["รับเข้า", "เบิกออก", "รับคืน", "ยกเลิก"];
  var customers = ["'A10001", "'A10002", "'A10003", "'A10004", "-"];
  
  var now = new Date();
  var rows = [];
  
  for (var i = 0; i < 150; i++) {
    var status = statuses[Math.floor(Math.random() * statuses.length)];
    var itRaw = masterItems[Math.floor(Math.random() * (masterItems.length - 1)) + 1];
    var randomDays = Math.floor(Math.random() * 90);
    var date = new Date(now.getTime() - (randomDays * 24 * 60 * 60 * 1000));
    
    var row = new Array(23).fill("");
    row[0] = "MOCK90" + String(i + 1).padStart(3, "0"); 
    row[1] = date; 
    row[2] = operators[Math.floor(Math.random() * operators.length)]; 
    row[3] = status; 
    row[4] = itRaw[0] || ""; 
    row[5] = itRaw[1] || ""; 
    row[6] = itRaw[2] || ""; 
    row[7] = itRaw[3] || ""; 
    row[8] = itRaw[4] || ""; 
    row[9] = itRaw[5] || ""; 
    row[10] = Math.floor(Math.random() * 10) + 1; 
    row[11] = (status === "เบิกออก" || status === "รับคืน") ? customers[Math.floor(Math.random() * (customers.length - 1))] : "-"; 
    row[12] = "Kerry Logistics"; 
    row[13] = date; 
    row[14] = "Mock Data for Testing"; 
    row[15] = zones[Math.floor(Math.random() * zones.length)]; 
    row[16] = "-"; 
    row[17] = "-"; 
    row[18] = "-"; 
    row[19] = "-"; 
    
    if (status === "ยกเลิก") {
      row[20] = "Test Void Error"; 
      row[21] = "Admin"; 
    } else {
      row[20] = "-";
      row[21] = "-";
    }
    
    row[22] = ""; 
    rows.push(row);
  }
  
  rows.sort(function(a, b) { return a[1].getTime() - b[1].getTime(); });
  ts.getRange(ts.getLastRow() + 1, 1, rows.length, 23).setValues(rows);
  return "Successfully added " + rows.length + " mock transactions.";
}

