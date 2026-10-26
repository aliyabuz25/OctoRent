import { useCallback, useEffect, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";
import InvoiceDetailsModal from "../rentals/InvoiceDetailsModal.jsx";
import ToastContainer from "../common/ToastContainer.jsx";
import ContextMenu from "../common/ContextMenu.jsx";
import FeatherIcon from "../common/FeatherIcon.jsx";
import { api } from "../../lib/api.js";
import { exportInvoicePDF } from "../../lib/exportInvoicePDF.js";

let tid = 0;

export default function InvoicesPanel() {
  const ref = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [menu, setMenu] = useState(null);

  const push = useCallback((m, t = "info") => {
    tid++;
    setToasts((p) => [...p, { id: tid, message: m, type: t }]);
  }, []);
  const rm = useCallback((id) => setToasts((p) => p.filter((x) => x.id !== id)), []);

  const fetcher = useCallback(() => api.listInvoices(), []);

  const cols = [
    {
      title: "Faktura No",
      field: "id",
      width: 140,
      minWidth: 110,
      formatter: (cell) => `<span class="cell-mono" style="font-weight:600">#${cell.getValue() || ""}</span>`,
    },
    { title: "Müştəri Adı", field: "customer", width: 220, minWidth: 160, sorter: "string" },
    {
      title: "İcarə Dövrü",
      field: "startDate",
      width: 190,
      minWidth: 160,
      hozAlign: "center",
      formatter: (cell) => {
        const d = cell.getRow().getData();
        return `${d.startDate || "-"} → ${d.endDate || "-"}`;
      },
    },
    {
      title: "Cəmi Məbləğ",
      field: "totalAmount",
      width: 130,
      minWidth: 105,
      hozAlign: "right",
      sorter: "number",
      formatter: (cell) => {
        const val = Number(cell.getValue() || 0).toFixed(2);
        return `<b style="color:#0f172a">${val} ₺</b>`;
      },
    },
    {
      title: "Sənəd Vəziyyəti",
      field: "status",
      width: 130,
      minWidth: 105,
      hozAlign: "center",
      formatter: (cell) => {
        const val = cell.getValue();
        const isClosed = val === "closed";
        return `<span style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${
          isClosed ? "#e2e8f0" : "#dcfce7"
        };color:${isClosed ? "#475569" : "#166534"}">${isClosed ? "Bağlı" : "Aktiv"}</span>`;
      },
    },
    {
      title: "Ödəniş",
      field: "paymentStatus",
      width: 120,
      minWidth: 100,
      hozAlign: "center",
      formatter: (cell) => {
        const isPaid = cell.getValue() === "paid";
        return `<span style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${
          isPaid ? "#dcfce7" : "#fef3c7"
        };color:${isPaid ? "#166534" : "#92400e"}">${isPaid ? "Ödənilib" : "Gözləyir"}</span>`;
      },
    },
    { title: "Tərtib Edən", field: "createdBy", width: 130, minWidth: 110 },
    { title: "Referans", field: "reference", width: 140, minWidth: 110 },
    { title: "Tarix", field: "createdAt", width: 150, minWidth: 130 },
  ];

  const handlePay = async (id) => {
    try {
      const res = await api.payInvoice(id);
      push("Ödəniş uğurla qeydə alındı", "success");
      ref.current?.reload();
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice(res.invoice);
      }
    } catch (e) {
      push(e.message || "Xəta", "error");
    }
  };

  const handleReturnItem = async (invoiceId, itemId) => {
    try {
      const res = await api.returnInvoiceItem(invoiceId, itemId);
      push("Məhsul təhvil alındı və stoka qaytarıldı", "success");
      ref.current?.reload();
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(res.invoice);
      }
    } catch (e) {
      push(e.message || "Xəta", "error");
    }
  };

  const menuItems = menu
    ? [
        { label: "Faktura Detalları", action: () => setSelectedInvoice(menu.row) },
        { label: "PDF Yüklə", action: () => exportInvoicePDF(menu.row) },
        null,
        menu.row.paymentStatus !== "paid"
          ? { label: "Ödənişi Qəbul Et", action: () => handlePay(menu.row.id) }
          : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="stock-panel">
      <ToastContainer toasts={toasts} onRemove={rm} />
      <div className="grid-toolbar">
        <div className="searchbox">
          <input
            type="search"
            placeholder="Faktura, müştəri və ya referans axtar..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              ref.current?.applySearch(e.target.value);
            }}
          />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              setSearch("");
              ref.current?.clearFilters();
            }}
          >
            Təmizlə
          </button>
          <button onClick={() => ref.current?.exportCsv("invoices.csv")}>CSV</button>
          <button onClick={() => ref.current?.exportExcel("invoices.xlsx")}>Excel</button>
          <button className="default" onClick={() => ref.current?.reload()} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <FeatherIcon name="RefreshCw" size={13} /> Yenilə
          </button>
        </div>
      </div>

      <DataGrid
        ref={ref}
        columns={cols}
        dataFetcher={fetcher}
        onRowContext={(e, r) => setMenu({ x: e.clientX, y: e.clientY, row: r })}
      />

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}

      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRefresh={() => ref.current?.reload()}
          onPay={handlePay}
          onReturnItem={handleReturnItem}
        />
      )}
    </div>
  );
}
