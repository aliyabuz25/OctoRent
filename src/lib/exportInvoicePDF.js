import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportInvoicePDF(invoice, tenantName = "OctoRent") {
  const doc = new jsPDF();

  // Header / Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 95);
  doc.text(tenantName || "OctoRent", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("Resmi Kirayə və Faktura Sənədi", 14, 28);

  // Invoice Details right-side
  doc.setFontSize(10);
  doc.setTextColor(33, 41, 54);
  doc.text(`Faktura No: #${invoice.id || invoice.reference || "-"}`, 140, 20);
  doc.text(`Tarix: ${new Date(invoice.createdAt || invoice.date || Date.now()).toLocaleDateString("tr-TR")}`, 140, 26);
  doc.text(`Status: ${invoice.status === "closed" ? "Bağlı / Tamamlandı" : "Aktiv"}`, 140, 32);
  doc.text(`Ödəniş: ${invoice.paymentStatus === "paid" ? "Ödənilib" : "Ödənilməyib"}`, 140, 38);

  // Line
  doc.setDrawColor(200, 205, 212);
  doc.line(14, 44, 196, 44);

  // Customer Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text("Müştəri Məlumatları", 14, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Müştəri: ${invoice.customer || "-"}`, 14, 59);
  if (invoice.startDate && invoice.endDate) {
    doc.text(`Müddət: ${invoice.startDate} — ${invoice.endDate}`, 14, 65);
  }
  if (invoice.note) {
    doc.text(`Qeyd: ${invoice.note}`, 14, 71);
  }

  // Items Table
  const tableData = (invoice.items || []).map((it, idx) => [
    idx + 1,
    it.sku || "-",
    it.name || "-",
    Number(it.rentalPrice || it.price || 0).toFixed(2) + " ₺",
    it.days || 1,
    it.quantity || it.qty || 1,
    Number(it.totalPrice || it.total || 0).toFixed(2) + " ₺",
    it.returnStatus ? "Təhvil alındı" : "Kirayədə",
  ]);

  autoTable(doc, {
    startY: invoice.note ? 76 : 70,
    head: [["#", "SKU", "Məhsul", "Günlük", "Gün", "Say", "Məbləğ", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      3: { halign: "right" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "right", fontStyle: "bold" },
      7: { halign: "center" },
    },
  });

  const finalY = doc.lastAutoTable?.finalY || 120;

  // Total summary box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  const totalAmount = Number(invoice.totalAmount || invoice.total || 0).toFixed(2);
  doc.text(`Cəmi Məbləğ: ${totalAmount} ₺`, 140, finalY + 12);

  // History & Signatures
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Yaradan: ${invoice.createdBy || "Sistem"}`, 14, finalY + 12);
  if (invoice.closedBy) {
    doc.text(`Təhvil alan / Bağlayan: ${invoice.closedBy}`, 14, finalY + 18);
  }

  // Footer line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 280, 196, 280);
  doc.setFontSize(8);
  doc.text("OctoRent Kirayə Sistemi tərəfindən avtomatik tərtib edilmişdir.", 14, 285);

  doc.save(`Faktura_${invoice.id || "document"}.pdf`);
}
