import { useCallback, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";
import Modal from "../common/Modal.jsx";
import ToastContainer from "../common/ToastContainer.jsx";
import ContextMenu from "../common/ContextMenu.jsx";
import { api } from "../../lib/api.js";

let tid = 0;

export default function CashflowPanel() {
  const ref = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(null);
  const [modal, setModal] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

  const push = useCallback((m, t = "info") => {
    tid++;
    setToasts((p) => [...p, { id: tid, message: m, type: t }]);
  }, []);
  const rm = useCallback((id) => setToasts((p) => p.filter((x) => x.id !== id)), []);

  const fetcher = useCallback(async () => {
    const list = await api.listCashflow();
    const data = Array.isArray(list) ? list : [];
    let inc = 0;
    let exp = 0;
    for (const d of data) {
      const amt = Number(d.amount) || 0;
      if (d.type === "expense") exp += amt;
      else inc += amt;
    }
    setSummary({ income: inc, expense: exp, balance: inc - exp });
    return data;
  }, []);

  const cols = [
    { title: "Tarix", field: "date", width: 120, minWidth: 95, hozAlign: "center" },
    {
      title: "Hərəkət Növü",
      field: "type",
      width: 130,
      minWidth: 110,
      hozAlign: "center",
      formatter: (cell) => {
        const isExp = cell.getValue() === "expense";
        return `<span style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;display:inline-block;background:${
          isExp ? "#fee2e2" : "#dcfce7"
        };color:${isExp ? "#991b1b" : "#166534"}">${isExp ? "Məxaric (-)" : "Mədaxil (+)"}</span>`;
      },
    },
    {
      title: "Məbləğ",
      field: "amount",
      width: 130,
      minWidth: 105,
      hozAlign: "right",
      sorter: "number",
      formatter: (cell) => {
        const isExp = cell.getRow().getData().type === "expense";
        const val = Number(cell.getValue() || 0).toLocaleString("az-AZ", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return `<span style="font-weight:700;color:${isExp ? "#dc2626" : "#16a34a"}">${isExp ? "-" : "+"}${val} ₺</span>`;
      },
    },
    { title: "Kateqoriya", field: "category", width: 160, minWidth: 120 },
    { title: "Ödəniş Metodu", field: "paymentMethod", width: 130, minWidth: 105, hozAlign: "center" },
    { title: "Tərəf (Müştəri / Şəxs)", field: "party", width: 180, minWidth: 130 },
    { title: "Açıqlama", field: "description", minWidth: 200 },
    { title: "Qeyd Edən", field: "createdBy", width: 130, minWidth: 105, hozAlign: "center" },
  ];

  const handleSave = async (form) => {
    try {
      await api.createCashflow(form);
      push("Kassa əməliyyatı qeydə alındı", "success");
      setModal(false);
      ref.current?.reload();
    } catch (e) {
      push(e.message || "Xəta", "error");
    }
  };

  const handleDelete = async (row) => {
    if (!confirm("Bu kassa hərəkətini silmək istəyirsiniz?")) return;
    try {
      await api.deleteCashflow(row.id);
      push("Əməliyyat silindi", "success");
      ref.current?.reload();
    } catch (e) {
      push(e.message || "Xəta", "error");
    }
  };

  const menuItems = menu
    ? [{ label: "Sil", danger: true, action: () => handleDelete(menu.row) }]
    : [];

  return (
    <div className="stock-panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <ToastContainer toasts={toasts} onRemove={rm} />

      {/* Quick Cash Summary Widget */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "6px 8px 10px 8px" }}>
        <div style={statBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Ümumi Mədaxil (Gəlir)</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#16a34a" }}>
            +{summary.income.toFixed(2)} ₺
          </div>
        </div>
        <div style={statBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Ümumi Məxaric (Xərc)</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#dc2626" }}>
            -{summary.expense.toFixed(2)} ₺
          </div>
        </div>
        <div style={statBox}>
          <div style={{ fontSize: 11, color: "#64748b" }}>Kassa Qalığı (Balans)</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: summary.balance >= 0 ? "#1e3a5f" : "#dc2626",
            }}
          >
            {summary.balance.toFixed(2)} ₺
          </div>
        </div>
      </div>

      <div className="grid-toolbar">
        <div className="searchbox">
          <input
            type="search"
            placeholder="Kateqoriya, şəxs və ya açıqlama axtar..."
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
          <button onClick={() => ref.current?.exportCsv("kassa_ve_maliyye.csv")}>CSV</button>
          <button onClick={() => ref.current?.exportExcel("kassa_ve_maliyye.xlsx")} title="Excel formatında ixrac">
            Excel
          </button>
          <button className="default" onClick={() => setModal(true)}>
            + Yeni Kassa Əməliyyatı
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

      {modal && <CashflowModal onClose={() => setModal(false)} onSubmit={handleSave} />}
    </div>
  );
}

const statBox = {
  background: "#fff",
  border: "1px solid #d3dae2",
  borderRadius: 5,
  padding: "8px 12px",
};

function CashflowModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    type: "income",
    category: "Kirayə Ödənişi",
    amount: "",
    paymentMethod: "Nağd",
    party: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Modal title="Yeni Kassa Əməliyyatı (Mədaxil / Məxaric)" size="md" onClose={onClose}>
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="modal-body">
          <div className="form-grid">
            <div className="field">
              <label>Hərəkət Növü *</label>
              <select value={form.type} onChange={set("type")}>
                <option value="income">Mədaxil (+) — Kiralama, Satış, Digər Gəlir</option>
                <option value="expense">Məxaric (-) — Təmir, İcarə, Əməkhaqqı, Xərc</option>
              </select>
            </div>
            <div className="field">
              <label>Məbləğ (₺) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={set("amount")}
                required
              />
            </div>
            <div className="field">
              <label>Kateqoriya</label>
              <select value={form.category} onChange={set("category")}>
                <option value="Kirayə Ödənişi">Kirayə Ödənişi</option>
                <option value="Məhsul Satışı">Məhsul Satışı</option>
                <option value="Avadanlıq Alışı">Avadanlıq Alışı</option>
                <option value="Təmir və Servis">Təmir və Servis</option>
                <option value="Ofis/Anbar İcarəsi">Ofis/Anbar İcarəsi</option>
                <option value="Əməkhaqqı">Əməkhaqqı</option>
                <option value="Kommunal və Nəqliyyat">Kommunal və Nəqliyyat</option>
                <option value="Digər">Digər</option>
              </select>
            </div>
            <div className="field">
              <label>Ödəniş Metodu</label>
              <select value={form.paymentMethod} onChange={set("paymentMethod")}>
                <option value="Nağd">Nağd Kassa</option>
                <option value="Bank / POS Kart">Bank / POS Kart</option>
                <option value="Bank Köçürməsi (Hesaba)">Bank Köçürməsi (Hesaba)</option>
              </select>
            </div>
            <div className="field">
              <label>Tarix</label>
              <input type="date" value={form.date} onChange={set("date")} />
            </div>
            <div className="field">
              <label>Müştəri və ya Şəxs</label>
              <input placeholder="Kiminlə əməliyyat aparıldı" value={form.party} onChange={set("party")} />
            </div>
            <div className="field field-wide">
              <label>Açıqlama</label>
              <textarea
                rows={2}
                placeholder="Əməliyyat haqqında qeydlər..."
                value={form.description}
                onChange={set("description")}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            İmtina
          </button>
          <button type="submit" className="btn-primary" disabled={!form.amount}>
            Kassaya Daxil Et
          </button>
        </div>
      </form>
    </Modal>
  );
}
