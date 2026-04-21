# 📦 Logistics Workflow — เอกสาร Logic & ระบบ (Living Document)

> **วัตถุประสงค์:** บันทึก Logic การทำงานที่ถูกต้องของระบบ Logistics ทั้งหมด เพื่อป้องกันการแก้ไขแล้วทำให้ระบบเพี้ยน
> ⚠️ **ทุกครั้งที่แก้ไขฟังก์ชันที่เกี่ยวข้อง ต้องอัปเดตไฟล์นี้ด้วย!**

---

## 🗂️ ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `frontend/src/components/LogisticsDashboard.tsx` | หน้าหลัก แสดงรายการงาน + ปุ่ม Action + Tab Filtering |
| `frontend/src/components/LogisticsSummary.tsx` | หน้าสรุปก่อนบันทึก + กำหนด Job Status |
| `frontend/src/components/ReturnForm.tsx` | ฟอร์มกรอกข้อมูลรับคืน |
| `frontend/src/components/IssueForm.tsx` | ฟอร์มกรอกข้อมูลเบิกสินค้า |
| `frontend/src/api.ts` | ตัวกลางส่งข้อมูลไปหลังบ้าน |
| `server/routes/transactions.ts` | Backend: บันทึก Transaction + อัปเดต Stock |
| `docs/logistics_return_workflow.md` | **ไฟล์นี้** — เอกสาร Logic |

---

## 🔄 Workflow ที่ถูกต้อง (User-Defined)

### กรณีที่ 1: งานมีทั้งส่งของ + รับคืน (Combined)

```
[สร้าง Job] ──► [รอรับงาน] ──► [รับงาน (ACCEPTED)]
                                      │
                                      ▼  แท็บ: ดำเนินการ
                              ┌───────────────────┐
                              │  ปุ่ม: เบิกสินค้า  │ (ส้ม)
                              └────────┬──────────┘
                                       │ กด → ไป IssueForm
                                       ▼
                              [บันทึกเบิกสินค้า]
                              Status: "กำลังไปส่งและรับคืน"
                                       │
                                       ▼  กลับมา Dashboard
                              ┌───────────────────┐
                              │  ปุ่ม: รับคืนสินค้า │ (ม่วง)
                              └────────┬──────────┘
                                       │ กด → ไป ReturnForm
                                       ▼
                              [บันทึกรับคืน]
                              Status: "รับจากร้าน - กำลังเดินทางกลับ"
                                       │
                                       ▼  ย้ายแท็บอัตโนมัติ
                              [แท็บ: เสร็จสิ้น] ◄── Admin รออนุมัติ
```

### กรณีที่ 2: งานมีแค่รับคืนอย่างเดียว

```
[สร้าง Job] ──► [รอรับงาน] ──► [รับงาน (ACCEPTED)]
                                      │
                                      ▼  แท็บ: ดำเนินการ
                              ┌───────────────────┐
                              │  ปุ่ม: รับคืนสินค้า │ (ม่วง) ← ขึ้นตรงนี้เลย
                              └────────┬──────────┘
                                       │ กด → ไป ReturnForm
                                       ▼
                               [บันทึกรับคืน]
                               Status: "รับจากร้าน - กำลังเดินทางกลับ"
                                        │
                                        ▼  ย้ายแท็บอัตโนมัติ (จบงานคนขับ)
                               [แท็บ: เสร็จสิ้น] ◄── หน้าที่ Driver จบแล้ว / Admin รอตรวจ
```

---

## 📊 สถานะ (Job Status) — ตารางอ้างอิง

