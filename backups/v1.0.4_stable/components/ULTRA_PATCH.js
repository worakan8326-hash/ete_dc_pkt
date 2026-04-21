import fs from 'fs';
import path from 'path';

const file_path = 'Settings.tsx';
let content = fs.readFileSync(file_path, 'utf8');

const buggedStates = [
  '      );\n    }\n\n  const handleImportExcel',
  '      );\n    }\n\n\n  const handleImportExcel',
  '      );\n    }\n  const handleImportExcel'
];

const fixedState = `      );
    }
    return list;
  }, [masterItems, filterType, filterBrand, searchTerm]);

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
      const fileName = \`Inventory_Master_\${new Date().toISOString().split('T')[0]}.xlsx\`;
      
      a.href = url;
      a.download = fileName;
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

  const handleImportExcel`;

const normalizedContent = content.replace(/\r\n/g, '\n');
let found = false;

for (const bugged of buggedStates) {
    const normalizedBugged = bugged.replace(/\r\n/g, '\n');
    if (normalizedContent.includes(normalizedBugged)) {
        const newContent = normalizedContent.replace(normalizedBugged, fixedState.replace(/\r\n/g, '\n'));
        fs.writeFileSync(file_path, newContent, 'utf8');
        console.log("Success: Settings.tsx patched via ESM Node.");
        found = true;
        break;
    }
}

if (!found) {
    console.log("Error: Could not find any of the bugged states.");
    // Emergency search for any line gap near handleImportExcel
    const lines = normalizedContent.split('\n');
    const importIdx = lines.findIndex(l => l.includes('const handleImportExcel'));
    if (importIdx !== -1) {
        console.log("Attempting emergency insertion before handleImportExcel at line " + (importIdx + 1));
        const head = lines.slice(0, importIdx).join('\n');
        const tail = lines.slice(importIdx).join('\n');
        // We'll assume the head ended at "    }" or similar
        const newContent = head + "\n" + fixedState.split('      );\n    }\n')[1] + "\n" + tail;
        fs.writeFileSync(file_path, newContent, 'utf8');
        console.log("Success: Emergency patch applied.");
    } else {
        console.log("CRITICAL FAILURE: handleImportExcel not found.");
    }
}
