import Barcode from "../common/Barcode.jsx";
import Modal from "../common/Modal.jsx";

const buildRows = (product) => [
  ["SKU", product.sku],
  ["Ürün Adı", product.name],
  ["EAN-13", <span className="mono">{product.ean13}</span>],
  ["Kategori", product.category],
  ["Marka", product.brand],
  ["Birim", product.unit],
  ["Stok Adedi", product.quantity],
  ["Kritik Stok", product.minStock],
  ["Raf / Lokasyon", product.location],
  ["Tedarikçi", product.supplier],
  ["Alış Fiyatı", `${Number(product.cost || 0).toFixed(2)} ₺`],
  ["Satış Fiyatı", `${Number(product.price || 0).toFixed(2)} ₺`],
  ["Güncelleme", product.updated],
  ["Açıklama", product.description || "-"],
];

export default function DetailsModal({ product, onClose }) {
  return (
    <Modal title="Ürün Detayı" size="lg" onClose={onClose}>
      <div className="modal-body">
        <div className="details-layout">
          <table className="details-table">
            <tbody>
              {buildRows(product).map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="barcode-box">
            <Barcode value={product.ean13} />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn-primary" onClick={onClose}>
          Kapat
        </button>
      </div>
    </Modal>
  );
}
