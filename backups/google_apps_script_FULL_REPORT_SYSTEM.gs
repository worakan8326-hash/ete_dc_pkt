/**
 * google_apps_script_FULL_REPORT_SYSTEM.gs - THE ULTIMATE MASTER VERSION 
 * (Standardized Numbering + Cancellation with Column Q/R Support + Daily Email Report + Optimized)
 */

var ss = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'getItems') return getItems();
  if (action === 'getTransactions') return getTransactions();
  if (action === 'getNextTxnNo') return jsonResponse({ txnNo: getNextTxnNo() });
  if (action === 'getUsers') return getUsers();
  if (action === 'getSettings') return getSettings();
  if (action === 'getZones') return getZones();
  if (action === 'getCustomers') return getCustomers();
  if (action === 'getOnlineCount') return getOnlineCount();
  if (action === 'getPermissions') return getPermissions();
  if (action === 'getInitialData') return getInitialData();
  if (action === 'getNextCustomerCv') return jsonResponse({ cv: getNextCustomerCv() });
  return jsonResponse({ status: 'error', message: 'Action [' + action + '] not found' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    var data = JSON.parse(e.postData.contents);
    var action = data.action || e.parameter.action;

    if (action === "saveMasterItems") return jsonResponse(saveMasterItems(data.items || []));
    if (action === "saveMasterItem") return jsonResponse(saveMasterItem(data.item));
    if (action === "deleteMasterItem") return jsonResponse(deleteMasterItem(data.rowIndex));
    if (action === "login") return handleLogin(data.username, data.password);
    if (action === "saveUser") return jsonResponse(saveUser(data.user));
    if (action === "deleteUser") return jsonResponse(deleteUser(data.rowIndex));
    if (action === "saveSettings") return jsonResponse(saveSettings(data.settings));
    if (action === "receive" || action === "issue") return jsonResponse(processTransaction(action, data));
    if (action === "processBatch") return jsonResponse(processBatchTransaction(data));
    if (action === "cancelTransaction" || action === "voidTransaction") {
      var txnNo = data.txnNo || data.txnId || e.parameter.txnNo;
      return jsonResponse(cancelTransaction(txnNo, data.operator, data.reason));
    }
    if (action === "clearTransactions") return jsonResponse(clearTransactions());
    if (action === "saveZone") return jsonResponse(saveZone(data.zone));
    if (action === "deleteZone") return jsonResponse(deleteZone(data.rowIndex));
    if (action === "saveCustomer") return jsonResponse(saveCustomer(data.customer));
    if (action === "deleteCustomer") return jsonResponse(deleteCustomer(data.rowIndex));
    if (action === "testTelegram") return jsonResponse(testTelegram());
    if (action === "relinkTelegram") return jsonResponse(relinkTelegram(data.newUrl));
    if (action === "pingStatus") return jsonResponse(handlePing(data.username, data.name, data.ip, data.loc));
    
    // Email Report Actions
    if (action === "testEmailReport") return jsonResponse(testEmailReport(data.email));
    if (action === "savePermissions") return jsonResponse(savePermissions(data.permissions));
    if (action === "setupTrigger") return jsonResponse(setupTrigger());

    return jsonResponse({ status: 'error', message: 'Action not found' });
  } catch (err) { return jsonResponse({ status: 'error', message: err.toString() }); } finally { lock.releaseLock(); }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ระบบรันเลขพัสดุ (Transaction No) [Optimized]
function getNextTxnNo() {
  var sheet = ss.getSheetByName("Transactions");
  var lastRow = sheet ? sheet.getLastRow() : 0;
  
  if (lastRow <= 1) return "000001";
  
  // ดึงข้อมูลแค่ "แถวสุดท้าย" แถวเดียวมาเช็ค
  var lastVal = sheet.getRange(lastRow, 1).getValue();
  var max = parseInt(String(lastVal).replace(/[^0-9]/g, ""), 10);
  
  // ถ้าหาค่าตัวเลขจากแถวสุดท้ายไม่ได้ ให้รันแบบค้นหาจาก 100 แถวล่าสุดแทน (Fallback)
  if (isNaN(max)) {
    var checkRows = Math.min(lastRow - 1, 100); 
    var data = sheet.getRange(lastRow - checkRows + 1, 1, checkRows, 1).getValues();
    max = 0;
    for (var i = 0; i < data.length; i++) {
      var v = parseInt(String(data[i][0]).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(v) && v > max) max = v;
    }
  }
  
  return String(max + 1).padStart(6, "0");
}

function getInitialData() {
  return jsonResponse({
    items: getItemsArray(),
    transactions: getTransactionsArray(),
    settings: getSettingsInternal(),
    zones: getZonesInternal(),
    customers: getCustomersArray(),
    permissions: getPermissionsInternal()
  });
}

function getItemsArray() {
  var sheet = ss.getSheetByName("data");
  if(!sheet) return [];
  var data = sheet.getDataRange().getValues(), h = data[0], list = [];
  for(var i=1; i<data.length; i++) {
    var row = data[i]; if(!row[0] && !row[1]) continue;
    var it = {}; for(var j=0; j<h.length; j++) it[h[j]] = row[j];
    it.rowIndex = i + 1; list.push(it);
  }
  return list;
}

function getItems() {
  return jsonResponse(getItemsArray());
}

function processTransaction(action, payload) {
  var ds = ss.getSheetByName("data"), ts = ss.getSheetByName("Transactions");
  var qty = parseFloat(payload.quantity), rIdx = payload.rowIndex;
  var colIdx = ds.getRange(1, 1, 1, ds.getLastColumn()).getValues()[0].indexOf("จำนวน") + 1;
  var cell = ds.getRange(rIdx, colIdx), cur = parseFloat(cell.getValue()) || 0;
  var nQty = action === "receive" ? cur + qty : cur - qty;
  if (action === "issue" && qty > cur) throw new Error("Out of stock");
  cell.setValue(nQty);
  var tNo = payload.txnNo || getNextTxnNo();
  var cv = (payload.cv && !String(payload.cv).startsWith("'")) ? "'" + payload.cv : (payload.cv || "");
  ts.appendRow([tNo, new Date(), payload.operator, action==="receive"?"รับเข้า":"เบิกออก", payload.item["ประเภท"], payload.item["ยี่ห้อหรือรูปแบบ"], payload.item["รายการ"], payload.item["สภาพ"], payload.item["รายละเอียด"], payload.item["ขนาด"], qty, cv, payload.deliveryBy, payload.deliveryDate, payload.note, payload.workZone]);
  ts.getRange(ts.getLastRow(), 1).setNumberFormat("@").setValue(tNo);
  sendNotification(action, payload, nQty);
  return { status: "success", newQuantity: nQty };
}

function cancelTransaction(txnNo, operator, reason) {
  var ds = ss.getSheetByName("data"), ts = ss.getSheetByName("Transactions");
  if (!ts) return { status: "error", message: "Sheet not found" };
  
  var tsData = ts.getDataRange().getValues();
  var tsHeaders = tsData[0];
  var txnIdx = tsHeaders.indexOf("เลขที่รายการ") !== -1 ? tsHeaders.indexOf("เลขที่รายการ") : 0;
  var statusIdx = tsHeaders.indexOf("สถานะ");
  var itemIdx = tsHeaders.indexOf("รายการ");
  var qtyIdx = tsHeaders.indexOf("จำนวน");
  var typeIdx = tsHeaders.indexOf("ประเภท");
  var brandIdx = tsHeaders.indexOf("ยี่ห้อหรือรูปแบบ");
  var condIdx = tsHeaders.indexOf("สภาพ");
  var specIdx = tsHeaders.indexOf("รายละเอียด");
  var sizeIdx = tsHeaders.indexOf("ขนาด");
  
  // Build a lookup map for inventory items to avoid nested loops
  var dsData = ds.getDataRange().getValues();
  var dsHeaders = dsData[0];
  var dsQtyIdx = dsHeaders.indexOf("จำนวน");
  var inventoryMap = {}; // Key: type|brand|item|cond|size
  for (var j = 1; j < dsData.length; j++) {
    var key = [dsData[j][0], dsData[j][1], dsData[j][2], dsData[j][3], dsData[j][5]].join("|");
    inventoryMap[key] = { rowIndex: j + 1, currentQty: parseFloat(dsData[j][dsQtyIdx]) || 0 };
  }
  
  var itemsData = [];
  var originalTx = null;
  var found = false;
  
  for (var i = 1; i < tsData.length; i++) {
    if (String(tsData[i][txnIdx]) === String(txnNo)) {
      var currentStatus = String(tsData[i][statusIdx]);
      if (currentStatus.indexOf("ยกเลิก") !== -1) continue;
      
      if (!originalTx) {
        originalTx = {};
        for(var k=0; k<tsHeaders.length; k++) originalTx[tsHeaders[k]] = tsData[i][k];
      }

      var qty = parseFloat(tsData[i][qtyIdx]) || 0;
      var type = String(tsData[i][typeIdx] || ""), 
          brand = String(tsData[i][brandIdx] || ""), 
          item = String(tsData[i][itemIdx] || ""), 
          cond = String(tsData[i][condIdx] || ""),
          spec = String(tsData[i][specIdx] || ""),
          size = String(tsData[i][sizeIdx] || "");
      
      // 1. คืนยอดสต็อก (O(1) lookup)
      var key = [type, brand, item, cond, size].join("|");
      var inv = inventoryMap[key];
      var nQty = "-";
      if (inv) {
        nQty = (currentStatus === "รับเข้า") ? inv.currentQty - qty : inv.currentQty + qty;
        ds.getRange(inv.rowIndex, dsQtyIdx + 1).setValue(nQty);
        inv.currentQty = nQty; // Update map for subsequent items in same batch
      }
      
      // 2. บันทึกสถานะและเหตุผล
      ts.getRange(i + 1, statusIdx + 1).setValue("ยกเลิก");
      ts.getRange(i + 1, 17).setValue(reason || "-");
      ts.getRange(i + 1, 18).setValue(operator || "-");
      
      itemsData.push({
        type: type, brand: brand, name: item, cond: cond, spec: spec, size: size,
        qty: (currentStatus === "รับเข้า") ? -qty : qty,
        newStock: nQty
      });
      found = true;
    }
  }
  
  if (found) {
    sendCancelNotificationExtended(txnNo, operator, reason, itemsData, originalTx);
  }
  return found ? { status: "success" } : { status: "error", message: "ไม่พบเลขที่รายการหรือถูกยกเลิกไปแล้ว" };
}

function sendNotification(action, payload, newStock) {
  // Legacy single notification call replaced by Batch to support uniform style
  var itemsData = [{
    name: payload.item["ประเภท"],
    brand: payload.item["ยี่ห้อหรือรูปแบบ"],
    spec: payload.item["รายการ"],
    qty: payload.quantity,
    newStock: newStock
  }];
  sendBatchNotification(action, payload, itemsData);
}

function sendCancelNotification(txnNo, item, qty, operator, reason) {
  // Redirect to comprehensive Void notification if called individually
  sendCancelNotificationExtended(txnNo, operator, reason, [{
    name: "-", brand: "-", spec: item, qty: qty, newStock: "-"
  }], null);
}

function getCustomerFooter(cv, workZone, deliveryBy, deliveryDate, note) {
  var s = ss.getSheetByName("Customers");
  var cust = null;
  if (s && cv && String(cv) !== "-") {
    var d = s.getDataRange().getValues();
    var cleanCV = String(cv).replace(/^[']*/, "").trim().toLowerCase();
    for (var i = 1; i < d.length; i++) {
        var rowCV = String(d[i][0]).replace(/^[']*/, "").trim().toLowerCase();
        var rowName = String(d[i][1]).trim().toLowerCase();
        if (rowCV === cleanCV || rowCV.includes(cleanCV) || cleanCV.includes(rowCV) || rowName.includes(cleanCV)) {
            cust = {
                cv: d[i][0], name: d[i][1], phone: d[i][2], address: d[i][3],
                subdistrict: d[i][4], district: d[i][5], province: d[i][6], zipcode: d[i][7],
                lat: d[i][8], lng: d[i][9]
            };
            break;
        }
    }
  }

  var footer = "\n--------------------\n";
  if (cust) {
    footer += "📍 CV/ลูกค้า: " + cust.name + " (CV " + cust.cv + ")\n";
    footer += "🏠 ที่อยู่: " + (cust.address || "") + " ต." + (cust.subdistrict || "") + " อ." + (cust.district || "") + " จ." + (cust.province || "") + " " + (cust.zipcode || "") + "\n";
    footer += "📞 โทร: " + (cust.phone || "-") + "\n";
    if (cust.lat && cust.lng) {
      footer += "📍 แผนที่: <a href='https://www.google.com/maps/search/?api=1&query=" + cust.lat + "," + cust.lng + "'>📌 พิกัดบนแผนที่</a>\n";
    }
  } else if (cv && String(cv) !== "-" && cv !== "") {
    footer += "📍 CV/ลูกค้า: " + cv + "\n";
  }

  footer += "🏜️ เขตการทำงาน: " + (workZone || "-") + "\n";
  footer += "🚚 จัดส่งโดย: " + (deliveryBy || "-") + "\n";
  footer += "📅 กำหนดส่ง: " + (deliveryDate || "-") + "\n";
  footer += "หมายเหตุ: " + (note || "-");
  return footer;
}

function sendBatchNotification(action, payload, itemsData) {
  try {
    var s = getSettingsInternal();
    if (s["NOTIFY_PRIORITY"] !== "TELEGRAM") return;
    if (action === 'receive' && !s["NOTIFY_RECEIVE"]) return;
    if (action === 'issue' && !s["NOTIFY_ISSUE"]) return;

    var emoji = action === 'receive' ? "🟢" : "🟡";
    var title = action === 'receive' ? "แจ้งเตือนการรับพัสดุ (RECEIVE)" : "แจ้งเตือนการเบิกพัสดุ (ISSUE)";
    
    var msg = emoji + " <b>" + title + "</b>\n";
    msg += "⏰ วันที่: " + Utilities.formatDate(new Date(), "GMT+7", "d/M/yyyy HH:mm") + "\n";
    msg += "👤 ผู้ทำรายการ: " + (payload.operator || "-") + "\n";
    msg += "📄 รหัสรายการ: " + (payload.txnNo || "-") + "\n";
    
    msg += "--------------------\n\n";
    for (var i = 0; i < itemsData.length; i++) {
        var it = itemsData[i];
        var prefix = (action === 'receive' ? "+" : "-");
        var desc = [it.type, it.brand, it.name, it.cond, it.spec, it.size].map(function(s){ return String(s || "").trim(); }).filter(function(s){ return s && s !== "-"; }).join(" ");
        msg += (i + 1) + ". " + desc + "\t\t<b>" + prefix + it.qty + "</b> (คงเหลือ:" + it.newStock + ")\n\n";
    }

    msg += getCustomerFooter(payload.cv, payload.workZone, payload.deliveryBy, payload.deliveryDate, payload.note);
    
    pushTelegramMessage(s["TG_BOT_TOKEN"], s["TG_CHAT_ID"], msg);
  } catch(e) { console.error("Telegram Batch Error: " + e.toString()); }
}

function sendCancelNotificationExtended(txnNo, operator, reason, itemsData, originalTx) {
  try {
    var s = getSettingsInternal();
    if (s["NOTIFY_PRIORITY"] !== "TELEGRAM") return;
    if (!s["NOTIFY_VOID"]) return;

    var msg = "🔴 <b>แจ้งเตือนการยกเลิกรายการ (VOID)</b>\n";
    msg += "⏰ วันที่: " + Utilities.formatDate(new Date(), "GMT+7", "d/M/yyyy HH:mm") + "\n";
    msg += "👤 ผู้ยกเลิก: " + (operator || "-") + "\n";
    msg += "👤 เจ้าของเดิม: " + (originalTx ? originalTx["ผู้ทำรายการ"] : "-") + "\n";
    msg += "📄 รหัสรายการ: " + (txnNo || "-") + "\n";
    msg += "⚠️ เหตุผล: " + (reason || "-") + "\n";
    
    msg += "--------------------\n";
    for (var i = 0; i < itemsData.length; i++) {
        var it = itemsData[i];
        var desc = [it.type, it.brand, it.name, it.cond, it.spec, it.size].map(function(s){ return String(s || "").trim(); }).filter(function(s){ return s && s !== "-"; }).join(" ");
        msg += (i + 1) + ". " + desc + "\n";
        msg += "   คืนคลัง: <b>" + (it.qty > 0 ? "+" : "") + it.qty + "</b> (คงเหลือ: " + it.newStock + ")\n\n";
    }

    msg += "--------------------\n";
    msg += "📍 ยกเลิกโดย: " + (operator || "-") + "\n";
    msg += "🚚 เหตุผล: " + (reason || "-") + "\n";

    if (originalTx) {
        msg += getCustomerFooter(originalTx["CV"], originalTx["เขตการทำงาน"], originalTx["จัดส่งโดย"], originalTx["กำหนดส่ง"], originalTx["หมายเหตุ"]);
    }
    
    pushTelegramMessage(s["TG_BOT_TOKEN"], s["TG_CHAT_ID"], msg);
  } catch(e) { console.error("Telegram Cancel Error: " + e.toString()); }
}

function pushTelegramMessage(token, chatId, msg) {
  var url = "https://api.telegram.org/bot" + String(token).trim() + "/sendMessage";
  try { UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ chat_id: String(chatId).trim(), text: msg, parse_mode: "HTML" }) }); } catch(e) { console.error("Fetch API Error: " + e.toString()); }
}

function getSettingsInternal() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("cache_settings");
  if (cached) return JSON.parse(cached);

  var s = ss.getSheetByName("Settings"); if (!s) return {};
  var d = s.getDataRange().getValues(), r = {};
  for(var i = 1; i < d.length; i++) if (d[i][0]) r[d[i][0]] = d[i][1];
  
  cache.put("cache_settings", JSON.stringify(r), 3600); // 1 hour
  return r;
}

