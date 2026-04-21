import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ========== ITEMS (Master Inventory) ==========

// GET /api/items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.masterItem.findMany({ orderBy: { id: 'asc' } });
    // แปลงให้ตรงกับ format เดิมที่ Frontend คาดหวัง (Thai field names)
    const mapped = items.map(i => ({
      rowIndex: i.id,
      ประเภท: i.category,
      ยี่ห้อหรือรูปแบบ: i.brand ?? '',
      รายการ: i.item_name ?? '',
      สภาพ: i.condition ?? '',
      รายละเอียด: i.details ?? '',
      ขนาด: i.size ?? '',
      จำนวน: i.stock_qty,
      repair_qty: i.repair_qty || 0,
      scrap_qty: i.scrap_qty || 0,
      lost_qty: i.lost_qty || 0,
      quarantine_qty: i.quarantine_qty || 0
    }));
    return res.json(mapped);
  } catch (err: any) {
    return res.json({ status: 'error', message: err.message });
  }
});

// POST /api/items — upsert single item
router.post('/', async (req: Request, res: Response) => {
  const { item } = req.body;
  if (!item) return res.json({ status: 'error', message: 'No item provided' });

  try {
    const warehouseId = item.warehouseId ? Number(item.warehouseId) : null;
    const data = {
      category: item.ประเภท || item.category || '',
      brand: item.ยี่ห้อหรือรูปแบบ || item.brand || null,
      item_name: item.รายการ || item.item_name || null,
      condition: item.สภาพ || item.condition || null,
      details: item.รายละเอียด || item.details || null,
      size: item.ขนาด || item.size || null,
      stock_qty: Number(item.จำนวน ?? item.stock_qty ?? 0),
    };

    const result = await prisma.$transaction(async (tx) => {
      let masterItem;
      if (item.rowIndex) {
        masterItem = await tx.masterItem.update({ where: { id: item.rowIndex }, data });
      } else {
        masterItem = await tx.masterItem.create({ data });
      }

      if (warehouseId) {
        await tx.warehouseStock.upsert({
          where: {
            item_id_warehouse_id: {
              item_id: masterItem.id,
              warehouse_id: warehouseId
            }
          },
          update: { stock_qty: data.stock_qty },
          create: { warehouse_id: warehouseId, item_id: masterItem.id, stock_qty: data.stock_qty }
        });
      }
      return masterItem;
    });

    return res.json({ status: 'success', item: { ...result, rowIndex: result.id } });
  } catch (err: any) {
    console.error('Save Item Error:', err);
    return res.json({ status: 'error', message: err.message });
  }
});

// POST /api/items/batch — upsert multiple items
router.post('/batch', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.json({ status: 'error', message: 'items must be an array' });

  try {
    const created: any[] = [];
    const warehouseIdInput = req.body.warehouseId ? Number(req.body.warehouseId) : null;
    
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const warehouseId = warehouseIdInput || (item.warehouseId ? Number(item.warehouseId) : null);
        const data = {
          category: item.ประเภท || item.category || '',
          brand: item.ยี่ห้อหรือรูปแบบ || item.brand || null,
          item_name: item.รายการ || item.item_name || null,
          condition: item.สภาพ || item.condition || null,
          details: item.รายละเอียด || item.details || null,
          size: item.ขนาด || item.size || null,
          stock_qty: Number(item.จำนวน ?? item.stock_qty ?? 0),
        };

        let masterItem;
        if (item.rowIndex) {
          masterItem = await tx.masterItem.update({ where: { id: item.rowIndex }, data });
        } else {
          masterItem = await tx.masterItem.create({ data });
        }

        if (warehouseId) {
          await tx.warehouseStock.upsert({
            where: {
              item_id_warehouse_id: {
                item_id: masterItem.id,
                warehouse_id: warehouseId
              }
            },
            update: { stock_qty: data.stock_qty },
            create: { warehouse_id: warehouseId, item_id: masterItem.id, stock_qty: data.stock_qty }
          });
        }
        created.push({ ...masterItem, rowIndex: masterItem.id });
      }
    });

    return res.json({ status: 'success', items: created });
  } catch (err: any) {
    console.error('Batch Item Error:', err);
    return res.json({ status: 'error', message: err.message });
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await prisma.masterItem.delete({ where: { id } });
    return res.json({ status: 'success' });
  } catch (err: any) {
    return res.json({ status: 'error', message: err.message });
  }
});

export default router;
