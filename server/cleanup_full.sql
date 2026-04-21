-- ล้างข้อมูล Transaction และ Job ทั้งหมด
TRUNCATE TABLE "Transaction" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Job" RESTART IDENTITY CASCADE;

-- รีเซตถังขยะและจำนวนพัสดุในคลังให้กลับเป็น 0 (ยกเว้น stock_qty ที่ให้มีไว้ทดสอบ)
UPDATE "MasterItem" SET 
  repair_qty = 0, 
  scrap_qty = 0, 
  lost_qty = 0, 
  quarantine_qty = 0, 
  transit_qty = 0;

UPDATE "WarehouseStock" SET 
  repair_qty = 0, 
  scrap_qty = 0, 
  lost_qty = 0, 
  quarantine_qty = 0, 
  transit_qty = 0;
