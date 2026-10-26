import * as XLSX from "xlsx";

export function exportToExcel(data, fileName = "export.xlsx", sheetName = "Məlumat") {
  if (!Array.isArray(data) || data.length === 0) {
    alert("İxrac ediləcək məlumat yoxdur!");
    return;
  }

  // Flatten / clean objects
  const cleanData = data.map((item) => {
    const row = {};
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === "object" && v !== null) {
        row[k] = JSON.stringify(v);
      } else {
        row[k] = v;
      }
    }
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(cleanData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, fileName);
}
