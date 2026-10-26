import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

const money = (n) => (Number(n) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

export default function ReportsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([api.listItems(), api.list("sales"), api.list("purchases"), api.movements()])
      .then(([items, sales, purchases, movs]) => {
        if (alive) setData({ items, sales, purchases, movs });
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="stock-panel" style={{ padding: 20, color: "#64748b" }}>Yüklənir...</div>;
  if (!data) return <div className="stock-panel" style={{ padding: 20, color: "#b91c1c" }}>Hesabat yüklənə bilmədi.</div>;

  const { items, sales, purchases, movs } = data;

  const num = (v) => Number(v) || 0;
  const totalQty = items.reduce((s, i) => s + num(i.quantity), 0);
  const stockCost = items.reduce((s, i) => s + num(i.quantity) * num(i.cost), 0);
  const stockPrice = items.reduce((s, i) => s + num(i.quantity) * num(i.price), 0);
  const lowItems = items.filter((i) => num(i.quantity) > 0 && num(i.quantity) <= num(i.minStock));
  const outItems = items.filter((i) => num(i.quantity) <= 0);
  const salesTotal = sales.reduce((s, d) => s + num(d.total), 0);
  const purchaseTotal = purchases.reduce((s, d) => s + num(d.total), 0);
  const movIn = movs.filter((m) => m.type === "in").reduce((s, m) => s + num(m.qty), 0);
  const movOut = movs.filter((m) => m.type === "out").reduce((s, m) => s + num(m.qty), 0);

  const byCategory = Object.values(
    items.reduce((acc, i) => {
      const key = i.category || "Digər";
      acc[key] = acc[key] || { name: key, count: 0, qty: 0, value: 0 };
      acc[key].count += 1;
      acc[key].qty += num(i.quantity);
      acc[key].value += num(i.quantity) * num(i.cost);
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  const maxCatValue = Math.max(1, ...byCategory.map((c) => c.value));

  return (
    <div className="stock-panel" style={{ padding: 12, overflow: "auto" }}>
      <div style={grid4}>
        <Card label="Ümumi məhsul" value={items.length} />
        <Card label="Ümumi stok (ədəd)" value={totalQty} />
        <Card label="Stok dəyəri (maya)" value={money(stockCost)} />
        <Card label="Satış dəyəri (potensial)" value={money(stockPrice)} />
      </div>

      <div style={{ ...grid4, marginTop: 10 }}>
        <Card label="Kritik stok" value={lowItems.length} color="#9d5d00" />
        <Card label="Bitmiş stok" value={outItems.length} color="#c50f1f" />
        <Card label="Satış cəmi" value={money(salesTotal)} color="#16a34a" />
        <Card label="Alış cəmi" value={money(purchaseTotal)} color="#2563eb" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <Panel title="Kateqoriya üzrə dəyər">
          {byCategory.length === 0 && <Empty />}
          {byCategory.map((c) => (
            <div key={c.name} style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <b>{c.name}</b>
                <span>{money(c.value)} · {c.qty} ədəd</span>
              </div>
              <div style={{ height: 8, background: "#eef2f6", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(c.value / maxCatValue) * 100}%`, height: "100%", background: "#2563eb" }} />
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Anbar hərəkatı">
          <div style={{ display: "flex", gap: 12, padding: 12 }}>
            <div style={{ flex: 1, textAlign: "center", background: "#ecfdf5", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Daxil (ədəd)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>{movIn}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", background: "#fef2f2", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Çıxar (ədəd)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#c50f1f" }}>{movOut}</div>
            </div>
          </div>
          <div style={{ padding: "0 12px 12px", fontSize: 12, color: "#64748b" }}>
            Cəmi {movs.length} hərəkat qeydə alınıb.
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: 12 }}>
        <Panel title="Kritik & bitmiş məhsullar">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["SKU", "Məhsul", "Kateqoriya", "Stok", "Kritik", "Status"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...outItems, ...lowItems].map((i) => (
                <tr key={i.id}>
                  <td style={td}>{i.sku}</td>
                  <td style={td}>{i.name}</td>
                  <td style={td}>{i.category}</td>
                  <td style={{ ...td, textAlign: "right" }}>{i.quantity}</td>
                  <td style={{ ...td, textAlign: "right" }}>{i.minStock}</td>
                  <td style={td}>
                    <span style={{ color: num(i.quantity) <= 0 ? "#c50f1f" : "#9d5d00", fontWeight: 600 }}>
                      {num(i.quantity) <= 0 ? "Bitmiş" : "Kritik"}
                    </span>
                  </td>
                </tr>
              ))}
              {outItems.length + lowItems.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, color: "#64748b" }}>Kritik və ya bitmiş məhsul yoxdur.</td></tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

const grid4 = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 };
const th = { textAlign: "left", padding: "6px 10px", borderBottom: "1px solid #eef2f6", fontWeight: 700, color: "#334155" };
const td = { padding: "6px 10px", borderBottom: "1px solid #f1f5f9" };

function Card({ label, value, color }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #d3dae2", borderRadius: 8, padding: 12 }}>
      <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#0f172a" }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #d3dae2", borderRadius: 8, height: "100%" }}>
      <div style={{ padding: 10, borderBottom: "1px solid #eef2f6", fontWeight: 600 }}>{title}</div>
      {children}
    </div>
  );
}

function Empty() {
  return <div style={{ padding: 12, color: "#64748b", fontSize: 12.5 }}>Məlumat yoxdur.</div>;
}
