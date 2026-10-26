import { useCallback, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";
import { api } from "../../lib/api.js";

const columns = [
  { title: "Tarix", field: "date", width: 120, minWidth: 95, hozAlign: "center" },
  {
    title: "Növ",
    field: "type",
    width: 110,
    minWidth: 95,
    hozAlign: "center",
    formatter: (cell) => {
      const is = cell.getValue() === "in";
      return `<span style="padding:3px 10px;border-radius:4px;font-weight:700;font-size:11px;background:${is ? "#dcfce7" : "#fee2e2"};color:${is ? "#166534" : "#991b1b"}">${is ? "Daxil (+)" : "Çıxar (-)"}</span>`;
    },
  },
  { title: "SKU", field: "sku", width: 120, minWidth: 90, formatter: (c) => `<span class="cell-mono">${c.getValue() || ""}</span>` },
  { title: "Məhsul Adı", field: "itemName", width: 240, minWidth: 160, sorter: "string" },
  { title: "Miqdar", field: "qty", width: 100, minWidth: 80, hozAlign: "right", sorter: "number", formatter: (c) => `<b>${c.getValue() || 0}</b>` },
  { title: "Sonrakı Qalıq", field: "quantityAfter", width: 120, minWidth: 95, hozAlign: "right", sorter: "number" },
  { title: "Qeyd", field: "note", minWidth: 180 },
  { title: "Zaman", field: "at", width: 150, minWidth: 130 },
];
export default function MovementsPanel(){
  const ref=useRef(null);
  const [search, setSearch] = useState("");
  const fetcher=useCallback(()=>api.fetch("/api/movements").then(r=>r.json()),[]);
  return (
    <div className="stock-panel">
      <div className="grid-toolbar">
        <div className="searchbox">
          <input
            type="search"
            placeholder="Axtar..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              ref.current?.applySearch(e.target.value);
            }}
          />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              setSearch("");
              ref.current?.clearFilters();
            }}
          >
            Təmizlə
          </button>
          <button onClick={() => ref.current?.exportCsv("movements.csv")}>CSV</button>
          <button onClick={() => ref.current?.exportExcel("movements.xlsx")}>Excel</button>
        </div>
      </div>
      <DataGrid ref={ref} columns={columns} dataFetcher={fetcher}/>
    </div>
  );
}
