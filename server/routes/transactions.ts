import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { format } from 'date-fns';
import { Notifier } from '../lib/notifier';
import { ITEM_STATUS, JOB_STATUS, statusMatches } from '../lib/constants';
import { getDistance } from '../lib/location';

const router = Router();

// ========== TRANSACTIONS (Jobs & Details) ==========

// GET /api/transactions
router.get('/', async (_req: Request, res: Response) => {
  try {
    const txns = await prisma.transaction.findMany({
      include: {
        item: true,
        job: { include: { customer: true } },
        operator: true,
      },
      orderBy: { created_at: 'desc' },
      take: 500, // Limit for performance
    });

    const mapped = txns.map(t => {
      // Reconstruct CV or name
      const cv = t.job?.customer?.cv ?? '';

      return {
        id: t.id.toString(), // Send ID as backup string
        เลขที่รายการ: t.job_id ?? `TXN-${t.id}`,
        "วัน-เวลา": t.created_at.toISOString(),
        ผู้ทำรายการ: t.operator?.name ?? t.delivery_by ?? 'Unknown',
        สถานะ: t.action_type,
        ประเภท: t.item?.category ?? 'งานบริการ (กิจกรรม)',
        "ยี่ห้อ/รูปแบบ": t.item?.brand ?? t.activity_name ?? '',
        รายการ: t.item?.item_name ?? t.activity_name ?? '',
        สภาพ: t.item?.condition ?? 'ปกติ',
        รายละเอียด: t.item?.details ?? '',
        ขนาด: t.item?.size ?? '',
        จำนวน: t.quantity,
        CV: cv || t.job?.customer_cv || '',
        เขตการทำงาน: t.zone_name ?? '',
        จัดส่งโดย: t.delivery_by || t.job?.delivery_by || 'N/A',
        ผู้แจ้ง: t.job?.notifier || t.operator?.name || '',
        วันที่แจ้ง: t.job?.notification_date?.toISOString() || '',
        กำหนดส่ง: t.job?.created_at.toISOString() || '',
        เวลานัดหมาย: t.job?.appointment_date?.toISOString() || '',
        "หมายเหตุแจ้งงาน": t.job?.note || '',
        "หมายเหตุเพิ่มเติม": t.note || '',
        หมายเหตุ: t.job?.note || t.note || t.return_reason || '',
        "สาเหตุการคืน": t.return_reason ?? '',
        "สภาพตู้": t.cabinet_status ?? '',
        "เหตุผลการยกเลิก": t.cancel_reason ?? '',
        "ยกเลิกโดย": t.action_type === 'ยกเลิก' ? (t.operator?.name ?? 'Unknown') : '',
        // 🚀 New Hardening Fields
        item_id: t.item_id,
        job_id: t.job_id || '',
        serial_number: t.serial_number || '',
        distance_warning: t.distance_warning || '',
        lat: t.lat,
        lng: t.lng,
        "รูปภาพประกอบ": t.image_url || '',
      };
    });

    return res.json(mapped);
  } catch (err: any) {
    return res.json({ status: 'error', message: err.message });
  }
});

// GET /api/transactions/jobRequests (ใบแจ้งงาน)
router.get('/jobRequests', async (req: Request, res: Response) => {
  const { cv } = req.query;
  try {
    const jobs = await prisma.job.findMany({
      where: {
        ...(cv ? { customer_cv: String(cv) } : {}),
      },
      include: {
        customer: true,
        transactions: { include: { item: true } },
        operator: true
      },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    const mapped = jobs.map(j => ({
      jobId: j.job_id,
      cv: j.customer_cv,
      customerName: j.customer?.name ?? '',
      type: j.job_type,
      status: j.status,
      note: j.note,
      operator: j.operator?.name ?? 'SYSTEM',
      createdAt: j.created_at.toISOString(),
      appointmentDate: j.appointment_date,
      returnReason: j.transactions.find(t => t.return_reason)?.return_reason || '',
      items: j.transactions.map(t => ({
        ประเภท: t.item?.category || 'งานบริการ',
        ยี่ห้อหรือรูปแบบ: t.item?.brand ?? t.activity_name ?? '',
        รายการ: t.item?.item_name ?? t.activity_name ?? '',
        ขนาด: t.item?.size ?? '',
        สภาพ: t.item?.condition ?? 'ปกติ',
        จำนวน: t.quantity,
        rowIndex: t.item?.id,
        action_type: t.action_type,
        return_reason: t.return_reason || '',
        cabinet_status: t.cabinet_status || '',
        serial_number: t.serial_number || '',
        serialNumber: t.serial_number || ''
      }))
    }));

    return res.json(mapped);
  } catch (err: any) {
    return res.json({ status: 'error', message: err.message });
  }
});

// GET /api/logistics/jobs (สำหรับพนักงานขนส่งโดยเฉพาะ)
router.get('/logistics/jobs', async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        status: {
          notIn: ['ยกเลิก', 'ยกเลิกคงคลังแล้ว']
        },
        job_type: {
          not: 'SURVEY'
        }
      },
      include: {
        customer: true,
        transactions: { include: { item: true } },
        operator: true,
        warehouse: true
      },
      orderBy: { created_at: 'desc' },
      take: 200
    });

    const mapped = jobs.map(j => ({
      jobId: j.job_id,
      cv: j.customer_cv,
      customerName: j.customer?.name ?? '',
      type: j.job_type,
      status: j.status,
      note: j.note,
      operator: j.operator?.name ?? 'SYSTEM',
      createdAt: j.created_at.toISOString(),
      appointmentDate: j.appointment_date,
      warehouse: j.warehouse?.name || 'Phuket',
      warehouseId: j.warehouse_id,
      items: j.transactions.map(t => ({
        id: t.id,
        รายการ: t.item?.item_name || t.item?.category || 'พัสดุ',
        ขนาด: t.item?.size || '',
        จำนวน: t.quantity,
        action_type: t.action_type,
        rowIndex: t.item_id,
        serialNumber: t.serial_number || '',
        cabinet_status: t.cabinet_status || ''
      }))
    }));

    return res.json(mapped);
  } catch (err: any) {
    return res.json({ status: 'error', message: err.message });
  }
});


