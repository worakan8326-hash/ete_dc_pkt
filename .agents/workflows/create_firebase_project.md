# Workflow: create_firebase_project.md
---
description: สร้างโปรเจคใหม่บน Firebase (frontend + Firestore) แยกจากโปรเจคเดิม
---
1. เปิด Terminal แล้วไปที่ Desktop
   ```
   cd "C:/Users/Rocket Star/Desktop"
   ```
2. สร้างโฟลเดอร์ใหม่สำหรับโปรเจค Firebase
   ```
   mkdir ete_dc_pkt_firebase
   cd ete_dc_pkt_firebase
   ```
3. สร้าง Vite React TypeScript โปรเจค (non‑interactive)
   // turbo-all
   ```
   npx -y create-vite@latest ./ --template react-ts
   ```
4. ติดตั้ง Firebase SDK
   ```
   npm install firebase
   ```
5. สร้างไฟล์ config Firebase
   - สร้าง `src/firebase.ts` ด้วยโค้ดต่อไปนี้ (ใส่ค่า firebaseConfig ของคุณ)
   ```typescript
   import { initializeApp } from "firebase/app";
   import { getFirestore } from "firebase/firestore";
   import { getAuth } from "firebase/auth";

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   export const db = getFirestore(app);
   export const auth = getAuth(app);
   ```
6. คัดลอกโค้ด `src/api.ts` จากโปรเจคเดิม แล้วปรับให้ใช้ Firebase SDK (ดูแผนการย้ายในไฟล์ `firebase_migration_plan.md`)
7. คัดลอก `src/types.ts` และ `src/components/*` ที่ต้องการใช้ (เช่น Settings, TransactionForm) ไปยังโฟลเดอร์ `src` ของโปรเจคใหม่
8. ปรับ `src/App.tsx` ให้ import `firebase.ts` และใช้ API ใหม่
9. ทดสอบโดยรัน
   ```
   npm run dev
   ```
10. เมื่อทุกอย่างทำงานได้ ให้ทำการ Deploy ไป Firebase Hosting (optional)
    ```
    npm install -g firebase-tools
    firebase login
    firebase init hosting
    npm run build
    firebase deploy
    ```

**หมายเหตุ**: ขั้นตอนที่ 6‑8 ต้องแก้ไขโค้ดให้สอดคล้องกับ Firestore (ดูแผนการย้ายใน `firebase_migration_plan.md`).