| สถานะ | Tab | ปุ่มที่แสดง | ใครตั้ง |
|---|---|---|---|
| `PENDING` / `รอส่ง` / `รอรับคืน` | รอรับงาน | "รับงาน" (indigo) | ระบบ |
| `ACCEPTED` / `รับงาน` | ดำเนินการ | ขึ้นกับ items ใน job | Driver กดรับงาน |
| `เบิกออก - กำลังเดินทาง` | ดำเนินการ | "ไปหน้ารับคืน" (ถ้ามี returnItems) | `LogisticsSummary` (issue, ไม่มี returnItems) |
| `กำลังไปส่งและรับคืน` | ดำเนินการ | "ไปหน้ารับคืนสินค้า" (ม่วง) | `LogisticsSummary` (issue, มี returnItems) |
| `รับจากร้าน - กำลังเดินทางกลับ` | **เสร็จสิ้น** | (ไม่มีปุ่ม / รอ Admin) | `LogisticsSummary` (return) |
| `คืนของแล้ว` / `ปิดงาน` | เสร็จสิ้น | (ไม่มีปุ่ม / รอ Admin) | Backend auto |
| `เสร็จสิ้น` | เสร็จสิ้น | "เสร็จสมบูรณ์" (แสดงสีเขียว) | Admin อนุมัติ |

---

## 🗃️ Tab Filtering Logic (`LogisticsDashboard.tsx`)

```typescript
// แท็บ "รอรับงาน"
status === 'PENDING' || status.includes('รอส่ง') || status.includes('รอรับคืน')

// แท็บ "ดำเนินการ" — งานที่ Driver กำลังทำอยู่ (ยังไม่ส่งคืน)
const isInProgress = status.includes('ACCEPTED') || status.includes('รับงาน') || ...;

const hasHandedOverItems = items.some(it => it.action_type.includes('รอตรวจ'));

if (hasHandedOverItems) return false; // ← ถ้าคืนของมาแล้ว (รอตรวจ) "ย้ายออก" จากหน้าดำเนินการทันที

return isInProgress;

// แท็บ "เสร็จสิ้น" — งานที่จบแล้ว หรือ งานที่ Driver คืนของมาแล้วรอ Admin ตรวจ
const isDone = status.includes('เสร็จสิ้น') || status.includes('ตรวจสอบแล้ว') || ...;

return isDone || hasHandedOverItems; // ← สองเงื่อนไขนี้ทำให้งานมาโผล่ตรงนี้
```

---

## 🎯 Button Rendering Logic (`LogisticsDashboard.tsx` — แท็บ ดำเนินการ)

```typescript
const jobStatus = String(job.status || "");

// เบิกของออกไปแล้วหรือยัง?
const isIssued =
  jobStatus.includes('เบิกออก') || jobStatus.includes('กำลังไปส่ง') ||
  jobStatus.includes('กำลังเดินทาง') || jobStatus.includes('กำลังไปส่งและรับคืน');

// รับคืนแล้วหรือยัง?
const isReturned =
  jobStatus.includes('รับจากร้าน') || jobStatus.includes('รับคืนสำเร็จ') ||
  jobStatus.includes('คืนของแล้ว') || jobStatus.includes('กำลังเดินทางกลับ') ||
  jobStatus.includes('เสร็จสิ้น');

// STEP 1: มีของต้องส่ง และยังไม่ได้เบิก → ปุ่มเบิกสินค้า (ส้ม)
if (hasDelivery && !isIssued) → navigate to IssueForm

// STEP 2: เบิกแล้ว (หรือไม่มีของส่ง) และยังไม่ได้รับคืน → ปุ่มรับคืน (ม่วง)
if (hasReturn && !isReturned) → navigate to ReturnForm

// ทำครบแล้ว → return null (งานย้ายไปแท็บเสร็จสิ้นแล้ว)
```

---

## 🎯 Status Setting Logic (`LogisticsSummary.tsx`)

```typescript
status: jobId ? (() => {
  if (action === 'issue') {
    const hasReturnItems = matchedJob?.items?.some((it: any) =>
      ['RETURN', 'RECEIVE', 'แจ้งคืน'].includes(String(it.action_type || '').toUpperCase()) ||
      String(it.action_type || '').includes('คืน')
    );
    // งาน Combined → "กำลังไปส่งและรับคืน"
    // งานส่งอย่างเดียว → "เบิกออก - กำลังเดินทาง"
    return hasReturnItems ? 'กำลังไปส่งและรับคืน' : 'เบิกออก - กำลังเดินทาง';
  }
  if (action === 'return') return 'รับจากร้าน - กำลังเดินทางกลับ';
  return undefined;
})() : undefined
```

---

## 🔧 Backend Transit Stock Logic (`transactions.ts`)