// POST /api/transactions/cancel (ยกเลิกรายการทั้งหมดในใบงาน)
router.post('/cancel', async (req: Request, res: Response) => {
  const { txnNo, reason, operator } = req.body;
  if (!txnNo) return res.json({ status: 'error', message: 'Missing Transaction No (job_id)' });

  try {
    const user = await prisma.user.findFirst({ where: { name: operator } }) || await prisma.user.findFirst();

    const result = await prisma.$transaction(async (tx) => {
      // 1. หาข้อมูล Job และ Transactions ทั้งหมดในใบงานนั้น
      const job = await tx.job.findUnique({
        where: { job_id: txnNo },
        include: {
          transactions: { include: { item: true } },
          customer: true
        }
      });

      if (!job) throw new Error(`ไม่พบเลขที่รายการ "${txnNo}"`);
      if (job.status === 'ยกเลิก' || job.status.includes('ยกเลิก')) throw new Error('รายการนี้ถูกยกเลิกไปแล้ว');

      // 2. ไล่ Revert สต็อกของทุกรายการใน Job นี้ (เฉพาะที่ยังไม่ยกเลิก)
      for (const txn of job.transactions) {
        let stockChange = 0;
        let repairChange = 0;
        let scrapChange = 0;
        let lostChange = 0;
        let quarantineChange = 0;
        let transitChange = 0;

        const action = txn.action_type || '';
        const isIssue = action.includes('เบิกออก') || action.includes('BORROW') || action.includes('ISSUE');
        const isReturn = action.includes('รับคืน') || action.includes('RECEIVE') || action.includes('RETURN');
        const isQuarantine = action.includes('รอตรวจ') || action.includes('รอตรวจสอบ');

        if (isIssue) {
          // 🛒 Reverting an ISSUE: move from Transit back to its ORIGINAL bucket
          transitChange = -txn.quantity;
          
          if (statusMatches(action, ITEM_STATUS.REPAIR)) {
            repairChange = txn.quantity;
          } else if (statusMatches(action, ITEM_STATUS.SCRAP)) {
            scrapChange = txn.quantity;
          } else if (statusMatches(action, ITEM_STATUS.LOST)) {
            lostChange = txn.quantity;
          } else if (statusMatches(action, ITEM_STATUS.QUARANTINE)) {
            quarantineChange = txn.quantity;
          } else {
            // Default: Normal Stock
            stockChange = txn.quantity;
          }
        } else if (isReturn || isQuarantine) {
          // 📥 Reverting a RETURN/QUARANTINE: remove from system (it was added during return)
          // Note: If they picked it up to transit but haven't returned to base, 
          // we only remove from transit.
          if (action.includes('เดินทางกลับ') || action.includes('PICKUP')) {
            transitChange = -txn.quantity;
          } else {
            quarantineChange = -txn.quantity;
          }
        } else if (action === 'รับเข้า') {
          stockChange = -txn.quantity;
        }

        if (stockChange !== 0 || repairChange !== 0 || scrapChange !== 0 || lostChange !== 0 || quarantineChange !== 0 || transitChange !== 0) {
          // 1. Update Global MasterItem
          await tx.masterItem.update({
            where: { id: txn.item_id },
            data: {
              stock_qty: { increment: stockChange },
              repair_qty: { increment: repairChange },
              scrap_qty: { increment: scrapChange },
              lost_qty: { increment: lostChange },
              quarantine_qty: { increment: quarantineChange },
              transit_qty: { increment: transitChange }
            }
          });

          // 2. Update Warehouse-specific Stock
          if (job.warehouse_id) {
            await tx.warehouseStock.upsert({
              where: {
                item_id_warehouse_id: {
                  item_id: txn.item_id,
                  warehouse_id: job.warehouse_id
                }
              },
              update: {
                stock_qty: { increment: stockChange },
                repair_qty: { increment: repairChange },
                scrap_qty: { increment: scrapChange },
                lost_qty: { increment: lostChange },
                quarantine_qty: { increment: quarantineChange },
                transit_qty: { increment: transitChange }
              },
              create: {
                item_id: txn.item_id,
                warehouse_id: job.warehouse_id,
                stock_qty: Math.max(0, stockChange),
                repair_qty: Math.max(0, repairChange),
                scrap_qty: Math.max(0, scrapChange),
                lost_qty: Math.max(0, lostChange),
                quarantine_qty: Math.max(0, quarantineChange),
                transit_qty: Math.max(0, transitChange)
              }
            }).catch(e => console.error("WH Revert Error:", e));
          }
        }

        // อัปเดต Transaction รายตัว
        await tx.transaction.update({
          where: { id: txn.id },
          data: {
            cancel_reason: reason || 'ยกเลิกโดยผู้ใช้',
            action_type: 'ยกเลิก'
          }
        });
      }

      // 3. อัปเดตหัว Job
      await tx.job.update({
        where: { job_id: txnNo },
        data: { status: 'ยกเลิกคงคลังแล้ว' }
      });

      // 4. บันทึก Audit Log
      await tx.auditLog.create({
        data: {
          user_id: user?.id,
          action: `CANCEL_JOB: ${txnNo} (Reason: ${reason})`,
        }
      });

      return job;
    });

    // Notify
    Notifier.notify({
      type: 'VOID',
      txnNo: txnNo,
      operator: operator || 'System',
      customer: result.customer?.name,
      cv: result.customer_cv || undefined,
      items: result.transactions.map(t => ({ name: t.item?.item_name || t.activity_name || 'พัสดุ/กิจกรรม', quantity: t.quantity })),
      note: reason
    });

    return res.json({ status: 'success', message: 'ยกเลิกรายการสำเร็จ' });
  } catch (err: any) {
    console.error("Cancel Error:", err);
    return res.json({ status: 'error', message: err.message });
  }
});

