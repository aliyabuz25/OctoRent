import { useEffect, useState } from "react";
import Modal from "../common/Modal.jsx";

export default function PurchasesModal({ onClose, onSave, suppliers, items }) {
  const [form, setForm] = useState({ supplier: suppliers[0]||"", reference: "", date: new Date().toISOString().slice(0,10), note: "", status: "draft", total: 0, items: [] });
  const [row, setRow] = useState({ itemId: items[0]?.id||"", sku:"", name:"", qty: 1, price: items[0]?.cost||0 });

  useEffect(()=>{
    if(items.length && !row.itemId){ setRow(r=>({...r,itemId:items[0].id, price: items[0].cost})); }
    if(suppliers.length && !form.supplier){ setForm(f=>({...f,supplier:suppliers[0]})); }
  },[items,suppliers]);

  useEffect(()=>{
    const it = items.find(x=>x.id==row.itemId);
    if(it) setRow(r=>({...r,price: Number(it.cost)||0}));
  },[row.itemId,items]);

  const addLine = ()=>{
    const qty = Number(row.qty)||1;
    const price = Number(row.price)||0;
    if(qty <= 0) return;
    if(row.itemId){
      const it=items.find(x=>x.id==Number(row.itemId)||x.id==row.itemId);
      if(it){
        const line = { id: Date.now() + Math.random(), itemId: it.id, sku: it.sku, name: it.name, qty, price, total: qty*price };
        const list=[...form.items,line];
        setForm(f=>({...f, items:list, total: list.reduce((s,l)=>s+l.total,0)}));
        setRow({ itemId: items[0]?.id||"", sku:"", name:"", qty:1, price: items[0]?.cost||0 });
        return;
      }
    }
    if(row.sku){
      const it=items.find(x=>String(x.sku).toLowerCase()===String(row.sku).toLowerCase());
      if(it){
        const line = { id: Date.now() + Math.random(), itemId: it.id, sku: it.sku, name: it.name, qty, price: price||it.cost, total: qty*(price||it.cost) };
        const list=[...form.items,line];
        setForm(f=>({...f, items:list, total: list.reduce((s,l)=>s+l.total,0)}));
        setRow({ itemId: items[0]?.id||"", sku:"", qty:1, price: items[0]?.cost||0 });
        return;
      }
    }
    if(row.name){
      const line = { id: Date.now() + Math.random(), itemId: null, sku: row.sku||"", name: row.name, qty, price, total: qty*price };
      const list=[...form.items,line];
      setForm(f=>({...f, items:list, total: list.reduce((s,l)=>s+l.total,0)}));
      setRow({ itemId: items[0]?.id||"", sku:"", name:"", qty:1, price:0 });
      return;
    }
  };

  const removeLine = (id)=>{ const list=form.items.filter(x=>x.id!=id); setForm(f=>({...f,items:list,total:list.reduce((s,l)=>s+l.total,0)})); };

  return (
    <Modal title="Yeni alış sənədi" size="lg" onClose={onClose}>
      <form className="modal-form" onSubmit={(e)=>{e.preventDefault(); onSave(form);}}>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field"><label>Satıcı</label>
              <select value={form.supplier} onChange={(e)=>setForm(f=>({...f,supplier:e.target.value}))}>
                {suppliers.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Tarix</label><input type="date" value={form.date} onChange={(e)=>setForm(f=>({...f,date:e.target.value}))}/></div>
            <div className="field"><label>Referans</label><input value={form.reference} onChange={(e)=>setForm(f=>({...f,reference:e.target.value}))}/></div>
            <div className="field"><label>Status</label>
              <select value={form.status} onChange={(e)=>setForm(f=>({...f,status:e.target.value}))}>
                <option value="draft">Qaralama</option>
                <option value="confirmed">Təsdiqlənib</option>
                <option value="received">Qəbz alınıb</option>
                <option value="paid">Ödənib</option>
              </select>
            </div>
            <div className="field field-wide"><label>Qeyd</label><textarea rows={2} value={form.note} onChange={(e)=>setForm(f=>({...f,note:e.target.value}))}/></div>
          </div>

          <div style={{marginTop:12,border:"1px solid #e8edf2",borderRadius:6}}>
            <div style={{display:"flex",gap:6,padding:8,background:"#f8fafc",borderBottom:"1px solid #eef2f6",flexWrap:"wrap"}}>
              <select style={{width:240}} value={row.itemId} onChange={(e)=>{
                const val=e.target.value;
                const it=items.find(x=>String(x.id)===String(val));
                setRow(r=>({...r,itemId:val, sku:it?.sku||"", name:it?.name||"", price: it?.cost||r.price}));
              }}>
                <option value="">-- Seçin (və ya əl ilə yazın) --</option>
                {items.map(it=><option key={it.id} value={it.id}>{it.sku} - {it.name}</option>)}
              </select>
              <input type="text" placeholder="SKU" style={{width:90}} value={row.sku||""} onChange={(e)=>setRow(r=>({...r,sku:e.target.value,itemId:""}))}/>
              <input type="text" placeholder="Məhsul adı" style={{width:160}} value={row.name||""} onChange={(e)=>setRow(r=>({...r,name:e.target.value,itemId:""}))}/>
              <input type="number" placeholder="Miqdar" style={{width:70}} value={row.qty} onChange={(e)=>setRow(r=>({...r,qty:e.target.value}))}/>
              <input type="number" step="0.01" placeholder="Qiymət" style={{width:80}} value={row.price} onChange={(e)=>setRow(r=>({...r,price:e.target.value}))}/>
              <button type="button" onClick={addLine}>+ Sətir əlavə et</button>
            </div>
            <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#fafafa"}}>{["SKU","Məhsul","Miqdar","Qiymət","Cəmi",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",borderBottom:"1px solid #eef2f6"}}>{h}</th>)}</tr></thead>
              <tbody>
                {form.items.map(l=>(
                  <tr key={l.id}>
                    <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{l.sku}</td>
                    <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{l.name}</td>
                    <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{l.qty}</td>
                    <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{Number(l.price).toFixed(2)}</td>
                    <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}>{l.total.toFixed(2)}</td>
                    <td style={{padding:"6px 10px",borderBottom:"1px solid #f1f5f9"}}><button type="button" onClick={()=>removeLine(l.id)}>Sil</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{textAlign:"right",padding:8,fontWeight:600}}>Ümumi: {form.total.toFixed(2)} ₼</div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>İmtina</button>
          <button type="submit" className="btn-primary" disabled={form.items.length===0}>Yadda saxla</button>
        </div>
      </form>
    </Modal>
  );
}
