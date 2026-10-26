import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonButton,
  IonFab,
  IonFabButton,
  IonSearchbar
} from '@ionic/react';
import BIcon from '../ui/BIcon.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../lib/useToast.js';
import {
  num,
  money,
  dateLabel,
  todayStr,
  statusMeta,
  docTotal,
  STATUS_OPTIONS
} from '../lib/fmt.js';
import Sheet from '../ui/Sheet.jsx';
import ConfirmSheet from '../ui/ConfirmSheet.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import FormField from '../ui/FormField.jsx';
import ItemPicker from '../ui/ItemPicker.jsx';
import StatusChip from '../ui/StatusChip.jsx';
import { printSalesDocument } from '../lib/printDocument.js';

const KINDS = [
  { id: 'purchases', label: 'Alışlar', partner: 'supplier', partnerLabel: 'Təchizatçı', partnerEntity: 'suppliers', priceKey: 'cost', defaultStatus: 'received' },
  { id: 'sales', label: 'Faturalar', partner: 'customer', partnerLabel: 'Müştəri', partnerEntity: 'customers', priceKey: 'price', defaultStatus: 'confirmed' },
  { id: 'rentals', label: 'İcara', partner: 'customer', partnerLabel: 'Müştəri', partnerEntity: 'customers', priceKey: 'price', defaultStatus: 'draft' }
];

function statusOptions(kind) {
  return (STATUS_OPTIONS[kind] || []).map((code) => ({ value: code, label: statusMeta(code).label }));
}