function getSettings() { return jsonResponse(getSettingsInternal()); }

function saveSettings(obj) {
  var s = ss.getSheetByName("Settings") || ss.insertSheet("Settings");
  s.clear(); s.appendRow(["Key", "Value"]);
  var rows = Object.keys(obj).map(function(k){ return [k, typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : obj[k]]; });
  if (rows.length) s.getRange(2, 1, rows.length, 2).setValues(rows);
  CacheService.getScriptCache().remove("cache_settings"); // Immediate invalidation
  return {status: "success"};
}

// --- Master Data Management (Improved with DUPLICATE CHECK & FULL AUTO-SORT) ---

function saveMasterItem(item) {
  var s = ss.getSheetByName("data");
  var dataRows = s.getDataRange().getValues();
  var headers = dataRows[0];
  var rows = dataRows.slice(1);
  
  var r = [
    item["ประเภท"] || "", 
    item["ยี่ห้อหรือรูปแบบ"] || "", 
    item["รายการ"] || "", 
    item["สภาพ"] || "", 
    item["รายละเอียด"] || "", 
    item["ขนาด"] || "", 
    parseFloat(item["จำนวน"]) || 0
  ];

  // 1. DUPLICATE CHECK (Check everything except quantity)
  // Check against processed rows in memory
  var alreadyExists = false;
  if (!item.rowIndex) {
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (String(row[0]).trim() === String(r[0]).trim() && 
            String(row[1]).trim() === String(r[1]).trim() && 
            String(row[2]).trim() === String(r[2]).trim() && 
            String(row[3]).trim() === String(r[3]).trim() && 
            String(row[4]).trim() === String(r[4]).trim() && 
            String(row[5]).trim() === String(r[5]).trim()) {
          alreadyExists = true;
          break;
        }
    }
    if (alreadyExists) return { status: "error", message: "⚠️ รายการนี้มีอยู่ในฐานข้อมูลแล้วนะครับ" };
  }

  // 2. LOGIC: Add or Update existing data in memory array
  if (item.rowIndex) {
    // We can't rely on rowIndex directly if we sorted before, 
    // but the frontend sends the latest rowIndex it knows.
    // However, since we are doing a FULL RE-WRITE below, we just update the specific row index if it's within bounds.
    if (item.rowIndex <= dataRows.length) {
      rows[item.rowIndex - 2] = r;
    } else {
      rows.push(r);
    }
  } else {
    rows.push(r);
  }

  // 3. FULL DATA RE-ORDERING (Category Preservation + Internal Sort)
  
  // 3.1 Get Category Order Map from original data to preserve positions
  var categoryOrder = [];
  dataRows.slice(1).forEach(function(r) {
    if (r[0] && categoryOrder.indexOf(String(r[0]).trim()) === -1) {
      categoryOrder.push(String(r[0]).trim());
    }
  });

  // If new category added, it might not be in categoryOrder yet. Add it at the end.
  rows.forEach(function(r) {
    if (r[0] && categoryOrder.indexOf(String(r[0]).trim()) === -1) {
       categoryOrder.push(String(r[0]).trim());
    }
  });

  // 3.2 Sort Rows
  rows.sort(function(a, b) {
    var catA = String(a[0] || "").trim();
    var catB = String(b[0] || "").trim();
    
    // Primary Sort: Category (by appearance order)
    var idxA = categoryOrder.indexOf(catA);
    var idxB = categoryOrder.indexOf(catB);
    
    if (idxA !== idxB) return idxA - idxB;
    
    // Secondary Sort: Internal Fields (Brand > Name > Condition > Detail > Size)
    var sortCols = [1, 2, 3, 4, 5]; 
    for (var i = 0; i < sortCols.length; i++) {
      var idx = sortCols[i];
      var valA = String(a[idx] || "").trim().toLowerCase();
      var valB = String(b[idx] || "").trim().toLowerCase();
      if (valA < valB) return -1;
      if (valA > valB) return 1;
    }
    return 0;
  });

  // 4. WRITE BACK TO SHEET (Clear and set new sorted values)
  s.getRange(2, 1, s.getLastRow() || 1, 7).clearContent();
  if (rows.length > 0) {
    s.getRange(2, 1, rows.length, 7).setValues(rows);
  }

  return { status: "success" };
}

