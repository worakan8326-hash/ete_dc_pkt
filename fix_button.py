import sys
import os

path = r'c:\Users\Rocket Star\Desktop\ete_dc_pkt\frontend\src\components\TransactionForm.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleSaveCustomer to include alert
old_handle = 'await refreshCustomers();'
new_handle = 'await refreshCustomers(); alert("บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว");'
if old_handle in content:
    content = content.replace(old_handle, new_handle)

# 2. Update Button to use LoadingSpinner
old_btn = "{loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลลูกค้า'}"
new_btn = "{loading ? LoadingSpinner : 'บันทึกข้อมูลลูกค้า'}"
if old_btn in content:
    content = content.replace(old_btn, new_btn)

# 3. Add flex styling to the button
old_class = 'className="w-full py-4 bg-amber-500 text-on-surface font-black rounded-2xl shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-50"'
new_class = 'className="w-full py-4 bg-amber-500 text-on-surface font-black rounded-2xl shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center min-h-[56px]"'
if old_class in content:
    content = content.replace(old_class, new_class)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully!")
