import { useEffect, useState } from "react";
import Modal from "../common/Modal.jsx";
import FeatherIcon from "../common/FeatherIcon.jsx";
import { exportInvoicePDF } from "../../lib/exportInvoicePDF.js";

export default function InvoiceDetailsModal({ invoice, onClose, onRefresh, onPay, onReturnItem }) {
  const [data, setData] = useState(invoice);

  useEffect(() => {
    setData(invoice);
  }, [invoice]);

  if (!data) return null;

  const items = data.items || [];
  const history = data.history || [];
  const allReturned = items.length > 0 && items.every((i) => i.returnStatus);
  const isPaid = data.paymentStatus === "paid";
  const isClosed = data.status === "closed";

  const handleReturn = async (itemId) => {
    if (!confirm("Bu məhsulu təhvil almaq və stoka qaytarmaq istədiyinizə əminsiniz?")) return;
    try {
      await onReturnItem(data.id, itemId);
    } catch (e) {
      alert("Xəta: " + e.message);
    }
  };

  const handlePay = async () => {
    if (!confirm("Faktura ödənişini qeydə almaq istəyirsiniz?")) return;
    try {
      await onPay(data.id);
    } catch (e) {
      alert("Xəta: " + e.message);
    }
  };

  const handleExportPDF = () => {
    exportInvoicePDF(data);
  };

  return (
    <Modal title={`Faktura Detalları #${data.id || ""}`} size="lg" onClose={onClose}>
      <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
        {/* Top Info Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: 12,
            background: "#f8fafc",
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>{data.customer || "Müştəri"}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Tarix: {data.startDate || data.date} — {data.endDate || data.date} ({data.days || 1} gün)
            </div>
            {data.reference && (
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                Referans: <b>{data.reference}</b>
              </div>
            )}
            {data.note && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontStyle: "italic" }}>
                "{data.note}"
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginBottom: 6 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  background: isClosed ? "#e2e8f0" : "#dcfce7",
                  color: isClosed ? "#475569" : "#166534",
                }}
              >
                {isClosed ? "Bağlı Faktura" : "Aktiv Kirayə"}
              </span>
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  background: isPaid ? "#dcfce7" : "#fef3c7",
                  color: isPaid ? "#166534" : "#92400e",
                }}
              >
                {isPaid ? "Ödənilib" : "Ödənilməyib"}
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
              {(Number(data.totalAmount || data.total) || 0).toFixed(2)} ₺
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            onClick={handleExportPDF}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#1e3a5f", color: "#fff", border: "none" }}
          >
            <FeatherIcon name="Download" size={14} color="#fff" /> PDF Yüklə
          </button>
          {!isPaid && (
            <button
              type="button"
              onClick={handlePay}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#16a34a", color: "#fff", border: "none" }}
            >
              <FeatherIcon name="CheckCircle" size={14} color="#fff" /> Ödənişi Qəbul Et
            </button>
          )}
        </div>

        {/* Items List */}
        <div style={{ border: "1px solid #d3dae2", borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ padding: "8px 12px", background: "#f1f5f9", fontWeight: 600, fontSize: 13, borderBottom: "1px solid #cbd5e1" }}>
            Kirayə Verilən Məhsullar və Təhvil Vəziyyəti
          </div>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "7px 10px", borderBottom: "1px solid #e2e8f0" }}>SKU</th>
                <th style={{ padding: "7px 10px", borderBottom: "1px solid #e2e8f0" }}>Məhsul</th>
                <th style={{ padding: "7px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>Say</th>
                <th style={{ padding: "7px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Kirayə (₺/gün)</th>
                <th style={{ padding: "7px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Məbləğ</th>
                <th style={{ padding: "7px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>Status</th>
                <th style={{ padding: "7px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{it.sku || "-"}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 500 }}>{it.name}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>{it.quantity || it.qty || 1}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    {(Number(it.rentalPrice || it.price) || 0).toFixed(2)} ₺
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>
                    {(Number(it.totalPrice || it.total) || 0).toFixed(2)} ₺
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 600,
                        background: it.returnStatus ? "#dcfce7" : "#fee2e2",
                        color: it.returnStatus ? "#166534" : "#991b1b",
                      }}
                    >
                      {it.returnStatus ? "Təhvil alındı" : "Kirayədə"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    {!it.returnStatus && (
                      <button
                        type="button"
                        onClick={() => handleReturn(it.id)}
                        style={{ padding: "3px 8px", fontSize: 11, color: "#1e3a5f" }}
                      >
                        Təhvil al (Qaytar)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* History / Actions Timeline */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 12, background: "#f8fafc" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
            Əməliyyat Tarixçəsi
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.map((h, i) => (
              <div key={i} style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                <FeatherIcon name="Clock" size={13} color="#3b82f6" />
                <span>
                  <b>{h.by || "İstifadəçi"}</b>: {h.note || h.action}
                </span>
                <span style={{ color: "#94a3b8", marginLeft: "auto" }}>
                  {new Date(h.at).toLocaleString("tr-TR")}
                </span>
              </div>
            ))}
            {history.length === 0 && (
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Tarixçə qeydi yoxdur.</div>
            )}
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Bağla
        </button>
      </div>
    </Modal>
  );
}
