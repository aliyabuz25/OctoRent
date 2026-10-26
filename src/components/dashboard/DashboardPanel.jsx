import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import FeatherIcon from "../common/FeatherIcon.jsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const money = (n) => (Number(n) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

export default function DashboardPanel() {
  const [items, setItems] = useState([]);
  const [movs, setMovs] = useState([]);
  const [sales, setSales] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.fetch("/api/items").then((r) => r.json()).catch(() => []),
      api.fetch("/api/movements").then((r) => r.json()).catch(() => []),
      api.list("sales").catch(() => []),
      api.list("rentals").catch(() => []),
      api.listInvoices().catch(() => []),
    ])
      .then(([i, m, s, r, inv]) => {
        setItems(Array.isArray(i) ? i : []);
        setMovs(Array.isArray(m) ? m.slice(0, 15) : []);
        setSales(Array.isArray(s) ? s : []);
        setRentals(Array.isArray(r) ? r : []);
        setInvoices(Array.isArray(inv) ? inv : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const total = items.length;
  const low = items.filter((x) => Number(x.quantity) > 0 && Number(x.quantity) <= Number(x.minStock)).length;
  const zero = items.filter((x) => Number(x.quantity) <= 0).length;
  const sumStock = items.reduce((s, x) => s + Number(x.quantity || 0), 0);
  const totalStockValue = items.reduce((s, x) => s + Number(x.quantity || 0) * Number(x.cost || 0), 0);
  const totalSalesVal = sales.reduce((s, x) => s + Number(x.total || 0), 0);
  const totalRentalVal = rentals.reduce((s, x) => s + Number(x.total || 0), 0);
  const activeRentalsCount = rentals.filter((r) => r.status === "rented" || r.status === "active").length;

  // Category Breakdown for Chart
  const categoryCounts = items.reduce((acc, it) => {
    const cat = it.category || "Digər";
    acc[cat] = (acc[cat] || 0) + (Number(it.quantity) || 1);
    return acc;
  }, {});

  const catLabels = Object.keys(categoryCounts).slice(0, 6);
  const catData = catLabels.map((k) => categoryCounts[k]);

  const doughnutData = {
    labels: catLabels.length > 0 ? catLabels : ["Məlumat yoxdur"],
    datasets: [
      {
        data: catData.length > 0 ? catData : [1],
        backgroundColor: [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
          "#ec4899",
          "#64748b",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Stock Status Bar Chart
  const stockBarData = {
    labels: ["Normal Stok", "Kritik Hədd", "Bitmiş / Sıfır"],
    datasets: [
      {
        label: "Məhsul Sayı",
        data: [Math.max(0, total - low - zero), low, zero],
        backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="stock-panel" style={{ padding: 12, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: "#1e3a5f" }}>İcmal və Analitika</h3>
        <button onClick={loadData} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <FeatherIcon name="RefreshCw" size={13} className={loading ? "spin-icon" : ""} />
          <span>{loading ? "Yüklənir..." : "Yenilə"}</span>
        </button>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: "#64748b", fontSize: 11 }}>Ümumi Məhsul</span>
            <FeatherIcon name="Boxes" size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{total}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Kataloqdakı çeşid</div>
        </div>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: "#64748b", fontSize: 11 }}>Aktiv Kirayələr</span>
            <FeatherIcon name="Calendar" size={16} color="#6366f1" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#4f46e5" }}>{activeRentalsCount}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Müştəridə olan sənədlər</div>
        </div>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: "#64748b", fontSize: 11 }}>Kritik Qalıq</span>
            <FeatherIcon name="AlertTriangle" size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#b45309" }}>{low}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Minimum həddin altında</div>
        </div>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: "#64748b", fontSize: 11 }}>Cəmi Stok Miqdarı</span>
            <FeatherIcon name="Layers" size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#047857" }}>{sumStock}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Anbarlardakı vahid</div>
        </div>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: "#64748b", fontSize: 11 }}>Stok Dəyəri (Maya)</span>
            <FeatherIcon name="DollarSign" size={16} color="#059669" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#065f46" }}>{money(totalStockValue)}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Mövcud anbar dəyəri</div>
        </div>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={{ color: "#64748b", fontSize: 11 }}>Kirayə Dövriyyəsi</span>
            <FeatherIcon name="TrendingUp" size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1d4ed8" }}>{money(totalRentalVal)}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Sənədləşmiş kirayə cəmi</div>
        </div>
      </div>

      {/* Chart.js Interactive Visualizations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #d3dae2", borderRadius: 6, padding: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 12.5, color: "#1e3a5f", marginBottom: 10 }}>
            Kateqoriya Üzrə Stok Dağılımı
          </div>
          <div style={{ height: 210, display: "flex", justifyContent: "center" }}>
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #d3dae2", borderRadius: 6, padding: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 12.5, color: "#1e3a5f", marginBottom: 10 }}>
            Stok Sağlamlığı və Vəziyyəti
          </div>
          <div style={{ height: 210 }}>
            <Bar
              data={stockBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Movements Table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #d3dae2", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #eef2f6", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Son Anbar Hərəkətləri</span>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: "normal" }}>Son 15 əməliyyat</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["Tarix", "Tip", "SKU", "Məhsul", "Miqdar", "Qalıq", "Qeyd"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "7px 10px", borderBottom: "1px solid #cbd5e1", color: "#334155" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 10px", color: "#475569" }}>{m.date || "-"}</td>
                    <td style={{ padding: "6px 10px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 600,
                          background: m.type === "in" ? "#dcfce7" : "#fee2e2",
                          color: m.type === "in" ? "#166534" : "#991b1b",
                        }}
                      >
                        {m.type === "in" ? "Daxil (+)" : "Çıxar (-)"}
                      </span>
                    </td>
                    <td style={{ padding: "6px 10px", fontFamily: "monospace", color: "#1e293b" }}>{m.sku}</td>
                    <td style={{ padding: "6px 10px", fontWeight: 500 }}>{m.itemName}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: m.type === "in" ? "#166534" : "#991b1b" }}>
                      {m.type === "in" ? `+${m.qty}` : `-${m.qty}`}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right", color: "#334155" }}>{m.quantityAfter}</td>
                    <td style={{ padding: "6px 10px", color: "#64748b" }}>{m.note || "-"}</td>
                  </tr>
                ))}
                {movs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 20, color: "#94a3b8" }}>
                      Hələ heç bir hərəkət qeydə alınmayıb.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #d3dae2",
  borderRadius: 6,
  padding: "10px 14px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};
