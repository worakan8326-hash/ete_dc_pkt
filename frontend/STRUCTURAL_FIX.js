import fs from 'fs';
const path = 'src/api.ts';
let content = fs.readFileSync(path, 'utf8');

// ลบส่วนที่ซ้ำซ้อนและพังออกจนถึงจุดที่เริ่ม Transactions
const startOfGoodCode = content.indexOf('export const getTransactions');
const usefulCode = content.substring(startOfGoodCode);

const finalContent = `import type { MaterialItem, Transaction } from './types';

export const API_URL = "https://script.google.com/macros/s/AKfycbxt1Ewqq1k75q6ZcDETVaR2f3VyMnnERI9z_Y9BalTW6U24lCV3xT58S0SOjK4Lzm5TRQ/exec";

export const getItems = async (): Promise<MaterialItem[]> => {
  if (!API_URL) return [];
  const res = await fetch(\`\${API_URL}?action=getItems\`);
  if (!res.ok) throw new Error("Failed to fetch items");
  return res.json();
};

export const getMaterials = getItems; // Alias for App.tsx compatibility

` + usefulCode;

fs.writeFileSync(path, finalContent, 'utf8');
console.log("api.ts structural fix completed.");
