import { useCallback, useEffect, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";
import RentalsModal from "./RentalsModal.jsx";
import InvoiceDetailsModal from "./InvoiceDetailsModal.jsx";
import ToastContainer from "../common/ToastContainer.jsx";
import ContextMenu from "../common/ContextMenu.jsx";
import { api } from "../../lib/api.js";
import { exportInvoicePDF } from "../../lib/exportInvoicePDF.js";

const cols = [
  { title: "Tarix", field: "date", width: 110, minWidth: 95, hozAlign: "center" },
  { title: "Müştəri", field: "customer", width: 220, minWidth: 160, sorter: "string" },
  {
    title: "Müddət",
    field: "startDate",
    width: 190,
    minWidth: 160,
    hozAlign: "center",
    formatter: (cell) => {
      const d = cell.getRow().getData();
      return `${d.startDate || d.date || "-"} → ${d.endDate || d.date || "-"}`;
    },
  },
  {
    title: "Məbləğ",
    field: "total",
    width: 120,
    minWidth: 100,
    hozAlign: "right",
    sorter: "number",
    formatter: (cell) => `<b style="color:#0f172a">${Number(cell.getValue() || 0).toFixed(2)} ₺</b>`,
  },
  {
    title: "Status",
    field: "status",
    width: 120,
    minWidth: 100,
    hozAlign: "center",
    formatter: (cell) => {
      const val = cell.getValue();
      let color = "#166534";
      let bg = "#dcfce7";
      let text = "Kirayədə";
      if (val === "closed" || val === "completed") {
        text = "Tamamlandı";
        bg = "#e2e8f0";
        color = "#475569";
      } else if (val === "draft") {
        text = "Qaralama";
        bg = "#fef3c7";
        color = "#92400e";
      }
      return `<span style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${bg};color:${color}">${text}</span>`;
    },
  },
  { title: "Referans", field: "reference", width: 140, minWidth: 110 },
  { title: "Qeyd", field: "note", minWidth: 200 },
  { title: "Yaradılıb", field: "createdAt", width: 150, minWidth: 130 },
];

let tid = 0;

export default function RentalsPanel() {
  const ref = useRef(null);
  const [show, setShow] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [menu, setMenu] = useState(null);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");

  const fetcher = useCallback(() => api.fetch("/api/rentals").then((r) => r.json()), []);

  useEffect(() => {
    Promise.all([
      api.fetch("/api/items").then((r) => r.json()),
      api.fetch("/api/customers").then((r) => r.json()),
    ]).then(([i, c]) => {
      setItems(Array.isArray(i) ? i : []);
      setCustomers(Array.isArray(c) ? c.map((x) => x.name || x) : []);
    });
  }, []);

  const push = (m, t = "info") => {
    tid++;
    setToasts((p) => [...p, { id: tid, message: m, type: t }]);
  };
  const rm = (id) => setToasts((p) => p.filter((x) => x.id !== id));

  const save = async (doc) => {
    try {
      const res = await api.fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p.error || `Xəta (${res.status})`);
      }
      const createdRental = await res.json();

      // Also create an invoice in OctoRent format
      try {
        await api.createInvoice({
          ...doc,
          id: createdRental.id,
          totalAmount: doc.total,
        });
      } catch (err) {
        console.error("Auto invoice creation:", err);
      }

      push("Kirayə və Faktura sənədi uğurla yaradıldı", "success");
      setShow(false);
      ref.current?.reload();
    } catch (e) {
      push(e.message || "Xəta baş verdi", "error");
    }
  };

  const handlePay = async (id) => {
    try {
      await api.payInvoice(id);
      push("Ödəniş qeydə alındı", "success");
      ref.current?.reload();
    } catch (e) {
      push(e.message || "Xəta", "error");
    }
  };

  const handleReturnItem = async (invoiceId, itemId) => {
    try {
      await api.returnInvoiceItem(invoiceId, itemId);
      push("Məhsul təhvil alındı və stoka qaytarıldı", "success");
      ref.current?.reload();
    } catch (e) {
      push(e.message || "Xəta", "error");
    }
  };

  const menuItems = menu
    ? [
        {
          label: "Faktura və Təhvil Detalları",
          action: () => setSelectedInvoice(menu.row),
        },
        {
          label: "Faktura PDF Yüklə",
          action: () => exportInvoicePDF(menu.row),
        },
        null,
        menu.row.status !== "closed" && menu.row.status !== "completed"
          ? {
              label: "Kirayəni Tamamla (Hamısını Təhvil Al)",
              action: async () => {
                if (!confirm("Bütün məhsulları təhvil almaq və kirayəni tamamlamaq istəyirsiniz?")) return;
                try {
                  await api.fetch(`/api/rentals/${menu.row.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "completed" }),
                  });
                  push("Kirayə tamamlandı", "success");
                  ref.current?.reload();
                } catch (e) {
                  push(e.message || "Xəta", "error");
                }
              },
            }
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
            placeholder="Kirayə sənədi və ya müştəri axtar..."
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
          <button onClick={() => ref.current?.exportCsv("rentals.csv")}>CSV</button>
          <button onClick={() => ref.current?.exportExcel("rentals.xlsx")}>Excel</button>
          <button className="default" onClick={() => setShow(true)}>
            + Yeni Kirayə
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

      {show && (
        <RentalsModal
          onClose={() => setShow(false)}
          onSave={save}
          customers={customers}
          items={items}
        />
      )}

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

