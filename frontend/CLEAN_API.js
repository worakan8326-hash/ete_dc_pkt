import fs from 'fs';
const path = 'src/api.ts';
let content = fs.readFileSync(path, 'utf8');

// ลบส่วนหัวที่พังออกให้หมดจนถึงจุดที่มี export ตัวแรกจริงๆ
const startIdx = content.indexOf('export const API_URL');
if (startIdx !== -1) {
    content = content.substring(startIdx);
}

const cleanHeader = `import type { MaterialItem, Transaction } from './types';

`;

fs.writeFileSync(path, cleanHeader + content, 'utf8');
console.log("api.ts cleaned successfully.");
