import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Deleting items containing "มือสอง" and their stock records...');

  try {
    // 1. Find items to delete
    const itemsToDelete = await prisma.masterItem.findMany({
      where: {
        OR: [
          { category: { contains: 'มือสอง' } },
          { brand: { contains: 'มือสอง' } },
          { item_name: { contains: 'มือสอง' } },
          { condition: { contains: 'มือสอง' } },
          { details: { contains: 'มือสอง' } }
        ]
      },
      select: { id: true }
    });

    const itemIds = itemsToDelete.map(i => i.id);

    if (itemIds.length === 0) {
      console.log('✅ No items found containing "มือสอง".');
      return;
    }

    console.log(`🔍 Found ${itemIds.length} items to delete.`);

    // 2. Delete related WarehouseStock first
    const deletedStock = await prisma.warehouseStock.deleteMany({
      where: { item_id: { in: itemIds } }
    });
    console.log(`✅ Deleted ${deletedStock.count} WarehouseStock records.`);

    // 3. Delete MasterItem
    const deletedItems = await prisma.masterItem.deleteMany({
      where: { id: { in: itemIds } }
    });
    console.log(`✅ Deleted ${deletedItems.count} MasterItem records.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
