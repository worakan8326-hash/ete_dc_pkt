DELETE FROM "Transaction";
DELETE FROM "Job";
UPDATE "MasterItem" SET "quarantine_qty" = 0, "repair_qty" = 0, "scrap_qty" = 0, "lost_qty" = 0, "transit_qty" = 0;
UPDATE "WarehouseStock" SET "quarantine_qty" = 0, "repair_qty" = 0, "scrap_qty" = 0, "lost_qty" = 0, "transit_qty" = 0;
