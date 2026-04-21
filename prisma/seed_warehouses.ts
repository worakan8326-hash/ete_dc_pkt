import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding warehouses and stock levels...');

  // 1. Create Warehouses
  const warehouses = [
    { name: 'สำนักงานใหญ่ (ภูเก็ต)' },
    { name: 'คลังพังงา' },
    { name: 'คลังกระบี่' }
  ];

  for (const w of warehouses) {
    await prisma.warehouse.upsert({
      where: { name: w.name },
      update: {},
      create: w,
    });
  }

  const allWarehouses = await prisma.warehouse.findMany();
  const allItems = await prisma.masterItem.findMany();

  console.log(`📍 Total Warehouses: ${allWarehouses.length}`);
  console.log(`🧊 Total Master Items: ${allItems.length}`);

  // 2. Seed 5 units for each item in each warehouse
  // We'll update the global stock_qty in MasterItem as well (sum of all warehouses)
  for (const item of allItems) {
    let globalStock = 0;
    
    for (const wh of allWarehouses) {
      await prisma.warehouseStock.upsert({
        where: {
          item_id_warehouse_id: {
            item_id: item.id,
            warehouse_id: wh.id
          }
        },
        update: { stock_qty: 5 },
        create: {
          item_id: item.id,
          warehouse_id: wh.id,
          stock_qty: 5
        }
      });
      globalStock += 5;
    }

    // Update the cache in MasterItem
    await prisma.masterItem.update({
      where: { id: item.id },
      data: { stock_qty: globalStock }
    });
  }

  console.log('✅ Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