function saveMasterItems(items) {
  var s = ss.getSheetByName("data");
  var dataRows = s.getDataRange().getValues();
  var rows = dataRows.slice(1);

  // 1. Process Updates/Adds in memory
  items.forEach(function(item) {
    var r = [
      item["ประเภท"] || "", 
      item["ยี่ห้อหรือรูปแบบ"] || "", 
      item["รายการ"] || "", 
      item["สภาพ"] || "", 
      item["รายละเอียด"] || "", 
      item["ขนาด"] || "", 
      parseFloat(item["จำนวน"]) || 0
    ];
    if (item.rowIndex && item.rowIndex <= dataRows.length) {
      rows[item.rowIndex - 2] = r;
    } else {
      rows.push(r);
    }
  });

  // 2. Identify Category Order (Maintain Chronological Order)
  var categoryOrder = [];
  dataRows.slice(1).forEach(function(r) {
    if (r[0] && categoryOrder.indexOf(String(r[0]).trim()) === -1) {
      categoryOrder.push(String(r[0]).trim());
    }
  });
  rows.forEach(function(r) {
    if (r[0] && categoryOrder.indexOf(String(r[0]).trim()) === -1) {
      categoryOrder.push(String(r[0]).trim());
    }
  });

  // 3. Sort
  rows.sort(function(a, b) {
    var idxA = categoryOrder.indexOf(String(a[0] || "").trim());
    var idxB = categoryOrder.indexOf(String(b[0] || "").trim());
    if (idxA !== idxB) return idxA - idxB;
    
    var sortCols = [1, 2, 3, 4, 5];
    for (var i = 0; i < sortCols.length; i++) {
      var idx = sortCols[i];
      var valA = String(a[idx] || "").trim().toLowerCase();
      var valB = String(b[idx] || "").trim().toLowerCase();
      if (valA < valB) return -1;
      if (valA > valB) return 1;
    }
    return 0;
  });

  s.getRange(2, 1, s.getLastRow() || 1, 7).clearContent();
  if (rows.length > 0) {
    s.getRange(2, 1, rows.length, 7).setValues(rows);
  }
  return { status: "success" };
}

