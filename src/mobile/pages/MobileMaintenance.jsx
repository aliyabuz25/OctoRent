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
  IonFab,
  IonFabButton,
  IonButton,
  IonToast,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { api } from '../lib/api.js';
import { useToast } from '../lib/useToast.js';
import { num, money, dateLabel, todayStr } from '../lib/fmt.js';
import Sheet from '../ui/Sheet.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import FormField from '../ui/FormField.jsx';
import BIcon from '../ui/BIcon.jsx';

const FILTERS = [
  { id: 'all', label: 'Hamısı' },
  { id: 'in_service', label: 'Təmirdə' },
  { id: 'repaired', label: 'Təmir Edildi' },
  { id: 'pending', label: 'Gözləyir' },
];

export default function MobileMaintenance() {
  const { toast, show, showError, close } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    itemName: '',
    sku: '',
    serialNumber: '',
    issue: '',
    status: 'in_service',
    cost: '',
    technician: '',
    note: '',
    startDate: todayStr(),
  });

  const load = useCallback(async () => {
    try {
      const data = await api.listMaintenance();
      setList(Array.isArray(data) ? data : []);
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
    return list
      .filter((m) => {
        if (filter !== 'all' && m.status !== filter) return false;
        if (!q) return true;
        return [m.itemName, m.sku, m.serialNumber, m.issue, m.technician].some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(b.startDate || b.createdAt || '').localeCompare(String(a.startDate || a.createdAt || '')));
  }, [list, search, filter]);

  const handleSave = async () => {
    if (!form.itemName && !form.sku) {
      show('Məhsul adı və ya SKU daxil edin', 'warning');
      return;
    }
    try {
      await api.createMaintenance({
        ...form,
        cost: Number(form.cost) || 0,
      });
      show('Servis qeydi yaradıldı', 'success');
      setShowCreate(false);
      setForm({
        itemName: '',
        sku: '',
        serialNumber: '',
        issue: '',
        status: 'in_service',
        cost: '',
        technician: '',
        note: '',
        startDate: todayStr(),
      });
      load();
    } catch (e) {
      showError(e);
    }
  };

  const doRefresh = async (e) => {
    await load();
    e.detail.complete();
  };

  const statusMeta = (st) => {
    if (st === 'repaired') return { label: 'Təmir Edildi', color: 'success' };
    if (st === 'scrapped') return { label: 'İstismardan Çıxarıldı', color: 'danger' };
    if (st === 'pending') return { label: 'Gözləyir', color: 'tertiary' };
    return { label: 'Təmirdə', color: 'warning' };
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/mobile/more" />
          </IonButtons>
          <IonTitle>Servis & Təmir</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={search}
            onIonInput={(e) => setSearch(e.detail.value || '')}
            placeholder="Avadanlıq, seriya no və ya usta..."
          />
        </IonToolbar>
        <div className="filter-chips" style={{ padding: '4px 12px 8px' }}>
          {FILTERS.map((f) => (
            <IonChip
              key={f.id}
              color={filter === f.id ? 'primary' : 'medium'}
              outline={filter !== f.id}
              onClick={() => setFilter(f.id)}
            >
              <IonLabel>{f.label}</IonLabel>
            </IonChip>
          ))}
        </div>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {visible.length === 0 && !loading ? (
          <EmptyState
            icon="construct-outline"
            title="Servis qeydi yoxdur"
            subtitle="Texniki baxış və ya təmir qeydi yaratmaq üçün + düyməsinə klikləyin"
          />
        ) : (
          <IonList inset>
            {visible.map((item) => {
              const meta = statusMeta(item.status);
              return (
                <IonItem key={item.id} button onClick={() => setDetail(item)} detail>
                  <div
                    slot="start"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: '#f1f5f9',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    <BIcon name="bi-tools" />
                  </div>
                  <IonLabel>
                    <h2>{item.itemName || item.sku || 'Avadanlıq'}</h2>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>
                      {item.serialNumber ? `SN: ${item.serialNumber} · ` : ''}
                      {item.technician ? `Usta: ${item.technician}` : 'Usta təyin edilməyib'}
                    </p>
                  </IonLabel>
                  <div slot="end" style={{ textAlign: 'right' }}>
                    <IonChip color={meta.color} style={{ fontSize: '11px', height: '24px' }}>
                      {meta.label}
                    </IonChip>
                    {Number(item.cost) > 0 && (
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                        {money(item.cost)}
                      </div>
                    )}
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowCreate(true)}>
            <BIcon name="Plus" size={24} />
          </IonFabButton>
        </IonFab>

        {/* Detail Sheet */}
        <Sheet isOpen={Boolean(detail)} onClose={() => setDetail(null)} title="Texniki Servis Detalları">
          {detail && (
            <div style={{ padding: '8px 16px 24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {detail.itemName || detail.sku || 'Avadanlıq'}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <IonChip color={statusMeta(detail.status).color}>
                    {statusMeta(detail.status).label}
                  </IonChip>
                  {Number(detail.cost) > 0 && (
                    <span style={{ fontWeight: 700, color: '#1e40af' }}>{money(detail.cost)}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>SKU</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{detail.sku || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Seriya Nömrəsi</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{detail.serialNumber || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Usta / Texnik</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{detail.technician || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Giriş Tarixi</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>
                    {dateLabel(detail.startDate || detail.createdAt)}
                  </div>
                </div>
              </div>

              {detail.issue && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Nasazlıq / Problem</div>
                  <div style={{ marginTop: '4px', color: '#334155', fontSize: '13px' }}>
                    {detail.issue}
                  </div>
                </div>
              )}

              {detail.note && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Əlavə Qeyd</div>
                  <div style={{ marginTop: '4px', color: '#334155', fontSize: '13px' }}>
                    {detail.note}
                  </div>
                </div>
              )}
            </div>
          )}
        </Sheet>

        {/* Create Sheet */}
        <Sheet
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="Yeni Servis / Təmir Qeydi"
        >
          <div style={{ padding: '8px 16px 32px' }}>
            <FormField label="Məhsul / Avadanlıq Adı *">
              <input
                type="text"
                placeholder="Məs: HP LaserJet Pro M404n"
                value={form.itemName}
                onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </FormField>

            <FormField label="SKU / Kod">
              <input
                type="text"
                placeholder="Məs: RS-001"
                value={form.sku}
                onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </FormField>

            <FormField label="Seriya Nömrəsi (SN)">
              <input
                type="text"
                placeholder="Məs: VNC3K92110"
                value={form.serialNumber}
                onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </FormField>

            <FormField label="Nasazlıq Təsviri">
              <textarea
                rows={2}
                placeholder="Problemi qeyd edin..."
                value={form.issue}
                onChange={(e) => setForm((p) => ({ ...p, issue: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </FormField>

            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="in_service">Təmirdə</option>
                <option value="repaired">Təmir Edildi</option>
                <option value="pending">Gözləyir</option>
                <option value="scrapped">İstismardan Çıxarıldı</option>
              </select>
            </FormField>

            <FormField label="Təmir Xərci (₺)">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.cost}
                onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </FormField>

            <FormField label="Usta / Məsul Texnik">
              <input
                type="text"
                placeholder="Ustanın adı"
                value={form.technician}
                onChange={(e) => setForm((p) => ({ ...p, technician: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </FormField>

            <IonButton expand="block" onClick={handleSave} style={{ marginTop: '16px' }}>
              Qeydiyyata Al
            </IonButton>
          </div>
        </Sheet>

        <IonToast
          isOpen={toast.isOpen}
          message={toast.message}
          color={toast.color}
          duration={2000}
          onDidDismiss={close}
        />
      </IonContent>
    </IonPage>
  );
}
