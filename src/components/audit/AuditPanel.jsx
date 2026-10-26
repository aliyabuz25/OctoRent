import { useCallback, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";
import { api } from "../../lib/api.js";

const columns = [
  { title: "Zaman", field: "at", width: 170, minWidth: 140 },
  { title: "Əməliyyat", field: "action", width: 180, minWidth: 140, sorter: "string" },
  { title: "Obyekt ID", field: "entityId", width: 150, minWidth: 110 },
  {
    title: "Ətraflı Detallar",
    field: "details",
    minWidth: 320,
    formatter: (c) => {
      try {
        return JSON.stringify(c.getValue() || {})
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      } catch {
        return "";
      }
    },
  },
];
export default function AuditPanel(){
  const ref=useRef(null);
  const [search, setSearch] = useState("");
  const fetcher=useCallback(()=>api.fetch("/api/audit").then(r=>r.json()),[]);
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
          <button onClick={() => ref.current?.exportCsv("audit.csv")}>CSV</button>
          <button onClick={() => ref.current?.exportExcel("audit.xlsx")}>Excel</button>
        </div>
      </div>
      <DataGrid ref={ref} columns={columns} dataFetcher={fetcher}/>
    </div>
  );
}
