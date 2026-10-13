import { useCallback, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";

const columns = [
  { title: "Tarix", field: "date", width: 120, headerFilter: "input" },
  { title: "Tip", field: "type", width: 80, headerFilter: "list", headerFilterParams:{valuesLookup:true} },
  { title: "SKU", field: "sku", width: 110, headerFilter: "input" },
  { title: "Məhsul", field: "itemName", width: 240, headerFilter: "input" },
  { title: "Miqdar", field: "qty", width: 90, hozAlign:"right", sorter:"number" },
  { title: "Qalıq", field: "quantityAfter", width: 90, hozAlign:"right" },
  { title: "Qeyd", field: "note", width: 240, headerFilter: "input" },
  { title: "Zaman", field: "at", width: 160 },
];
export default function MovementsPanel(){
  const ref=useRef(null);
  const fetcher=useCallback(()=>fetch("/api/movements").then(r=>r.json()),[]);
  return (
    <div className="stock-panel">
      <div className="grid-toolbar">
        <div className="searchbox"><input type="search" placeholder="Axtar..." onChange={(e)=>ref.current?.applySearch(e.target.value)}/></div>
        <button onClick={()=>ref.current?.clearFilters()}>Təmizlə</button>
        <button onClick={()=>ref.current?.exportCsv("movements.csv")}>CSV</button>
      </div>
      <DataGrid ref={ref} columns={columns} dataFetcher={fetcher}/>
    </div>
  );
}