function deleteMasterItem(idx) { 
  var s = ss.getSheetByName("data");
  if (idx && idx > 1) {
    s.deleteRow(parseInt(idx));
    return { status: "success" };
  }
  return { status: "error", message: "Invalid Row Index" };
}

function getUsers() { var d=(ss.getSheetByName("Users")||ss.insertSheet("Users")).getDataRange().getValues(), l=[]; for(var i=1;i<d.length;i++)l.push({rowIndex:i+1,username:d[i][0],name:d[i][2],role:d[i][3]}); return jsonResponse(l); }

function saveUser(u) { 
  var s=ss.getSheetByName("Users")||ss.insertSheet("Users"); 
  if(u.rowIndex) {
    if (u.password && u.password.toString().trim() !== '') {
      s.getRange(u.rowIndex,1,1,4).setValues([[u.username, u.password, u.name, u.role]]);
    } else {
      s.getRange(u.rowIndex, 1).setValue(u.username);
      s.getRange(u.rowIndex, 3).setValue(u.name);
      s.getRange(u.rowIndex, 4).setValue(u.role);
    }
  } else {
    s.appendRow([u.username, u.password || '', u.name, u.role]); 
  }
  CacheService.getScriptCache().remove("valid_users_list");
  return {status:"success"}; 
}