| subAction | itemStatus contains | ผลต่อสต๊อก |
|---|---|---|
| `issue` | "เดินทาง" / "ทาง" / "เบิก" | Stock **-qty**, Transit **+qty** |
| `issue` | "เสร็จ" / "เรียบร้อย" | Transit **-qty** |
| `return` | "ร้าน" / "รับคืน" | Transit **+qty** |
| `return` | "ออฟฟิศ" / "คืนแล้ว" / "ปิดงาน" / "เสร็จสิ้น" / "สำเร็จ" | Transit **-qty**, Quarantine/Stock **+qty** |

> ⚠️ `action_type` ในตาราง `Transaction` = **itemStatus** (เช่น "กำลังเดินทาง")  
> ⚠️ `status` ในตาราง `Job` = **สถานะงาน** (เช่น "เบิกออก - กำลังเดินทาง")  
> **ทั้งสองต่างกัน! ห้ามสับสน!**

---

## 🔌 API — ข้อควรระวัง (`api.ts`)

```typescript
// ✅ ถูก: ส่ง subAction='return' ตรงๆ เพื่อให้ Backend คำนวณ Transit ถูกต้อง
subAction: action === 'return' ? 'return' : action

// ❌ ผิด: ถ้าแปลง 'return' → 'receive' หลังบ้านจะข้าม Transit Logic ทั้งหมด
```

---

## 🛡️ Null Safety Rules

```typescript
// ✅ ถูก — ปลอดภัยจาก Crash
String(value || "").toUpperCase()
String(value || "").includes('keyword')

// ❌ ผิด — Crash ถ้า value === undefined
value.toUpperCase()
value.includes('keyword')
```

---

## 📅 History of Changes

| วันที่ | การเปลี่ยนแปลง | ไฟล์ที่แก้ |
|---|---|---|
| 2026-04-14 | เพิ่ม Null Safety ป้องกัน toUpperCase Crash | `transactions.ts` |
| 2026-04-14 | แก้ใบเสร็จ (Return Slip) ไม่หายก่อน User กด OK | `ReturnForm.tsx` |
| 2026-04-14 | เพิ่ม `transactions` prop ใน `LogisticsDashboard` (ป้องกัน จอขาว) | `App.tsx`, `LogisticsDashboard.tsx` |
| 2026-04-14 | แก้ isIssued/isReturned ให้อ่านจาก `job.status` (แทน Transaction History ที่ผิด) | `LogisticsDashboard.tsx` |
| 2026-04-14 | เพิ่มสถานะ "กำลังไปส่งและรับคืน" สำหรับงาน Combined | `LogisticsSummary.tsx` |
| 2026-04-14 | ยกเลิก Auto-Complete "เสร็จสิ้น" จาก Frontend (ทำให้งานปิดก่อนเวลา) | `LogisticsSummary.tsx` |
| 2026-04-14 | เพิ่ม "เสร็จสิ้น"/"สำเร็จ" ใน isReturningToBase Backend trigger | `transactions.ts` |
| 2026-04-14 | **แก้ Tab Filtering:** "รับจากร้าน" → ย้ายไปแท็บเสร็จสิ้น (ไม่ค้างใน ดำเนินการ) | `LogisticsDashboard.tsx` |
| 2026-04-14 | **แก้ Button Logic:** ลบปุ่ม "จัดการงาน" ออก, ใช้ return null แทนเมื่องานเสร็จ | `LogisticsDashboard.tsx` |
| 2026-04-14 | **แก้ปุ่มรับงานไม่ยอมทำงาน (Frontend):** เมื่อ action='status_only' ส่ง items=[] ไป Backend | `LogisticsDashboard.tsx` |
| 2026-04-14 | **แก้ปุ่มรับงานไม่ยอมทำงาน (Backend):** Backend บังคับ override สถานะ ACCEPTED → รอรับคืน สำหรับ job_type=RETURN ที่ยังไม่มี transaction — แก้โดย skip override เมื่อ isStatusOnly=true และเพิ่ม ACCEPTED/รับงาน/เบิก ใน isInProgress check | `transactions.ts` |


---

