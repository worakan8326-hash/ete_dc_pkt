import sys

file_path = 'Settings.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

target_marker = '  }, [masterItems, filterType, filterBrand, searchTerm]);'
insertion_point = -1

for i, line in enumerate(lines):
    if target_marker in line:
        insertion_point = i + 1
        break

if insertion_point != -1:
    new_code = """
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    try {
      setLoading(true);
      const dataToExport = masterItems.map(it => ({
        'ประเภท': it.ประเภท,
        'ยี่ห้อหรือรูปแบบ': it['ยี่ห้อหรือรูปแบบ'],
        'รายการ': it.รายการ,
        'สภาพ': it.สภาพ,
        'รายละเอียด': it.รายละเอียด,
        'ขนาด': it.ขนาด,
        'จำนวน': it.จำนวน,
        'RowIndex': it.rowIndex
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Inventory_Master_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Export Excel สำเร็จ');
    } catch (err: any) {
      setError('Export ล้มเหลว: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
"""
    # Check if lines were deleted by previous failed attempts (look for handleImportExcel)
    import_found = -1
    for i in range(insertion_point, len(lines)):
        if 'const handleImportExcel' in lines[i]:
            import_found = i
            break
    
    # If there's a gap or missing lines, we'll just insert after insertion_point
    lines.insert(insertion_point, new_code)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Success: Inserted handleExportExcel")
else:
    print("Error: Could not find target marker")
