import { dateLabel, money, num, statusMeta } from './fmt.js';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const octoRentLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 56" role="img" aria-label="OctoRent">
  <g fill="none" stroke="#183b3a" stroke-width="4" stroke-linecap="round">
    <path d="M26 27c-8 7-11 12-8 16 3 3 7 1 10-3M34 30c-3 10-3 15 1 16 4 1 6-3 7-8M40 27c4 9 7 13 11 11 3-2 2-6-2-10M27 20c-5-7-7-12-3-15 3-2 7 1 9 6M36 19c0-8 2-12 6-12 4 0 5 5 3 11"/>
  </g><circle cx="34" cy="23" r="12" fill="#e5aa59"/><circle cx="30" cy="22" r="1.5" fill="#183b3a"/><circle cx="38" cy="22" r="1.5" fill="#183b3a"/>
  <text x="67" y="30" fill="#183b3a" font-family="Arial,sans-serif" font-size="25" font-weight="700">OctoRent</text><text x="68" y="46" fill="#617170" font-family="Arial,sans-serif" font-size="8" letter-spacing="2.2">RENTAL &amp; INVENTORY</text>
</svg>`;
const logoData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(octoRentLogo)}`;

export function printSalesDocument(doc, tenant, mode = 'invoice') {
  if (!doc) return;
  const receipt = mode === 'receipt';
  const issuer = tenant?.name || 'OctoRent';
  const rows = (doc.items || []).map((line, index) => `
    <tr><td>${index + 1}</td><td><strong>${escapeHtml(line.name || line.sku || 'Məhsul')}</strong><small>${escapeHtml(line.sku || '')}</small></td>
    <td class="num">${num(line.qty)}</td><td class="num">${money(line.price)}</td><td class="num">${money(num(line.qty) * num(line.price))}</td></tr>`).join('');
  const total = num(doc.total) || (doc.items || []).reduce((sum, line) => sum + num(line.qty) * num(line.price), 0);
  const title = receipt ? 'SATIŞ FİŞİ' : 'SATIŞ FAKTURASI';
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('Çap pəncərəsi bloklandı. Brauzerdə pop-up icazəsi verib yenidən cəhd edin.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · ${escapeHtml(doc.reference || doc.id)}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;padding:30px;color:#202928;font:13px Arial,sans-serif;background:#fff}.sheet{max-width:820px;margin:auto}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #183b3a;padding-bottom:20px}.logo{width:190px;height:auto}.kind{text-align:right;color:#183b3a;font-size:20px;font-weight:700;letter-spacing:1px}.meta{margin-top:8px;color:#556260;font-size:12px;line-height:1.8}.parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:22px 0}.parties div{line-height:1.7}.label{display:block;color:#73807e;text-transform:uppercase;letter-spacing:1px;font-size:9px;font-weight:700;margin-bottom:5px}table{width:100%;border-collapse:collapse;margin:4px 0 18px}th{text-align:left;padding:10px 8px;background:#f0f4f3;color:#526260;font-size:10px;text-transform:uppercase}td{padding:11px 8px;border-bottom:1px solid #e6eae9;vertical-align:top}td small{display:block;color:#75807f;margin-top:3px}.num{text-align:right;white-space:nowrap}.total{margin-left:auto;width:min(300px,100%);padding:14px 0;border-top:2px solid #183b3a;display:flex;justify-content:space-between;font-size:17px;font-weight:700}.note{margin-top:22px;padding:12px;background:#f7f8f7;color:#58615f;white-space:pre-wrap}.status{margin-top:10px;font-size:11px;color:#697573}.sign{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:60px}.sign div{border-top:1px solid #aeb8b6;padding-top:8px;color:#75807f;font-size:10px}.foot{margin-top:28px;padding-top:12px;border-top:1px solid #e1e6e5;color:#7e8987;font-size:9px;text-align:center}
    ${receipt ? 'body{padding:12px;font-family:monospace}.sheet{width:76mm;max-width:100%;font-size:11px}.top{padding-bottom:10px}.logo{width:135px}.kind{font-size:14px}.parties{padding:12px 0;gap:8px}.parties div{line-height:1.5}th{padding:6px 3px;font-size:8px}td{padding:7px 3px;font-size:10px}.total{width:100%;font-size:14px}.sign{margin-top:30px;gap:18px}' : ''}
    @media print{body{padding:0}.sheet{max-width:none}.no-print{display:none!important}@page{size:${receipt ? '80mm auto' : 'A4'};margin:${receipt ? '4mm' : '16mm'}}}
  </style></head><body><main class="sheet"><header class="top"><img class="logo" src="${logoData}" alt="OctoRent"><div><div class="kind">${title}</div><div class="meta">№ ${escapeHtml(doc.reference || doc.id)}<br>Tarix: ${escapeHtml(dateLabel(doc.date))}<br>Vəziyyət: ${escapeHtml(statusMeta(doc.status).label)}</div></div></header>
  <section class="parties"><div><span class="label">Satıcı</span><strong>${escapeHtml(issuer)}</strong><br>OctoRent</div><div><span class="label">Müştəri</span><strong>${escapeHtml(doc.customer || 'Pərakəndə müştəri')}</strong></div></section>
  <table><thead><tr><th>#</th><th>Məhsul</th><th class="num">Say</th><th class="num">Qiymət</th><th class="num">Məbləğ</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="total"><span>YEKUN</span><span>${money(total)}</span></div>${doc.note ? `<div class="note"><span class="label">Qeyd</span>${escapeHtml(doc.note)}</div>` : ''}
  <div class="status">Sənəd № ${escapeHtml(doc.reference || doc.id)} · ${escapeHtml(issuer)}</div><section class="sign"><div>Təhvil verən / imza</div><div>Təhvil alan / imza</div></section><footer class="foot">${escapeHtml(issuer)} · Sənəd elektron qaydada yaradılıb.</footer>
  <button class="no-print" onclick="window.print()" style="margin-top:24px;padding:12px 20px;background:#183b3a;color:white;border:0;border-radius:6px;font-size:15px">PDF yadda saxla / Çap et</button></main><script>window.onload=()=>setTimeout(()=>window.print(),350);window.onafterprint=()=>setTimeout(()=>window.close(),250)</script></body></html>`);
  printWindow.document.close();
}