> ## 📌 กฎทองของระบบนี้
> 1. **สถานะงาน** → อ่านจาก `job.status` โดยตรง ห้ามคำนวณเองจาก Transaction Array
> 2. **`action_type`** ใน Transaction ≠ **`status`** ใน Job — คนละตารางคนละความหมาย
> 3. **ห้าม Auto-Set** "เสร็จสิ้น" จาก Frontend — ให้ใช้สถานะกลางที่หมายความว่า "Driver ทำเสร็จแล้ว" แทน
> 4. **Tab เสร็จสิ้น** = งานที่ Driver ทำเสร็จแล้ว รอ Admin อนุมัติ (ไม่ใช่งานที่ Admin ปิดแล้ว)


---

## 🗂️ ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `frontend/src/components/LogisticsDashboard.tsx` | หน้าหลัก แสดงรายการงาน + ปุ่ม Action |
| `frontend/src/components/LogisticsSummary.tsx` | หน้าสรุปก่อนบันทึก + กำหนด Status |
| `frontend/src/components/ReturnForm.tsx` | ฟอร์มกรอกข้อมูลรับคืน |
| `frontend/src/components/IssueForm.tsx` | ฟอร์มกรอกข้อมูลเบิกสินค้า |
| `frontend/src/api.ts` | ตัวกลางส่งข้อมูลไปหลังบ้าน |
| `server/routes/transactions.ts` | Backend: บันทึก Transaction + อัปเดต Stock |

---

## 🔄 Workflow หลัก: งานแบบ Combined (มีทั้งส่ง + รับคืน)

```
[สร้าง Job] → [รอรับงาน] → [รับงาน] → [เบิกสินค้า] → [กำลังไปส่งและรับคืน]
                                              ↓
                                     [ถึงลูกค้า: ส่งของ + รับคืน]
                                              ↓
                                     [รับพัสดุกลับ (ReturnForm)]
                                              ↓
                                     [รับจากร้าน - กำลังเดินทางกลับ]
```

---

## 📊 สถานะ (Job Status) ที่ใช้ในระบบ

| สถานะ | ความหมาย | ใครตั้ง |
|---|---|---|
| `รอรับงาน` | Job ถูกสร้างแล้ว รอ Driver รับ | ระบบ (auto) |
| `กำลังดำเนินการ` / `ACCEPTED` | Driver รับงานแล้ว | Driver กดปุ่มรับงาน |
| `เบิกออก - กำลังเดินทาง` | เบิกสินค้าออกแล้ว (งานมีแค่ส่งอย่างเดียว) | `LogisticsSummary` (action=issue, ไม่มี returnItems) |
| `กำลังไปส่งและรับคืน` | เบิกสินค้าออกแล้ว (งานมีทั้งส่ง + รับคืน) | `LogisticsSummary` (action=issue, มี returnItems) |
| `รับจากร้าน - กำลังเดินทางกลับ` | รับพัสดุคืนจากลูกค้าแล้ว กำลังกลับ | `LogisticsSummary` (action=return) |
| `เสร็จสิ้น` | งานจบสมบูรณ์ | ตั้งด้วยมือ (ห้าม Auto จาก Frontend) |

> ⚠️ **ข้อห้ามสำคัญ:** ห้าม Auto-Set สถานะ `เสร็จสิ้น` จาก Frontend โดยการดูประวัติ Transaction เก่า เพราะจะ Match ผิด Job ทำให้งานปิดก่อนเวลา!

---

## 🎯 Logic การตรวจสอบสถานะบน Dashboard

### ✅ วิธีที่ถูกต้อง — ใช้ `job.status` โดยตรง

```typescript
// LogisticsDashboard.tsx (ใน activeTab === 'active' block)
const jobStatus = String(job.status || "");

const isIssued = 
  jobStatus.includes('เบิกออก') ||
  jobStatus.includes('กำลังไปส่ง') ||
  jobStatus.includes('กำลังเดินทาง') ||
  jobStatus.includes('กำลังไปส่งและรับคืน') ||
  jobStatus.includes('เสร็จสิ้น');

const isReturned = 
  jobStatus.includes('รับจากร้าน') ||
  jobStatus.includes('รับคืนสำเร็จ') ||
  jobStatus.includes('คืนของแล้ว') ||
  jobStatus.includes('เสร็จสิ้น');
```

