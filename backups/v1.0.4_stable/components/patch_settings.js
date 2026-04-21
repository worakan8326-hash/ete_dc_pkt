const fs = require('fs');

const file_path = 'Settings.tsx';
let lines = fs.readFileSync(file_path, 'utf8').split('\n');

const target_marker = '  }, [masterItems, filterType, filterBrand, searchTerm]);';
const insertion_point = lines.findIndex(line => line.includes(target_marker));

if (insertion_point !== -1) {
    const new_code = `
  const fileInputRef = { current: null }; // Fallback or search for real one
  // Re-define it if it was deleted
  
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
      a.download = \`Inventory_Master_\${new Date().toISOString().split('T')[0]}.xlsx\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Export Excel สำเร็จ');
    } catch (err) {
      setError('Export ล้มเหลว: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
`;
    // We'll also fix the missing fileInputRef if it was deleted
    if (!lines.some(l => l.includes('const fileInputRef'))) {
        lines.splice(insertion_point + 1, 0, '  const fileInputRef = useRef<HTMLInputElement>(null);');
    }
    
    lines.splice(insertion_point + 2, 0, new_code);
    
    fs.writeFileSync(file_path, lines.join('\n'), 'utf8');
    console.log("Success: Inserted handleExportExcel");
} else {
    console.log("Error: Could not find target marker");
}
