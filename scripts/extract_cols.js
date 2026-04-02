const xlsx = require('xlsx');
const path = require('path');

const filePath = "C:\\Users\\Admin\\Documents\\BC-Class\\NVCC Ashram Connect.xlsx";
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

if (data.length > 0) {
  console.log(JSON.stringify(data[0]));
} else {
  console.log("No data found");
}
