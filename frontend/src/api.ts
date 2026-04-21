import type { MaterialItem, Transaction } from './types';

export let API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3002/api`;

// Force clear storage to prevent ghost connections
localStorage.removeItem('ete_app_script_url');

export const updateApiUrl = (newUrl: string) => {
  API_URL = newUrl || import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3002/api`;
};

export const resetApiUrl = () => {
  API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001/api`;
  localStorage.removeItem('ete_app_script_url');
};

export let initialDataCache: any = null;
export const invalidateCache = () => { initialDataCache = null; };

export const safeFetch = async (url: string, options: any = {}, retries = 2): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);

  let token = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      token = user.token || null;
    }
  } catch (e) { }

  const headers: Record<string, string> = {
    ...options.headers,
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const finalOptions = {
    ...options,
    signal: options.signal || controller.signal,
    cache: 'no-store',
    headers: headers,
  };

  try {
    const res = await fetch(url, finalOptions);
    clearTimeout(id);
    if (!res.ok && retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return safeFetch(url, options, retries - 1);
    }
    return res;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError' && retries > 0) {
      if (!options.signal || !options.signal.aborted) {
        return safeFetch(url, options, retries - 1);
      }
    } else if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return safeFetch(url, options, retries - 1);
    }
    throw err;
  }
};

export const getInitialData = async (): Promise<any> => {
  if (!API_URL) throw new Error("API URL is not configured. Please start backend server.");
  const res = await safeFetch(`${API_URL}/initialData?t=${Date.now()}`);
  if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลเริ่มต้นได้ (Network Error)");
  const data = await res.json();
  initialDataCache = data;
  return data;
};

export const getItems = async (forceRefetch = false): Promise<MaterialItem[]> => {
  if (!API_URL) return [];
  if (!forceRefetch && initialDataCache?.items) return initialDataCache.items;
  const res = await safeFetch(`${API_URL}/items?t=${Date.now()}`);
  if (!res.ok) throw new Error("Failed to fetch items");
  const data = await res.json();
  if (initialDataCache) initialDataCache.items = data;
  return data;
};

export const getMaterials = getItems;

export const getTransactions = async (forceRefetch = false): Promise<Transaction[]> => {
  if (!API_URL) return [];
  if (!forceRefetch && initialDataCache?.transactions) return initialDataCache.transactions;
  const res = await safeFetch(`${API_URL}/transactions?t=${Date.now()}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  if (initialDataCache) initialDataCache.transactions = data;
  return data;
};

