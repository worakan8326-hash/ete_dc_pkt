import type { MaterialItem, Transaction } from './types';

export const API_URL = "https://script.google.com/macros/s/AKfycbzxjCSXuvP_Nl6H6wtT07yqtDDeCH0fkkQ1iSooL0-CC9Q-V0hUZgqp0pAeMtUi_hagMw/exec";
export let initialDataCache: any = null;

export const getInitialData = async (): Promise<any> => {
  if (!API_URL) throw new Error("API URL is not configured. Please deploy the Apps Script first.");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=getInitialData`;
  const res = await fetch(urlWithAction);
  if (!res.ok) throw new Error("Failed to fetch initial data");
  const data = await res.json();
  initialDataCache = data;
  return data;
};

export const getItems = async (forceRefetch = false): Promise<MaterialItem[]> => {
  if (!API_URL) return [];
  if (!forceRefetch && initialDataCache?.items) return initialDataCache.items;
  const res = await fetch(`${API_URL}${API_URL.includes('?') ? '&' : '?'}action=getItems`);
  if (!res.ok) throw new Error("Failed to fetch items");
  const data = await res.json();
  if (initialDataCache) initialDataCache.items = data;
  return data;
};

export const getMaterials = getItems; // Alias for App.tsx compatibility

export const getTransactions = async (forceRefetch = false): Promise<Transaction[]> => {
  if (!API_URL) return [];
  if (!forceRefetch && initialDataCache?.transactions) return initialDataCache.transactions;
  const res = await fetch(`${API_URL}${API_URL.includes('?') ? '&' : '?'}action=getTransactions`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  if (initialDataCache) initialDataCache.transactions = data;
  return data;
};

export const getNextTxnNo = async (): Promise<string> => {
  if (!API_URL) return '000000';
  const res = await fetch(`${API_URL}?action=getNextTxnNo`);
  if (!res.ok) return '000000';
  const data = await res.json();
  return data.txnNo || '000000';
};

export const processTransaction = async (
  action: 'receive' | 'issue', 
  item: MaterialItem, 
  quantity: number,
  cv: string,
  deliveryBy: string,
  deliveryDate: string,
  txnNo: string,
  operatorName: string
): Promise<any> => {
  if (!API_URL) throw new Error("API URL is not configured. Please deploy the Apps Script first.");
  
  const payload = {
    action,
    rowIndex: item.rowIndex,
    item,
    quantity,
    cv,
    deliveryBy,
    deliveryDate,
    txnNo,
    operator: operatorName
  };

  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=${action}`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) throw new Error("Transaction failed");
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const processBatchTransaction = async (
  action: 'receive' | 'issue',
  items: { item: MaterialItem, quantity: number }[],
  cv: string,
  deliveryBy: string,
  deliveryDate: string,
  txnNo: string,
  operatorName: string,
  note?: string,
  workZone?: string
): Promise<any> => {
  if (!API_URL) throw new Error("API URL is not configured. Please deploy the Apps Script first.");
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s Timeout

  try {
    const payload = {
      action: 'processBatch',
      subAction: action,
      items,
      cv,
      deliveryBy,
      deliveryDate,
      txnNo,
      operator: operatorName,
      note,
      workZone
    };

    const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=processBatch`;
    const res = await fetch(urlWithAction, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Batch transaction failed");
    const data = await res.json();
    if (data.status === "error") throw new Error(data.message);
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error("ส่งข้อมูลล่าช้าเกิน 45 วินาที (Timeout) กรุณาตรวจสอบอินเทอร์เน็ตและลองอีกครั้งเพื่อความปลอดภัยครับ");
    throw err;
  }
};

export const login = async (username: string, password: string, deviceInfo?: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL is not configured. Please deploy the Apps Script first.");
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s Timeout

  try {
    const payload = {
      action: 'login',
      username,
      password,
      deviceInfo
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Login failed to fetch");
    const data = await res.json();
    if (data.status === 'success' && data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      if (deviceInfo) localStorage.setItem('device-info', JSON.stringify(deviceInfo));
    }
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error("การเชื่อมต่อหมดเวลา (Timeout) กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่อีกครั้ง");
    throw err;
  }
};

export const pingStatus = async (username: string, name: string): Promise<any> => {
  if (!API_URL || !username) return { count: 0 };
  const infoRaw = localStorage.getItem('device-info');
  const info = infoRaw ? JSON.parse(infoRaw) : {};
  
  const payload = {
    action: 'pingStatus',
    username,
    name,
    ip: info.ip || '',
    loc: info.loc || ''
  };

  const res = await fetch(API_URL, {
     method: 'POST',
     headers: { 'Content-Type': 'text/plain' },
     body: JSON.stringify(payload)
  });
  return res.json();
};

export const getOnlineCount = async (): Promise<number> => {
   if (!API_URL) return 0;
   const res = await fetch(`${API_URL}${API_URL.includes('?') ? '&' : '?'}action=getOnlineCount`);
   const data = await res.json();
   return data.count || 0;
};

export const getNextCustomerCv = async (): Promise<string> => {
  if (!API_URL) return "A100001";
  const res = await fetch(`${API_URL}${API_URL.includes('?') ? '&' : '?'}action=getNextCustomerCv`);
  const data = await res.json();
  return data.cv || "A100001";
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const logoutData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('device-info');
  localStorage.removeItem('ete-active-tab');
};

// --- Settings & Admin API ---

export const getUsers = async (): Promise<any[]> => {
  if (!API_URL) return [];
  const res = await fetch(`${API_URL}?action=getUsers`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const saveUser = async (user: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=saveUser`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveUser', user })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const deleteUser = async (rowIndex: number): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=deleteUser`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'deleteUser', rowIndex })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const getSettings = async (): Promise<any> => {
  if (initialDataCache?.settings) return initialDataCache.settings;
  if (!API_URL) return {};
  const res = await fetch(`${API_URL}?action=getSettings`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const saveSettings = async (settings: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=saveSettings`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveSettings', settings })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const saveMasterItem = async (item: MaterialItem): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=saveMasterItem`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveMasterItem', item })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const saveMasterItems = async (items: MaterialItem[]): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=saveMasterItems`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveMasterItems', items })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const deleteMasterItem = async (rowIndex: number): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=deleteMasterItem`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'deleteMasterItem', rowIndex })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const setupTrigger = async (): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=setupTrigger`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'setupTrigger' })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const testDailyReport = async (): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=testDailyReport`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'testDailyReport' })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const testTelegram = async (): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=testTelegram`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'testTelegram' })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const relinkTelegram = async (webhookUrl: string): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=relinkTelegram`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'relinkTelegram', url: webhookUrl })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const cancelTransaction = async (txnNo: string, operator: string, reason?: string): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  
  // Send action in URL as well for maximum reliability with Apps Script redirects
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=cancelTransaction&txnNo=${txnNo}&operator=${encodeURIComponent(operator)}&reason=${encodeURIComponent(reason || '')}`;
  
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'cancelTransaction', txnNo, operator, reason })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const clearTransactions = async (): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=clearTransactions`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'clearTransactions' })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const getZones = async (forceRefetch = false): Promise<any[]> => {
  if (!forceRefetch && initialDataCache?.zones) return initialDataCache.zones;
  if (!API_URL) return [];
  const res = await fetch(`${API_URL}${API_URL.includes('?') ? '&' : '?'}action=getZones`);
  const data = await res.json();
  if (initialDataCache) initialDataCache.zones = data;
  return data;
};

export const saveZone = async (zone: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=saveZone`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveZone', zone })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const deleteZone = async (rowIndex: number): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=deleteZone`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'deleteZone', rowIndex })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const getCustomers = async (forceRefetch = false): Promise<any[]> => {
  if (!forceRefetch && initialDataCache?.customers) return initialDataCache.customers;
  if (!API_URL) return [];
  const res = await fetch(`${API_URL}${API_URL.includes('?') ? '&' : '?'}action=getCustomers`);
  const data = await res.json();
  if (initialDataCache) initialDataCache.customers = data;
  return data;
};

export const saveCustomer = async (customer: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=saveCustomer`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveCustomer', customer })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const deleteCustomer = async (rowIndex: number): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=deleteCustomer`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'deleteCustomer', rowIndex })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const getPermissions = async (): Promise<any> => {
  if (initialDataCache?.permissions) return initialDataCache.permissions;
  if (!API_URL) return {};
  const res = await fetch(`${API_URL}${API_URL.includes('?') ? '&' : '?'}action=getPermissions`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const savePermissions = async (permissions: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const urlWithAction = `${API_URL}${API_URL.includes('?') ? '&' : '?'}action=savePermissions`;
  const res = await fetch(urlWithAction, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'savePermissions', permissions })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

