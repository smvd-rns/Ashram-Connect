const XLSX = require('xlsx');
const path = require('path');

const data = [
  ["Devotee Full Name", "Harinam Type", "Date"],
  ["Radhapada Pankaj das", "7:00:00 AM, PDC, 7:40:00 AM", "10/13/2025"],
  ["Sample User", "7:00:00 AM, PDC", "10/14/2025"],
  ["Another User", "7:40:00 AM", "10/14/2025"]
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Template");

const filePath = path.join('C:', 'Users', 'Admin', '.gemini', 'antigravity', 'brain', 'bcfce25c-52ef-42e1-a7ed-bd9a15d06a28', 'harinam_import_template.xlsx');
XLSX.writeFile(wb, filePath);
console.log('File created at:', filePath);