export const getNextTxnNo = async (): Promise<string> => {
  if (!API_URL) return '000000';
  const res = await safeFetch(`${API_URL}/transactions/next-txn-no`);
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
  operator: string,
  note: string = '',
  workZone: string = '',
  notifier?: string,
  notificationDate?: string,
  returnReason?: string,
  cabinetCondition?: string,
  photos?: string[]
): Promise<any> => {
  if (!API_URL) throw new Error("API URL is not configured.");
  const payload = { action, item, quantity, cv, deliveryBy, deliveryDate, txnNo, operator, note, workZone, notifier, notificationDate, returnReason, cabinetCondition, photos };
  const res = await safeFetch(`${API_URL}/transactions/single`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("Transaction failed");
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  invalidateCache();
  return data;
};

export interface BatchTransactionParams {
  action: 'receive' | 'issue' | 'return' | 'survey';
  items: { item: MaterialItem, quantity: number, isSub?: boolean, subType?: string }[];
  cv: string;
  deliveryBy: string;
  deliveryDate: string;
  txnNo: string;
  operator: string;
  note: string;
  workZone: string;
  notifier?: string;
  notificationDate?: string;
  returnReason?: string;
  cabinetCondition?: string;
  photos?: string[];
  jobId?: string;
  status?: string;
  lat?: string;
  lng?: string;
  warehouseId?: number;
  toWarehouseId?: number;
}

export const processBatchTransaction = async (params: BatchTransactionParams): Promise<any> => {
  if (!API_URL) return { status: 'error', message: 'API URL not configured' };
  const { action, items, cv, deliveryBy, deliveryDate, txnNo, operator, note, workZone, notifier, notificationDate, returnReason, cabinetCondition, photos, jobId, status, lat, lng, warehouseId, toWarehouseId } = params;
  const defaultStatusLabel = action === 'return' ? 'รับคืนแล้ว' : (action === 'receive' ? 'รับเข้า' : 'เบิกออก');
  const finalStatus = status || defaultStatusLabel;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  try {
    const payload = { action: 'processBatch', subAction: action, status: finalStatus, items, cv, deliveryBy, deliveryDate, txnNo, operator, note, workZone, notifier, notificationDate, returnReason, cabinetCondition, photos, jobId, lat, lng, warehouseId, toWarehouseId };
    const res = await safeFetch(`${API_URL}/transactions/processBatch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Batch transaction failed");
    const data = await res.json();
    if (data.status === "error") throw new Error(data.message);
    invalidateCache();
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error("ส่งข้อมูลล่าช้าเกิน 45 วินาที (Timeout)");
    throw err;
  }
};

export const login = async (username: string, password: string, deviceInfo?: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL is not configured.");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  try {
    const payload = { action: 'login', username, password, deviceInfo };
    const res = await safeFetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    if (data.status === 'success' && data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      if (deviceInfo) localStorage.setItem('device-info', JSON.stringify(deviceInfo));
    }
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error("การเชื่อมต่อหมดเวลา (Timeout)");
    throw err;
  }
};

export const pingStatus = async (username: string, name: string): Promise<any> => {
  if (!API_URL || !username) return { count: 0 };
  const infoRaw = localStorage.getItem('device-info');
  const info = infoRaw ? JSON.parse(infoRaw) : {};
  const payload = { action: 'pingStatus', username, name, ip: info.ip || '', loc: info.loc || '' };
  const res = await safeFetch(`${API_URL}/auth/ping`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return res.json();
};

export const getOnlineCount = async (): Promise<number> => {
  if (!API_URL) return 0;
  const res = await safeFetch(`${API_URL}/auth/onlineCount`);
  const data = await res.json();
  return data.count || 0;
};

export const getNextCustomerCv = async (): Promise<string> => {
  if (!API_URL) return "A100001";
  const res = await safeFetch(`${API_URL}/customers/next-cv`);
  const data = await res.json();
  return data.cv || "A100001";
};

export const saveJobRequest = async (payload: {
  cv: string;
  deliveryItems: any[];
  returnItems: any[];
  operator: string;
  note: string;
  returnReason?: string;
  appointmentDate?: string;
  warehouseId?: number;
  photos?: string[];
}): Promise<any> => {
  if (!API_URL) throw new Error("API URL is not configured.");
  const res = await safeFetch(`${API_URL}/transactions/jobRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const getJobRequests = async (cv?: string): Promise<any[]> => {
  if (!API_URL) return [];
  const url = `${API_URL}/transactions/jobRequests${cv ? `?cv=${cv}` : ''}`;
  const res = await safeFetch(url);
  const data = await res.json();
  return data;
};

export const getLogisticsJobs = async (): Promise<any[]> => {
  if (!API_URL) return [];
  const res = await safeFetch(`${API_URL}/transactions/logistics/jobs`);
  if (!res.ok) throw new Error("Failed to fetch logistics jobs");
  const data = await res.json();
  return data;
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
  const res = await safeFetch(`${API_URL}/settings/users`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const saveUser = async (user: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const currentUser = getCurrentUser();
  const userWithOperator = { ...user, currentOperator: currentUser?.name || 'Unknown' };
  const res = await safeFetch(`${API_URL}/settings/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: userWithOperator })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const deleteUser = async (rowIndex: number): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/settings/users/${rowIndex}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const getSettings = async (forceRefetch = false): Promise<any> => {
  if (!forceRefetch && initialDataCache?.settings) return initialDataCache.settings;
  if (!API_URL) return {};
  const res = await safeFetch(`${API_URL}/settings`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  if (initialDataCache) initialDataCache.settings = data;
  return data;
};

export const saveSettings = async (settings: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  if (initialDataCache) initialDataCache.settings = settings;
  return data;
};

export const saveMasterItem = async (item: MaterialItem): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const currentUser = getCurrentUser();
  const itemWithOperator = { ...item, operator: currentUser?.name || 'Unknown' };
  const res = await safeFetch(`${API_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: itemWithOperator })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  if (initialDataCache && initialDataCache.items) {
    const idx = initialDataCache.items.findIndex((it: any) => it.rowIndex === item.rowIndex);
    if (idx !== -1) initialDataCache.items[idx] = item;
    else initialDataCache.items.push(item);
  }
  return data;
};

export const saveMasterItems = async (items: MaterialItem[]): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const currentUser = getCurrentUser();
  const operator = currentUser?.name || 'Unknown';
  const itemsWithOperator = items.map(it => ({ ...it, operator }));
  const res = await safeFetch(`${API_URL}/items/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: itemsWithOperator })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  if (initialDataCache) initialDataCache.items = items;
  return data;
};

export const deleteMasterItem = async (rowIndex: number): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/items/${rowIndex}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const setupTrigger = async (): Promise<any> => {
  return { status: 'success', message: 'Not needed in Node.js backend' };
};

export const testDailyReport = async (): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/settings/testDailyReport`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const testTelegram = async (): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/settings/testTelegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const relinkTelegram = async (webhookUrl: string): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/settings/relinkTelegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const cancelTransaction = async (txnNo: string, operator: string, reason?: string): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/transactions/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txnNo, operator, reason })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const clearTransactions = async (): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/transactions/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const getZones = async (forceRefetch = false): Promise<any[]> => {
  if (!forceRefetch && initialDataCache?.zones) return initialDataCache.zones;
  if (!API_URL) return [];
  const res = await safeFetch(`${API_URL}/zones`);
  const data = await res.json();
  if (initialDataCache) initialDataCache.zones = data;
  return data;
};

export const saveZone = async (zone: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  if (initialDataCache && initialDataCache.zones) {
    const idx = initialDataCache.zones.findIndex((z: any) => z.rowIndex === zone.rowIndex);
    if (idx !== -1) initialDataCache.zones[idx] = zone;
    else initialDataCache.zones.push(zone);
  }
  return data;
};

export const deleteZone = async (rowIndex: string): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/zones/${rowIndex}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const getCustomers = async (forceRefetch = false): Promise<any[]> => {
  if (!forceRefetch && initialDataCache?.customers) return initialDataCache.customers;
  if (!API_URL) return [];
  const res = await safeFetch(`${API_URL}/customers`);
  const data = await res.json();
  if (initialDataCache) initialDataCache.customers = data;
  return data;
};

export const saveCustomer = async (customer: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  if (initialDataCache && initialDataCache.customers) {
    const idx = initialDataCache.customers.findIndex((c: any) => c.rowIndex === customer.rowIndex);
    if (idx !== -1) initialDataCache.customers[idx] = customer;
    else initialDataCache.customers.push(customer);
  }
  return data;
};

export const deleteCustomer = async (rowIndex: string): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/customers/${rowIndex}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const getPermissions = async (): Promise<any> => {
  if (initialDataCache?.permissions) return initialDataCache.permissions;
  if (!API_URL) return {};
  const res = await safeFetch(`${API_URL}/auth/permissions`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
};

export const savePermissions = async (permissions: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/auth/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions })
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  if (initialDataCache) initialDataCache.permissions = permissions;
  return data;
};

export const getWarehouses = async (forceRefetch = false): Promise<any[]> => {
  if (!forceRefetch && initialDataCache?.warehouses) return initialDataCache.warehouses;
  if (!API_URL) return [];
  const res = await safeFetch(`${API_URL}/warehouses`);
  const data = await res.json();
  if (initialDataCache) initialDataCache.warehouses = data;
  return data;
};

export const saveWarehouse = async (warehouse: any): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/warehouses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(warehouse)
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  if (initialDataCache) {
    if (!initialDataCache.warehouses) initialDataCache.warehouses = [];
    const idx = initialDataCache.warehouses.findIndex((w: any) => w.id === data.warehouse?.id);
    if (idx !== -1) initialDataCache.warehouses[idx] = data.warehouse;
    else initialDataCache.warehouses.push(data.warehouse);
  }
  return data;
};

export const deleteWarehouse = async (id: number): Promise<any> => {
  if (!API_URL) throw new Error("API URL not configured");
  const res = await safeFetch(`${API_URL}/warehouses/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  if (initialDataCache) delete initialDataCache.warehouses;
  return data;
};