export default function MobileDocuments() {
  const { toast, show, showError, close } = useToast();

  const [kindId, setKindId] = useState('purchases');
  const kind = KINDS.find((k) => k.id === kindId);

  const [docs, setDocs] = useState([]);
  const [items, setItems] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [detail, setDetail] = useState(null);
  const [editor, setEditor] = useState(null);
  const [picker, setPicker] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    api.getTenant().then((result) => setTenant(result?.tenant || null)).catch(() => setTenant(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, its, parts] = await Promise.all([
        api.list(kind.id),
        items.length ? Promise.resolve(items) : api.listItems(),
        api.list(kind.partnerEntity).catch(() => [])
      ]);
      setDocs(list);
      setItems(its);
      setPartners(parts);
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  }, [kind.id, kind.partnerEntity, items, showError]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindId]);

  const doRefresh = async (e) => {
    await load();
    e.detail.complete();
  };

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return docs
      .filter((d) => {
        if (!q) return true;
        return [d.reference, d.supplier, d.customer, statusMeta(d.status).label].some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }, [docs, search]);

  const openNew = () => {
    setEditor({
      partner: partners[0]?.name || '',
      reference: '',
      status: kind.defaultStatus,
      date: todayStr(),
      note: '',
      items: []
    });
  };

  const setEditorField = (k) => (v) => setEditor((e) => ({ ...e, [k]: v }));

  const addLine = (it) => {
    setEditor((e) => ({
      ...e,
      items: [
        ...e.items,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          itemId: it.id,
          sku: it.sku,
          name: it.name,
          qty: 1,
          price: num(it[kind.priceKey])
        }
      ]
    }));
    setPicker(false);
  };

  const setLine = (lineId, patch) =>
    setEditor((e) => ({
      ...e,
      items: e.items.map((l) => (l.id === lineId ? { ...l, ...patch } : l))
    }));

  const removeLine = (lineId) =>
    setEditor((e) => ({ ...e, items: e.items.filter((l) => l.id !== lineId) }));

  const total = useMemo(
    () => (editor?.items || []).reduce((s, l) => s + num(l.qty) * num(l.price), 0),
    [editor]
  );

  const save = async () => {
    if (!editor) return;
    if (!String(editor.partner || '').trim()) {
      show(`${kind.partnerLabel} adı mütləqdir`, 'warning');
      return;
    }
    if (editor.items.length === 0) {
      show('Ən azı bir məhsul əlavə edin', 'warning');
      return;
    }
    if (editor.items.some((line) => num(line.qty) <= 0 || num(line.price) < 0)) {
      show('Məhsul sayı sıfırdan böyük, qiymət isə mənfi olmamalıdır', 'warning');
      return;
    }
    setBusy(true);
    try {
      const items = editor.items.map((l) => ({
        id: l.id,
        itemId: l.itemId,
        sku: l.sku,
        name: l.name,
        qty: num(l.qty),
        price: num(l.price),
        total: num(l.qty) * num(l.price)
      }));
      const reference = editor.reference.trim() || (kind.id === 'sales'
        ? `FTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
        : `${kind.id.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`);
      await api.create(kind.id, {
        [kind.partner]: editor.partner.trim(),
        reference,
        status: editor.status,
        date: editor.date,
        note: editor.note,
        items,
        total: items.reduce((s, l) => s + l.total, 0)
      });
      setEditor(null);
      show('Sənəd yaradıldı', 'success');
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (doc, status) => {
    setBusy(true);
    try {
      const updated = await api.update(kind.id, doc.id, { status });
      setDetail(updated);
      show('Status yeniləndi', 'success');
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(kind.id, toDelete.id);
      setToDelete(null);
      setDetail(null);
      show('Sənəd silindi', 'success');
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const cell = (key, val) => (
    <div className="detail-cell" key={key}>
      <div className="detail-key">{key}</div>
      <div className="detail-val">{val || '—'}</div>
    </div>
  );

  const partnerName = (doc) => doc[kind.partner] || doc.supplier || doc.customer || '—';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
        <IonTitle>Faturalar və sənədlər</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={search}
            onIonInput={(e) => setSearch(e.detail.value || '')}
            placeholder="Referans / tərəf axtar"
          />
        </IonToolbar>
        <div className="kind-seg">
          <IonSegment
            value={kindId}
            onIonChange={(e) => {
              setKindId(e.detail.value);
              setDetail(null);
            }}
          >
            {KINDS.map((k) => (
              <IonSegmentButton key={k.id} value={k.id}>
                {k.label}
              </IonSegmentButton>
            ))}
          </IonSegment>
        </div>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="count-line">{visible.length} sənəd</div>

        {visible.length === 0 ? (
          <EmptyState
            title={loading ? 'Yüklənir…' : 'Sənəd yoxdur'}
            subtitle={`Yeni ${kind.label.toLowerCase()} sənədi yaradın`}
            actionLabel="Yeni sənəd"
            onAction={openNew}
            tone={loading ? 'default' : 'warning'}
          />
        ) : (
          <div className="page-pad">
            <IonList className="m-list">
              {visible.map((doc) => (
                <IonItem key={doc.id} button onClick={() => setDetail(doc)}>
                  <IonLabel>
                    <h2>{doc.reference || doc.id}</h2>
                    <p>
                      {partnerName(doc)} • {dateLabel(doc.date)}
                    </p>
                    <p>{(doc.items || []).length} sətir</p>
                  </IonLabel>
                  <div slot="end" style={{ textAlign: 'right' }}>
                    <StatusChip code={doc.status} />
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{money(docTotal(doc))}</div>
                  </div>
                </IonItem>
              ))}
            </IonList>
          </div>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openNew}>
            <BIcon name="plus-lg" />
          </IonFabButton>
        </IonFab>

        {/* ---------- detay ---------- */}
        <Sheet
          isOpen={!!detail}
          title={kind.label}
          onClose={() => setDetail(null)}
          className="tall-sheet"
          actions={
            <div className="document-actions">
              {kind.id === 'sales' && <>
                <IonButton fill="outline" expand="block" className="btn-grow" onClick={() => printSalesDocument(detail, tenant, 'invoice')}>
                  <BIcon name="FileText" slot="start" /> PDF faktura
                </IonButton>
                <IonButton fill="outline" expand="block" className="btn-grow" onClick={() => printSalesDocument(detail, tenant, 'receipt')}>
                  <BIcon name="Receipt" slot="start" /> Fiş çap et
                </IonButton>
              </>}
              <IonButton color="danger" fill="outline" expand="block" className="btn-grow" onClick={() => { setToDelete(detail); setDetail(null); }}>
                <BIcon name="Trash2" slot="start" /> Sənədi sil
              </IonButton>
            </div>
          }
        >
          {detail && (
            <>
              <div className="sheet-hero">
                <div>
                  <h2>{detail.reference || detail.id}</h2>
                  <p>
                    {partnerName(detail)} • {dateLabel(detail.date)}
                  </p>
                </div>
                <StatusChip code={detail.status} />
              </div>

              <div className="detail-grid">
                {cell(kind.partnerLabel, partnerName(detail))}
                {cell('Məbləğ', money(docTotal(detail)))}
                {cell('Sətir sayı', (detail.items || []).length)}
                {cell('Stoka təsir', detail.stockApplied || detail.stockDeducted ? 'Tətbiq edilib' : 'Tətbiq edilməyib')}
              </div>

              {detail.note && <p className="form-note">{detail.note}</p>}

              <div className="section-head">
                <span className="section-title">Statusu dəyiş</span>
              </div>
              <div className="filter-row" style={{ paddingLeft: 0 }}>
                {statusOptions(kind.id).map((o) => (
                  <IonChip
                    key={o.value}
                    button
                    color={detail.status === o.value ? statusMeta(o.value).color : 'medium'}
                    outline={detail.status !== o.value}
                    onClick={() => detail.status !== o.value && changeStatus(detail, o.value)}
                  >
                    {o.label}
                  </IonChip>
                ))}
              </div>

              <div className="section-head">
                <span className="section-title">Məhsullar</span>
              </div>
              <IonList className="m-list">
                {(detail.items || []).map((l, i) => (
                  <IonItem key={l.id || i}>
                    <IonLabel>
                      <h2>{l.name || l.sku || '—'}</h2>
                      <p>
                        {num(l.qty)} × {money(l.price)}
                      </p>
                    </IonLabel>
                    <div slot="end" style={{ fontWeight: 700, fontSize: 13 }}>
                      {money(num(l.qty) * num(l.price))}
                    </div>
                  </IonItem>
                ))}
              </IonList>
            </>
          )}
        </Sheet>

        {/* ---------- yeni sənəd ---------- */}
        <Sheet
          isOpen={!!editor}
          title={kind.id === 'sales' ? 'Yeni fatura' : `Yeni ${kind.label.toLowerCase()} sənədi`}
          onClose={() => setEditor(null)}
          className="tall-sheet"
          actions={
            <>
              <IonButton className="btn-grow" fill="outline" color="medium" onClick={() => setEditor(null)} disabled={busy}>
                İmtina
              </IonButton>
              <IonButton className="btn-grow" onClick={save} disabled={busy}>
                {busy ? 'Gözləyin…' : 'Yadda saxla'}
              </IonButton>
            </>
          }
        >
          {editor && (
            <>
              <div className="form-list">
                <FormField
                  label={kind.partnerLabel}
                  value={editor.partner}
                  required
                  onInput={setEditorField('partner')}
                  placeholder={kind.partnerLabel}
                />
                <FormField label="Referans" value={editor.reference} placeholder={`${kind.id.slice(0, 3).toUpperCase()}-0001`} onInput={setEditorField('reference')} />
                <FormField label="Status" value={editor.status} options={statusOptions(kind.id)} onInput={setEditorField('status')} />
                <FormField label="Tarix" type="date" value={editor.date} onInput={setEditorField('date')} />
                <FormField label="Qeyd" value={editor.note} onInput={setEditorField('note')} textarea />
              </div>

              {partners.length > 0 && (
                <div className="filter-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  {partners.slice(0, 8).map((p) => (
                    <IonChip key={p.id || p.name} outline color="primary" button onClick={() => setEditorField('partner')(p.name)}>
                      {p.name}
                    </IonChip>
                  ))}
                </div>
              )}

              <div className="section-head">
                <span className="section-title">Məhsullar</span>
                <button className="section-link" onClick={() => setPicker(true)}>
                  + Əlavə et
                </button>
              </div>

              {editor.items.length === 0 ? (
                <EmptyState title="Sətir yoxdur" subtitle="Məhsul əlavə etmək üçün yuxarıdakı düyməni basın" />
              ) : (
                editor.items.map((l) => (
                  <div className="line-row" key={l.id}>
                    <div className="line-main">
                      <div className="line-name">{l.name}</div>
                      <div className="line-sub">{l.sku || '—'}</div>
                    </div>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={l.qty}
                      onChange={(ev) => setLine(l.id, { qty: Number(ev.target.value || 0) })}
                      className="line-input"
                      style={{ width: 62 }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={l.price}
                      onChange={(ev) => setLine(l.id, { price: Number(ev.target.value || 0) })}
                      className="line-input"
                      style={{ width: 82 }}
                    />
                    <IonButton fill="clear" color="danger" size="small" onClick={() => removeLine(l.id)}>
                      <BIcon name="trash" />
                    </IonButton>
                  </div>
                ))
              )}

              <div className="form-total">
                <span>Ümumi məbləğ</span>
                <span>{money(total)}</span>
              </div>
              <p className="form-note">
                Qeyd: "Qaralama" statusunda sənəd stoka təsir etmir. Digər statuslarda stok avtomatik dəyişir.
              </p>
            </>
          )}
        </Sheet>

        <ItemPicker
          isOpen={picker}
          items={items}
          title="Məhsul əlavə et"
          onPick={addLine}
          onClose={() => setPicker(false)}
        />

        <ConfirmSheet
          isOpen={!!toDelete}
          title="Sənədi sil"
          message={`"${toDelete?.reference || toDelete?.id}" sənədi silinsinmi?`}
          confirmLabel="Sil"
          destructive
          busy={busy}
          onConfirm={remove}
          onClose={() => setToDelete(null)}
        />

        <IonToast
          isOpen={toast.isOpen}
          message={toast.message}
          color={toast.color}
          duration={2400}
          position="top"
          onDidDismiss={close}
        />
      </IonContent>
    </IonPage>
  );
}
