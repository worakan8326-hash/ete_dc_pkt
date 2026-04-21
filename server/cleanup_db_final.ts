import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Starting Full Database Cleanup...');
  
  try {
    // 1. Delete all Transactions
    const deleteTxns = await prisma.transaction.deleteMany({});
    console.log(`✅ Deleted ${deleteTxns.count} transactions.`);

    // 2. Delete all Jobs
    const deleteJobs = await prisma.job.deleteMany({});
    console.log(`✅ Deleted ${deleteJobs.count} jobs.`);

    // 3. Reset MasterItem stock buckets (except physical stock)
    const resetMasterItems = await prisma.masterItem.updateMany({
      data: {
        repair_qty: 0,
        scrap_qty: 0,
        lost_qty: 0,
        quarantine_qty: 0,
        transit_qty: 0
      }
    });
    console.log(`✅ Reset MasterItem stock buckets for ${resetMasterItems.count} types.`);

    // 4. Reset WarehouseStock buckets
    const resetWarehouseStocks = await prisma.warehouseStock.updateMany({
      data: {
        repair_qty: 0,
        scrap_qty: 0,
        lost_qty: 0,
        quarantine_qty: 0,
        transit_qty: 0
      }
    });
    console.log(`✅ Reset WarehouseStock buckets for ${resetWarehouseStocks.count} records.`);

    console.log('✨ Database is now completely clean and ready.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
