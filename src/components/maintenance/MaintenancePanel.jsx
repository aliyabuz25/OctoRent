import { useCallback, useEffect, useRef, useState } from "react";
import DataGrid from "../common/DataGrid.jsx";
import Modal from "../common/Modal.jsx";
import ToastContainer from "../common/ToastContainer.jsx";
import ContextMenu from "../common/ContextMenu.jsx";
import { api } from "../../lib/api.js";

let tid = 0;

export default function MaintenancePanel() {
  const ref = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(null);
  const [modal, setModal] = useState(null);
  const [items, setItems] = useState([]);

  const push = useCallback((m, t = "info") => {
    tid++;
    setToasts((p) => [...p, { id: tid, message: m, type: t }]);
  }, []);
  const rm = useCallback((id) => setToasts((p) => p.filter((x) => x.id !== id)), []);

  const fetcher = useCallback(() => api.listMaintenance(), []);

  useEffect(() => {
    api.listItems().then((res) => setItems(Array.isArray(res) ? res : [])).catch(() => {});
  }, []);

  const cols = [
    { title: "Məhsul Adı", field: "itemName", width: 220, minWidth: 160, sorter: "string" },
    { title: "SKU", field: "sku", width: 120, minWidth: 90 },
    { title: "Seriya No", field: "serialNumber", width: 130, minWidth: 100 },
    { title: "Nasazlıq / Problem", field: "issue", minWidth: 200 },
    {
      title: "Status",
      field: "status",
      width: 140,
      minWidth: 110,
      hozAlign: "center",
      formatter: (cell) => {
        const val = cell.getValue();
        let bg = "#fef3c7";
        let color = "#92400e";
        let text = "Təmirdə";
        if (val === "repaired") {
          bg = "#dcfce7";
          color = "#166534";
          text = "Təmir Edildi";
        } else if (val === "scrapped") {
          bg = "#fee2e2";
          color = "#991b1b";
          text = "İstismardan Çıxarıldı";
        } else if (val === "pending") {
          bg = "#e0e7ff";
          color = "#3730a3";
          text = "Gözləyir";
        }
        return `<span style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${bg};color:${color}">${text}</span>`;
      },
    },
    {
      title: "Təmir Xərci",
      field: "cost",
      width: 120,
      minWidth: 100,
      hozAlign: "right",
      sorter: "number",
      formatter: (cell) => `<b>${Number(cell.getValue() || 0).toFixed(2)} ₺</b>`,
    },
    { title: "Usta / Texnik", field: "technician", width: 140, minWidth: 110 },
    { title: "Giriş Tarixi", field: "startDate", width: 120, minWidth: 100, hozAlign: "center" },
    { title: "Bitmə Tarixi", field: "completedDate", width: 120, minWidth: 100, hozAlign: "center" },
  ];

  const handleSave = async (form) => {
    try {
      if (form.id) {
        await api.updateMaintenance(form.id, form);
        push("Servis qeydi yeniləndi", "success");
      } else {
        await api.createMaintenance(form);
        push("Yeni servis qeydi əlavə olundu", "success");
      }
      setModal(null);
      ref.current?.reload();
    } catch (e) {
      push(e.message || "Xəta", "error");
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`"${row.itemName || row.sku}" servis qeydini silmək istəyirsiniz?`)) return;
    try {
      await api.deleteMaintenance(row.id);
      push("Qeyd silindi", "success");
      ref.current?.reload();
    } catch (e) {
      push(e.message || "Xəta", "error");
    }
  };

  const menuItems = menu
    ? [
        { label: "Düzəliş et", action: () => setModal({ mode: "edit", form: menu.row }) },
        {
          label: "Təmir Edildi olaraq qeyd et",
          action: () =>
            handleSave({
              ...menu.row,
              status: "repaired",
              completedDate: new Date().toISOString().slice(0, 10),
            }),
        },
        null,
        { label: "Sil", danger: true, action: () => handleDelete(menu.row) },
      ]
    : [];

  return (
    <div className="stock-panel">
      <ToastContainer toasts={toasts} onRemove={rm} />
      <div className="grid-toolbar">
        <div className="searchbox">
          <input
            type="search"
            placeholder="Məhsul, seriya nömrəsi və ya usta axtar..."
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
          <button onClick={() => ref.current?.exportCsv("servis_texniki_baxis.csv")}>CSV</button>
          <button onClick={() => ref.current?.exportExcel("servis_texniki_baxis.xlsx")}>Excel</button>
          <button
            className="default"
            onClick={() =>
              setModal({
                mode: "create",
                form: {
                  itemId: "",
                  itemName: "",
                  sku: "",
                  serialNumber: "",
                  issue: "",
                  status: "in_service",
                  cost: 0,
                  technician: "",
                  note: "",
                  startDate: new Date().toISOString().slice(0, 10),
                  completedDate: "",
                },
              })
            }
          >
            + Yeni Servis Qeydi
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

      {modal && (
        <MaintenanceModal
          state={modal}
          items={items}
          onClose={() => setModal(null)}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}

function MaintenanceModal({ state, items, onClose, onSubmit }) {
  const [form, setForm] = useState(state.form);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const onItemSelect = (e) => {
    const val = e.target.value;
    const it = items.find((x) => String(x.id) === String(val));
    if (it) {
      setForm((p) => ({
        ...p,
        itemId: it.id,
        itemName: it.name,
        sku: it.sku,
        serialNumber: it.serialNumber || p.serialNumber,
      }));
    } else {
      setForm((p) => ({ ...p, itemId: val }));
    }
  };

  return (
    <Modal
      title={state.mode === "edit" ? "Servis Qeydinə Düzəliş" : "Yeni Servis / Baxış Qeydi"}
      size="md"
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="modal-body">
          <div className="form-grid">
            <div className="field field-wide">
              <label>Məhsul Seçin</label>
              <select value={form.itemId || ""} onChange={onItemSelect}>
                <option value="">-- Məhsullar arasından seçin (və ya əl ilə yazın) --</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku} - {it.name} (Seriya: {it.serialNumber || "-"})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Məhsul Adı *</label>
              <input value={form.itemName} onChange={set("itemName")} required />
            </div>
            <div className="field">
              <label>SKU Kodu</label>
              <input value={form.sku} onChange={set("sku")} />
            </div>
            <div className="field">
              <label>Seriya Nömrəsi</label>
              <input value={form.serialNumber} onChange={set("serialNumber")} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={set("status")}>
                <option value="in_service">Təmirdə (Servisdədir)</option>
                <option value="pending">Gözləyir</option>
                <option value="repaired">Təmir Edildi (Hazırdır)</option>
                <option value="scrapped">İstismardan Çıxarıldı (Zay)</option>
              </select>
            </div>
            <div className="field">
              <label>Təmir Xərci (₺)</label>
              <input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={set("cost")}
              />
            </div>
            <div className="field">
              <label>Usta / Texnik / Servis Mərkəzi</label>
              <input value={form.technician} onChange={set("technician")} />
            </div>
            <div className="field">
              <label>Servisə Giriş Tarixi</label>
              <input type="date" value={form.startDate} onChange={set("startDate")} />
            </div>
            <div className="field">
              <label>Tamamlanma Tarixi</label>
              <input type="date" value={form.completedDate || ""} onChange={set("completedDate")} />
            </div>
            <div className="field field-wide">
              <label>Problem / Təsvir *</label>
              <textarea
                rows={2}
                placeholder="Nasazlıq və tələb olunan təmir detalları..."
                value={form.issue}
                onChange={set("issue")}
                required
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            İmtina
          </button>
          <button type="submit" className="btn-primary">
            Yadda saxla
          </button>
        </div>
      </form>
    </Modal>
  );
}
