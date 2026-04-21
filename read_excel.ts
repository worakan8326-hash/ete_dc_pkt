import * as xlsx from 'xlsx';
import * as fs from 'fs';

const filePath = 'C:\\Users\\Rocket Star\\Desktop\\ete_dc_pkt\\LABTEST_Data_ete_pk_dc_ims.xlsx';

try {
  const workbook = xlsx.readFile(filePath);
  console.log('📌 Sheet Names:', workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n=== 📊 ${sheetName} (Rows: ${data.length}) ===`);
    console.log('Header:', data[0]);
    if (data.length > 1) {
      console.log('Row 1:', data[1]);
    }
  }
} catch (e) {
  console.error("Error reading file:", e);
}
