function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'getItems') {
    return getItems();
  } else if (action === 'getTransactions') {
    return getTransactions();
  } else if (action === 'getNextTxnNo') {
    return getNextTxnNo();
  } else if (action === 'getUsers') {
    return getUsers();
  } else if (action === 'getSettings') {
    return getSettings();
  } else if (action === 'getZones') {
    return getZones();
  } else if (action === 'cancelTransaction') {
    return cancelTransaction(e.parameter.txnNo || e.parameter.id, e.parameter.operator, e.parameter.reason);
  } else if (action === 'pingStatus') {
    return handlePing(e.parameter.username || "", e.parameter.name || "", e.parameter.ip || "", e.parameter.loc || "");
  } else if (action === 'getOnlineCount') {
    return getOnlineCount();
  } else if (action === 'getCustomers') {
    return getCustomers();
  }
  
  return jsonResponse({status: "error", message: "Invalid action for GET (" + action + ") [v7]"});
}

function doPost(e) {
  try {
    var body = {};
    var action = '';
    try {
      body = JSON.parse(e.postData.contents);
      if (body.events && body.events.length > 0) {
        return handleLineWebhook(body);
      }
      if (body.update_id || body.message || body.channel_post) {
        return handleTelegramWebhook(body);
      }
      action = (body.action || e.parameter.action || "").trim();
    } catch(err) {
      return jsonResponse({status: "error", message: "Invalid JSON format: " + err.toString()});
    }

    if (action === 'receive' || action === 'issue') {
      return processTransaction(action, body);
    } else if (action === 'processBatch') {
      return processBatchTransaction(body);
    } else if (action === 'login') {
      return handleLogin(body.username, body.password, body.deviceInfo);
    } else if (action === 'saveUser') {
      return saveUser(body.user);
    } else if (action === 'deleteUser') {
      return deleteUser(body.rowIndex);
    } else if (action === 'saveSettings') {
      return saveSettings(body.settings);
    } else if (action === 'saveMasterItem') {
      return saveMasterItem(body.item);
    } else if (action === 'saveMasterItems') {
      return saveMasterItems(body.items);
    } else if (action === 'deleteMasterItem') {
      return deleteMasterItem(body.rowIndex);
    } else if (action === 'cancelTransaction') {
      return cancelTransaction(body.txnNo, body.operator, body.reason);
    } else if (action === 'setupTrigger') {
      return setupDailyTrigger();
    } else if (action === 'testDailyReport') {
      return sendDailySummaryReport(true);
    } else if (action === 'relinkTelegram') {
      return relinkTelegramWebhook(body.url);
    } else if (action === 'saveZone') {
      return saveZone(body.zone);
    } else if (action === 'deleteZone') {
      return deleteZone(body.rowIndex);
    } else if (action === 'clearTransactions') {
      return clearTransactions();
    } else if (action === 'testTelegram') {
      return testTelegram();
    } else if (action === 'pingStatus') {
      return handlePing(body.username, body.name, body.ip, body.loc);
    } else if (action === 'saveCustomer') {
      return saveCustomer(body.customer);
    } else if (action === 'deleteCustomer') {
      return deleteCustomer(body.rowIndex);
    }

    return jsonResponse({status: "error", message: "Invalid action for POST (" + action + ") [v8]"});
  } catch (globalErr) {
    logToSheet("Critical Error", globalErr.toString());
    return jsonResponse({status: "error", message: "Server Error: " + globalErr.toString()});
  }
}

function getCustomers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Customers");
  if (!sheet) {
    sheet = ss.insertSheet("Customers");
    sheet.appendRow(["CV", "ชื่อลูกค้า", "เบอร์โทร", "ที่อยู่", "ตำบล", "อำเภอ", "จังหวัด", "รหัสไปรษณีย์", "Latitude", "Longitude"]);
    return jsonResponse([]);
  }
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return jsonResponse([]);
  var customers = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    customers.push({ 
      rowIndex: i + 1, 
      cv: String(row[0]), 
      name: String(row[1]), 
      phone: String(row[2]), 
      address: String(row[3]), 
      subdistrict: String(row[4] || ''),
      district: String(row[5] || ''),
      province: String(row[6] || ''),
      zipcode: String(row[7] || ''),
      lat: String(row[8] || ''), 
      lng: String(row[9] || '') 
    });
  }
  return jsonResponse(customers);
}

function saveCustomer(customer) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Customers") || ss.insertSheet("Customers");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["CV", "ชื่อลูกค้า", "เบอร์โทร", "ที่อยู่", "ตำบล", "อำเภอ", "จังหวัด", "รหัสไปรษณีย์", "Latitude", "Longitude"]);
  }
  
  var rowData = [
    (customer.cv && !String(customer.cv).startsWith("'")) ? "'" + customer.cv : customer.cv, 
    customer.name, 
    customer.phone, 
    customer.address, 
    customer.subdistrict,
    customer.district,
    customer.province,
    customer.zipcode,
    customer.lat, 
    customer.lng
  ];
  
  if (customer.rowIndex) {
    sheet.getRange(customer.rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    var existingData = sheet.getDataRange().getValues();
    for (var i = 1; i < existingData.length; i++) {
      if (String(existingData[i][0]) === String(customer.cv)) {
         sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
         return jsonResponse({status: "success", message: "อัปเดตข้อมูลลูกค้าเดิมเรียบร้อย"});
      }
    }
    sheet.appendRow(rowData);
  }
  return jsonResponse({status: "success", message: "บันทึกข้อมูลลูกค้าเรียบร้อย"});
}

function deleteCustomer(rowIndex) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Customers");
  if (sheet && rowIndex) sheet.deleteRow(rowIndex);
  return jsonResponse({status: "success", message: "ลบข้อมูลลูกค้าเรียบร้อย"});
}
