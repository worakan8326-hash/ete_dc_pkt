import * as xlsx from 'xlsx';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function importItems() {
  const filePath = path.join(__dirname, '..', 'Data_ete_pk_dc_ims (3).xlsx');
  console.log(`📖 Loading file: ${filePath}`);

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = 'data';
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`ไม่พบแท็บ "${sheetName}" ในไฟล์ Excel`);
    }

    // Convert to JSON
    const rows = xlsx.utils.sheet_to_json(sheet);
    console.log(`📊 Found ${rows.length} rows in Excel.`);

    // 1. Clear old data (Clear in order to avoid FK constraints)
    console.log('🗑 Clearing all transaction & history data for a fresh start...');
    await prisma.auditLog.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.warehouseStock.deleteMany({}); // เพิ่มบรรทัดนี้
    await prisma.masterItem.deleteMany({});

    // 2. Prepare mapping
    // Excel Header -> Prisma field
    const mapping: Record<string, string> = {
      'ประเภท': 'category',
      'ยี่ห้อ/รูปแบบ': 'brand',
      'ยี่ห้อ': 'brand',
      'ยี่ห้อหรือรูปแบบ': 'brand',
      'รายการ': 'item_name',
      'สภาพ': 'condition',
      'รายละเอียดเพิ่มเติม': 'details',
      'รายละเอียด': 'details',
      'ขนาด': 'size',
      'ยอดคงเหลือปัจจุบัน': 'stock_qty',
      'สต็อก': 'stock_qty',
      'จำนวน': 'stock_qty'
    };

    const newItems = rows.map((row: any) => {
      const item: any = {
        category: '',
        brand: '',
        item_name: '',
        condition: '',
        details: '',
        size: '',
        stock_qty: 0
      };

      for (const [key, value] of Object.entries(row)) {
        const field = mapping[key.trim()];
        if (field) {
          if (field === 'stock_qty') {
            item[field] = parseInt(String(value || 0)) || 0;
          } else {
            item[field] = String(value || '').trim();
          }
        }
      }
      return item;
    }).filter(it => it.category || it.item_name); // Filter out empty rows

    console.log(`🚀 Inserting ${newItems.length} items into MasterItem...`);

    // Use createMany for speed
    await prisma.masterItem.createMany({
      data: newItems,
      skipDuplicates: true
    });

    console.log('✅ Import Completed successfully!');

  } catch (err: any) {
    console.error('❌ Import Failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

importItems();
