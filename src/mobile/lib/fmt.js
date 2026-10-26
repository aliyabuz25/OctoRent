export const num = (v) => Number(v) || 0;

export const money = (n) =>
  num(n).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₼';

export const todayStr = () => new Date().toISOString().slice(0, 10);

export function dateLabel(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function dateTimeLabel(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dateLabel(iso)} ${hh}:${mi}`;
}

export function dayLabel(iso) {
  if (!iso) return 'Digər';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dateLabel(iso);
  const now = new Date();
  const strip = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((strip(now) - strip(d)) / 86400000);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Dünən';
  if (diff === 2) return 'Əvvəlki gün';
  return dateLabel(iso);
}

export function stockState(qty, min) {
  const q = num(qty);
  const m = num(min);
  if (q <= 0) return 'out';
  if (q <= m) return 'low';
  return 'ok';
}

export const STOCK_STATE_LABEL = { out: 'Stokda yox', low: 'Kritik', ok: 'Normal' };

export const STOCK_STATE_COLOR = { out: 'danger', low: 'warning', ok: 'success' };

export const DOC_KINDS = [
  { id: 'purchases', label: 'Alışlar', partnerKey: 'supplier', partnerLabel: 'Təchizatçı', icon: 'cart' },
  { id: 'sales', label: 'Satışlar', partnerKey: 'customer', partnerLabel: 'Müştəri', icon: 'cash' },
  { id: 'rentals', label: 'İcara', partnerKey: 'customer', partnerLabel: 'Müştəri', icon: 'people' },
];

export const STATUS_META = {
  n: { label: 'Qaralama', color: 'medium' },
  draft: { label: 'Qaralama', color: 'medium' },
  confirmed: { label: 'Təsdiqlənib', color: 'primary' },
  received: { label: 'Qəbz alınıb', color: 'success' },
  paid: { label: 'Ödənib', color: 'success' },
  rented: { label: 'İcarədə', color: 'warning' },
  active: { label: 'Aktiv', color: 'success' },
  returned: { label: 'Qaytarılıb', color: 'secondary' },
  cancelled: { label: 'Ləğv edilib', color: 'danger' },
};

export const STATUS_OPTIONS = {
  purchases: ['draft', 'confirmed', 'received', 'paid'],
  sales: ['draft', 'confirmed', 'paid'],
  rentals: ['draft', 'confirmed', 'rented', 'active', 'returned', 'cancelled'],
};

export function statusMeta(code) {
  return STATUS_META[code] || { label: code || '—', color: 'medium' };
}

export function docTotal(doc) {
  if (num(doc?.total)) return num(doc.total);
  return (doc?.items || []).reduce((s, it) => s + num(it.qty) * num(it.price), 0);
}
