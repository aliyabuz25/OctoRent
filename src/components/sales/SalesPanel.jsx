import { useCallback, useEffect, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";
import SalesModal from "./SalesModal.jsx";
import ToastContainer from "../common/ToastContainer.jsx";

const cols = [
  { title:"Tarix", field:"date", width:110, headerFilter:"input" },
  { title:"Müştəri", field:"customer", width:200, headerFilter:"input" },
  { title:"Referans", field:"reference", width:140, headerFilter:"input" },
  { title:"Məbləğ", field:"total", width:120, hozAlign:"right", formatter:"money", formatterParams:{symbol:"₼",precision:2,symbolAfter:true} },
  { title:"Status", field:"status", width:110, headerFilter:"input" },
  { title:"Qeyd", field:"note", width:240, headerFilter:"input" },
  { title:"Yaradılıb", field:"createdAt", width:160 },
];
let tid=0;
export default function SalesPanel(){
  const ref=useRef(null);
  const [show,setShow]=useState(false);
  const [items,setItems]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [toasts,setToasts]=useState([]);
  const fetcher=useCallback(()=>fetch("/api/sales").then(r=>r.json()),[]);
  useEffect(()=>{
    Promise.all([fetch("/api/items").then(r=>r.json()), fetch("/api/customers").then(r=>r.json())]).then(([i,c])=>{
      setItems(i); setCustomers(c.map(x=>x.name));
    });
  },[]);
  const push=(m,t="info")=>{ tid++; setToasts(p=>[...p,{id:tid,message:m,type:t}]); };
  const rm=(id)=>setToasts(p=>p.filter(x=>x.id!=id));
  const save=async(doc)=>{
    try{
      await fetch("/api/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(doc)});
      push("Satış sənədi yadda saxlanıldı","success");
      setShow(false); ref.current?.reload();
    }catch(e){ push("Xəta baş verdi","error"); }
  };
  return (
    <div className="stock-panel">
      <ToastContainer toasts={toasts} onRemove={rm}/>
      <div className="grid-toolbar">
        <div className="searchbox"><input type="search" placeholder="Axtar..." onChange={(e)=>ref.current?.applySearch(e.target.value)}/></div>
        <button onClick={()=>ref.current?.clearFilters()}>Təmizlə</button>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={()=>ref.current?.exportCsv("sales.csv")}>CSV</button>
          <button className="default" onClick={()=>setShow(true)}>Yeni satış</button>
        </div>
      </div>
      <DataGrid ref={ref} columns={cols} dataFetcher={fetcher}/>
      {show && <SalesModal onClose={()=>setShow(false)} onSave={save} customers={customers} items={items}/>}
    </div>
  );
}
