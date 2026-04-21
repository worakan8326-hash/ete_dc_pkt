import fs from 'fs';
const path = 'src/api.ts';
let content = fs.readFileSync(path, 'utf8');

// ลบส่วนหัวที่พังออก (ถ้ามี)
content = content.replace(/^[\s\S]*?export const getItems/g, 'export const getItems');

// เติม API_URL กลับเข้าไปที่บรรทัดบนสุด
const newContent = `import type { MaterialItem, Transaction } from './types';

export const API_URL = "https://script.google.com/macros/s/AKfycbxt1Ewqq1k75q6ZcDETVaR2f3VyMnnERI9z_Y9BalTW6U24lCV3xT58S0SOjK4Lzm5TRQ/exec";

` + content;

fs.writeFileSync(path, newContent, 'utf8');
console.log("api.ts fixed successfully with new URL.");