// POST /api/transactions/processBatch
router.post('/processBatch', async (req: Request, res: Response) => {
  const {
    subAction, action, status, items, cv, jobId, txnNo, operator,
    note, workZone, returnReason, cabinetCondition, photos,
    deliveryBy, notifier, notificationDate,
    lat, lng, warehouseId, toWarehouseId
  } = req.body;

  try {
    // 🛡️ BACKEND SAFETY NET: Deduplicate incoming items to prevent accidental double-accounting
    // if the frontend mistakenly sends multiple history lines for the same items.
    // ⚠️ CRITICAL: Each physical item from FulfillmentForm is already qty=1 and must stay separate.
    // Include cabinetCondition AND a unique index in the key so items with DIFFERENT or SAME
    // conditions are NEVER merged (each physical piece is its own record).
    const uniqueItems = (items || []).reduce((acc: any[], it: any, idx: number) => {
      const mid = Number(it.item?.rowIndex || it.item?.id || it.rowIndex || it.id);
      const sn = it.serialNumber || it.serial_number || null;
      const cond = it.cabinetCondition || it.cabinet_status || null;
      // Use index to guarantee uniqueness per physical item
      const key = `${mid}-${sn}-${cond}-${idx}`;

      const existing = acc.find(x => x._key === key);
      if (!existing) {
        acc.push({ ...it, _key: key });
      } else {
        existing.quantity = (Number(existing.quantity) || 0) + (Number(it.quantity) || 1);
      }
      return acc;
    }, []);

    const user = await prisma.user.findFirst({ where: { name: operator } }) || await prisma.user.findFirst();
    if (!user) throw new Error("Operator user not found in DB");

    const customer = cv ? await prisma.customer.findUnique({ where: { cv } }) : null;

    // Geofencing Logic (Standard Hardening)
    let distanceWarning: string | null = null;
    let geofenceEnforcement = "WARN"; // Default to Warning only

    const geofenceSetting = await prisma.systemSetting.findUnique({ where: { key: 'GEOFENCE_ENFORCEMENT' } });
    if (geofenceSetting) geofenceEnforcement = geofenceSetting.value;

    if (customer && lat && lng && customer.latitude && customer.longitude) {
      const dist = getDistance(Number(lat), Number(lng), customer.latitude, customer.longitude);
      if (dist > 500) {
        const warning = `⚠️ ห่างจากจุดร้านค้า ${(dist / 1000).toFixed(2)} กม.`;
        if (geofenceEnforcement === 'BLOCK') {
          throw new Error(`ไม่อนุญาตให้ทำรายการนอกพื้นที่ร้านค้า (${warning}) กรุณาตรวจสอบพิกัด GPS ของท่าน`);
        }
        distanceWarning = warning;
      }
    }

    const finalJobId = jobId || txnNo || `JOB-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      const jobRecord = await tx.job.upsert({
        where: { job_id: finalJobId },
        update: {
          status: status,
          delivery_by: deliveryBy || undefined,
          notifier: notifier || undefined,
          notification_date: notificationDate ? new Date(notificationDate) : undefined,
          warehouse_id: warehouseId ? Number(warehouseId) : undefined
        },
        create: {
          job_id: finalJobId,
          // 🛡️ ENSURE Foreign Key Integrity: Only set cv if it exists in Customer table
          customer_cv: (cv === 'ADMIN_REVIEW' || !customer) ? null : cv,
          job_type: String(subAction || action || "RETURN").toUpperCase(),
          operator_id: user.id,
          status: status,
          note: note || null,
          delivery_by: deliveryBy || null,
          notifier: notifier || null,
          notification_date: notificationDate ? new Date(notificationDate) : null,
          warehouse_id: warehouseId ? Number(warehouseId) : 1 // Default to 1 if new job
        }
      });

      const resolvedWarehouseId = Number(warehouseId || jobRecord.warehouse_id || 1);
      const resolvedToWarehouseId = Number(toWarehouseId || 0);

      for (const reqItem of uniqueItems) {
        const qty = Number(reqItem.quantity || 1);
        let itemStatus = reqItem.status || status || 'ปกติ';

        const effectiveAction = (subAction || action || '').toLowerCase();
        const isSurveyJob = jobRecord?.job_type === 'SURVEY' || effectiveAction === 'survey';
        const isStatusOnly = effectiveAction === 'status_only' || effectiveAction === 'status_update';

        // 🚨 ULTIMATE OVERRIDE: Any item being returned or received back MUST be "waiting for inspection"
        // This handles cases where job_type might be delayed or misidentified.
        if (effectiveAction === 'return' || effectiveAction === 'receive' || (effectiveAction === 'fulfill' && itemStatus.includes('รอตรวจ'))) {
           if (itemStatus.includes('รอตรวจ') || effectiveAction === 'return') {
              itemStatus = 'รอตรวจสอบ';
           }
        }

        console.log(`[DEBUG] Final Action Decision: ${itemStatus} (Original: ${reqItem.status})`);

        console.log(`[DEBUG] Processing Item: JobID=${jobRecord.job_id}, JobType=${jobRecord.job_type}, Action=${action}, EffectiveAction=${(subAction || action || '').toLowerCase()}, ItemStatus=${itemStatus}`);

        const sn = reqItem.serialNumber || null; // Serial Number from frontend
        const masterItemId = Number(reqItem.item?.rowIndex || reqItem.item?.id || reqItem.rowIndex || reqItem.id);
        const activityName = reqItem.activity_name || (isSurveyJob ? 'งานสำรวจลูกค้า' : null);

        if (!activityName && isNaN(masterItemId)) throw new Error(`ข้อมูลพัสดุไม่ถูกต้อง (Invalid Item ID: ${masterItemId})`);

        // --- NEW TRANSIT LOGIC (USING CENTRALIZED CONSTANTS) ---
        // 📥 INCREMENTS
        const isNormalReturn = statusMatches(itemStatus, ITEM_STATUS.NORMAL);
        const isRepairStatus = statusMatches(itemStatus, ITEM_STATUS.REPAIR);
        const isScrapStatus = statusMatches(itemStatus, ITEM_STATUS.SCRAP);
        const isLostStatus = statusMatches(itemStatus, ITEM_STATUS.LOST);
        const isQuarantineStatus = statusMatches(itemStatus, ITEM_STATUS.QUARANTINE);
        const isTransitStatus = statusMatches(itemStatus, ITEM_STATUS.TRANSIT);

        // Logic check
        const globalStatus = status || '';

        // 1. Issuing from Warehouse to Driver (Stock -> Transit)
        const isIssuingToDriver = effectiveAction === 'issue' && (isTransitStatus || statusMatches(globalStatus, JOB_STATUS.TRANSIT_ACTIVES)) && !statusMatches(itemStatus, JOB_STATUS.COMPLETED);
        
        // 2. Fulfilling Delivery (Transit -> Out)
        // Happens when action is 'issue' with completed status OR specific 'fulfill' action
        const isFulfillingDelivery = (effectiveAction === 'issue' || effectiveAction === 'fulfill') && 
                                     (statusMatches(itemStatus, JOB_STATUS.COMPLETED) || statusMatches(globalStatus, JOB_STATUS.COMPLETED));

        // 🚀 PRIORITIZE RETURNING TO BASE (Transit -> Office/Quarantine)
        // If it's a return and it mentions "office", "inspect", or "success", it must be arriving at base
        const isReturningToBase = (effectiveAction === 'return' || effectiveAction === 'receive' || effectiveAction === 'fulfill') && 
                                  (statusMatches(globalStatus, JOB_STATUS.RETURNED_TO_BASE) || itemStatus.includes('รอตรวจ'));

        // 3. Picking up from Customer (Customer -> Transit)
        const isPickingUpToTransit = !isReturningToBase && 
                                     (effectiveAction === 'return' || effectiveAction === 'fulfill') && 
                                     statusMatches(globalStatus, JOB_STATUS.PICKUP);


        // Determine changes
        let stockChange = 0;
        let repairChange = 0;
        let scrapChange = 0;
        let lostChange = 0;
        let quarantineChange = 0;
        let transitChange = 0;


        if (!isStatusOnly && !isSurveyJob) {
          if (effectiveAction === 'return' || (effectiveAction === 'fulfill' && itemStatus.includes('รอตรวจ')) || (jobRecord?.job_type === 'RETURN' && !isStatusOnly)) {
            // 🚨 FORCE QUARANTINE: Any return action must enter inspection pool
            transitChange = isReturningToBase ? -qty : 0;
            quarantineChange = qty;
            stockChange = 0; repairChange = 0; scrapChange = 0; lostChange = 0;
          } else if (isIssuingToDriver) {
            stockChange = -qty;
            transitChange = qty;
          } else if (isFulfillingDelivery) {
            transitChange = -qty;
            // No stock increase because it's leaving the system
          } else if (isPickingUpToTransit) {
            transitChange = qty;
          } else if (effectiveAction === 'transfer') {
            // STOCK TRANSFER LOGIC (Corrected: Increases destination warehouse stock)
            if (!resolvedToWarehouseId || isNaN(resolvedToWarehouseId)) throw new Error("กรุณาเลือกคลังปลายทาง");
            if (resolvedWarehouseId === resolvedToWarehouseId) throw new Error("คลังต้นทางและปลายทางต้องไม่เป็นคลังเดียวกัน");
            
            // 🚨 ATOMIC UPDATE: Handle Destination ADDITION
            await tx.warehouseStock.upsert({
              where: {
                item_id_warehouse_id: {
                  item_id: masterItemId,
                  warehouse_id: resolvedToWarehouseId
                }
              },
              update: { stock_qty: { increment: qty } },
              create: {
                item_id: masterItemId,
                warehouse_id: resolvedToWarehouseId,
                stock_qty: qty,
                repair_qty: 0, scrap_qty: 0, lost_qty: 0, quarantine_qty: 0, transit_qty: 0
              }
            });

            // Set stockChange to decrement from Source in the next block
            stockChange = -qty;
          } else {
            // Fallback for direct movements (un-jobbed transactions)
            const shouldIncStock = subAction === 'receive' && isNormalReturn;
            const shouldIncRepair = subAction === 'receive' && isRepairStatus;
            const shouldIncScrap = subAction === 'receive' && isScrapStatus;
            const shouldIncLost = subAction === 'receive' && isLostStatus;
            const shouldIncQuarantine = subAction === 'receive' && isQuarantineStatus;

            const shouldDecStock = subAction === 'issue' && (isNormalReturn || !isRepairStatus && !isScrapStatus && !isLostStatus && !isQuarantineStatus);
            const shouldDecRepair = subAction === 'issue' && isRepairStatus;
            const shouldDecScrap = subAction === 'issue' && isScrapStatus;
            const shouldDecLost = subAction === 'issue' && isLostStatus;
            const shouldDecQuarantine = subAction === 'issue' && isQuarantineStatus;

            stockChange = shouldIncStock ? qty : (shouldDecStock ? -qty : 0);
            repairChange = shouldIncRepair ? qty : (shouldDecRepair ? -qty : 0);
            scrapChange = shouldIncScrap ? qty : (shouldDecScrap ? -qty : 0);
            lostChange = shouldIncLost ? qty : (shouldDecLost ? -qty : 0);
            quarantineChange = shouldIncQuarantine ? qty : (shouldDecQuarantine ? -qty : 0);
          }
        }

        // 🔄 Special Case: Bucket Transfers for Admin Review
        if (cv === 'ADMIN_REVIEW' || cv === 'QUARANTINE_REVIEW' || subAction === 'review') {
          if (subAction === 'receive' || action === 'receive') {
            // Admin is moving item FROM a temporary state (Quarantine/Repair) to a final state (Stock/Scrap/Repair)
            // 1. Identify where it's COMES FROM
            // Most Admin Review items come from Quarantine. So we decrement Quarantine by default.
            // UNLESS the item was already in Repair (e.g., 'Repair Done' action)
            const isComingFromRepair = itemStatus.includes('ซ่อมเสร็จ') || status?.includes('ซ่อมเสร็จ');

            if (isComingFromRepair) {
              repairChange = -qty;
              stockChange = qty; // Finished repair goes back to usable stock
            } else {
              // Default case: Moving from Quarantine pool
              quarantineChange = -qty;

              if (isNormalReturn || itemStatus.includes('ปกติ')) {
                stockChange = qty;
              } else if (isRepairStatus) {
                repairChange = qty;
              } else if (isScrapStatus) {
                scrapChange = qty;
              } else if (isLostStatus) {
                lostChange = qty;
              } else {
                // Fallback: if status is unclear, return to stock for safety
                stockChange = qty;
              }
            }
          }
        }

        if (!isSurveyJob && (stockChange !== 0 || repairChange !== 0 || scrapChange !== 0 || lostChange !== 0 || quarantineChange !== 0)) {
          // 1. First find current stock to verify
          const itemInDB = await tx.masterItem.findUnique({
            where: { id: masterItemId },
            select: {
              stock_qty: true, repair_qty: true, scrap_qty: true, lost_qty: true,
              quarantine_qty: true, transit_qty: true, item_name: true,
              category: true, brand: true, size: true
            }
          });

          if (!itemInDB) throw new Error(`ไม่พบพัสดุรหัส ${masterItemId} ในระบบ`);

          // 🚀 CHECK SPECIFIC WAREHOUSE STOCK
          const whStock = await tx.warehouseStock.findUnique({
            where: {
              item_id_warehouse_id: {
                item_id: masterItemId,
                warehouse_id: resolvedWarehouseId
              }
            }
          });

          const currentWhStock = whStock?.stock_qty || 0;
          const currentWhTransit = whStock?.transit_qty || 0;

          // 🛡️ IDEMPOTENT ISSUE CHECK: If we are subtracting stock for a JOB, 
          // but that item was already 'Issued' (เบิกออก) in this job history, we skip the subtraction 
          // to avoid "Insufficient Stock" errors from duplicate requests / UI lag.
          if (finalJobId && stockChange < 0) {
            const alreadyIssued = await tx.transaction.findFirst({
              where: {
                job_id: finalJobId,
                item_id: masterItemId,
                action_type: { contains: 'เบิกออก' }
              }
            });

            if (alreadyIssued) {
              console.log(`[IDEMPOTENCY] Item ${masterItemId} already issued in Job ${finalJobId}. Skipping duplicate deduction.`);
              stockChange = 0;
              transitChange = 0;
            }
          }

          if (stockChange < 0 && currentWhStock < qty) {
            const displayName = itemInDB.item_name || [itemInDB.category, itemInDB.brand, itemInDB.size].filter(Boolean).join(' ') || `รหัสพัสดุ ${masterItemId}`;
            const whName = await tx.warehouse.findUnique({ where: { id: resolvedWarehouseId } }).then(w => w?.name || 'รหัส ' + resolvedWarehouseId);
            throw new Error(`สต๊อกคลังพัสดุ "${whName}" ไม่พอสำหรับรายการ "${displayName}" (เหลือ ${currentWhStock} แต่ต้องการเบิก ${qty})`);
          }

          // 🚨 Relax Transit check for Returns
          // If we are returning to base, we don't strictly care if it was 'officially' on the truck
          // but we will floor the decrement at the current transit amount to avoid negative transit.
          if (transitChange < 0 && isReturningToBase) {
            transitChange = Math.max(-currentWhTransit, transitChange);
          } else if (transitChange < 0 && currentWhTransit < qty) {
            const displayName = itemInDB.item_name || [itemInDB.category, itemInDB.brand, itemInDB.size].filter(Boolean).join(' ') || `รหัสพัสดุ ${masterItemId}`;
            throw new Error(`สต๊อก 'ระหว่างส่ง' ในคลังที่เลือกไม่พอกำหรับรายการ "${displayName}" (เหลือ ${currentWhTransit} แต่ต้องการตัดส่งมอบ ${qty})`);
          }

          // 2. Perform Atomic Update on MasterItem (Global Cache)
          // 🛡️ INTERNAL TRANSFER: Do not change global totals during warehouse transfer
          if (effectiveAction !== 'transfer') {
            await tx.masterItem.update({
              where: { id: masterItemId },
              data: {
                stock_qty: { increment: stockChange },
                repair_qty: { increment: repairChange },
                scrap_qty: { increment: scrapChange },
                lost_qty: { increment: lostChange },
                quarantine_qty: { increment: quarantineChange },
                transit_qty: { increment: transitChange }
              }
            });
          }

          // 3. Perform Atomic Update on WarehouseStock (Local Location)
          await tx.warehouseStock.upsert({
            where: {
              item_id_warehouse_id: {
                item_id: masterItemId,
                warehouse_id: resolvedWarehouseId
              }
            },
            update: {
              stock_qty: { increment: stockChange },
              repair_qty: { increment: repairChange },
              scrap_qty: { increment: scrapChange },
              lost_qty: { increment: lostChange },
              quarantine_qty: { increment: quarantineChange },
              transit_qty: { increment: transitChange }
            },
            create: {
              item_id: masterItemId,
              warehouse_id: resolvedWarehouseId,
              stock_qty: stockChange > 0 ? stockChange : 0,
              repair_qty: repairChange > 0 ? repairChange : 0,
              scrap_qty: scrapChange > 0 ? scrapChange : 0,
              lost_qty: lostChange > 0 ? lostChange : 0,
              quarantine_qty: quarantineChange > 0 ? quarantineChange : 0,
              transit_qty: transitChange > 0 ? transitChange : 0
            }
          });

          // 5. 🏠 CUSTOMER INVENTORY LOGIC (Persistent Storage)
          if (cv && cv !== 'ADMIN_REVIEW' && cv !== 'QUARANTINE_REVIEW' && !isSurveyJob && !isStatusOnly) {
            let customerQtyChange = 0;
            if (isFulfillingDelivery) {
              customerQtyChange = qty;
            } else if (isReturningToBase) {
              customerQtyChange = -qty;
            }

            if (customerQtyChange !== 0) {
              await tx.customerInventory.upsert({
                where: {
                  customer_cv_item_id: {
                    customer_cv: cv,
                    item_id: masterItemId
                  }
                },
                update: { quantity: { increment: customerQtyChange } },
                create: {
                  customer_cv: cv,
                  item_id: masterItemId,
                  quantity: Math.max(0, customerQtyChange)
                }
              });
            }
          }
        }

        // 📝 Determine the label to save in DB Action Type
        // If it's forced to quarantine, the official action is "Waiting for Inspection"
        let dbActionType = itemStatus;
        if (effectiveAction === 'transfer') {
            dbActionType = 'ย้ายพัสดุ';
        } else if (quarantineChange > 0 || effectiveAction === 'return' || effectiveAction === 'receive' || (effectiveAction === 'fulfill' && itemStatus.includes('รอตรวจ'))) {
            dbActionType = 'รอตรวจสอบ';
        } else if (effectiveAction === 'fulfill' && (statusMatches(itemStatus, JOB_STATUS.COMPLETED) || statusMatches(globalStatus, JOB_STATUS.COMPLETED))) {
            dbActionType = 'ส่งมอบเรียบร้อย';
        }

        // 🚀 CRITICAL FIX: Split aggregated quantities into individual transaction records
        // This satisfies the requirement: "แยกแต่ละชิ้นออกมา" (Separate every single piece)
        const totalQty = Math.max(1, Math.floor(qty)); // Ensure at least 1 if it's meant to be processed
        
        const validZones = await tx.zone.findMany({ select: { name: true } }).then(zs => zs.map(z => z.name));
        const rawZone = (workZone === 'ADMIN_OFFICE' ? null : (workZone || null));
        const effectiveZone = validZones.includes(rawZone!) ? rawZone : null;

        for (let i = 0; i < totalQty; i++) {
          await tx.transaction.create({
            data: {
              job_id: jobRecord.job_id,
              item_id: isNaN(masterItemId) ? null : masterItemId,
              activity_name: activityName,
              operator_id: user.id,
              action_type: dbActionType,
              quantity: 1, // Store as 1 per row
              zone_name: effectiveZone,
              delivery_by: deliveryBy || null,
              return_reason: reqItem.returnReason || returnReason || null,
              cabinet_status: reqItem.cabinetCondition || (effectiveAction === 'issue' || effectiveAction === 'fulfill' ? 'ปกติ' : (reqItem.status || cabinetCondition || null)),
              image_url: photos && photos.length > 0 ? photos.join('\n') : null,
              serial_number: sn,
              lat: lat ? Number(lat) : null,
              lng: lng ? Number(lng) : null,
              distance_warning: distanceWarning,
              note: reqItem.note || note || null,
              to_warehouse_id: effectiveAction === 'transfer' ? resolvedToWarehouseId : null,
              warehouse_id: resolvedWarehouseId
            }
          });
        }


      }

      // 3. Final Job Status Calculation (For RETURN jobs)
      // ข้ามทั้งหมดถ้าเป็น status_only (เช่น กดรับงาน) เพราะเราต้องการแค่อัปเดต status ตรงๆ
      const isStatusOnly = subAction === 'status_only' || subAction === 'status_update';
      if (jobRecord.job_type === 'RETURN' && !isStatusOnly) {
        const allTxns = await tx.transaction.findMany({ where: { job_id: finalJobId } });

        const totalRequested = allTxns
          .filter(t => t.action_type === 'แจ้งคืน')
          .reduce((sum, t) => sum + t.quantity, 0);

        const totalProcessed = allTxns
          .filter(t => ['รอตรวจ', 'รับคืน', 'สูญหาย', 'ชำรุดหนัก', 'ชำรุดหนัก/ซาก'].includes(t.action_type))
          .reduce((sum, t) => sum + t.quantity, 0);

        const hasLoss = allTxns.some(t => ['สูญหาย', 'ชำรุดหนัก', 'ชำรุดหนัก/ซาก'].includes(t.action_type));

        let finalStatus = status;
        if (totalProcessed === 0) {
          // ไม่ override ถ้าเป็นสถานะที่ Driver กำลังดำเนินการอยู่แล้ว
          const isInProgress = (status || '').toLowerCase().includes('transit') ||
            (status || '').includes('เดินทาง') ||
            (status || '').includes('ร้าน') ||
            (status || '').toUpperCase().includes('ACCEPTED') ||
            (status || '').includes('รับงาน') ||
            (status || '').includes('เบิก') ||
            (status || '').includes('กำลังไปส่ง');

          if (!isInProgress) {
            finalStatus = 'รอรับคืน';
          }
        } else if (totalProcessed < totalRequested) {
          finalStatus = 'คืนบางส่วน';
        } else {
          finalStatus = hasLoss ? 'ปิดงาน (มีพัสดุสูญหาย/ซาก)' : 'คืนของแล้ว';
        }

        await tx.job.update({
          where: { job_id: finalJobId },
          data: { status: finalStatus }
        });
      }
    }, { maxWait: 10000, timeout: 20000 });

    // Notify
    Notifier.notify({
      type: String(subAction || action || "RETURN").toUpperCase() as any,
      txnNo: finalJobId,
      operator,
      customer: customer?.name,
      cv,
      items: items.map((i: any) => ({ 
        name: i.item ? `${i.item.รายการ || ''} ${i.item.ขนาด || ''}`.trim() : (i.activity_name || 'งานบริการ/กิจกรรม'), 
        quantity: i.quantity 
      })),
      note,
      photos
    });

    return res.json({ status: 'success', message: 'ทำรายการสำเร็จ', jobId: finalJobId });
  } catch (err: any) {
    console.error("Batch Transaction Error:", err);
    return res.json({ status: 'error', message: err.message });
  }
});

// POST /api/transactions/jobRequest (แจ้งงานใหม่)
router.post('/jobRequest', async (req: Request, res: Response) => {
  const { cv, deliveryItems, returnItems, operator, note, returnReason, notifier, notificationDate, appointmentDate, warehouseId, photos } = req.body;

  try {
    // 1. หา User (เน้นหาจากชื่อ ถ้าไม่มีให้เอาคนแรกสุด)
    let user = await prisma.user.findFirst({ where: { name: { contains: operator || '', mode: 'insensitive' } } });
    if (!user) user = await prisma.user.findFirst();
    if (!user) throw new Error("ไม่พบข้อมูลพนักงานในระบบ กรุณาตรวจสอบการตั้งค่าผู้ใช้งาน");

    const customer = cv ? await prisma.customer.findUnique({ where: { cv } }) : null;

    const datePrefix = format(new Date(), 'yyyyMMdd');
    const timestamp = Date.now().toString().slice(-4);
    const jobId = `JOB-${datePrefix}-${timestamp}`;

    const jobType = deliveryItems && deliveryItems.length > 0 ? 'DELIVERY' : 'RETURN';

    await prisma.$transaction(async (tx) => {
      // 1. สร้าง Job
      await tx.job.create({
        data: {
          job_id: jobId,
          // 🛡️ ENSURE Foreign Key Integrity: Only set cv if it exists in Customer table
          customer_cv: customer ? cv : null,
          job_type: jobType,
          operator_id: user!.id,
          status: jobType === 'RETURN' ? 'รอรับคืน' : 'PENDING',
          note: note || null,
          notifier: notifier || null,
          notification_date: notificationDate ? new Date(notificationDate) : null,
          appointment_date: appointmentDate ? new Date(appointmentDate) : null,
          warehouse_id: warehouseId ? Number(warehouseId) : 1
        }
      });

      // 2. เตรียมรายการพัสดุทั้งหมด
      const allReqItems = [
        ...(deliveryItems || []).map((i: any) => ({ ...i, _type: 'DELIVERY' })),
        ...(returnItems || []).map((i: any) => ({ ...i, _type: 'RETURN' }))
      ];

      // --- DIAGNOSTIC LOG ---
      console.log(`[jobRequest] Incoming items for ${jobId}:`, {
        deliveryCount: (deliveryItems || []).length,
        returnCount: (returnItems || []).length,
        jobType
      });

      // 1.5 Fetch valid zones to avoid FK violations
      const validZones = await tx.zone.findMany({ select: { name: true } }).then(zs => zs.map(z => z.name));

      let savedCount = 0;
      for (const it of allReqItems) {
        // Extract item ID with priority: item.id > item.rowIndex > rowIndex > it.id
        const rawId = it.item?.id || it.item?.rowIndex || it.rowIndex || it.item_id || it.id;
        const itemId = Number(rawId);

        if (!rawId || isNaN(itemId)) {
          console.warn(`[jobRequest] Skipping item due to invalid ID:`, { rawId, itemId, item: it.item });
          continue;
        }

        // 🚀 CRITICAL FIX: Split main items into individual units (Quantity 1)
        const mainQty = Math.max(1, Math.floor(Number(it.quantity || 1)));
        const rawZone = it.zone_name || it.workZone || customer?.province || null;
        const effectiveZone = validZones.includes(rawZone!) ? rawZone : null;

        for (let i = 0; i < mainQty; i++) {
          await tx.transaction.create({
            data: {
              job_id: jobId,
              item_id: itemId,
              operator_id: user!.id,
              action_type: it._type === 'DELIVERY' ? 'แจ้งส่ง' : 'แจ้งคืน',
              quantity: 1, // Store as 1 per row
              serial_number: it.serialNumber || null,
              zone_name: effectiveZone,
              delivery_by: it.deliveryBy || operator || user?.name || null,
              warehouse_id: warehouseId ? Number(warehouseId) : 1,
              // returnReasons is an array from frontend; returnReason is top-level fallback
              return_reason: it._type === 'RETURN'
                ? (it.returnReasons?.[0] || it.returnReason || returnReason || null)
                : null,
              cabinet_status: it.cabinetCondition || (it._type === 'DELIVERY' ? 'ปกติ' : (it.status || it.cabinet_status || null)),
              image_url: photos && photos.length > 0 ? photos.join('\n') : null,
              note: it._type === 'RETURN' && it.status && it.status !== 'ปกติ' ? `[RIDER CLAIM: ${it.status}]` : it.note || null
            }
          });
          savedCount++;
        }




        // 🔥 Save subItems (Accessories/Stickers) as flat transactions so they aren't lost
        if (it.subItems && Array.isArray(it.subItems)) {
          for (const sub of it.subItems) {
            const subRawId = sub.item?.id || sub.item?.rowIndex || sub.rowIndex || sub.item_id || sub.id;
            const subItemId = Number(subRawId);
            if (!subRawId || isNaN(subItemId)) continue;

            // 🚀 CRITICAL FIX: Split sub-items into individual units (Quantity 1)
            const subQty = Math.max(1, Math.floor(Number(sub.quantity || 1)));
            const rawZone = it.zone_name || it.workZone || customer?.province || null;
            const effectiveZone = validZones.includes(rawZone!) ? rawZone : null;

            for (let i = 0; i < subQty; i++) {
              await tx.transaction.create({
                data: {
                  job_id: jobId,
                  item_id: subItemId,
                  operator_id: user!.id,
                  action_type: it._type === 'DELIVERY' ? 'แจ้งส่ง' : 'แจ้งคืน',
                  quantity: 1, // Store as 1 per row
                  zone_name: effectiveZone,
                  delivery_by: it.deliveryBy || operator || user?.name || null,
                  warehouse_id: warehouseId ? Number(warehouseId) : 1,
                  image_url: photos && photos.length > 0 ? photos.join('\n') : null,
                  return_reason: it._type === 'RETURN' ? (sub.returnReason || it.returnReason || returnReason || 'แจ้งงานขอเก็บคืน') : null
                }
              });
              savedCount++;
            }



          }
        }
      }

      if (savedCount === 0 && allReqItems.length > 0) {
        throw new Error("ไม่สามารถบันทึกรายการพัสดุได้ (ตรวจสอบ ID สินค้าไม่พบ) กรุณาลองใหม่อีกครั้งครับ");
      }
    });

    console.log(`[jobRequest] Successfully saved ${jobId} with transactions.`);

    // Notify separately
    const allItems = [
      ...(deliveryItems || []).map((i: any) => ({ name: `[แจ้งส่ง] ${i.item?.รายการ || 'พัสดุ'}`, quantity: i.quantity })),
      ...(returnItems || []).map((i: any) => ({ name: `[แจ้งคืน] ${i.item?.รายการ || 'พัสดุ'}`, quantity: i.quantity }))
    ];

    Notifier.notify({
      type: 'JOB_REQUEST',
      txnNo: jobId,
      operator: operator || user.name,
      customer: customer?.name,
      cv,
      items: allItems,
      note,
      photos
    });

    return res.json({ status: 'success', jobId });
  } catch (err: any) {
    console.error("JobRequest Error:", err);
    return res.json({ status: 'error', message: err.message });
  }
});

// POST /api/transactions/confirm-repair (Admin Review Actions)
router.post('/confirm-repair', async (req: Request, res: Response) => {
  const { action, itemId, serialNumber, originalTxnId, originalTxnIds, operatorName, note, quantity } = req.body;
  const qty = Number(quantity || 1);

  // Support both single and multiple IDs
  const txnIds: number[] = Array.isArray(originalTxnIds)
    ? originalTxnIds.map(id => Number(id))
    : (originalTxnId ? [Number(originalTxnId)] : []);

  try {
    const user = await prisma.user.findFirst({ where: { name: operatorName } }) || await prisma.user.findFirst();
    if (!user) throw new Error("ไม่พบข้อมูลผู้ดำเนินการในระบบ");

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find Reference Transaction (use first ID from list) to inherit metadata
      const refTxnId = txnIds[0];
      const originalTxn = refTxnId ? await tx.transaction.findUnique({
        where: { id: refTxnId },
        include: { job: true }
      }) : null;

      const warehouseId = Number(req.body.warehouseId || originalTxn?.warehouse_id || 1);

      // 2. Find Master Item
      const item = await tx.masterItem.findUnique({ where: { id: Number(itemId) } });
      if (!item) throw new Error("ไม่พบข้อมูลพัสดุ");

      let targetItem = item;

      // 🚀 HARDENING: If marked as Normal or Repair Done, it MUST go to "สต๊อก" condition
      // This ensures returned items are categorized as "Stock" items in the inventory.
      if (['quarantine_approve', 'repair_done', 'available'].includes(action)) {
        const isGoodAlready = item.condition === 'ใหม่' || item.condition === 'สต๊อก';

        // Use original item if it's already in good condition and we are just approving it
        if (action === 'quarantine_approve' && isGoodAlready) {
          targetItem = item;
        } else if (item.condition !== 'สต๊อก') {
          const found = await tx.masterItem.findFirst({
            where: {
              category: item.category || "",
              brand: item.brand || "",
              item_name: item.item_name || "",
              size: item.size || "",
              details: item.details || "",
              condition: 'สต๊อก'
            }
          });

          if (found) {
            targetItem = found;
          } else {
            // Create new "สต๊อก" condition item if not exists
            targetItem = await tx.masterItem.create({
              data: {
                category: item.category || "ETC",
                brand: item.brand || "-",
                item_name: item.item_name || "-",
                size: item.size || "-",
                condition: 'สต๊อก',
                details: item.details || "",
                stock_qty: 0,
                repair_qty: 0,
                scrap_qty: 0,
                lost_qty: 0,
                quarantine_qty: 0,
                transit_qty: 0
              }
            });
          }
        }
      }

      let repairChange = 0;
      let stockChange = 0;
      let scrapChange = 0;
      let lostChange = 0;
      let quarantineChange = 0;
      let statusLabel = '';

      if (action === 'repair_done') {
        repairChange = -qty;
        stockChange = qty;
        statusLabel = 'ซ่อมเสร็จ (พร้อมใช้งาน) (Checked)';
      } else if (action === 'to_scrap') {
        repairChange = -qty;
        scrapChange = qty;
        statusLabel = 'จำหน่ายซาก (รอจำหน่าย) (Checked)';
      } else if (action === 'scrap_sold') {
        scrapChange = -qty;
        statusLabel = 'อนุมัติจำหน่ายซากเรียบร้อย (out)';
      } else if (action === 'confirm_loss') {
        lostChange = -qty;
        statusLabel = 'ยืนยันสูญหาย (out)';
      } else if (action === 'quarantine_approve') {
        quarantineChange = -qty;
        stockChange = qty;
        statusLabel = 'ปกติ (พร้อมใช้งาน) (Checked)';
      } else if (action === 'quarantine_to_repair') {
        quarantineChange = -qty;
        repairChange = qty;
        statusLabel = 'พบว่าเสีย (ส่งซ่อม) (Checked)';
      } else if (action === 'quarantine_to_scrap') {
        quarantineChange = -qty;
        scrapChange = qty;
        statusLabel = 'พบว่าเป็นซาก (Checked)';
      } else if (action === 'quarantine_to_lost') {
        quarantineChange = -qty;
        lostChange = qty;
        statusLabel = 'พบว่าสูญหาย (Checked)';
      }

      // Determine physical condition from action
      const physicalCondition = 
        (action === 'quarantine_approve' || action === 'repair_done') ? 'ปกติ' :
        (action === 'quarantine_to_repair') ? 'ส่งซ่อม' : 
        (action === 'quarantine_to_scrap' || action === 'to_scrap') ? 'ตีซาก' :
        (action === 'quarantine_to_lost' || action === 'confirm_loss') ? 'สูญหาย' :
        'ปกติ';

      // 3. Update Master Item Buckets
      // Decrement source (Quarantine, Repair, Scrap, Lost - OUTGOING)
      await tx.masterItem.update({
        where: { id: item.id },
        data: {
          repair_qty: { increment: repairChange < 0 ? repairChange : 0 },
          scrap_qty: { increment: (action === 'scrap_sold') ? -qty : 0 },
          lost_qty: { increment: (action === 'confirm_loss') ? -qty : 0 },
          quarantine_qty: { increment: quarantineChange < 0 ? quarantineChange : 0 }
        }
      });

      // Increment target (Stock, Repair, Scrap, Lost - INCOMING)
      await tx.masterItem.update({
        where: { id: targetItem.id },
        data: {
          stock_qty: { increment: stockChange > 0 ? stockChange : 0 },
          repair_qty: { increment: repairChange > 0 ? repairChange : 0 },
          scrap_qty: { increment: (action === 'quarantine_to_scrap' || action === 'to_scrap') ? qty : 0 },
          lost_qty: { increment: (action === 'quarantine_to_lost') ? qty : 0 }
        }
      });


      // 4. Update Warehouse Stock (Use UPSERT)
      // Decrement Source Warehouse
      await tx.warehouseStock.upsert({
        where: { item_id_warehouse_id: { item_id: item.id, warehouse_id: warehouseId } },
        update: {
          repair_qty: { increment: repairChange < 0 ? repairChange : 0 },
          quarantine_qty: { increment: quarantineChange < 0 ? quarantineChange : 0 },
          scrap_qty: { increment: (action === 'scrap_sold') ? -qty : 0 },
          lost_qty: { increment: (action === 'confirm_loss') ? -qty : 0 }
        },
        create: {
          item_id: item.id,
          warehouse_id: warehouseId,
          stock_qty: 0, repair_qty: 0, quarantine_qty: 0, scrap_qty: 0, lost_qty: 0
        }
      });

      // Increment Target Warehouse
      await tx.warehouseStock.upsert({
        where: { item_id_warehouse_id: { item_id: targetItem.id, warehouse_id: warehouseId } },
        update: {
          stock_qty: { increment: stockChange > 0 ? stockChange : 0 },
          repair_qty: { increment: repairChange > 0 ? repairChange : 0 },
          scrap_qty: { increment: (action === 'quarantine_to_scrap' || action === 'to_scrap') ? qty : 0 },
          lost_qty: { increment: (action === 'quarantine_to_lost') ? qty : 0 }
        },
        create: {
          item_id: targetItem.id,
          warehouse_id: warehouseId,
          stock_qty: stockChange > 0 ? stockChange : 0,
          repair_qty: repairChange > 0 ? repairChange : 0,
          scrap_qty: (action === 'quarantine_to_scrap' || action === 'to_scrap') ? qty : 0,
          lost_qty: (action === 'quarantine_to_lost') ? qty : 0,
          quarantine_qty: 0
        }
      });

      // 5. 🔄 UPDATE existing transactions IN-PLACE (no new records = no duplicate item count)
      if (txnIds.length > 0) {
        await tx.transaction.updateMany({
          where: { id: { in: txnIds } },
          data: {
            action_type: `ตรวจสอบแล้ว: ${statusLabel}`,
            cabinet_status: physicalCondition,
            item_id: targetItem.id,
            note: `[Admin Check: ${note || statusLabel}] by ${operatorName}`
          }
        });
      }

      // 6. Reconcile Original Job Status
      if (originalTxn?.job_id) {
        const allJobTxns = await tx.transaction.findMany({
          where: { job_id: originalTxn.job_id }
        });

        const hasUninspected = allJobTxns.some(t =>
          t.action_type === 'รอรับคืน' ||
          t.action_type.includes('รอตรวจ') ||
          t.action_type.includes('คลังกักกัน')
        );

        if (!hasUninspected) {
          await tx.job.update({
            where: { job_id: originalTxn.job_id },
            data: { status: 'เสร็จสิ้น (ตรวจสอบแล้ว)' }
          });
        } else {
          // Stay in progress if some items are still pending admin review
          await tx.job.update({
            where: { job_id: originalTxn.job_id },
            data: { status: 'ดำเนินการ (อยู่ระหว่างตรวจสอบ)' }
          });
        }
      }

      return { targetJobId: originalTxn?.job_id || 'REVIEW' };
    });

    return res.json({
      status: 'success',
      message: 'ดำเนินการสำเร็จ',
      jobId: result.targetJobId
    });

  } catch (err: any) {
    console.error("Confirm Repair Error:", err);
    return res.json({ status: 'error', message: err.message });
  }
});

// GET /api/transactions/next-txn-no
router.get('/next-txn-no', async (_req: Request, res: Response) => {
  try {
    const datePrefix = format(new Date(), 'yyMMdd');
    const lastJob = await prisma.job.findFirst({
      where: { job_id: { startsWith: `TXN-${datePrefix}` } },
      orderBy: { job_id: 'desc' }
    });

    let nextNum = 1;
    if (lastJob) {
      const parts = lastJob.job_id.split('-');
      if (parts.length === 3) {
        const currentNum = parseInt(parts[2], 10);
        if (!isNaN(currentNum)) nextNum = currentNum + 1;
      }
    }

    const nextTxnNo = `TXN-${datePrefix}-${String(nextNum).padStart(4, '0')}`;
    return res.json({ txnNo: nextTxnNo });
  } catch (error) {
    return res.json({ txnNo: `TXN-${format(new Date(), 'yyMMdd')}-0001` });
  }
});

// POST /api/transactions/logistics/rider-cancel
router.post('/logistics/rider-cancel', async (req: Request, res: Response) => {
  const { jobId, reason, operatorName } = req.body;
  if (!jobId || !reason) return res.json({ status: 'error', message: 'Missing jobId or reason' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the job and its items
      const job = await tx.job.findUnique({
        where: { job_id: jobId },
        include: { transactions: { include: { item: true } } }
      });

      if (!job) throw new Error('Job not found');

      // 2. Handle Item Stock Movements (Only for DELIVERY/ISSUE items that are in Transit)
      for (const t of job.transactions) {
        const action = String(t.action_type || '').toUpperCase();
        const isDelivery = ['ISSUE', 'DELIVERY', 'BORROW', 'เบิก'].some(k => action.includes(k));
        
        // If it's a delivery item and the job is being canceled, move from Transit -> Quarantine (Wait for Inspection)
        if (isDelivery && t.item_id) {
           // Move Master Item Buckets
           await tx.masterItem.update({
             where: { id: t.item_id },
             data: {
               transit_qty: { decrement: t.quantity },
               quarantine_qty: { increment: t.quantity }
             }
           });

           // Move Warehouse Stock Buckets
           await tx.warehouseStock.updateMany({
             where: { item_id: t.item_id, transit_qty: { gte: t.quantity } },
             data: {
               transit_qty: { decrement: t.quantity },
               quarantine_qty: { increment: t.quantity }
             }
           });

           // 🚀 CRITICAL FIX: Split cancellation adjustment into individual units (Quantity 1)
           const cancelQty = Math.max(1, Math.floor(Number(t.quantity || 1)));
           const validZones = await tx.zone.findMany({ select: { name: true } }).then(zs => zs.map(z => z.name));

           for (let i = 0; i < cancelQty; i++) {
             const rawZone = t.zone_name || job.customer?.province || null;
             const effectiveZone = validZones.includes(rawZone!) ? rawZone : null;

             await tx.transaction.create({
               data: {
                 job_id: jobId,
                 item_id: t.item_id,
                 operator_id: job.operator_id,
                 action_type: `คลังกักกัน: ยกเลิกการส่ง (รอตรวจคืน)`,
                 quantity: 1, // Store as 1 per row
                 serial_number: t.serial_number,
                 zone_name: effectiveZone,
                 delivery_by: operatorName || t.delivery_by || job.delivery_by || 'Rider',
                 warehouse_id: t.warehouse_id || job.warehouse_id || 1,
                 return_reason: `Rider ยกเลิก: ${reason}`,
                 note: `ยกเลิกโดย ${operatorName || 'Rider'}`
               }
             });

           }


        }
      }

      // 3. Update Job Status
      const updatedJob = await tx.job.update({
        where: { job_id: jobId },
        data: {
          status: `ยกเลิก (${reason})`,
          note: `ยกเลิกโดย ${operatorName || 'Rider'}: ${reason} (เมื่อ ${format(new Date(), 'HH:mm')})`
        }
      });

      return updatedJob;
    });

    return res.json({ status: 'success', data: result });
  } catch (err: any) {
    console.error("Rider Cancel Error:", err);
    return res.json({ status: 'error', message: err.message });
  }
});

// 🧹 Wipe all logistics queues (Quarantine, Repair, Scrap, Lost)
router.post('/wipe-queues', async (_req, res) => {
  try {
    await prisma.$transaction([
      // 1. Reset all buckets in WarehouseStock back to 0
      prisma.warehouseStock.updateMany({
        data: {
          quarantine_qty: 0,
          repair_qty: 0,
          scrap_qty: 0,
          lost_qty: 0,
          transit_qty: 0
        }
      }),
      // 2. We don't delete transactions for audit trail, but they will be filtered out 
      // because the buckets are now 0 and items are marked (out) conceptually.
      // Actually, let's mark the relevant transactions as (out/cleared) to be sure
      prisma.transaction.updateMany({
        where: {
          OR: [
            { action_type: { contains: 'รอตรวจ' } },
            { action_type: { contains: 'รับคืน' } },
            { action_type: { contains: 'ซ่อม' } },
            { action_type: { contains: 'ซาก' } },
            { action_type: { contains: 'หาย' } }
          ],
          NOT: { action_type: { contains: '(out)' } }
        },
        data: {
          action_type: { set: 'ยกเลิกรายการ (ล้างกระดาน) (out)' }
        }
      })
    ]);

    return res.json({ status: 'success', message: 'ล้างคิวงานทั้งหมดเรียบร้อยแล้ว' });
  } catch (err: any) {
    console.error(err);
    return res.json({ status: 'error', message: err.message });
  }
});

export default router;

