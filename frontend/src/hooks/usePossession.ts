import { useMemo } from 'react';
import { TRANSACTION_STATUSES, POSSESSION_ACTIONS } from '../constants/logisticsConstants';
import { classifyLogisticsItem, aggregateJobItems, formatItemName } from '../utils/logisticsUtils';
import type { Transaction } from '../types';

/**
 * 📦 usePossession Hook
 * Calculates the current stock in a customer's possession.
 * Enrichment: Uses masterItems to recover missing categories/brands.
 */
export function usePossession(
   transactions: Transaction[], 
   customerCv: string | undefined, 
   logisticsJobs: any[] = [],
   masterItems: any[] = []
) {
   const possessionList = useMemo(() => {
      const targetCv = String(customerCv || '').trim();
      if (!targetCv) return [];

      interface ItemSum { 
         name: string; 
         type: string; 
         size: string; 
         detail: string; 
         condition: string; 
         qty: number; 
         lastStatus?: string; 
         lastDate?: string; 
      }
      
      const map: Record<string, ItemSum> = {};
      const processedJobIds = new Set<string>();

      const normalizeCv = (val: any) => String(val || '').trim().toUpperCase().replace(/^A/, '');
      const normalizedTargetCv = normalizeCv(targetCv);

      const getJobId = (it: any) => {
         const id = it.jobId || it.job_id || it.JobID || it.txnNo || it.txn_no || it.TxnNo || it.ref || it.id || '';
         return String(id).trim();
      };

      /**
       * 🪄 Data Enrichment Helper (Enhanced)
       * Tries multiple fields to match master item
       */
      const enrichItem = (it: any) => {
         const itemId = it.item_id || it.rowIndex || it.rowIndexMaster || null;
         if (!itemId) return it;

         const master = masterItems.find(m => 
            String(m.id) === String(itemId) || 
            String(m.rowIndex) === String(itemId) || 
            String(m.item_id) === String(itemId)
         );

         if (master) {
            return {
               ...it,
               ประเภท: it.ประเภท || master.ประเภท || master.category || '',
               ยี่ห้อหรือรูปแบบ: it.ยี่ห้อหรือรูปแบบ || it.brand || master.ยี่ห้อหรือรูปแบบ || master.brand || '',
               รายการ: it.รายการ || it.item_name || master.รายการ || master.item_name || '',
               ขนาด: it.ขนาด || it.size || master.ขนาด || master.size || '',
               สภาพ: it.สภาพ || it.condition || it.Condition || master.สภาพ || master.condition || 'ปกติ'
            };
         }
         return it;
      };

      const generateKey = (it: any) => {
         const { main, meta } = formatItemName(it);
         const cond = String(it.สภาพ || it.condition || 'ปกติ').trim();
         return `${main}|${meta}|${cond}`;
      };

      const updateLastDate = (key: string, newDate: string | undefined) => {
         if (!newDate || !map[key]) return;
         const cleanDate = String(newDate).split(' ')[0];
         if (!map[key].lastDate || cleanDate > map[key].lastDate) {
            map[key].lastDate = cleanDate;
         }
      };

      // 1️⃣ Process Active/History Jobs
      (logisticsJobs || []).forEach(job => {
         const rawCv = String(job.cv || job.CV || job.CustomerID || '').trim();
         if (normalizeCv(rawCv) !== normalizedTargetCv || rawCv === '') return;

         const jId = getJobId(job);
         if (jId && processedJobIds.has(jId)) return;
         if (jId) processedJobIds.add(jId);

         const js = String(job.status || '').toUpperCase();
         const isConfirmed = js.includes('เสร็จ') || js.includes('สำเร็จ') || js.includes('SUCCESS') || js.includes('คืน') || js.includes('กลับ');

         const { allAggregated } = aggregateJobItems(job.items || [], job.status);

         allAggregated.forEach(agg => {
            const enriched = enrichItem(agg.it);
            const itemKey = generateKey(enriched);
            const category = agg.category;
            const qty = agg.totalQty;

            if (!map[itemKey]) {
               const { main } = formatItemName(enriched);
               map[itemKey] = { 
                  name: main, 
                  type: enriched.ประเภท || '',
                  detail: enriched.รายละเอียด || enriched.details || '',
                  size: enriched.ขนาด || '',
                  condition: enriched.สภาพ || 'ปกติ',
                  qty: 0 
               };
            }

            if (category === 'SEND' && isConfirmed) {
               map[itemKey].qty += qty;
               map[itemKey].lastStatus = agg.action_type || job.status || 'ส่งเสร็จแล้ว';
               updateLastDate(itemKey, job.completion_date || job.deliveryDate || job.updated_at || job.date);
            } else if (category === 'RETURN' && isConfirmed) {
               map[itemKey].qty -= qty;
            }
         });
      });

      // 2️⃣ Process Historical Transactions
      (transactions || []).forEach(t => {
         const rawCv = String(t.CV || t.cv || t.CustomerID || '').trim();
         if (normalizeCv(rawCv) !== normalizedTargetCv || rawCv === '') return;

         const tId = getJobId(t);
         if (tId && processedJobIds.has(tId)) return;

         const enriched = enrichItem(t);
         const itemKey = generateKey(enriched);
         const status = String(t.สถานะ || t.Status || '').toUpperCase();
         if (status.includes(TRANSACTION_STATUSES.CANCELLED.toUpperCase())) return;

         const category = classifyLogisticsItem(status);
         const qty = Number(t.จำนวน || t.qty || t.Quantity || 0);

         if (!map[itemKey]) {
            const { main } = formatItemName(enriched);
            map[itemKey] = { 
               name: main,
               type: enriched.ประเภท || '',
               detail: enriched.รายละเอียด || enriched.details || '',
               size: enriched.ขนาด || '',
               condition: enriched.สภาพ || 'ปกติ',
               qty: 0 
            };
         }

         const isIncoming = POSSESSION_ACTIONS.CONFIRMED_DELIVERY.some(k => status.includes(k.toUpperCase())) || category === 'SEND';
         const isOutgoing = POSSESSION_ACTIONS.LEAVING_SHOP.some(k => status.includes(k.toUpperCase())) || category === 'RETURN';

         if (isIncoming) {
            map[itemKey].qty += qty;
            map[itemKey].lastStatus = t.สถานะ ||'ส่งเสร็จแล้ว';
            updateLastDate(itemKey, t["วัน-เวลา"] || t.Date || t.deliveryDate);
         } else if (isOutgoing) {
            map[itemKey].qty -= qty;
         }
      });

      // 3️⃣ Expansion and Freezer Detection
      const grouped = Object.values(map).filter(it => it.qty > 0);
      const result: typeof grouped = [];

      grouped.forEach(item => {
         const nameLower = String(item.name || '').toLowerCase();
         const typeLower = String(item.type || '').toLowerCase();
         
         const isFreezer = (
            nameLower.includes('ตู้แช่') || 
            nameLower.includes('liebherr') || 
            nameLower.includes('sanyo') ||
            nameLower.includes('the cool') ||
            nameLower.includes('sands') ||
            typeLower.includes('ตู้แช่')
         ) && (
            !nameLower.includes('กุญแจ') && 
            !nameLower.includes('สติกเกอร์') && 
            !nameLower.includes('สติ๊กเกอร์') && 
            !nameLower.includes('ตะกร้า') && 
            !nameLower.includes('อุปกรณ์')
         );
         
         if (isFreezer) {
            for (let i = 0; i < item.qty; i++) {
               result.push({ ...item, qty: 1 });
            }
         } else {
            result.push(item);
         }
      });

      return result;
   }, [transactions, customerCv, logisticsJobs, masterItems]);

   return possessionList;
}
