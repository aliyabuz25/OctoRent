import { useEffect, useState } from "react";
import Modal from "../common/Modal.jsx";

export default function StockModal({ product, defaultMode = "in", onClose, onSubmit }) {
  const [mode, setMode] = useState(defaultMode);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setMode(defaultMode);
    setAmount("");
    setNote("");
  }, [product, defaultMode]);

  const current = Number(product.quantity) || 0;
  const delta = (Number(amount) || 0) * (mode === "in" ? 1 : -1);
  const result = Math.max(0, current + delta);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!delta) return;
    onSubmit(delta, note);
  };

  return (
    <Modal title="Stok hərəkəti" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="kv-row"><span className="kv-label">Məhsul</span><span className="kv-value">{product.name}</span></div>
          <div className="kv-row"><span className="kv-label">SKU</span><span className="kv-value mono">{product.sku}</span></div>
          <div className="kv-row"><span className="kv-label">Cari stok</span><span className="kv-value">{current}</span></div>
          <div className="segmented">
            <button type="button" className={mode==="in"?"active":""} onClick={()=>setMode("in")}>Daxil</button>
            <button type="button" className={mode==="out"?"active":""} onClick={()=>setMode("out")}>Çıxar</button>
          </div>
          <div className="field"><label htmlFor="s-amount">Miqdar</label><input id="s-amount" type="number" min="1" autoFocus value={amount} onChange={(e)=>setAmount(e.target.value)}/></div>
          <div className="field"><label htmlFor="s-note">Qeyd (istəyə bağlı)</label><input id="s-note" value={note} onChange={(e)=>setNote(e.target.value)}/></div>
          <div className="stock-result">Yeni stok: <strong>{result}</strong>{result <= (Number(product.minStock)||0) && <span className="low-stock">kritis</span>}</div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>İmtina</button>
          <button type="submit" className="btn-primary" disabled={!delta}>Tətbiq et</button>
        </div>
      </form>
    </Modal>
  );
}
