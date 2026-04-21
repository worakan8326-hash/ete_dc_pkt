/**
 * ฟังก์ชันสำหรับระบบส่งรายงานอัตโนมัติ (Email + Excel/PDF)
 * นำโค้ดนี้ไปวางต่อท้ายไฟล์ Code.gs ใน Google Apps Script Editor ของคุณครับ
 */

function processDailyReports() {
  const settings = getSettings(); // ฟังก์ชันดึงค่าตั้งค่าจากชีต Settings
  
  if (!settings.ENABLE_DAILY_REPORT) return;
  
  // 1. ตรวจสอบ "วัน" ที่ต้องส่ง
  const now = new Date();
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayName = dayNames[now.getDay()];
  
  const allowedDays = (settings.RPT_DAYS || '').split(',');
  if (!allowedDays.includes(todayName)) return;

  // 2. ตรวจสอบ "เวลา" (ส่งในช่วงเวลา +- 1 นาที)
  const targetH = parseInt(settings.RPT_DAILY_TIME_H);
  const targetM = parseInt(settings.RPT_DAILY_TIME_M);
  
  if (now.getHours() !== targetH || now.getMinutes() !== targetM) return;

  // 3. เตรียมไฟล์สำหรับส่ง
  const attachments = [];
  const reportData = generateReportData(); // ฟังก์ชันดึงข้อมูลสรุปประจำวันจากตาราง History/Transactions
  
  // กรณีต้องการ Excel
  if (settings.FORMAT_EXCEL && reportData.length > 0) {
    const excelBlob = generateExcelBlob(reportData);
    attachments.push(excelBlob);
  }
  
  // กรณีต้องการ PDF
  if (settings.FORMAT_PDF && reportData.length > 0) {
    const pdfBlob = generatePdfBlob(reportData);
    attachments.push(pdfBlob);
  }

  // 4. ส่งอีเมล
  if (settings.ENABLE_EMAIL_REPORT && settings.REPORT_EMAIL_DEST && attachments.length > 0) {
    MailApp.sendEmail({
      to: settings.REPORT_EMAIL_DEST,
      subject: `[สรุปรายงาน] รายการประจำวันวันที่ ${now.toLocaleDateString('th-TH')}`,
      body: `สวัสดีครับ,\n\nแนบไฟล์สรุปรายงานประจำวันจากระบบจัดเก็บสินค้า สำหรับวั้นที่ ${now.toLocaleDateString('th-TH')} ครับ\n\nขอบคุณครับ\nระบบจัดการคลังสินค้าอัตโนมัติ`,
      attachments: attachments
    });
    
    Logger.log("Email Sent Succesfully to: " + settings.REPORT_EMAIL_DEST);
  }
}

/**
 * วิธีตั้งเวลาส่ง (Trigger):
 * 1. ใน Google Apps Script Editor ให้กดปุ่ม "นาฬิกา" (Triggers) ด้านซ้าย
 * 2. กดปุ่ม "Add Trigger"
 * 3. เลือกฟังก์ชัน "processDailyReports"
 * 4. เลือก Time-driven -> Minutes timer -> Every minute 
 * (เพื่อให้ระบบคอยเช็คทุกๆ นาทีว่าถึงเวลาที่ตั้งไว้ในแอปหรือยัง)
 */
