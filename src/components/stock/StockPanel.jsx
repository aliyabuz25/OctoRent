import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import ToastContainer from "../common/ToastContainer.jsx";
import StockTable from "./StockTable.jsx";
import ProductModal from "./ProductModal.jsx";
import StockModal from "./StockModal.jsx";
import DetailsModal from "./DetailsModal.jsx";
import ContextMenu from "../common/ContextMenu.jsx";

let tid = 0;

export default function StockPanel() {
  const tableRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [menu, setMenu] = useState(null);
  const [productModal, setProductModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);

  const pushToast = useCallback((m, t = "info") => {
    tid++;
    setToasts((p) => [...p, { id: tid, message: m, type: t }]);
  }, []);
  const removeToast = useCallback((id) => setToasts((p) => p.filter((x) => x.id !== id)), []);
  const run = useCallback(async (act, ok) => {
    try {
      await act();
      if (ok) pushToast(ok, "success");
    } catch (e) {
      pushToast(e.message || "Xəta", "error");
      throw e;
    }
  }, [pushToast]);

  const persistEdit = useCallback(async (cell) => {
    const { id } = cell.getRow().getData();
    try {
      await api.updateItem(id, { [cell.getField()]: cell.getValue() });
      pushToast("Saxlanıldı", "success");
    } catch (e) {
      cell.restoreOldValue();
      pushToast(e.message, "error");
    }
  }, [pushToast]);

  const saveProduct = (p) => run(async () => {
    if (p.id) await api.updateItem(p.id, p);
    else await api.createItem(p);
    setProductModal(null);
    tableRef.current?.reload();
  }, p.id ? "Məhsul yeniləndi" : "Məhsul əlavə edildi");

  const applyStock = (delta, note) =>
    run(async () => {
      await api.changeStock(stockModal.id, delta, note);
      setStockModal(null);
      tableRef.current?.reload();
    }, "Stok hərəkatı tətbiq olundu");

  const del = (p) => {
    if (!confirm(`"${p.name}" silinsin mi?`)) return;
    run(async () => {
      await api.deleteItem(p.id);
      tableRef.current?.reload();
    }, "Silindi");
  };

  const copy = (txt, lbl) => {
    navigator.clipboard?.writeText(txt || "");
    pushToast(lbl + " kopyalandı", "info");
  };

  const menuItems = menu ? [
    { label: "Məlumat", action: () => setDetailsProduct(menu.product) },
    { label: "Düzəliş", action: () => setProductModal({ mode: "edit", product: menu.product }) },
    { label: "Kopyalayaraq yeni", action: () => setProductModal({ mode: "create", product: { ...menu.product, id: undefined, sku: "", ean13: "" } }) },
    null,
    { label: "Stoka daxil", action: () => setStockModal({ ...menu.product, defaultMode: "in" }) },
    { label: "Stokdan çıxar", action: () => setStockModal({ ...menu.product, defaultMode: "out" }) },
    null,
    { label: "EAN-13 kopyala", action: () => copy(menu.product.ean13, "EAN-13") },
    { label: "SKU kopyala", action: () => copy(menu.product.sku, "SKU") },
    null,
    { label: "Sil", danger: true, action: () => del(menu.product) },
  ] : [];

  return (
    <div className="stock-panel">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="grid-toolbar">
        <div className="searchbox">
          <input
            type="search"
            placeholder="Axtar..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              tableRef.current?.applySearch(event.target.value);
            }}
          />
        </div>
        <button onClick={() => {
          setSearchTerm("");
          tableRef.current?.clearFilters();
        }}>Təmizlə</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button onClick={() => tableRef.current?.exportCsv()}>CSV</button>
          <button
            className="default"
            onClick={() => setProductModal({ mode: "create", product: null })}
          >
            Yeni məhsul
          </button>
        </div>
      </div>
      <StockTable ref={tableRef} onCellEdited={persistEdit} onRowContext={(e, p) => setMenu({ x: e.clientX, y: e.clientY, product: p })} />
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
      {productModal && <ProductModal mode={productModal.mode} initial={productModal.product} onClose={() => setProductModal(null)} onSubmit={saveProduct} />}
      {stockModal && <StockModal product={stockModal} defaultMode={stockModal.defaultMode} onClose={() => setStockModal(null)} onSubmit={applyStock} />}
      {detailsProduct && <DetailsModal product={detailsProduct} onClose={() => setDetailsProduct(null)} />}
    </div>
  );
}
