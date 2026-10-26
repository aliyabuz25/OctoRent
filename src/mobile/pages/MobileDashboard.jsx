import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  useIonRouter
} from '@ionic/react';
import BIcon from '../ui/BIcon.jsx';
import { api } from '../lib/api.js';
import { usePerms } from '../lib/perms.js';
import { useToast } from '../lib/useToast.js';
import { num, money, dateLabel, stockState, STOCK_STATE_COLOR, STOCK_STATE_LABEL } from '../lib/fmt.js';
import StatCard from '../ui/StatCard.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ItemPicker from '../ui/ItemPicker.jsx';
import StockSheet from '../ui/StockSheet.jsx';
import NotificationBanner from '../ui/NotificationBanner.jsx';

export default function MobileDashboard() {
  const perms = usePerms();
  const router = useIonRouter();
  const { toast, show, showError, close } = useToast();

  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [tenantName, setTenantName] = useState(perms.actAs?.name || '');
  const [loading, setLoading] = useState(true);

  const [picker, setPicker] = useState({ open: false, mode: 'in' });
  const [stockItem, setStockItem] = useState(null);

  const load = useCallback(async () => {
    try {
      const [its, movs] = await Promise.all([api.listItems(), api.movements()]);
      setItems(its);
      setMovements(movs);
      if (!perms.actAs) {
        const t = await api.getTenant().catch(() => null);
        setTenantName(t?.tenant?.name || t?.name || '');
      }
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  }, [perms.actAs, showError]);

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

  const stats = useMemo(() => {
    const low = items.filter((i) => stockState(i.quantity, i.minStock) === 'low');
    const out = items.filter((i) => stockState(i.quantity, i.minStock) === 'out');
    const totalValue = items.reduce((s, i) => s + num(i.quantity) * num(i.cost), 0);
    const totalQty = items.reduce((s, i) => s + num(i.quantity), 0);
    return { low, out, totalValue, totalQty, count: items.length };
  }, [items]);

  const critical = useMemo(
    () => [...stats.out, ...stats.low].slice(0, 5),
    [stats]
  );

  const recent = useMemo(
    () => [...movements].sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))).slice(0, 5),
    [movements]
  );

  const handleStock = async ({ mode, qty, note }) => {
    try {
      await api.changeStock(stockItem.id, mode === 'in' ? qty : -qty, note);
      show(mode === 'in' ? 'Stok girişi qeydə alındı' : 'Stok çıxışı qeydə alındı', 'success');
      load();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Ana Səhifə</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <NotificationBanner />

        <div className="page-head">
          <h1 className="page-title">{tenantName || 'Müəssisə'}</h1>
          <p className="page-sub">{dateLabel(new Date().toISOString())} • Anbar icmalı</p>
        </div>

        <div className="stat-grid">
          <StatCard label="Məhsul növü" value={stats.count} sub={`Ümumi ədəd: ${stats.totalQty}`} color="primary" icon="Boxes" />
          <StatCard
            label="Kritik stok"
            value={stats.low.length}
            sub="Minimum həddə yaxın"
            color="warning"
            icon="AlertTriangle"
            onClick={() => router.push('/mobile/stock')}
          />
          <StatCard
            label="Stokda yox"
            value={stats.out.length}
            sub="Tükənmiş məhsullar"
            color="danger"
            icon="PackageX"
            onClick={() => router.push('/mobile/stock')}
          />
          <StatCard label="Anbar dəyəri" value={money(stats.totalValue)} sub="Maya dəyəri ilə" color="success" icon="TrendingUp" />
        </div>

        {perms.can('stock') && (
          <div className="quick-row">
            <IonButton
              color="success"
              fill="outline"
              onClick={() => setPicker({ open: true, mode: 'in' })}
            >
              <BIcon name="plus-circle" slot="start" />
              Stok girişi
            </IonButton>
            <IonButton
              color="danger"
              fill="outline"
              onClick={() => setPicker({ open: true, mode: 'out' })}
            >
              <BIcon name="dash-circle" slot="start" />
              Stok çıxışı
            </IonButton>
          </div>
        )}

        <div className="page-pad">
          {critical.length > 0 && (
            <>
              <div className="section-head">
                <span className="section-title">Diqqət tələb edən</span>
                <button className="section-link" onClick={() => router.push('/mobile/stock')}>
                  Hamısı
                </button>
              </div>
              <IonList className="m-list">
                {critical.map((it) => (
                  <IonItem key={it.id} button onClick={() => { setStockItem(it); setPicker({ open: false, mode: 'in' }); }}>
                    <IonLabel>
                      <h2>{it.name}</h2>
                      <p>
                        SKU: {it.sku || '—'} • Min: {num(it.minStock)}
                      </p>
                    </IonLabel>
                    <IonChip color={STOCK_STATE_COLOR[stockState(it.quantity, it.minStock)]} slot="end">
                      {num(it.quantity)}
                    </IonChip>
                  </IonItem>
                ))}
              </IonList>
            </>
          )}

          <div className="section-head">
            <span className="section-title">Son hərəkətlər</span>
            {perms.can('stock') && (
              <button className="section-link" onClick={() => router.push('/mobile/movements')}>
                Hamısı
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title={loading ? 'Yüklənir…' : 'Hərəkət yoxdur'}
              subtitle="Stok girişi və çıxışı burada görünəcək"
            />
          ) : (
            <IonList className="m-list">
              {recent.map((m) => (
                <IonItem key={m.id}>
                  <IonLabel>
                    <h2>{m.itemName}</h2>
                    <p>{dateLabel(m.date)} • {m.note || 'Qeyd yoxdur'}</p>
                  </IonLabel>
                  <IonChip color={m.type === 'in' ? 'success' : 'danger'} slot="end">
                    {m.type === 'in' ? '+' : '−'}
                    {num(m.qty)}
                  </IonChip>
                </IonItem>
              ))}
            </IonList>
          )}

          {perms.can('read') && (
            <div className="quick-row" style={{ padding: '14px 0 0' }}>
              <IonButton fill="outline" onClick={() => router.push('/mobile/reports')}>
                <BIcon name="bar-chart" slot="start" />
                Hesabatlar
              </IonButton>
              {perms.can('documents') && (
                <IonButton fill="outline" onClick={() => router.push('/mobile/documents')}>
                  <BIcon name="file-earmark-text" slot="start" />
                  Sənədlər
                </IonButton>
              )}
            </div>
          )}
        </div>

        <ItemPicker
          isOpen={picker.open}
          items={items}
          title={picker.mode === 'in' ? 'Giriş üçün məhsul seç' : 'Çıxış üçün məhsul seç'}
          onPick={(it) => {
            setPicker({ open: false, mode: picker.mode });
            setStockItem(it);
          }}
          onClose={() => setPicker({ open: false, mode: 'in' })}
        />

        <StockSheet
          isOpen={!!stockItem}
          item={stockItem}
          initialMode={picker.mode}
          onClose={() => setStockItem(null)}
          onSubmit={handleStock}
        />

        <IonToast
          isOpen={toast.isOpen}
          message={toast.message}
          color={toast.color}
          duration={2200}
          position="top"
          onDidDismiss={close}
        />
      </IonContent>
    </IonPage>
  );
}