function deleteUser(idx) { 
  if(idx>1)ss.getSheetByName("Users").deleteRow(idx); 
  CacheService.getScriptCache().remove("valid_users_list");
  return {status:"success"}; 
}

function handleLogin(u, p) { var d=ss.getSheetByName("Users").getDataRange().getValues(); for(var i=1;i<d.length;i++)if(String(d[i][0])===String(u)&&String(d[i][1])===String(p))return jsonResponse({status:"success",user:{username:d[i][0],name:d[i][2],role:d[i][3]}}); return jsonResponse({status:"error"}); }

function getZonesInternal() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("cache_zones");
  if (cached) return JSON.parse(cached);

  var d=(ss.getSheetByName("Zones")||ss.insertSheet("Zones")).getDataRange().getValues(), l=[]; 
  for(var i=1;i<d.length;i++)l.push({rowIndex:i+1,name:d[i][0],description:d[i][1]}); 
  
  cache.put("cache_zones", JSON.stringify(l), 3600); // 1 hour
  return l;
}

function getZones() { return jsonResponse(getZonesInternal()); }

function saveZone(z) { 
  var s=ss.getSheetByName("Zones")||ss.insertSheet("Zones"); 
  if(z.rowIndex)s.getRange(z.rowIndex,1,1,2).setValues([[z.name,z.description]]); 
  else s.appendRow([z.name,z.description]); 
  CacheService.getScriptCache().remove("cache_zones");
  return {status:"success"}; 
}

