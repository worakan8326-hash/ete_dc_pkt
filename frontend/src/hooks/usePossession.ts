import { useMemo } from 'react';
import { TRANSACTION_STATUSES, POSSESSION_ACTIONS } from '../constants/logisticsConstants';
import { classifyLogisticsItem, formatItemName } from '../utils/logisticsUtils';
import type { Transaction } from '../types';

/**
 * 📦 usePossession Hook
 * Calculates the current stock in a customer's possession based on transaction history
 * and finalized/in-transit logistics jobs.
 */
export function usePossession(transactions: Transaction[], customerCv: string | undefined, logisticsJobs: any[] = []) {
  const possessionList = useMemo(() => {
    if (!customerCv || !Array.isArray(transactions)) return [];

    interface ItemSum { name: string; size: string; detail: string; condition: string; qty: number; lastDate?: string; }
    const map: Record<string, ItemSum> = {};

    const targetCv = String(customerCv).trim();

    // Helper to compare and update the latest date
    const updateLastDate = (key: string, newDate: string | undefined) => {
       if (!newDate || !map[key]) return;
       const cleanDate = String(newDate).split(' ')[0]; // Take YYYY-MM-DD part
       if (!map[key].lastDate || cleanDate > map[key].lastDate) {
          map[key].lastDate = cleanDate;
       }
    };

    // 1️⃣ Process standard transactions
    const customerTxns = transactions.filter(t => {
      const tCv = String(t.CV || t.cv || t.CustomerID || '').trim();
      return tCv === targetCv && tCv !== '';
    });

    customerTxns.forEach(t => {
      const itemName = t.รายการ || t.ItemName || 'พัสดุ';
      const size = t.ขนาด || t.Size || '';
      const detail = t.รายละเอียด || t.Details || '';
      const condition = t.สภาพ || t.Condition || 'ปกติ';
      const key = `${itemName}-${detail}-${size}-${condition}`;

      const status = String(t.สถานะ || t.Status || '').toUpperCase();
      if (status.includes(TRANSACTION_STATUSES.CANCELLED.toUpperCase())) return;

      const qty = Number(t.จำนวน || t.qty || t.Quantity || 0);
      if (!map[key]) map[key] = { name: itemName, detail, size, condition, qty: 0 };

      const isPickUp = POSSESSION_ACTIONS.LEAVING_SHOP.some(k => status.includes(k.toUpperCase()));
      const isDropOff = POSSESSION_ACTIONS.CONFIRMED_DELIVERY.some(k => status.includes(k.toUpperCase()));

      if (isDropOff) {
         map[key].qty += qty;
         updateLastDate(key, t["วัน-เวลา"] || t.Date || t.deliveryDate || t["กำหนดส่ง"]);
      }
      else if (isPickUp) {
         map[key].qty -= qty;
      }
    });

    // 2️⃣ Process logistics jobs for synchronized real-time occupancy
    const targetCvLower = targetCv.toLowerCase();

    const relevantJobs = logisticsJobs.filter(j => {
       const jCv = String(j.cv || j.CV || j.CustomerID || '').trim().toLowerCase();
       return jCv === targetCvLower && jCv !== '';
    });

    relevantJobs.forEach(job => {
       const js = String(job.status || '').toUpperCase();
       
       // Rules for "Finalized" logistics states that imply hand-over to/from customer
       const isActiveReturnLeg = js.includes('คืน') || js.includes('กลับ');
       const isFinished = js.includes('เสร็จ') || js.includes('สำเร็จ');

       if (Array.isArray(job.items)) {
          job.items.forEach((it: any) => {
             const actionType = it.action_type || it.actionType || it.ActionType || '';
             const category = classifyLogisticsItem(actionType, job.status);
             
             // Property matching for different naming conventions (must match standard txn keys)
             const itemName = it.รายการ || it.item_name || it.item_Name || it.name || it.item || it.ItemName || 'พัสดุ';
             const detail = it.รายละเอียด || it.detail || it.Details || it.details || '';
             const size = it.ขนาด || it.size || it.Size || '';
             const condition = it.สภาพ || it.condition || it.Condition || 'ปกติ';
             
             const key = `${itemName}-${detail}-${size}-${condition}`;
             const qty = Number(it.จำนวน || it.quantity || it.qty || it.Quantity || 1);

             if (!map[key]) map[key] = { name: itemName, detail, size, condition, qty: 0 };

             // Logic: If it was a SEND item and job reached Final stages -> Customer has it (+1)
             if (category === 'SEND' && (isActiveReturnLeg || isFinished)) {
                map[key].qty += qty;
                const dateToUse = job.completion_date || job.deliveryDate || job.date || job["วัน-เวลา"] || job.appointmentDate || job.appointment_date || job.updated_at;
                updateLastDate(key, dateToUse);
             }
             // Logic: If it was a RETURN item and job reached Final stages -> Customer lost it (-1)
             else if (category === 'RETURN' && (isActiveReturnLeg || isFinished)) {
                map[key].qty -= qty;
             }
          });
       }
    });

    // Expand freezers into individual entries (1 card per unit)
    const grouped = Object.values(map).filter(it => it.qty > 0);
    const result: typeof grouped = [];
    
    grouped.forEach(item => {
      const isFreezer = String(item.name || '').includes('ตู้');
      if (isFreezer && item.qty > 1) {
        // Split into individual entries
        for (let i = 0; i < item.qty; i++) {
          result.push({ ...item, qty: 1 });
        }
      } else {
        result.push(item);
      }
    });

    return result;
  }, [transactions, customerCv, logisticsJobs]);

  return possessionList;
}
