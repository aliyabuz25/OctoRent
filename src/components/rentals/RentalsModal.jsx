import { useEffect, useState } from "react";
import Modal from "../common/Modal.jsx";
import FeatherIcon from "../common/FeatherIcon.jsx";

export default function RentalsModal({ onClose, onSave, customers, items }) {
  const [customer, setCustomer] = useState((customers[0] && (customers[0].name || customers[0])) || "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("rented");
  const [selectedItems, setSelectedItems] = useState([]);

  // Barcode and dropdown picker state
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");

  useEffect(() => {
    if (customers.length && !customer) {
      setCustomer((customers[0] && (customers[0].name || customers[0])) || "");
    }
  }, [customers, customer]);

  // Calculate days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const daysDiff = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1);

  const addProductToSelection = (item) => {
    if (!item) return;
    const existing = selectedItems.find((x) => String(x.itemId) === String(item.id));
    if (existing) {
      setSelectedItems((prev) =>
        prev.map((x) =>
          String(x.itemId) === String(item.id)
            ? { ...x, qty: x.qty + 1, total: (x.qty + 1) * x.price * daysDiff }
            : x
        )
      );
      return;
    }

    const price = Number(item.rentalPrice || item.price || 0);
    const line = {
      id: Date.now() + Math.random(),
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      ean13: item.ean13 || "",
      qty: 1,
      price: price,
      days: daysDiff,
      total: price * daysDiff,
    };
    setSelectedItems((prev) => [...prev, line]);
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const query = barcodeQuery.trim().toLowerCase();
    if (!query) return;

    const found = items.find(
      (it) =>
        (it.ean13 && String(it.ean13).toLowerCase() === query) ||
        (it.sku && String(it.sku).toLowerCase() === query) ||
        (it.serialNumber && String(it.serialNumber).toLowerCase() === query)
    );

    if (found) {
      addProductToSelection(found);
      setBarcodeQuery("");
    } else {
      alert("Bu barkod və ya SKU-ya uyğun məhsul tapılmadı!");
    }
  };

  const handleSelectAdd = () => {
    if (!selectedItemId) return;
    const found = items.find((x) => String(x.id) === String(selectedItemId));
    if (found) {
      addProductToSelection(found);
      setSelectedItemId("");
    }
  };

  // Recalculate totals when dates change
  useEffect(() => {
    setSelectedItems((prev) =>
      prev.map((item) => ({
        ...item,
        days: daysDiff,
        total: item.qty * item.price * daysDiff,
      }))
    );
  }, [daysDiff]);

  const updateItemQty = (id, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    setSelectedItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, qty, total: qty * x.price * daysDiff } : x))
    );
  };

  const updateItemPrice = (id, newPrice) => {
    const price = Math.max(0, Number(newPrice) || 0);
    setSelectedItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, price, total: x.qty * price * daysDiff } : x))
    );
  };

  const removeLine = (id) => {
    setSelectedItems((prev) => prev.filter((x) => x.id !== id));
  };

  const totalAmount = selectedItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert("Ən azı 1 məhsul əlavə edin!");
      return;
    }

    const payload = {
      customer,
      reference,
      startDate,
      endDate,
      date: startDate,
      note,
      status,
      days: daysDiff,
      total: totalAmount,
      totalAmount,
      items: selectedItems.map((it) => ({
        id: it.id,
        itemId: it.itemId,
        productId: it.itemId,
        sku: it.sku,
        name: it.name,
        price: it.price,
        rentalPrice: it.price,
        days: daysDiff,
        qty: it.qty,
        quantity: it.qty,
        total: it.total,
        totalPrice: it.total,
        returnStatus: false,
      })),
    };

    onSave(payload);
  };

  return (
    <Modal title="Yeni Kirayə və Faktura Sənədi" size="lg" onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body">
          {/* Top Form Fields */}
          <div className="form-grid">
            <div className="field">
              <label>Müştəri *</label>
              <select value={customer} onChange={(e) => setCustomer(e.target.value)} required>
                {customers.map((c) => (
                  <option key={c.name || c} value={c.name || c}>
                    {c.name || c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="rented">Kirayədə (Stokdan Çıxarılır)</option>
                <option value="active">Aktiv</option>
                <option value="draft">Qaralama (Stoka təsir etmir)</option>
              </select>
            </div>
            <div className="field">
              <label>Başlanğıc Tarixi</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Bitmə Tarixi</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Müddət</label>
              <div style={{ padding: "6px 10px", background: "#f1f5f9", borderRadius: 4, fontWeight: 600, color: "#1e3a5f" }}>
                {daysDiff} gün
              </div>
            </div>
            <div className="field">
              <label>Referans / Müqavilə No</label>
              <input
                placeholder="Məs: RENT-2026-001"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div className="field field-wide">
              <label>Qeyd / Xüsusi Şərtlər</label>
              <textarea
                rows={2}
                placeholder="Kirayə ilə bağlı əlavə qeydlər..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* Product selection section with Barcode & Dropdown */}
          <div style={{ marginTop: 14, border: "1px solid #d3dae2", borderRadius: 6, background: "#fff" }}>
            <div style={{ padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #eef2f6", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              {/* Barcode scanner input */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <FeatherIcon name="Barcode" size={16} color="#475569" />
                <input
                  type="text"
                  placeholder="Barkod / EAN-13 oxut..."
                  value={barcodeQuery}
                  onChange={(e) => setBarcodeQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleBarcodeSubmit(e);
                  }}
                  style={{ width: 170, height: 26, fontSize: 12 }}
                />
                <button type="button" onClick={handleBarcodeSubmit} style={{ height: 26 }}>
                  Oxut
                </button>
              </div>

              <div style={{ color: "#cbd5e1" }}>|</div>

              {/* Product Select */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <select
                  style={{ width: 220, height: 26, fontSize: 12 }}
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  <option value="">-- Məhsul siyahısından seç --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.sku} - {it.name} (Stok: {it.quantity})
                    </option>
                  ))}
                </select>
                <button type="button" onClick={handleSelectAdd} style={{ height: 26 }}>
                  + Əlavə et
                </button>
              </div>
            </div>

            {/* Selected Products Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                    <th style={{ padding: "6px 10px" }}>SKU</th>
                    <th style={{ padding: "6px 10px" }}>Məhsul</th>
                    <th style={{ padding: "6px 10px", width: 70 }}>Say</th>
                    <th style={{ padding: "6px 10px", width: 90 }}>Kirayə (₺/gün)</th>
                    <th style={{ padding: "6px 10px", width: 70, textAlign: "center" }}>Müddət</th>
                    <th style={{ padding: "6px 10px", width: 90, textAlign: "right" }}>Cəmi (₺)</th>
                    <th style={{ padding: "6px 10px", width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((l) => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{l.sku}</td>
                      <td style={{ padding: "6px 10px", fontWeight: 500 }}>{l.name}</td>
                      <td style={{ padding: "6px 10px" }}>
                        <input
                          type="number"
                          min="1"
                          style={{ width: 55, padding: "2px 4px", fontSize: 11 }}
                          value={l.qty}
                          onChange={(e) => updateItemQty(l.id, e.target.value)}
                        />
                      </td>
                      <td style={{ padding: "6px 10px" }}>
                        <input
                          type="number"
                          step="0.01"
                          style={{ width: 75, padding: "2px 4px", fontSize: 11 }}
                          value={l.price}
                          onChange={(e) => updateItemPrice(l.id, e.target.value)}
                        />
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "center", color: "#64748b" }}>
                        {daysDiff} gün
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "#1e3a5f" }}>
                        {l.total.toFixed(2)} ₺
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => removeLine(l.id)}
                          style={{ padding: "2px 6px", color: "#b91c1c", fontSize: 11 }}
                          title="Sil"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {selectedItems.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                        Barkod oxudaraq və ya siyahıdan seçərək kirayə məhsulları əlavə edin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "#f8fafc",
                borderTop: "1px solid #eef2f6",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Seçilmiş məhsul sayı: <b>{selectedItems.length}</b>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                Ümumi Məbləğ: <span style={{ color: "#16a34a" }}>{totalAmount.toFixed(2)} ₺</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            İmtina
          </button>
          <button type="submit" className="btn-primary" disabled={selectedItems.length === 0}>
            Kirayə və Fakturanı Yarat
          </button>
        </div>
      </form>
    </Modal>
  );
}