function deleteZone(idx) { 
  if(idx>1)ss.getSheetByName("Zones").deleteRow(idx); 
  CacheService.getScriptCache().remove("cache_zones");
  return {status:"success"}; 
}

// ดึงรายชื่อลูกค้าแบบครบทุกคอลัมน์ (10 คอลัมน์)
function getCustomersArray() { 
  var s = ss.getSheetByName("Customers") || ss.insertSheet("Customers"); 
  var d = s.getDataRange().getValues(), l = []; 
  for(var i = 1; i < d.length; i++) {
    var phone = String(d[i][2] || "");
    if (phone.startsWith("'")) phone = phone.substring(1);
    var cv = String(d[i][0] || "");
    if (cv.startsWith("'")) cv = cv.substring(1);

    l.push({
      rowIndex: i + 1,
      cv: cv,
      name: d[i][1],
      phone: phone,
      address: d[i][3],
      subdistrict: d[i][4],
      district: d[i][5],
      province: d[i][6],
      zipcode: d[i][7],
      lat: d[i][8],
      lng: d[i][9]
    });
  }
  return l; 
}

function getCustomers() { return jsonResponse(getCustomersArray()); }

function saveCustomer(c) { 
  var s = ss.getSheetByName("Customers") || ss.insertSheet("Customers"); 
  var phone = (c.phone && !String(c.phone).startsWith("'")) ? "'" + c.phone : (c.phone || "");
  var cv = (c.cv && !String(c.cv).startsWith("'")) ? "'" + c.cv : (c.cv || "");
  var r = [cv, c.name, phone, c.address, c.subdistrict, c.district, c.province, c.zipcode, c.lat, c.lng]; 
  if (c.rowIndex) s.getRange(c.rowIndex, 1, 1, 10).setValues([r]); 
  else s.appendRow(r); 
  return { status: "success" }; 
}

function deleteCustomer(idx) { if (idx > 1) ss.getSheetByName("Customers").deleteRow(idx); return { status: "success" }; }
function clearTransactions() { var s = ss.getSheetByName("Transactions"); if (s && s.getLastRow()>1) s.getRange(2,1,s.getLastRow()-1,s.getLastColumn()).clearContent(); return { status: "success" }; }
function testTelegram() { var s=getSettingsInternal(); if(s["TG_BOT_TOKEN"]&&s["TG_CHAT_ID"]) { pushTelegramMessage(s["TG_BOT_TOKEN"],s["TG_CHAT_ID"],"🚀 <b>ทดสอบสำเร็จ!</b>"); return {status:"success"}; } return {status:"error"}; }
function relinkTelegram(u) { return {status:"success"}; }

function handlePing(u, n, ip, l) {
  var s = ss.getSheetByName("ActiveSessions") || ss.insertSheet("ActiveSessions");
  
  // OPTIMIZED SECURE-CHECK: Use Cache for performance with many users
  var cache = CacheService.getScriptCache();
  var cachedUsers = cache.get("valid_users_list");
  var validUsers = [];
  
  if (cachedUsers) {
    validUsers = JSON.parse(cachedUsers);
  } else {
    // Cache miss: read from sheet and populate cache for 5 minutes
    var usersSheet = ss.getSheetByName("Users");
    var usersData = usersSheet ? usersSheet.getDataRange().getValues() : [];
    for (var i = 1; i < usersData.length; i++) {
      if (usersData[i][0]) validUsers.push(String(usersData[i][0]));
    }
    cache.put("valid_users_list", JSON.stringify(validUsers), 300); // 5 mins
  }
  
  if (validUsers.indexOf(String(u)) === -1) {
    return { status: "deleted", message: "User no longer exists" };
  }

  var now = new Date();
  var nowTime = now.getTime();
  
  // Aggregate Active Sessions in Cache Service to save API Quotas
  var sessionsCache = cache.get("active_sessions");
  var activeSessions = sessionsCache ? JSON.parse(sessionsCache) : {};
  
  // Update current user's session
  activeSessions[u] = { n: n, ip: ip, l: l, t: nowTime };
  
  var onlineCount = 0;
  var toKeep = {};
  
  for (var key in activeSessions) {
    if (nowTime - activeSessions[key].t < 600000) { // Keep for 10 mins
       toKeep[key] = activeSessions[key];
       if (nowTime - activeSessions[key].t < 300000) { // Count as online if < 5 mins
          onlineCount++;
       }
    }
  }
  
  // Save updated sessions back to cache
  cache.put("active_sessions", JSON.stringify(toKeep), 600); // Expiry 10 mins
  
  // THROTTLE: Write to Google Sheet only ONCE per minute maximum
  var lastUpdate = cache.get("last_sessions_update");
  if (!lastUpdate || (nowTime - parseInt(lastUpdate)) > 60000) {
    var newRows = [];
    for(var k in toKeep) {
      newRows.push([k, toKeep[k].n, toKeep[k].ip, toKeep[k].l, new Date(toKeep[k].t)]);
    }
    
    if (newRows.length > 0 && s) {
      if (s.getLastRow() === 0) s.appendRow(["Username", "Name", "IP", "Location", "LastSeen"]);
      s.clearContents();
      s.getRange(1, 1, 1, 5).setValues([["Username", "Name", "IP", "Location", "LastSeen"]]);
      s.getRange(2, 1, newRows.length, 5).setValues(newRows);
      
      // Update the throttle timestamp
      cache.put("last_sessions_update", String(nowTime), 120);
    }
  }
  
  return { status: "success", count: onlineCount };
}

