import fs from 'fs';
const path = 'src/api.ts';
let content = fs.readFileSync(path, 'utf8');

// ลบส่วนหัวที่พังออก (ถ้ามี)
content = content.replace(/^[\s\S]*?export const getItems/g, 'export const getItems');

// เติม API_URL กลับเข้าไปที่บรรทัดบนสุด
const newContent = `import type { MaterialItem, Transaction } from './types';

export const API_URL = "https://script.google.com/macros/s/AKfycbz-O_-jc6ptIpWe6PWlEWGA18j8isnn2NhPkFDUzbCtt8t0vNwgPT1m24U7vS0OO9z3/exec";

` + content;

fs.writeFileSync(path, newContent, 'utf8');
console.log("api.ts fixed successfully with new URL.");
