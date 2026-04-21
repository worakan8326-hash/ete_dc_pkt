# Approval Queue & Quarantine Management Workflow

This document outlines the administrative process and technical workflow for reviewing returned logistic items in the Approval Queue (formerly Repair Management).

## 1. Objective
The Approval Queue allows administrators to review items returned from the field (Quarantine stage) and decide their final destination based on physical inspection:
- **Available (ปกติ)**: Back to usable stock.
- **Repair (ส่งซ่อม)**: Move to repair bucket.
- **Scrap (จำหน่าย/ซาก)**: Mark as scrap for disposal.
- **Lost (สูญหาย)**: Confirm as lost and remove from active inventory.

## 2. Process Flow & Bucket Logic

### Step A: Reception (Field to Quarantine)
When a driver performs a **Return** transaction, the item enters the `quarantine_qty` bucket for the assigned warehouse.
- **Transaction Code**: `RECEIVE` (Sub-action: `return`)
- **Status in DB**: `รอตรวจสอบ (Quarantine)`

### Step B: Administrative Review
In the **Approval Queue**, admins view items grouped by their unique **Job ID**.

#### Available Actions:
1. **ปกติ (Approve)**
   - `quarantine_qty -N`, `stock_qty +N`
   - UI: Moves to **"สต๊อกพร้อมใช้"**
2. **ส่งซ่อม (To Repair)**
   - `quarantine_qty -N`, `repair_qty +N`
   - UI: Moves to **"รอซ่อม"**
3. **จำหน่าย (To Scrap)**
   - `quarantine_qty -N`, `scrap_qty +N`
   - UI: Moves to **"จำหน่ายซาก"**
4. **สูญหาย (Confirm Loss)**
   - `quarantine_qty -N`, `lost_qty +N`
   - UI: Removes from pending view.

## 3. Evidence Collection & Google Drive
To maintain accountability, every transaction is linked to evidentiary photos.

- **Data Format**: Photos are stored in the `image_url` field of the `Transaction` table as a multi-line string (separated by `\n`).
- **Rendering**: The UI uses a `getDriveThumbnail` utility to transform Google Drive viewer links into direct thumbnail images.
- **Layout**: Evidence photos are consolidated at the **bottom of each Job Card** to provide a clear overview of the entire delivery/return task.

## 4. Technical Components
- **Frontend Component**: `frontend/src/components/RepairManagement.tsx`
- **Backend Route**: `server/routes/transactions.ts` -> `/confirm-repair`
- **Audit Path**: Every admin action creates a new `ADMIN_REVIEW` job with its own transaction record, preserving the history of who reviewed which item and when.

---
*Created: 2026-04-14*
