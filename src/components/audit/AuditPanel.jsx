import { useCallback, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";

const columns=[
  {title:"Zaman",field:"at",width:160,headerFilter:"input"},
  {title:"Əməliyyat",field:"action",width:160,headerFilter:"input"},
  {title:"Obyekt ID",field:"entityId",width:160,headerFilter:"input"},
  {title:"Ətraflı",field:"details",width:520,formatter:(c)=>{ try{return JSON.stringify(c.getValue()||{});}catch{return"";} }},
];
export default function AuditPanel(){
  const ref=useRef(null);
  const fetcher=useCallback(()=>fetch("/api/audit").then(r=>r.json()),[]);
  return (
    <div className="stock-panel">
      <div className="grid-toolbar">
        <div className="searchbox"><input type="search" placeholder="Axtar..." onChange={(e)=>ref.current?.applySearch(e.target.value)}/></div>
        <button onClick={()=>ref.current?.clearFilters()}>Təmizlə</button>
        <button onClick={()=>ref.current?.exportCsv("audit.csv")}>CSV</button>
      </div>
      <DataGrid ref={ref} columns={columns} dataFetcher={fetcher}/>
    </div>
  );
}
