import { isValidEAN13 } from "../../lib/ean13.js";

const formatNumber = (cell) => Number(cell.getValue() || 0).toLocaleString("tr-TR");

const formatStock = (cell) => {
  const value = Number(cell.getValue() || 0);
  const min = Number(cell.getRow().getData().minStock || 0);
  const color = value <= 0 ? "#c50f1f" : value <= min ? "#9d5d00" : "#0b6a0b";
  return `<span style="color:${color};font-weight:600">${value}</span>`;
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
  { title: "SKU", field: "sku", width: 100, headerFilter: "input", editor: "input" },
  {
    title: "EAN-13",
    field: "ean13",
    width: 128,
    headerFilter: "input",
    editor: "input",
    validator: validateEAN,
    formatter: (cell) => `<span class="cell-mono">${cell.getValue() || ""}</span>`,
  },
  { title: "Ürün", field: "name", width: 190, headerFilter: "input", editor: "input" },
  {
    title: "Kategori",
    field: "category",
    width: 110,
    headerFilter: "list",
    headerFilterParams: { valuesLookup: true },
    editor: "autocomplete",
    editorParams: { valuesLookup: true, showListOnEmpty: true, freetext: true },
  },
  { title: "Marka", field: "brand", width: 100, headerFilter: "input", editor: "input" },
  {
    title: "Birim",
    field: "unit",
    width: 72,
    headerFilter: "list",
    headerFilterParams: { valuesLookup: true },
    editor: "list",
    editorParams: { valuesLookup: true },
  },
  {
    title: "Stok",
    field: "quantity",
    width: 72,
    hozAlign: "right",
    sorter: "number",
    headerFilter: "number",
    headerFilterFunc: ">=",
    editor: "number",
    editorParams: { min: 0, step: 1 },
    formatter: formatStock,
  },
  {
    title: "Kritik",
    field: "minStock",
    width: 72,
    hozAlign: "right",
    sorter: "number",
    editor: "number",
    editorParams: { min: 0, step: 1 },
    formatter: formatNumber,
  },
  {
    title: "Alış",
    field: "cost",
    width: 88,
    hozAlign: "right",
    sorter: "number",
    editor: "number",
    editorParams: { min: 0, step: 0.01 },
    ...money,
  },
  {
    title: "Fiyat",
    field: "price",
    width: 92,
    hozAlign: "right",
    sorter: "number",
    headerFilter: "number",
    headerFilterFunc: ">=",
    editor: "number",
    editorParams: { min: 0, step: 0.01 },
    ...money,
  },
  { title: "Lokasyon", field: "location", width: 88, headerFilter: "input", editor: "input" },
  { title: "Tedarikçi", field: "supplier", width: 118, headerFilter: "input", editor: "input" },
  { title: "Güncelleme", field: "updated", width: 96, hozAlign: "center" },
];
