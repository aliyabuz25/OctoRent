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
    onSubmit(delta);
  };

  return (
    <Modal title="Stok Hareketi" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="kv-row">
            <span className="kv-label">Ürün</span>
            <span className="kv-value">{product.name}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">SKU</span>
            <span className="kv-value mono">{product.sku}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Mevcut Stok</span>
            <span className="kv-value">{current}</span>
          </div>

          <div className="segmented">
            <button
              type="button"
              className={mode === "in" ? "active" : ""}
              onClick={() => setMode("in")}
            >
              Giriş
            </button>
            <button
              type="button"
              className={mode === "out" ? "active" : ""}
              onClick={() => setMode("out")}
            >
              Çıkış
            </button>
          </div>

          <div className="field">
            <label htmlFor="s-amount">Miktar</label>
            <input
              id="s-amount"
              type="number"
              min="1"
              autoFocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="s-note">Not (opsiyonel)</label>
            <input id="s-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>

          <div className="stock-result">
            Yeni stok: <strong>{result}</strong>
            {result <= (Number(product.minStock) || 0) && (
              <span className="low-stock">kritik seviye</span>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            İptal
          </button>
          <button type="submit" className="btn-primary" disabled={!delta}>
            Uygula
          </button>
        </div>
      </form>
    </Modal>
  );
}
