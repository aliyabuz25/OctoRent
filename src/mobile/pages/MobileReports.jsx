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
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonBackButton,
  IonButtons
} from '@ionic/react';
import { api } from '../lib/api.js';
import { useToast } from '../lib/useToast.js';
import { num, money, stockState, STOCK_STATE_COLOR, STOCK_STATE_LABEL } from '../lib/fmt.js';
import StatCard from '../ui/StatCard.jsx';
import EmptyState from '../ui/EmptyState.jsx';

export default function MobileReports() {
  const { toast, showError, close } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [items, sales, purchases, movs] = await Promise.all([
        api.listItems(),
        api.list('sales').catch(() => []),
        api.list('purchases').catch(() => []),
        api.movements().catch(() => [])
      ]);
      setData({ items, sales, purchases, movs });
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const doRefresh = async (e) => {
    await load();
    e.detail.complete();
  };

  const calc = useMemo(() => {
    if (!data) return null;
    const { items, sales, purchases, movs } = data;
    const totalQty = items.reduce((s, i) => s + num(i.quantity), 0);
    const stockCost = items.reduce((s, i) => s + num(i.quantity) * num(i.cost), 0);
    const stockPrice = items.reduce((s, i) => s + num(i.quantity) * num(i.price), 0);
    const low = items.filter((i) => stockState(i.quantity, i.minStock) === 'low');
    const out = items.filter((i) => stockState(i.quantity, i.minStock) === 'out');
    const salesTotal = sales.reduce((s, d) => s + num(d.total), 0);
    const purchaseTotal = purchases.reduce((s, d) => s + num(d.total), 0);
    const movIn = movs.filter((m) => m.type === 'in').reduce((s, m) => s + num(m.qty), 0);
    const movOut = movs.filter((m) => m.type === 'out').reduce((s, m) => s + num(m.qty), 0);

    const byCategory = Object.values(
      items.reduce((acc, i) => {
        const key = i.category || 'Digər';
        acc[key] = acc[key] || { name: key, value: 0, count: 0 };
        acc[key].value += num(i.quantity) * num(i.cost);
        acc[key].count += 1;
        return acc;
      }, {})
    ).sort((a, b) => b.value - a.value);

    const maxCat = Math.max(1, ...byCategory.map((c) => c.value));

    return {
      totalQty,
      stockCost,
      stockPrice,
      low,
      out,
      salesTotal,
      purchaseTotal,
      movIn,
      movOut,
      byCategory,
      maxCat,
      count: items.length
    };
  }, [data]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/mobile/settings" text="Geri" />
          </IonButtons>
          <IonTitle>Hesabatlar</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {!calc ? (
          <EmptyState title={loading ? 'Yüklənir…' : 'Məlumat yoxdur'} />
        ) : (
          <>
            <div className="stat-grid">
              <StatCard label="Məhsul növü" value={calc.count} sub={`Ümumi ədəd: ${calc.totalQty}`} color="primary" icon="Boxes" />
              <StatCard label="Anbar dəyəri" value={money(calc.stockCost)} sub="Maya qiyməti ilə" color="success" icon="DollarSign" />
              <StatCard label="Satış dəyəri" value={money(calc.stockPrice)} sub="Satış qiyməti ilə" color="primary" icon="TrendingUp" />
              <StatCard
                label="Potensial mənfəət"
                value={money(calc.stockPrice - calc.stockCost)}
                sub="Satış - maya"
                color="success"
                icon="Sparkles"
              />
              <StatCard label="Alışlar cəmi" value={money(calc.purchaseTotal)} sub={`${data.purchases.length} sənəd`} color="primary" icon="Package" />
              <StatCard label="Satışlar cəmi" value={money(calc.salesTotal)} sub={`${data.sales.length} sənəd`} color="success" icon="ShoppingCart" />
              <StatCard label="Stok girişi" value={calc.movIn} sub="Cəmi ədəd" color="success" icon="ArrowDownLeft" />
              <StatCard label="Stok çıxışı" value={calc.movOut} sub="Cəmi ədəd" color="danger" icon="ArrowUpRight" />
            </div>

            <div className="page-pad">
              <div className="section-head">
                <span className="section-title">Kateqoriya üzrə dəyər</span>
              </div>
              {calc.byCategory.length === 0 ? (
                <EmptyState title="Kateqoriya yoxdur" />
              ) : (
                <div className="report-bars">
                  {calc.byCategory.slice(0, 8).map((c) => (
                    <div className="report-bar" key={c.name}>
                      <div className="report-bar-top">
                        <span>
                          {c.name} <span style={{ color: '#66708a', fontWeight: 600 }}>({c.count})</span>
                        </span>
                        <span>{money(c.value)}</span>
                      </div>
                      <div className="report-bar-track">
                        <div className="report-bar-fill" style={{ width: `${Math.round((c.value / calc.maxCat) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="section-head">
                <span className="section-title">Diqqət tələb edən ({calc.low.length + calc.out.length})</span>
              </div>
              {calc.low.length + calc.out.length === 0 ? (
                <EmptyState title="Hər şey qaydasındadır" subtitle="Kritik və ya tükənmiş məhsul yoxdur" />
              ) : (
                <IonList className="m-list">
                  {[...calc.out, ...calc.low].map((it) => (
                    <IonItem key={it.id}>
                      <IonLabel>
                        <h2>{it.name}</h2>
                        <p>
                          SKU: {it.sku || '—'} • Min: {num(it.minStock)}
                        </p>
                      </IonLabel>
                      <IonChip color={STOCK_STATE_COLOR[stockState(it.quantity, it.minStock)]} slot="end">
                        {num(it.quantity)} · {STOCK_STATE_LABEL[stockState(it.quantity, it.minStock)]}
                      </IonChip>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </div>
          </>
        )}

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
