import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import ToastContainer from "./ToastContainer.jsx";
import ContextMenu from "./ContextMenu.jsx";
import DataGrid from "./DataGrid.jsx";

let tid = 0;

export default function EntityListPanel({ title, entity, columns, fields, nameField = "name", uniqueField = "name", modalSize = "md" }) {
  const gridRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(null);
  const [modal, setModal] = useState(null);

  const push = useCallback((m, t="info") => { tid++; setToasts((p)=>[...p,{id:tid,message:m,type:t}]); }, []);
  const rm = useCallback((id)=>setToasts((p)=>p.filter(x=>x.id!==id)),[]);
  const run = useCallback(async (a, ok)=>{ try{ await a(); if(ok) push(ok,"success"); }catch(e){ push(e.message||"Xəta","error"); throw e; } },[push]);

  const fetcher = useCallback(() => api.list(entity), [entity]);
  const save = (row) => run(async ()=>{
    if(row.id) await api.update(entity, row.id, row);
    else await api.create(entity, row);
    setModal(null); gridRef.current?.reload();
  }, row.id ? "Yeniləndi" : "Əlavə olundu");
  const del = (row)=>{ if(!confirm(`"${row[nameField]}" silinsin mi?`)) return; run(async()=>{ await api.delete(entity,row.id); gridRef.current?.reload(); }, "Silindi"); };

  const copy = (txt,lbl)=>{ navigator.clipboard?.writeText(txt||""); push(lbl+" kopyalandı","info"); };
  const menuItems = menu ? [
    { label: "Düzəliş et", action: () => setModal({ mode: "edit", row: menu.row }) },
    { label: "Kopyalayaraq yeni yarat", action: () => setModal({ mode: "create", row: { ...menu.row, id: undefined } }) },
    null,
    { label: "Adı kopyala", action: () => copy(menu.row[nameField], "Ad") },
    null,
    { label: "Sil", danger: true, action: () => del(menu.row) },
  ] : [];

  const empty = fields.reduce((o,f)=>{ o[f.key]=f.default||""; return o; },{});

  return (
    <div className="stock-panel">
      <ToastContainer toasts={toasts} onRemove={rm}/>
      <div className="grid-toolbar">
        <div className="searchbox">
          <input type="search" placeholder="Axtar..." value={search} onChange={(e)=>{ setSearch(e.target.value); gridRef.current?.applySearch(e.target.value); }}/>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button onClick={()=>{ setSearch(""); gridRef.current?.clearFilters(); }}>Təmizlə</button>
          <button onClick={()=>gridRef.current?.exportCsv(entity+".csv")}>CSV</button>
          <button onClick={()=>gridRef.current?.exportExcel(entity+".xlsx")}>Excel</button>
          <button className="default" onClick={()=>setModal({mode:"create",row:empty})}>Yeni</button>
        </div>
      </div>
      <DataGrid ref={gridRef} columns={columns} dataFetcher={fetcher} onRowContext={(e,r)=>setMenu({x:e.clientX,y:e.clientY,row:r})}/>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={()=>setMenu(null)}/>}
      {modal && (
        <SimpleModal title={modal.mode==="edit"?"Düzəliş":"Yeni"} size={modalSize} onClose={()=>setModal(null)} onSubmit={(v)=>save(v)} initial={modal.row} fields={fields}/>
      )}
    </div>
  );
}

function SimpleModal({ title,size,onClose,onSubmit,initial,fields }){
  const [f,setF]=useState(initial||{});
  useEffect(()=>setF(initial||{}),[initial]);
  const set=(k)=>(e)=>setF(p=>({...p,[k]:e.target.value}));
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className={`modal${size==="lg"?" modal-lg":""}`} onMouseDown={(e)=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">{title}</span><button className="modal-close" onClick={onClose}>×</button></div>
        <form className="modal-form" onSubmit={(e)=>{e.preventDefault(); onSubmit(f);}}>
          <div className="modal-body">
            <div className="form-grid">
              {fields.map((fld)=>(
                <div key={fld.key} className={`field ${fld.wide?"field-wide":""}`}>
                  <label>{fld.label}</label>
                  {fld.type==="textarea" ? (
                    <textarea rows={fld.rows||3} value={f[fld.key]||""} onChange={set(fld.key)}/>
                  ) : (
                    <input type={fld.type||"text"} value={f[fld.key]||""} onChange={set(fld.key)}/>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>İmtina</button>
            <button type="submit" className="btn-primary">Yadda saxla</button>
          </div>
        </form>
      </div>
    </div>
  );
}
