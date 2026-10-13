import { useEffect, useState } from "react";
import { isValidEAN13, randomEAN13 } from "../../lib/ean13.js";
import { UNITS, emptyProduct, normalizeProduct, compactProduct } from "../../constants/products.js";
import Modal from "../common/Modal.jsx";

export default function ProductModal({ mode, initial, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyProduct);

  useEffect(() => {
    setForm(initial ? normalizeProduct(initial) : emptyProduct);
  }, [initial]);

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const eanValid = !form.ean13 || isValidEAN13(form.ean13);
  const canSubmit = form.sku.trim() && form.name.trim() && eanValid;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit(compactProduct(form));
  };

  return (
    <Modal
      title={mode === "edit" ? "Ürün Düzenle" : "Ürün Tanımla"}
      size="lg"
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-body">
          <section className="form-section">
            <h4>Genel Bilgiler</h4>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="p-sku">Stok Kodu (SKU) *</label>
                <input id="p-sku" value={form.sku} onChange={setField("sku")} required />
              </div>
              <div className="field">
                <label htmlFor="p-name">Ürün Adı *</label>
                <input id="p-name" value={form.name} onChange={setField("name")} required />
              </div>
              <div className="field field-wide">
                <label htmlFor="p-ean">EAN-13 Barkod</label>
                <div className="ean-row">
                  <input
                    id="p-ean"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="13 hane"
                    value={form.ean13}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        ean13: event.target.value.replace(/\D/g, "").slice(0, 13),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setForm((prev) => ({ ...prev, ean13: randomEAN13() }))}
                  >
                    Üret
                  </button>
                </div>
                <span className={`ean-status ${eanValid ? "ok" : "bad"}`}>
                  {eanValid
                    ? form.ean13
                      ? "Geçerli EAN-13"
                      : "Boş bırakılırsa otomatik üretilir"
                    : "Geçersiz kontrol hanesi"}
                </span>
              </div>
              <div className="field">
                <label htmlFor="p-cat">Kategori</label>
                <input id="p-cat" value={form.category} onChange={setField("category")} />
              </div>
              <div className="field">
                <label htmlFor="p-brand">Marka</label>
                <input id="p-brand" value={form.brand} onChange={setField("brand")} />
              </div>
              <div className="field">
                <label htmlFor="p-unit">Birim</label>
                <select id="p-unit" value={form.unit} onChange={setField("unit")}>
                  {UNITS.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="form-section">
            <h4>Stok & Fiyat</h4>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="p-qty">Stok Adedi</label>
                <input id="p-qty" type="number" value={form.quantity} onChange={setField("quantity")} />
              </div>
              <div className="field">
                <label htmlFor="p-min">Kritik Stok</label>
                <input id="p-min" type="number" value={form.minStock} onChange={setField("minStock")} />
              </div>
              <div className="field">
                <label htmlFor="p-cost">Alış Fiyatı (₺)</label>
                <input id="p-cost" type="number" step="0.01" value={form.cost} onChange={setField("cost")} />
              </div>
              <div className="field">
                <label htmlFor="p-price">Satış Fiyatı (₺)</label>
                <input id="p-price" type="number" step="0.01" value={form.price} onChange={setField("price")} />
              </div>
              <div className="field">
                <label htmlFor="p-loc">Raf / Lokasyon</label>
                <input id="p-loc" value={form.location} onChange={setField("location")} />
              </div>
              <div className="field">
                <label htmlFor="p-sup">Tedarikçi</label>
                <input id="p-sup" value={form.supplier} onChange={setField("supplier")} />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h4>Açıklama</h4>
            <div className="field">
              <textarea rows={3} value={form.description} onChange={setField("description")} />
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            İptal
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {mode === "edit" ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
