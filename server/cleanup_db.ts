import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Database Cleanup...');

  try {
    // 1. Delete Transactions
    const deleteTxns = await prisma.transaction.deleteMany({});
    console.log(`✅ Deleted ${deleteTxns.count} Transactions`);

    // 2. Delete Jobs
    const deleteJobs = await prisma.job.deleteMany({});
    console.log(`✅ Deleted ${deleteJobs.count} Jobs`);

    // 3. Reset MasterItem Quantities to zero
    const resetMasterItems = await prisma.masterItem.updateMany({
      data: {
        stock_qty: 0,
        quarantine_qty: 0,
        repair_qty: 0,
        scrap_qty: 0,
        lost_qty: 0,
        transit_qty: 0
      }
    });
    console.log(`✅ Reset ${resetMasterItems.count} MasterItems to zero quantity`);

    // 4. Reset WarehouseStock Quantities to zero
    const resetWarehouseStocks = await prisma.warehouseStock.updateMany({
      data: {
        stock_qty: 0,
        quarantine_qty: 0,
        repair_qty: 0,
        scrap_qty: 0,
        lost_qty: 0,
        transit_qty: 0
      }
    });
    console.log(`✅ Reset ${resetWarehouseStocks.count} WarehouseStocks to zero quantity`);

    console.log('✨ Cleanup Complete. Database is ready for fresh testing!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