function getOnlineCount() {
  var s = ss.getSheetByName("ActiveSessions");
  if (!s) return jsonResponse({ count: 0 });
  var data = s.getDataRange().getValues();
  var now = new Date();
  var active = 0;
  for (var i = 1; i < data.length; i++) {
    if (now.getTime() - new Date(data[i][4]).getTime() < 300000) active++; // Active in last 5 mins
  }
  return jsonResponse({ count: active });
}


function getTransactionsArray() { 
  var s=ss.getSheetByName("Transactions"); if(!s) return []; 
  var d=s.getDataRange().getValues(), h=d[0], l=[]; 
  for(var i=1;i<d.length;i++){ var it={}; for(var j=0;j<h.length;j++)it[h[j]]=d[i][j]; l.push(it); } 
  return l.reverse(); 
}
function getTransactions() { return jsonResponse(getTransactionsArray()); }

function processBatchTransaction(payload) { 
  var ds = ss.getSheetByName("data"), ts = ss.getSheetByName("Transactions"); 
  var action = payload.subAction, items = payload.items, tNo = payload.txnNo || getNextTxnNo(), op = payload.operator || ""; 
  var notificationItems = [];
  var transactionRows = [];
  var now = new Date();
  var cv = (payload.cv && !String(payload.cv).startsWith("'")) ? "'" + payload.cv : (payload.cv || ""); 

  // Read all inventory items to avoid getValues inside loop
  var inventoryData = ds.getDataRange().getValues();
  var headers = inventoryData[0];
  var qtyColIdx = headers.indexOf("จำนวน");

  for(var i = 0; i < items.length; i++){ 
    var e = items[i], it = e.item, q = parseFloat(e.quantity); 
    
    // Update inventory level in memory
    var cur = parseFloat(inventoryData[it.rowIndex - 1][qtyColIdx]) || 0; 
    var nQty = action === "receive" ? cur + q : cur - q; 
    
    // Write back to sheet individually for safety/simplicity since it's targeted row, 
    // but the transaction logs are batched.
    ds.getRange(it.rowIndex, qtyColIdx + 1).setValue(nQty); 
    
    transactionRows.push([tNo, now, op, action === "receive" ? "รับเข้า" : "เบิกออก", it["ประเภท"], it["ยี่ห้อหรือรูปแบบ"], it["รายการ"], it["สภาพ"], it["รายละเอียด"], it["ขนาด"], q, cv, payload.deliveryBy, payload.deliveryDate, payload.note, payload.workZone]); 
    
    notificationItems.push({
      type: it["ประเภท"], brand: it["ยี่ห้อหรือรูปแบบ"], name: it["รายการ"], cond: it["สภาพ"],
      spec: it["รายละเอียด"], size: it["ขนาด"], qty: q, newStock: nQty
    });
  } 
  
  // Batch Append to Transactions
  if (transactionRows.length > 0) {
    var lastRow = ts.getLastRow();
    ts.getRange(lastRow + 1, 1, transactionRows.length, transactionRows[0].length).setValues(transactionRows);
    // Format TxnNo as text
    ts.getRange(lastRow + 1, 1, transactionRows.length, 1).setNumberFormat("@");
  }
  
  sendBatchNotification(action, payload, notificationItems);
  return { status: "success" }; 
}

// --- ระบบรายงานประจำวันผ่านอีเมล [Optimized with PropertiesService] ---

function testEmailReport(email) {
  try {
    const now = new Date();
    const attachments = [];
    const reportData = generateReportData();
    attachments.push(generateExcelBlob(reportData));
    attachments.push(generatePdfBlob(reportData));
    
    MailApp.sendEmail({
      to: email,
      subject: `[TEST] ทดสอบระบบรายงานอัตโนมัติ - ${now.toLocaleDateString('th-TH')}`,
      body: "สวัสดีครับ,\n\nได้รับเมลล์นี้ แสดงว่าระบบรายงานอัตโนมัติทำงานได้ปกติครับ\n\nขอบคุณครับ",
      attachments: attachments
    });
    return { status: "success", message: "ส่งเมลทดสอบสำเร็จ!" };
  } catch (err) { return { status: "error", message: err.toString() }; }
}

function processDailyReports() {
  const settings = getSettingsInternal();
  if (!settings.ENABLE_DAILY_REPORT) return;
  
  const now = new Date();
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayName = dayNames[now.getDay()];
  const allowedDays = (settings.RPT_DAYS || '').split(',');
  if (!allowedDays.includes(todayName)) return;

  const targetH = parseInt(settings.RPT_DAILY_TIME_H);
  const targetM = parseInt(settings.RPT_DAILY_TIME_M);
  
  // เช็คว่าเวลาปัจจุบัน "ถึงกำหนด หรือ เลยกำหนด" ส่งรายงานของวันนี้หรือยัง
  if (now.getHours() > targetH || (now.getHours() === targetH && now.getMinutes() >= targetM)) {
    
    // ใช้ ScriptProperties เช็คว่าวันนี้ทำการส่งไปแล้วหรือยัง
    const scriptProps = PropertiesService.getScriptProperties();
    const todayDateStr = now.toLocaleDateString('en-GB'); // รูปแบบ DD/MM/YYYY
    const lastRunDate = scriptProps.getProperty('LAST_DAILY_REPORT_DATE');
    
    // ถ้าวันนี้ยังไม่ได้ส่ง ถึงจะทำงาน
    if (lastRunDate !== todayDateStr) {
      const attachments = [];
      const reportData = generateReportData();
      
      if (settings.FORMAT_EXCEL && reportData.length > 0) attachments.push(generateExcelBlob(reportData));
      if (settings.FORMAT_PDF && reportData.length > 0) attachments.push(generatePdfBlob(reportData));

      if (settings.ENABLE_EMAIL_REPORT && settings.REPORT_EMAIL_DEST && attachments.length > 0) {
        try {
          MailApp.sendEmail({
            to: settings.REPORT_EMAIL_DEST,
            subject: `[รายงานประจำวัน] สรุปยอดรายการวันที่ ${now.toLocaleDateString('th-TH')}`,
            body: "สวัสดีครับ,\n\nแนบไฟล์สรุปรายงานประจำวันจากระบบจัดคลังสินค้าครับ",
            attachments: attachments
          });
          // เมื่อส่งสำเร็จ บันทึกวันที่ไว้ว่าวันนี้ส่งแล้ว
          scriptProps.setProperty('LAST_DAILY_REPORT_DATE', todayDateStr);
        } catch (e) {
          console.error("Email send failed: " + e.toString());
        }
      } else if (reportData.length === 0) {
        // ถ้าไม่มีข้อมูลเลย ก็บันทึกว่าส่งแล้ว จะได้ไม่ต้องพยายามส่งอีเมลเปล่าๆ ตลอดทั้งวัน
        scriptProps.setProperty('LAST_DAILY_REPORT_DATE', todayDateStr);
      }
    }
  }
}