### ❌ วิธีที่ผิด — ห้ามใช้!

```typescript
// ❌ ห้ามเช็คจาก Transactions Array เพราะ action_type ใน Transaction
// เก็บ itemStatus (เช่น "กำลังเดินทาง") ไม่ใช่ชื่อ Action ("เบิกออก")
// ทำให้ isIssued/isReturned ผิดพลาดเสมอ!
const isIssued = transactions.some(t => t.สถานะ?.includes('เบิกออก')); // ❌ WRONG
```

---

## 🎯 Logic การตั้งค่า Status เมื่อบันทึก

### `LogisticsSummary.tsx` — การตั้ง Status ที่ถูกต้อง

```typescript
status: jobId ? (() => {
  if (action === 'issue') {
    // ตรวจว่า job มีรายการรับคืนด้วยไหม?
    const hasReturnItems = matchedJob?.items?.some((it: any) =>
      ['RETURN', 'RECEIVE', 'แจ้งคืน'].includes(String(it.action_type || '').toUpperCase()) ||
      String(it.action_type || '').includes('คืน')
    );
    // ถ้ามีทั้งส่ง+คืน → "กำลังไปส่งและรับคืน"
    // ถ้ามีแค่ส่ง → "เบิกออก - กำลังเดินทาง"
    return hasReturnItems ? 'กำลังไปส่งและรับคืน' : 'เบิกออก - กำลังเดินทาง';
  }
  if (action === 'return') return 'รับจากร้าน - กำลังเดินทางกลับ';
  return undefined;
})() : undefined
```

---

## 🔧 Logic ฝั่ง Backend: Transit Stock (transactions.ts)

### ขั้นตอนการเคลื่อนย้ายสต๊อก

| Action | subAction | Status | ผลต่อสต๊อก |
|---|---|---|---|
| เบิกออก (Driver รับของ) | `issue` | มีคำว่า `เดินทาง` / `ทาง` / `เบิก` | Stock -qty, Transit +qty |
| ส่งให้ลูกค้าสำเร็จ | `issue` | มีคำว่า `เสร็จ` / `เรียบร้อย` | Transit -qty |
| รับคืนจากลูกค้า (Driver เก็บ) | `return` | มีคำว่า `ร้าน` / `รับคืน` | Transit +qty |
| นำพัสดุกลับออฟฟิศ | `return` | มีคำว่า `ออฟฟิศ` / `คืนแล้ว` / `ปิดงาน` / `เสร็จสิ้น` / `สำเร็จ` | Transit -qty, Quarantine/Stock +qty |

### ⚠️ จุดสำคัญ

- `action_type` ในตาราง `Transaction` DB = `itemStatus` (เช่น "กำลังเดินทาง")
- `status` ในตาราง `Job` DB = สถานะของงาน (เช่น "เบิกออก - กำลังเดินทาง")
- **ทั้งสองอย่างต่างกัน** อย่าสับสน!

---

## 🔌 API — การส่งข้อมูล

### `api.ts` — Mapping ที่ต้องระวัง

```typescript
// ✅ ถูกต้อง: ส่ง subAction เป็น 'return' ตรงๆ ไปหลังบ้าน
subAction: action === 'return' ? 'return' : action

// ❌ ผิด: ห้ามแปลง 'return' เป็น 'receive' เพราะหลังบ้านจะข้าม Transit Logic
subAction: action === 'return' ? 'receive' : action // ❌ WRONG
```

---

## 🛡️ Null Safety — จุดที่ต้องระวัง

ทุกที่ที่เรียก `.toUpperCase()` หรือ `.includes()` ต้องครอบด้วย `String(value || "")` เสมอ:

```typescript
// ✅ ปลอดภัย
const val = String(t.สถานะ || t.status || "").toUpperCase();

// ❌ เสี่ยง Crash
const val = t.สถานะ.toUpperCase(); // crash ถ้า t.สถานะ === undefined
```

---

## 📅 History of Changes

