import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonFab,
  IonFabButton,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonButton,
  IonButtons
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import BIcon from '../ui/BIcon.jsx';
import { api } from '../lib/api.js';
import { usePerms } from '../lib/perms.js';
import { useToast } from '../lib/useToast.js';
import { num, money, stockState, STOCK_STATE_COLOR, STOCK_STATE_LABEL, dateTimeLabel } from '../lib/fmt.js';
import Sheet from '../ui/Sheet.jsx';
import ConfirmSheet from '../ui/ConfirmSheet.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import FormField from '../ui/FormField.jsx';
import StockSheet from '../ui/StockSheet.jsx';
import FeatherIcon from '../../components/common/FeatherIcon.jsx';
import AppleWatchQRScanner from '../ui/AppleWatchQRScanner.jsx';

const BLANK = {
  sku: '',
  name: '',
  ean13: '',
  category: '',
  brand: '',
  unit: 'Ədəd',
  quantity: 0,
  minStock: 5,
  cost: 0,
  price: 0,
  location: '',
  supplier: '',
  description: ''
};

const FILTERS = [
  { id: 'all', label: 'Hamısı' },
  { id: 'low', label: 'Kritik' },
  { id: 'out', label: 'Stokda yox' }
];

export default function MobileStock() {
  const perms = usePerms();
  const router = useIonRouter();
  const { toast, show, showError, close } = useToast();

  const canWrite = perms.can('write');
  const canStock = perms.can('stock');

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState(null);
  const [editor, setEditor] = useState(null); // { item, mode }
  const [stockItem, setStockItem] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.listItems());
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
    const handleNotif = () => {
      load();
    };
    window.addEventListener('runstock:notification', handleNotif);
    return () => window.removeEventListener('runstock:notification', handleNotif);
  }, [load]);

  const doRefresh = async (e) => {
    await load();
    e.detail.complete();
  };

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((it) => {
      const st = stockState(it.quantity, it.minStock);
      if (filter === 'low' && st !== 'low') return false;
      if (filter === 'out' && st !== 'out') return false;
      if (!q) return true;
      return [it.name, it.sku, it.ean13, it.category, it.brand, it.location].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

  const save = async () => {
    const p = editor?.item || {};
    if (!String(p.sku || '').trim() || !String(p.name || '').trim()) {
      show('SKU və məhsul adı mütləqdir', 'warning');
      return;
    }
    setBusy(true);
    try {
      if (p.id) await api.updateItem(p.id, p);
      else await api.createItem(p);
      setEditor(null);
      show(p.id ? 'Məhsul yeniləndi' : 'Məhsul yaradıldı', 'success');
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const applyStock = async ({ mode, qty, note }) => {
    try {
      await api.changeStock(stockItem.id, mode === 'in' ? qty : -qty, note);
      show(mode === 'in' ? 'Stok girişi qeydə alındı' : 'Stok çıxışı qeydə alındı', 'success');
      load();
    } catch (e) {
      showError(e);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteItem(toDelete.id);
      setToDelete(null);
      setDetail(null);
      show('Məhsul silindi', 'success');
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const setField = (k) => (v) => setEditor((e) => ({ ...e, item: { ...e.item, [k]: v } }));
  const setNumField = (k) => (v) => setEditor((e) => ({ ...e, item: { ...e.item, [k]: num(v) } }));

  const cell = (key, val) => (
    <div className="detail-cell" key={key}>
      <div className="detail-key">{key}</div>
      <div className="detail-val">{val || '—'}</div>
    </div>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Stok</IonTitle>
          {perms.actAs && (
            <IonButtons slot="end">
              <IonButton fill="clear" onClick={() => perms.clearTenant()}>
                Platformaya qayıt
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
        <IonToolbar>
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: '8px' }}>
            <IonSearchbar
              value={search}
              onIonInput={(e) => setSearch(e.detail.value || '')}
              placeholder="Məhsul / SKU / EAN axtar"
              style={{ flex: 1, paddingRight: '4px' }}
            />
            <IonButton
              fill="clear"
              color="primary"
              onClick={() => setShowQRScanner(true)}
              title="Barkod / QR Skaner"
              style={{ margin: 0, '--padding-start': '6px', '--padding-end': '6px' }}
            >
              <FeatherIcon name="Camera" size={20} strokeWidth={2.2} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="filter-row">
          {FILTERS.map((f) => (
            <IonChip
              key={f.id}
              color={filter === f.id ? 'primary' : 'medium'}
              outline={filter !== f.id}
              onClick={() => setFilter(f.id)}
              button
            >
              {f.label}
            </IonChip>
          ))}
        </div>

        <div className="count-line">
          {visible.length} məhsul göstərilir (cəmi {items.length})
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title={loading ? 'Yüklənir…' : 'Məhsul tapılmadı'}
            subtitle={filter === 'all' ? 'Axtarış sözünü dəyişin və ya yeni məhsul əlavə edin' : 'Seçilmiş filtreyə uyğun məhsul yoxdur'}
            actionLabel={canWrite ? 'Yeni məhsul' : undefined}
            onAction={() => setEditor({ mode: 'create', item: { ...BLANK } })}
            tone={loading ? 'default' : 'warning'}
          />
        ) : (
          <div className="page-pad">
            <IonList className="m-list">
              {visible.map((item) => (
                <IonItem key={item.id} button onClick={() => setDetail(item)}>
                  <IonLabel>
                    <h2>{item.name}</h2>
                    <p>
                      SKU: {item.sku || '—'} • {item.category || '—'} / {item.brand || '—'}
                    </p>
                    <p>
                      {money(item.price)} • {item.location || 'Yer təyin edilməyib'}
                    </p>
                  </IonLabel>
                  <div slot="end" style={{ textAlign: 'right' }}>
                    <IonChip color={STOCK_STATE_COLOR[stockState(item.quantity, item.minStock)]}>
                      {num(item.quantity)}
                    </IonChip>
                    <div style={{ fontSize: 11, color: '#66708a' }}>
                      {STOCK_STATE_LABEL[stockState(item.quantity, item.minStock)]}
                    </div>
                  </div>
                </IonItem>
              ))}
            </IonList>
          </div>
        )}

        {canWrite && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={() => setEditor({ mode: 'create', item: { ...BLANK } })}>
              <BIcon name="plus-lg" />
            </IonFabButton>
          </IonFab>
        )}

        {/* ---------- detay sheet ---------- */}
        <Sheet
          isOpen={!!detail}
          title="Məhsul detayı"
          onClose={() => setDetail(null)}
          size="tall"
          actions={
            <>
              {canStock && (
                <IonButton className="btn-grow" color="primary" fill="outline" onClick={() => { setStockItem(detail); setDetail(null); }}>
                  <BIcon name="arrow-left-right" slot="start" />
                  Stok əməliyyatı
                </IonButton>
              )}
              {canWrite && (
                <IonButton className="btn-grow" onClick={() => { setEditor({ mode: 'edit', item: { ...detail } }); setDetail(null); }}>
                  <BIcon name="pencil" slot="start" />
                  Redaktə
                </IonButton>
              )}
            </>
          }
        >
          {detail && (
            <>
              <div className="sheet-hero">
                <div>
                  <h2>{detail.name}</h2>
                  <p>SKU: {detail.sku || '—'}</p>
                </div>
                <div className={`qty-badge tone-${STOCK_STATE_COLOR[stockState(detail.quantity, detail.minStock)]}`}>
                  {num(detail.quantity)}
                </div>
              </div>
              <div className="detail-grid">
                {cell('Vəziyyət', STOCK_STATE_LABEL[stockState(detail.quantity, detail.minStock)])}
                {cell('Minimum', num(detail.minStock))}
                {cell('Kateqoriya', detail.category)}
                {cell('Marka', detail.brand)}
                {cell('Birlik', detail.unit)}
                {cell('EAN13', detail.ean13)}
                {cell('Maya qiyməti', money(detail.cost))}
                {cell('Satış qiyməti', money(detail.price))}
                {cell('Yer', detail.location)}
                {cell('Təchizatçı', detail.supplier)}
                {cell('Dəyər', money(num(detail.quantity) * num(detail.cost)))}
                {cell('Yenilənmə', dateTimeLabel(detail.updated))}
              </div>
              {detail.description && <p className="form-note">{detail.description}</p>}
              {canWrite && (
                <IonButton
                  color="danger"
                  fill="outline"
                  expand="block"
                  style={{ marginTop: 10 }}
                  onClick={() => { setToDelete(detail); setDetail(null); }}
                >
                  <BIcon name="trash" slot="start" />
                  Məhsulu sil
                </IonButton>
              )}
            </>
          )}
        </Sheet>

        {/* ---------- redaktə sheet ---------- */}
        <Sheet
          isOpen={!!editor}
          title={editor?.mode === 'edit' ? 'Məhsulu redaktə et' : 'Yeni məhsul'}
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
            <div className="form-list">
              <FormField label="SKU" value={editor.item.sku} required onInput={setField('sku')} placeholder="RS-001" />
              <FormField label="Məhsul adı" value={editor.item.name} required onInput={setField('name')} />
              <FormField label="EAN13" value={editor.item.ean13} onInput={setField('ean13')} placeholder="Barkod (istəyə bağlı)" />
              <FormField label="Kateqoriya" value={editor.item.category} onInput={setField('category')} />
              <FormField label="Marka" value={editor.item.brand} onInput={setField('brand')} />
              <FormField label="Birlik" value={editor.item.unit} onInput={setField('unit')} />
              <FormField label="Mövcud stok" type="number" value={editor.item.quantity} onInput={setNumField('quantity')} />
              <FormField label="Minimum stok" type="number" value={editor.item.minStock} onInput={setNumField('minStock')} />
              <FormField label="Maya qiyməti (₼)" type="number" value={editor.item.cost} onInput={setNumField('cost')} />
              <FormField label="Satış qiyməti (₼)" type="number" value={editor.item.price} onInput={setNumField('price')} />
              <FormField label="Yer / raf" value={editor.item.location} onInput={setField('location')} />
              <FormField label="Təchizatçı" value={editor.item.supplier} onInput={setField('supplier')} />
              <FormField label="Açıqlama" value={editor.item.description} onInput={setField('description')} textarea />
            </div>
          )}
        </Sheet>

        {/* ---------- stok əməliyyatı ---------- */}
        <StockSheet
          isOpen={!!stockItem}
          item={stockItem}
          onClose={() => setStockItem(null)}
          onSubmit={applyStock}
        />

        {/* ---------- silmə təsdiqi ---------- */}
        <ConfirmSheet
          isOpen={!!toDelete}
          title="Məhsulu sil"
          message={`"${toDelete?.name}" məhsulu silinsinmi? Bu əməliyyat geri qaytarıla bilməz.`}
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
          duration={2200}
          position="top"
          onDidDismiss={close}
        />

        <AppleWatchQRScanner
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onSuccess={({ text }) => {
            setShowQRScanner(false);
            const query = text ? String(text).trim() : '';
            if (!query) return;
            const found = items.find(
              (i) =>
                String(i.sku || '').toLowerCase() === query.toLowerCase() ||
                String(i.ean13 || '').toLowerCase() === query.toLowerCase() ||
                String(i.id) === query
            );
            if (found) {
              setDetail(found);
              show(`Məhsul tapıldı: ${found.name}`, 'success');
            } else {
              setSearch(query);
              show(`Axtarış: ${query}`, 'primary');
            }
          }}
          mode="product"
          title="Məhsul Barkod / QR Skaneri"
        />
      </IonContent>
    </IonPage>
  );
}