function generateReportData() {
  var ts = ss.getSheetByName("Transactions");
  if (!ts) return [];
  var data = ts.getDataRange().getValues();
  var today = new Date();
  today.setHours(0,0,0,0);
  var report = [];
  for (var i = 1; i < data.length; i++) {
    var date = new Date(data[i][1]);
    date.setHours(0,0,0,0);
    if (date.getTime() === today.getTime()) report.push(data[i]);
  }
  return report;
}

function generateExcelBlob(data) {
  const tempSs = SpreadsheetApp.create('ETE_Daily_Report_Temp');
  const sheet = tempSs.getSheets()[0];
  sheet.appendRow(["เลขที่", "วันที่", "ผู้ทำรายการ", "สถานะ", "ประเภท", "ยี่ห้อ", "รายการ", "สภาพ", "รายละเอียด", "ขนาด", "จำนวน", "CV", "ส่งโดย", "กำหนดส่ง", "หมายเหตุ", "เขต"]);
  if (data.length > 0) sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  SpreadsheetApp.flush();
  const blob = UrlFetchApp.fetch("https://docs.google.com/spreadsheets/d/" + tempSs.getId() + "/export?exportFormat=xlsx", {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  }).getBlob().setName("Report_" + new Date().toLocaleDateString() + ".xlsx");
  DriveApp.getFileById(tempSs.getId()).setTrashed(true);
  return blob;
}

function generatePdfBlob(data) {
  const tempSs = SpreadsheetApp.create('ETE_Daily_Report_PDF_Temp');
  const sheet = tempSs.getSheets()[0];
  sheet.appendRow(["เลขที่", "วันที่", "สถานะ", "รายการ", "จำนวน", "CV"]);
  data.forEach(function(r){ sheet.appendRow([r[0], r[1], r[3], r[6], r[10], r[11]]); });
  SpreadsheetApp.flush();
  const blob = UrlFetchApp.fetch("https://docs.google.com/spreadsheets/d/" + tempSs.getId() + "/export?exportFormat=pdf&size=A4&portrait=false", {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  }).getBlob().setName("Report_" + new Date().toLocaleDateString() + ".pdf");
  DriveApp.getFileById(tempSs.getId()).setTrashed(true);
  return blob;
}

function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t){ if(t.getHandlerFunction() === "processDailyReports") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("processDailyReports").timeBased().everyMinutes(1).create();
  return { status: "success", message: "ตั้งค่าระบบอัตโนมัติสำเร็จแล้ว" };
}

function getNextCustomerCv() {
  var s = ss.getSheetByName("Customers");
  if (!s) return "A100001";
  var data = s.getDataRange().getValues();
  var max = 100000;
  var regex = /^A(\d{6})$/;
  for (var i = 1; i < data.length; i++) {
    var val = String(data[i][0]);
    var match = val.match(regex);
    if (match) {
      var num = parseInt(match[1]);
      if (num > max) max = num;
    }
  }
  return "A" + (max + 1);
}

// --- Role-Based Access Control (RBAC) ---
function getPermissions() { return jsonResponse(getPermissionsInternal()); }

function getPermissionsInternal() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("cache_permissions");
  if (cached) return JSON.parse(cached);

  var s = ss.getSheetByName("Permissions"); 
  if (!s) return {};
  var d = s.getDataRange().getValues(), r = {};
  for(var i = 1; i < d.length; i++) {
    if (d[i][0]) {
      try {
        r[d[i][0]] = JSON.parse(d[i][1]);
      } catch(e) {
        r[d[i][0]] = {};
      }
    }
  }
  
  cache.put("cache_permissions", JSON.stringify(r), 3600); // 1 hour
  return r;
}

function savePermissions(permissions) {
  var s = ss.getSheetByName("Permissions") || ss.insertSheet("Permissions");
  s.clear(); 
  s.appendRow(["Role", "PermissionJSON"]);
  var rows = Object.keys(permissions).map(function(role){ 
    return [role, JSON.stringify(permissions[role])]; 
  });
  if (rows.length) s.getRange(2, 1, rows.length, 2).setValues(rows);
  CacheService.getScriptCache().remove("cache_permissions"); // Clear cache immediately
  return {status: "success"};
}
