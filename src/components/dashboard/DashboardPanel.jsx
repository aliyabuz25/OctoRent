import { useEffect, useState } from "react";

export default function DashboardPanel(){
  const [items,setItems]=useState([]);
  const [movs,setMovs]=useState([]);
  useEffect(()=>{
    Promise.all([fetch("/api/items").then(r=>r.json()), fetch("/api/movements").then(r=>r.json())]).then(([i,m])=>{
      setItems(i); setMovs(m.slice(0,20));
    });
  },[]);
  const total = items.length;
  const low = items.filter(x=>Number(x.quantity)<=Number(x.minStock)).length;
  const zero = items.filter(x=>Number(x.quantity)<=0).length;
  const sumStock = items.reduce((s,x)=>s+Number(x.quantity),0);
  return (
    <div className="stock-panel" style={{padding:12,overflow:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <div style={{background:"#fff",border:"1px solid #d3dae2",borderRadius:8,padding:12}}>
          <div style={{color:"#64748b",fontSize:12}}>Ümumi məhsul</div>
          <div style={{fontSize:26,fontWeight:700}}>{total}</div>
        </div>
        <div style={{background:"#fff",border:"1px solid #d3dae2",borderRadius:8,padding:12}}>
          <div style={{color:"#64748b",fontSize:12}}>Kritik</div>
          <div style={{fontSize:26,fontWeight:700,color:"#9d5d00"}}>{low}</div>
        </div>
        <div style={{background:"#fff",border:"1px solid #d3dae2",borderRadius:8,padding:12}}>
          <div style={{color:"#64748b",fontSize:12}}>Bitmiş</div>
          <div style={{fontSize:26,fontWeight:700,color:"#c50f1f"}}>{zero}</div>
        </div>
        <div style={{background:"#fff",border:"1px solid #d3dae2",borderRadius:8,padding:12}}>
          <div style={{color:"#64748b",fontSize:12}}>Cəmi stok</div>
          <div style={{fontSize:26,fontWeight:700}}>{sumStock}</div>
        </div>
      </div>
      <div style={{marginTop:12,background:"#fff",border:"1px solid #d3dae2",borderRadius:8}}>
        <div style={{padding:10,borderBottom:"1px solid #eef2f6",fontWeight:600}}>Son hərəkatlar</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#f8fafc"}}>{["Tarix","Tip","SKU","Məhsul","Miqdar","Qalıq","Qeyd"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",borderBottom:"1px solid #eef2f6"}}>{h}</th>)}</tr></thead>
          <tbody>
            {movs.map(m=><tr key={m.id}>
              <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{m.date}</td>
              <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{m.type==="in"?"Daxil":"Çıxar"}</td>
              <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{m.sku}</td>
              <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{m.itemName}</td>
              <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9",textAlign:"right"}}>{m.qty}</td>
              <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9",textAlign:"right"}}>{m.quantityAfter}</td>
              <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{m.note}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
