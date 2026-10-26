import { useCallback, useEffect, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";
import PurchasesModal from "./PurchasesModal.jsx";
import ToastContainer from "../common/ToastContainer.jsx";
import { api } from "../../lib/api.js";

const cols = [
  { title: "Tarix", field: "date", width: 120, minWidth: 95, hozAlign: "center" },
  { title: "Təchizatçı", field: "supplier", width: 220, minWidth: 160, sorter: "string" },
  { title: "Referans", field: "reference", width: 150, minWidth: 110 },
  { title: "Məbləğ", field: "total", width: 130, minWidth: 100, hozAlign: "right", sorter: "number", formatter: (c) => `<b>${Number(c.getValue() || 0).toFixed(2)} ₺</b>` },
  {
    title: "Status",
    field: "status",
    width: 120,
    minWidth: 100,
    hozAlign: "center",
    formatter: (c) => `<span style="padding:3px 10px;border-radius:4px;font-weight:600;font-size:11px;background:#e0f2fe;color:#0369a1">${c.getValue() || "Qaralama"}</span>`,
  },
  { title: "Qeyd", field: "note", minWidth: 200 },
  { title: "Yaradılıb", field: "createdAt", width: 150, minWidth: 130 },
];
let tid=0;
export default function PurchasesPanel(){
  const ref=useRef(null);
  const [show,setShow]=useState(false);
  const [items,setItems]=useState([]);
  const [suppliers,setSuppliers]=useState([]);
  const [toasts,setToasts]=useState([]);
  const [search,setSearch]=useState("");
  const fetcher=useCallback(()=>api.fetch("/api/purchases").then(r=>r.json()),[]);
  useEffect(()=>{
    Promise.all([api.fetch("/api/items").then(r=>r.json()), api.fetch("/api/suppliers").then(r=>r.json())]).then(([i,s])=>{
      setItems(i); setSuppliers(s.map(x=>x.name));
    });
  },[]);
  const push=(m,t="info")=>{ tid++; setToasts(p=>[...p,{id:tid,message:m,type:t}]); };
  const rm=(id)=>setToasts(p=>p.filter(x=>x.id!=id));
  const save=async(doc)=>{
    try{
      const res=await api.fetch("/api/purchases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(doc)});
      if(!res.ok){ const p=await res.json().catch(()=>({})); throw new Error(p.error||`Xəta (${res.status})`); }
      push("Alış sənədi yadda saxlanıldı","success");
      setShow(false); ref.current?.reload();
    }catch(e){ push(e.message||"Xəta baş verdi","error"); }
  };
  return (
    <div className="stock-panel">
      <ToastContainer toasts={toasts} onRemove={rm}/>
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
          <button onClick={() => ref.current?.exportCsv("purchases.csv")}>CSV</button>
          <button onClick={() => ref.current?.exportExcel("purchases.xlsx")}>Excel</button>
          <button className="default" onClick={() => setShow(true)}>Yeni alış</button>
        </div>
      </div>
      <DataGrid ref={ref} columns={cols} dataFetcher={fetcher}/>
      {show && <PurchasesModal onClose={()=>setShow(false)} onSave={save} suppliers={suppliers} items={items}/>}
    </div>
  );
}
