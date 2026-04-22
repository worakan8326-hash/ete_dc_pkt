import xlsx from 'xlsx';
const { readFile, utils } = xlsx;
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const filePath = 'C:\\Users\\Rocket Star\\Desktop\\ete_dc_pkt\\LABTEST_Data_ete_pk_dc_ims.xlsx';

function excelDateToJSDate(serial: number) {
   var utc_days  = Math.floor(serial - 25569);
   var utc_value = utc_days * 86400;                                        
   var date_info = new Date(utc_value * 1000);
   var fractional_day = serial - Math.floor(serial) + 0.0000001;
   var total_seconds = Math.floor(86400 * fractional_day);
   var seconds = total_seconds % 60;
   total_seconds -= seconds;
   var hours = Math.floor(total_seconds / (60 * 60));
   var minutes = Math.floor(total_seconds / 60) % 60;
   return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

async function main() {
  console.log('🔄 กำลังอ่านไฟล์ Excel เพื่ออิมพอร์ต Transactions / Jobs / Logs...');
  const workbook = readFile(filePath);

  const users = await prisma.user.findMany();
  const userNameToId: Record<string, number> = {};
  users.forEach(u => userNameToId[u.name.trim()] = u.id);
  const defaultUser = users[0]?.id || 1;

  const items = await prisma.masterItem.findMany();
  const customers = await prisma.customer.findMany();
  const validCvs = new Set(customers.map(c => c.cv));
  
  const jobsSheet = workbook.Sheets['JobRequests'];
  if (jobsSheet) {
    const data: any[] = utils.sheet_to_json(jobsSheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < data.length; i++) {
        const row = data[i]; 
        if (row[0]) {
            const opName = row[5] ? String(row[5]).trim() : '';
            const opId = userNameToId[opName] || defaultUser;
            let cv = row[1] ? String(row[1]).trim() : null;
            if (cv && !validCvs.has(cv)) {
                // Upsert customer automatically to avoid crash
                await prisma.customer.upsert({
                    where: { cv },
                    update: {},
                    create: { cv, name: 'ลูกค้าที่ไม่ระบุชื่อ' }
                });
                validCvs.add(cv);
            }

            try {
               await prisma.job.upsert({
                 where: { job_id: String(row[0]).trim() },
                 update: {},
                 create: {
                   job_id: String(row[0]).trim(),
                   customer_cv: cv,
                   job_type: row[2] ? String(row[2]) : 'DELIVERY',
                   operator_id: opId,
                   note: row[6] ? String(row[6]) : null,
                   status: row[7] ? String(row[7]) : 'PENDING',
                 }
               });
               count++;
            } catch(e: any) {
               console.error("Job Error", e.message);
            }
        }
    }
    console.log(`✅ Jobs imported: ${count}`);
  }

  const txnSheet = workbook.Sheets['Transactions'];
  if (txnSheet) {
    await prisma.transaction.deleteMany({});
    
    const data: any[] = utils.sheet_to_json(txnSheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0]) {
            const jobStr = row[23] ? String(row[23]).trim() : null;
            if (jobStr) {
               // Ensure job exists to avoid FK error
               const existingJob = await prisma.job.findUnique({ where: { job_id: jobStr } });
               if (!existingJob) {
                   let cv = row[11] ? String(row[11]).trim() : null;
                   if (cv && !validCvs.has(cv)) {
                        await prisma.customer.upsert({
                            where: { cv },
                            update: {},
                            create: { cv, name: 'ลูกค้าที่ไม่ระบุชื่อ' }
                        });
                        validCvs.add(cv);
                   }
                   await prisma.job.create({
                      data: {
                          job_id: jobStr,
                          customer_cv: cv,
                          job_type: 'UNKNOWN',
                          operator_id: defaultUser,
                          status: 'COMPLETED'
                      }
                   });
               }
            }

            const opName = row[2] ? String(row[2]).trim() : '';
            const opId = userNameToId[opName] || defaultUser;
            
            const category = row[4] ? String(row[4]).trim() : '';
            let brand = row[5] ? String(row[5]).trim() : '';
            if (brand === '-' || brand === ' - ') brand = '';
            
            let matchedItem = items.find(it => {
                 let b1 = it.brand || '';
                 let b2 = brand;
                 return it.category === category && b1.trim() === b2.trim();
            });
            if (!matchedItem) matchedItem = items.find(it => it.category === category) || items[0];

            let dateVal = new Date();
            if (typeof row[1] === 'number') {
                dateVal = excelDateToJSDate(row[1]);
            }

            try {
               await prisma.transaction.create({
                   data: {
                       job_id: jobStr,
                       item_id: matchedItem.id,
                       operator_id: opId,
                       action_type: row[3] ? String(row[3]) : 'รับเข้า',
                       quantity: row[10] ? parseInt(String(row[10])) : 1,
                       zone_name: (row[15] && row[15] !== '-') ? String(row[15]) : null,
                       return_reason: (row[18] && row[18] !== '-') ? String(row[18]) : null,
                       cabinet_status: (row[19] && row[19] !== '-') ? String(row[19]) : null,
                       cancel_reason: (row[20] && row[20] !== '-') ? String(row[20]) : null,
                       created_at: dateVal,
                   }
               });
               count++;
            } catch(e: any) {
               console.error("Txn Error on index " + i + ":", e.message);
            }
        }
    }
    console.log(`✅ Transactions imported: ${count}`);
  }

  const auditSheet = workbook.Sheets['AuditLogs'];
  if (auditSheet) {
    await prisma.auditLog.deleteMany({});
    const data: any[] = utils.sheet_to_json(auditSheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < data.length; i++) {
        const row = data[i]; 
        if (row[0] && row[4]) {
            let dateVal = new Date();
            if (typeof row[0] === 'number') dateVal = excelDateToJSDate(row[0]);
            
            const opName = row[2] ? String(row[2]).trim() : '';
            const opId = userNameToId[opName] || defaultUser;

            try {
                await prisma.auditLog.create({
                    data: {
                        user_id: opId,
                        ip_address: row[3] ? String(row[3]) : null,
                        action: String(row[4]),
                        created_at: dateVal
                    }
                });
                count++;
            } catch(e: any) {
                console.error("Audit Error", e.message);
            }
        }
    }
    console.log(`✅ AuditLogs imported: ${count}`);
  }

  console.log('🎉 อิมพอร์ตแท็บย่อยสำเร็จครบแล้ว!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
