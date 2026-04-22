import xlsx from 'xlsx';
const { readFile, utils } = xlsx;
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const filePath = 'C:\\Users\\Rocket Star\\Desktop\\ete_dc_pkt\\Data_ete_pk_dc_ims (3).xlsx';

async function main() {
  console.log('🔄 กำลังอ่านไฟล์ Excel...');
  const workbook = readFile(filePath);

  // 1. Settings
  const settingsSheet = workbook.Sheets['Settings'];
  if (settingsSheet) {
    const data: any[] = utils.sheet_to_json(settingsSheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        await prisma.systemSetting.upsert({
          where: { key: String(row[0]) },
          update: { value: row[1] ? String(row[1]) : '' },
          create: { key: String(row[0]), value: row[1] ? String(row[1]) : '' }
        });
        count++;
      }
    }
    console.log(`✅ Settings imported: ${count}`);
  }

  // 2. Roles/Permissions
  const permSheet = workbook.Sheets['Permissions'];
  if (permSheet) {
    const data: any[] = utils.sheet_to_json(permSheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] && row[1]) {
            try {
                const perms = typeof row[1] === 'string' ? JSON.parse(row[1]) : row[1];
                await prisma.rolePermission.upsert({
                    where: { role: String(row[0]) },
                    update: { permissions: perms },
                    create: { role: String(row[0]), permissions: perms }
                });
                count++;
            } catch(e) {}
        }
    }
    console.log(`✅ Permissions imported: ${count}`);
  }

  // 3. Users
  const usersSheet = workbook.Sheets['Users'];
  if (usersSheet) {
    const data: any[] = utils.sheet_to_json(usersSheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] && row[1]) { // Username, Password
        await prisma.user.upsert({
          where: { username: String(row[0]) },
          update: { 
            password: String(row[1]),
            name: String(row[2] || ''),
            role: String(row[3] || 'staff')
          },
          create: {
            username: String(row[0]),
            password: String(row[1]),
            name: String(row[2] || ''),
            role: String(row[3] || 'staff')
          }
        });
        count++;
      }
    }
    console.log(`✅ Users imported: ${count}`);
  }

  // 4. Customers
  const custSheet = workbook.Sheets['Customers'];
  if (custSheet) {
    const data: any[] = utils.sheet_to_json(custSheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        await prisma.customer.upsert({
          where: { cv: String(row[0]) },
          update: {
            name: String(row[1] || ''),
            phone: row[2] ? String(row[2]) : null,
            address: row[3] ? String(row[3]) : null,
            sub_district: row[4] ? String(row[4]) : null,
            district: row[5] ? String(row[5]) : null,
            province: row[6] ? String(row[6]) : null,
            zipcode: row[7] ? String(row[7]) : null,
            latitude: row[8] ? parseFloat(String(row[8])) : null,
            longitude: row[9] ? parseFloat(String(row[9])) : null,
          },
          create: {
            cv: String(row[0]),
            name: String(row[1] || ''),
            phone: row[2] ? String(row[2]) : null,
            address: row[3] ? String(row[3]) : null,
            sub_district: row[4] ? String(row[4]) : null,
            district: row[5] ? String(row[5]) : null,
            province: row[6] ? String(row[6]) : null,
            zipcode: row[7] ? String(row[7]) : null,
            latitude: row[8] ? parseFloat(String(row[8])) : null,
            longitude: row[9] ? parseFloat(String(row[9])) : null,
          }
        });
        count++;
      }
    }
    console.log(`✅ Customers imported: ${count}`);
  }

  // 5. Zones
  const zonesSheet = workbook.Sheets['Zones'];
  if (zonesSheet) {
    const data: any[] = utils.sheet_to_json(zonesSheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        await prisma.zone.upsert({
          where: { name: String(row[0]) },
          update: { details: row[1] ? String(row[1]) : '' },
          create: { name: String(row[0]), details: row[1] ? String(row[1]) : '' }
        });
        count++;
      }
    }
    console.log(`✅ Zones imported: ${count}`);
  }

  // 6. Master (Items) -> ในไฟล์ชื่อ sheet "data"
  const masterSheet = workbook.Sheets['data'];
  if (masterSheet) {
    // delete all items first because we are repopulating ids
    // also delete transactions to avoid foreign key errors
    await prisma.transaction.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.warehouseStock.deleteMany({}); // Delete warehouse stocks first
    await prisma.masterItem.deleteMany({});

    // Get the first warehouse ID to use as default for stock restoration
    const firstWarehouse = await prisma.warehouse.findFirst();
    const defaultWarehouseId = firstWarehouse ? firstWarehouse.id : 1;

    const data: any[] = utils.sheet_to_json(masterSheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Index 0 = ประเภท, 1 = ยี่ห้อ, 2 = รายการ, 3 = สภาพ, 4 = รายละเอียด, 5 = ขนาด, 6 = จำนวนสต๊อก
      if (row[0] || row[1] || row[2]) {
        const stockQty = row[6] ? parseInt(String(row[6])) : 0;
        const newItem = await prisma.masterItem.create({
          data: {
            category: String(row[0] || ''),
            brand: row[1] ? String(row[1]) : null,
            item_name: row[2] ? String(row[2]) : null,
            condition: row[3] ? String(row[3]) : null,
            details: row[4] ? String(row[4]) : null,
            size: row[5] ? String(row[5]) : null,
            stock_qty: stockQty,
          }
        });
        
        // Also create a WarehouseStock record so the frontend shows the stock
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
    console.log(`✅ MasterItems imported: ${count}`);
  }

  console.log('🎉 นำเข้าข้อมูลทั้งหมดลงฐานข้อมูลเสร็จสิ้น สำเร็จ!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
