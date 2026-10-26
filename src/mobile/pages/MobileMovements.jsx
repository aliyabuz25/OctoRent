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
  IonRefresher,
  IonRefresherContent,
  IonToast
} from '@ionic/react';
import { api } from '../lib/api.js';
import { useToast } from '../lib/useToast.js';
import { num, dayLabel, dateLabel, dateTimeLabel } from '../lib/fmt.js';
import Sheet from '../ui/Sheet.jsx';
import EmptyState from '../ui/EmptyState.jsx';

const FILTERS = [
  { id: 'all', label: 'Hamısı' },
  { id: 'in', label: 'Giriş' },
  { id: 'out', label: 'Çıxış' }
];

export default function MobileMovements() {
  const { toast, showError, close } = useToast();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.movements();
      setMovements(data);
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return movements
      .filter((m) => {
        if (filter !== 'all' && m.type !== filter) return false;
        if (!q) return true;
        return [m.itemName, m.sku, m.note].some((v) => String(v || '').toLowerCase().includes(q));
      })
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }, [movements, search, filter]);

  const grouped = useMemo(() => {
    const map = new Map();
    visible.forEach((m) => {
      const key = dayLabel(m.date || m.at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    return [...map.entries()];
  }, [visible]);

  const totals = useMemo(() => {
    const i = visible.filter((m) => m.type === 'in').reduce((s, m) => s + num(m.qty), 0);
    const o = visible.filter((m) => m.type === 'out').reduce((s, m) => s + num(m.qty), 0);
    return { i, o };
  }, [visible]);

  const doRefresh = async (e) => {
    await load();
    e.detail.complete();
  };

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
          <IonTitle>Hərəkətlər</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={search}
            onIonInput={(e) => setSearch(e.detail.value || '')}
            placeholder="Məhsul / SKU / qeyd axtar"
          />
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
              color={filter === f.id ? (f.id === 'in' ? 'success' : f.id === 'out' ? 'danger' : 'primary') : 'medium'}
              outline={filter !== f.id}
              onClick={() => setFilter(f.id)}
              button
            >
              {f.label}
            </IonChip>
          ))}
        </div>

        <div className="count-line">
          {visible.length} qeyd • giriş {totals.i} • çıxış {totals.o}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title={loading ? 'Yüklənir…' : 'Hərəkət tapılmadı'}
            subtitle="Stok əməliyyatları burada qeydə alınır"
            tone={loading ? 'default' : 'warning'}
          />
        ) : (
          grouped.map(([label, list]) => (
            <div key={label}>
              <div className="group-label">{label}</div>
              <div className="page-pad">
                <IonList className="m-list">
                  {list.map((m) => (
                    <IonItem key={m.id} button onClick={() => setDetail(m)}>
                      <IonLabel>
                        <h2>{m.itemName}</h2>
                        <p>SKU: {m.sku || '—'} • {m.note || 'Qeyd yoxdur'}</p>
                      </IonLabel>
                      <div slot="end" style={{ textAlign: 'right' }}>
                        <IonChip color={m.type === 'in' ? 'success' : 'danger'}>
                          {m.type === 'in' ? '+' : '−'}
                          {num(m.qty)}
                        </IonChip>
                        <div style={{ fontSize: 11, color: '#66708a' }}>
                          {m.quantityAfter != null ? `qalıq: ${num(m.quantityAfter)}` : dateLabel(m.date)}
                        </div>
                      </div>
                    </IonItem>
                  ))}
                </IonList>
              </div>
            </div>
          ))
        )}

        <Sheet isOpen={!!detail} title="Hərəkət detayı" onClose={() => setDetail(null)} size="tall">
          {detail && (
            <div className="detail-grid">
              {cell('Məhsul', detail.itemName)}
              {cell('SKU', detail.sku)}
              {cell('Növ', detail.type === 'in' ? 'Giriş' : 'Çıxış')}
              {cell('Miqdar', num(detail.qty))}
              {cell('Əməliyyatdan sonra', detail.quantityAfter != null ? num(detail.quantityAfter) : null)}
              {cell('Tarix', dateLabel(detail.date))}
              {cell('Vaxt', dateTimeLabel(detail.at))}
              {cell('Qeyd', detail.note)}
            </div>
          )}
        </Sheet>

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
