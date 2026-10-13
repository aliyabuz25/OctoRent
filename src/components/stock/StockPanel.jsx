import { useCallback, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import ContextMenu from "../common/ContextMenu.jsx";
import ToastContainer from "../common/ToastContainer.jsx";
import StockTable from "./StockTable.jsx";
import ProductModal from "./ProductModal.jsx";
import StockModal from "./StockModal.jsx";
import DetailsModal from "./DetailsModal.jsx";

let toastId = 0;

export default function StockPanel() {
  const tableRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [menu, setMenu] = useState(null);
  const [productModal, setProductModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);

  const pushToast = useCallback((message, type = "info") => {
    toastId += 1;
    const id = toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const run = useCallback(
    async (action, successMsg, errorMsg) => {
      try {
        await action();
        if (successMsg) pushToast(successMsg, "success");
      } catch (err) {
        pushToast(errorMsg || err.message || "Xəta baş verdi", "error");
        throw err;
      }
    },
    [pushToast]
  );

  const persistEdit = useCallback(
    async (cell) => {
      const { id } = cell.getRow().getData();
      const field = cell.getField();
      try {
        await api.updateItem(id, { [field]: cell.getValue() });
        pushToast("Dəyişikliklər saxlanıldı", "success");
      } catch (err) {
        cell.restoreOldValue();
        pushToast(err.message || "Yadda saxlamaq mümkün olmadı", "error");
      }
    },
    [pushToast]
  );

  const saveProduct = (product) =>
    run(async () => {
      if (product.id) await api.updateItem(product.id, product);
      else await api.createItem(product);
      setProductModal(null);
      await tableRef.current?.reload();
    }, product.id ? "Məhsul yeniləndi" : "Məhsul əlavə edildi");

  const applyStock = (delta) =>
    run(async () => {
      await api.changeStock(stockModal.id, delta);
      setStockModal(null);
      await tableRef.current?.reload();
    }, "Stok hərəkatı tətbiq olundu");

  const deleteProduct = (product) => {
    if (!window.confirm(`"${product.name}" silinsin mi?`)) return;
    run(async () => {
      await api.deleteItem(product.id);
      await tableRef.current?.reload();
    }, "Məhsul silindi");
  };

  const copy = (text, label) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text || "");
    pushToast(`${label} kopyalandı`, "info");
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    tableRef.current?.applySearch(value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    tableRef.current?.clearFilters();
  };

  const menuItems = menu
    ? [
        { label: "Məhsul məlumatı", shortcut: "Enter", action: () => setDetailsProduct(menu.product) },
        { label: "Düzəliş et", action: () => setProductModal({ mode: "edit", product: menu.product }) },
        {
          label: "Kopyalayaraq yeni əlavə et",
          action: () =>
            setProductModal({
              mode: "create",
              product: { ...menu.product, id: undefined, sku: "", ean13: "" },
            }),
        },
        null,
        { label: "Stoka daxil et", action: () => setStockModal({ ...menu.product, defaultMode: "in" }) },
        { label: "Stokdan çıxar", action: () => setStockModal({ ...menu.product, defaultMode: "out" }) },
        null,
        { label: "EAN-13 kopyala", action: () => copy(menu.product.ean13, "EAN-13") },
        { label: "SKU kopyala", action: () => copy(menu.product.sku, "SKU") },
        null,
        { label: "Sil", danger: true, action: () => deleteProduct(menu.product) },
      ]
    : [];

  return (
    <div className="stock-panel">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="grid-toolbar">
        <div className="searchbox">
          <input
            type="search"
            placeholder="Bütün sahələrdə axtar..."
            value={searchTerm}
            onChange={(event) => handleSearch(event.target.value)}
          />
          <button aria-label="search"></button>
        </div>
        <button onClick={clearFilters}>Filterləri təmizlə</button>
        <button onClick={() => tableRef.current?.exportCsv()}>CSV ixrac et</button>
        <button
          className="default"
          onClick={() => setProductModal({ mode: "create", product: null })}
        >
          Yeni məhsul
        </button>
      </div>

      <StockTable
        ref={tableRef}
        onCellEdited={persistEdit}
        onRowContext={(event, product) =>
          setMenu({ x: event.clientX, y: event.clientY, product })
        }
      />

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />
      )}

      {productModal && (
        <ProductModal
          mode={productModal.mode}
          initial={productModal.product}
          onClose={() => setProductModal(null)}
          onSubmit={saveProduct}
        />
      )}

      {stockModal && (
        <StockModal
          product={stockModal}
          defaultMode={stockModal.defaultMode}
          onClose={() => setStockModal(null)}
          onSubmit={applyStock}
        />
      )}

      {detailsProduct && (
        <DetailsModal product={detailsProduct} onClose={() => setDetailsProduct(null)} />
      )}
    </div>
  );
}
