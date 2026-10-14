import { useCallback, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";

const cols = [
  { title:"Tarix", field:"date", width:110, headerFilter:"input" },
  { title:"Müştəri", field:"customer", width:200, headerFilter:"input" },
  { title:"Referans", field:"reference", width:140, headerFilter:"input" },
  { title:"Məbləğ", field:"total", width:120, hozAlign:"right", formatter:"money", formatterParams:{symbol:"₼",precision:2,symbolAfter:true} },
  { title:"Status", field:"status", width:110, headerFilter:"input" },
  { title:"Qeyd", field:"note", width:240, headerFilter:"input" },
  { title:"Yaradılıb", field:"createdAt", width:160 },
];
export default function SalesPanel(){
  const ref=useRef(null);
  const fetcher=useCallback(()=>fetch("/api/sales").then(r=>r.json()),[]);
  return (
    <div className="stock-panel">
      <div className="grid-toolbar">
        <div className="searchbox"><input type="search" placeholder="Axtar..." onChange={(e)=>ref.current?.applySearch(e.target.value)}/></div>
        <button onClick={()=>ref.current?.clearFilters()}>Təmizlə</button>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={()=>ref.current?.exportCsv("sales.csv")}>CSV</button>
          <button className="default" onClick={()=>alert("Satış sənədi yaratma tezliklə əlavə olunacaq")}>Yeni satış</button>
        </div>
      </div>
      <DataGrid ref={ref} columns={cols} dataFetcher={fetcher}/>
    </div>
  );
}
