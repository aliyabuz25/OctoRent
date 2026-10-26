import { isValidEAN13 } from "../../lib/ean13.js";

const formatNumber = (cell) => Number(cell.getValue() || 0).toLocaleString("tr-TR");

const formatStock = (cell) => {
  const value = Number(cell.getValue() || 0);
  const min = Number(cell.getRow().getData().minStock || 0);
  const color = value <= 0 ? "#dc2626" : value <= min ? "#d97706" : "#16a34a";
  const bg = value <= 0 ? "#fee2e2" : value <= min ? "#fef3c7" : "#dcfce7";
  return `<span style="background:${bg};color:${color};font-weight:700;padding:2px 8px;border-radius:4px;display:inline-block;min-width:32px;text-align:center;">${value}</span>`;
};

const validateEAN = (_cell, value) => {
  const ean = String(value ?? "").replace(/\D/g, "");
  if (!ean) return true;
  return isValidEAN13(ean) || "Geçersiz EAN-13";
};

const money = {
  formatter: "money",
  formatterParams: { symbol: "₺", precision: 2, symbolAfter: true },
};

export const columns = [
  { title: "SKU", field: "sku", width: 110, minWidth: 90, editor: "input", sorter: "string" },
  {
    title: "EAN-13",
    field: "ean13",
    width: 130,
    minWidth: 110,
    editor: "input",
    validator: validateEAN,
    formatter: (cell) => `<span class="cell-mono">${cell.getValue() || ""}</span>`,
  },
  { title: "Məhsul Adı", field: "name", width: 240, minWidth: 180, editor: "input", sorter: "string" },
  {
    title: "Kateqoriya",
    field: "category",
    width: 130,
    minWidth: 100,
    editor: "input",
    sorter: "string",
  },
  { title: "Marka", field: "brand", width: 120, minWidth: 90, editor: "input", sorter: "string" },
  {
    title: "Vahid",
    field: "unit",
    width: 80,
    minWidth: 70,
    hozAlign: "center",
    editor: "list",
    editorParams: { valuesLookup: true },
  },
  {
    title: "Stok",
    field: "quantity",
    width: 90,
    minWidth: 80,
    hozAlign: "center",
    sorter: "number",
    editor: "number",
    editorParams: { min: 0, step: 1 },
    formatter: formatStock,
  },
  {
    title: "Kritik",
    field: "minStock",
    width: 80,
    minWidth: 70,
    hozAlign: "right",
    sorter: "number",
    editor: "number",
    editorParams: { min: 0, step: 1 },
    formatter: formatNumber,
  },
  {
    title: "Alış Qiyməti",
    field: "cost",
    width: 115,
    minWidth: 100,
    hozAlign: "right",
    sorter: "number",
    editor: "number",
    editorParams: { min: 0, step: 0.01 },
    ...money,
  },
  {
    title: "Satış Qiyməti",
    field: "price",
    width: 115,
    minWidth: 100,
    hozAlign: "right",
    sorter: "number",
    editor: "number",
    editorParams: { min: 0, step: 0.01 },
    ...money,
  },
  {
    title: "Kirayə/Gün",
    field: "rentalPrice",
    width: 115,
    minWidth: 100,
    hozAlign: "right",
    sorter: "number",
    editor: "number",
    editorParams: { min: 0, step: 0.01 },
    ...money,
  },
  { title: "Seriya No", field: "serialNumber", width: 130, minWidth: 100, editor: "input" },
  { title: "Lokasiya / Rəf", field: "location", width: 120, minWidth: 100, editor: "input" },
  { title: "Təchizatçı", field: "supplier", width: 140, minWidth: 110, editor: "input" },
  { title: "Yenilənmə", field: "updated", width: 120, minWidth: 100, hozAlign: "center" },
];
