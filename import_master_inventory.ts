import xlsx from 'xlsx';
const { readFile, utils } = xlsx;
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const filePath = 'C:\\Users\\Rocket Star\\Desktop\\ete_dc_pkt\\MasterInventory_1776794385351.xlsx';

async function main() {
  console.log('🔄 กำลังอ่านไฟล์ Master Inventory...');
  const workbook = readFile(filePath);

  const sheetName = 'MasterData';
  const masterSheet = workbook.Sheets[sheetName];

  if (!masterSheet) {
    console.error(`❌ ไม่พบ Sheet ชื่อ "${sheetName}" ในไฟล์ Excel`);
    return;
  }

  console.log('🧹 กำลังล้างข้อมูล Item เดิม...');
  // ล้างข้อมูลเพื่อป้องกัน ID ซ้ำซ้อนและเพื่อให้ข้อมูลเป็นชุดล่าสุด
  // ต้องล้าง WarehouseStock, Transaction, Job ก่อนเพราะติด Foreign Key
  await prisma.transaction.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.warehouseStock.deleteMany({});
  await prisma.masterItem.deleteMany({});

  // หา Warehouse แรกเพื่อเป็นค่าเริ่มต้น
  const firstWarehouse = await prisma.warehouse.findFirst();
  const defaultWarehouseId = firstWarehouse ? firstWarehouse.id : 1;
  console.log(`📍 ใช้ Warehouse ID: ${defaultWarehouseId} เป็นค่าเริ่มต้น`);

  const data: any[] = utils.sheet_to_json(masterSheet, { header: 1 });
  let count = 0;

  console.log('📥 กำลังนำเข้าข้อมูล...');
  
  // เริ่มจาก i = 1 เพื่อข้าม Header
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Column Index (อ้างอิงจากโครงสร้างที่ตรวจสอบ):
    // 0: rowIndex (ข้าม)
    // 1: ประเภท (category)
    // 2: ยี่ห้อหรือรูปแบบ (brand)
    // 3: รายการ (item_name)
    // 4: สภาพ (condition)
    // 5: รายละเอียด (details)
    // 6: ขนาด (size)
    // 7: จำนวน (stock_qty)

    if (row[1] || row[2] || row[3]) {
      const stockQty = row[7] ? parseInt(String(row[7])) : 0;
      
      const newItem = await prisma.masterItem.create({
        data: {
          category: String(row[1] || ''),
          brand: row[2] ? String(row[2]) : null,
          item_name: row[3] ? String(row[3]) : null,
          condition: row[4] ? String(row[4]) : null,
          details: row[5] ? String(row[5]) : null,
          size: row[6] ? String(row[6]) : null,
          stock_qty: stockQty,
        }
      });
      
      // บันทึกสต๊อกใน WarehouseStock ด้วยเพื่อให้แสดงผลในระบบ
      if (stockQty > 0) {
        await prisma.warehouseStock.create({
          data: {
            item_id: newItem.id,
            warehouse_id: defaultWarehouseId,
            stock_qty: stockQty
          }
        });
      }
      count++;
    }
  }

  console.log(`✅ นำเข้า MasterItems สำเร็จ: ${count} รายการ`);
  console.log('🎉 เสร็จสิ้น!');
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาด:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