| วันที่ | การเปลี่ยนแปลง | ไฟล์ที่แก้ |
|---|---|---|
| 2026-04-14 | เพิ่ม Null Safety ป้องกัน toUpperCase Crash | `transactions.ts` |
| 2026-04-14 | แก้ใบเสร็จ (Return Slip) ไม่หายก่อน User กด OK | `ReturnForm.tsx` |
| 2026-04-14 | แก้ isIssued/isReturned ให้อ่านจาก `job.status` แทน Transaction History | `LogisticsDashboard.tsx` |
| 2026-04-14 | เพิ่มสถานะ "กำลังไปส่งและรับคืน" สำหรับงาน Combined | `LogisticsSummary.tsx` |
| 2026-04-14 | ยกเลิก Auto-Complete "เสร็จสิ้น" อัตโนมัติจาก Frontend (ทำให้งานปิดก่อนเวลา) | `LogisticsSummary.tsx` |
| 2026-04-14 | เพิ่ม `transactions` prop ใน `LogisticsDashboard` (ป้องกัน จอขาว) | `App.tsx`, `LogisticsDashboard.tsx` |
| 2026-04-14 | เพิ่ม "เสร็จสิ้น"/"สำเร็จ" ใน isReturningToBase backend trigger | `transactions.ts` |
| 2026-04-14 | ปรับปรุง Data Integrity แดชบอร์ด (ขยาย Keyword, รวมยอด Grouping, ซ่อนรายการขยะระหว่างทาง) | `LogisticsDashboard.tsx` |

---

## 📊 Dashboard Data Visualization Logic

เพื่อให้หน้าแดชบอร์ดสะอาดและตรวจสอบข้อมูลได้แม่นยำที่สุด ระบบใช้กฎดังนี้:

### 1. การกรองรายการขยะ (Noise Filtering)
รายการที่เป็นเพียงขั้นตอนการเคลื่อนย้าย (Audit Trail) จะถูก **ซ่อน** จากหน้าสรุปรายละเอียดงาน เพื่อลดความสับสน:
- **สถานะที่ถูกซ่อน:** `กำลังเดินทาง`, `รับงาน`, `TRANSIT`, `กำลังไปส่ง`, `รอดำเนินการ`
- **เป้าหมาย:** โชว์เฉพาะ "แผนงานเดิม (Plan)" และ "ผลลัพธ์สุดท้าย (Final Result)" เท่านั้น

### 2. การแยกประเภท (Categorization)
ใช้ "คีย์เวิร์ดขยาย" เพื่อระบุหมวดหมู่พัสดุ แม้สถานะจะเปลี่ยนไปตามผลการตรวจ:
- **RETURN (สีแดง):** `RETURN`, `RECEIVE`, `รับคืน`, `แจ้งคืน`, `รอตรวจ`, `ชำรุด`, `สูญหาย`, `ซาก`
- **SEND (สีน้ำเงิน):** `ISSUE`, `DELIVERY`, `แจ้งส่ง`, `สำเร็จ`, `เรียบร้อย`, `ส่งแล้ว`

### 3. การจัดกลุ่มและสรุปยอด (Grouping & Summing)
พัสดุรายการเดียวกันที่มีสถานะเดียวกันจะถูก **ยุบรวมเป็นบรรทัดเดียว** และบวกยอดจำนวน (`quantity`) ให้ถูกต้อง:
- มีการแสดง **รายละเอียดเชิงลึก (Sub-list)** ภายใต้รายการที่ถูกยุบ เพื่อโชว์หมายเลข Serial Number และสาเหตุการคืนแยกตามรายชื้น

---

> 📌 **กฎทองของระบบนี้:**
> 1. สถานะของงาน (`job.status`) อ่านจาก Database เสมอ — ห้ามคำนวณเองจาก Frontend
> 2. `action_type` ใน Transaction ≠ `status` ใน Job — คนละตารางคนละความหมาย
> 3. ห้าม Auto-Set "เสร็จสิ้น" จาก Frontend — ต้องทำจาก Backend เท่านั้น
> 4. รายการ "ระหว่างทาง" (Transit) มีไว้เพื่อ Audit ใน Database เท่านั้น — ไม่ต้องเอาขึ้น Dashboard หน้าสรุปงาน
