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
  { id: 'income', label: 'Mədaxil (+)' },
  { id: 'expense', label: 'Məxaric (-)' },
];

export default function MobileCashflow() {
  const { toast, show, showError, close } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    type: 'income',
    category: 'Kirayə Ödənişi',
    amount: '',
    paymentMethod: 'Nağd',
    party: '',
    description: '',
    date: todayStr(),
  });

  const load = useCallback(async () => {
    try {
      const data = await api.listCashflow();
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

  const stats = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const item of list) {
      const amt = num(item.amount);
      if (item.type === 'expense') exp += amt;
      else inc += amt;
    }
    return { inc, exp, balance: inc - exp };
  }, [list]);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return list
      .filter((m) => {
        if (filter !== 'all' && m.type !== filter) return false;
        if (!q) return true;
        return [m.category, m.party, m.description, m.paymentMethod].some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
  }, [list, search, filter]);

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      show('Məbləğ daxil edin', 'warning');
      return;
    }
    try {
      await api.createCashflow({
        ...form,
        amount: Number(form.amount),
      });
      show('Kassa hərəkəti qeydə alındı', 'success');
      setShowCreate(false);
      setForm({
        type: 'income',
        category: 'Kirayə Ödənişi',
        amount: '',
        paymentMethod: 'Nağd',
        party: '',
        description: '',
        date: todayStr(),
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

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/mobile/more" />
          </IonButtons>
          <IonTitle>Kassa & Maliyyə</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={search}
            onIonInput={(e) => setSearch(e.detail.value || '')}
            placeholder="Kateqoriya və ya şəxs axtar..."
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

      <IonContent fullscreen className="cashflow-content">
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* Quick Balance Banner */}
        <div
          style={{
            margin: '12px 16px',
            padding: '14px',
            background: stats.balance >= 0 ? '#eff6ff' : '#fef2f2',
            border: `1px solid ${stats.balance >= 0 ? '#bfdbfe' : '#fecaca'}`,
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Kassa Qalığı (Balans)
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: stats.balance >= 0 ? '#1e40af' : '#b91c1c',
                marginTop: '2px',
              }}
            >
              {money(stats.balance)}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px' }}>
            <div style={{ color: '#16a34a', fontWeight: 600 }}>+{money(stats.inc)}</div>
            <div style={{ color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>-{money(stats.exp)}</div>
          </div>
        </div>

        {visible.length === 0 && !loading ? (
          <EmptyState
            icon="wallet-outline"
            title="Kassa hərəkəti yoxdur"
            subtitle="Yeni mədaxil və ya məxaric əlavə etmək üçün + düyməsinə klikləyin"
          />
        ) : (
          <IonList inset>
            {visible.map((item) => {
              const isExp = item.type === 'expense';
              return (
                <IonItem key={item.id} button onClick={() => setDetail(item)} detail>
                  <div
                    slot="start"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: isExp ? '#fee2e2' : '#dcfce7',
                      color: isExp ? '#991b1b' : '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    <BIcon name={isExp ? 'bi-arrow-up-right' : 'bi-arrow-down-left'} />
                  </div>
                  <IonLabel>
                    <h2>{item.category || (isExp ? 'Xərc' : 'Gəlir')}</h2>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>
                      {item.party ? `${item.party} · ` : ''}
                      {item.paymentMethod || 'Nağd'}
                    </p>
                  </IonLabel>
                  <div slot="end" style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isExp ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {isExp ? '-' : '+'}
                      {money(item.amount)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {dateLabel(item.date || item.createdAt)}
                    </div>
                  </div>
                </IonItem>
              );
            })}
          </IonList>
        )}

        {/* Floating Action Button for New Transaction */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowCreate(true)}>
            <BIcon name="Plus" size={24} />
          </IonFabButton>
        </IonFab>

        {/* Transaction Detail Sheet */}
        <Sheet isOpen={Boolean(detail)} onClose={() => setDetail(null)} title="Əməliyyat Məlumatı">
          {detail && (
            <div style={{ padding: '8px 16px 24px' }}>
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px 0',
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '12px', color: '#64748b' }}>Məbləğ</div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: detail.type === 'expense' ? '#dc2626' : '#16a34a',
                    marginTop: '4px',
                  }}
                >
                  {detail.type === 'expense' ? '-' : '+'}
                  {money(detail.amount)}
                </div>
                <IonChip
                  color={detail.type === 'expense' ? 'danger' : 'success'}
                  style={{ marginTop: '8px' }}
                >
                  {detail.type === 'expense' ? 'Məxaric (Xərc)' : 'Mədaxil (Gəlir)'}
                </IonChip>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Kateqoriya</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{detail.category || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Ödəniş Metodu</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{detail.paymentMethod || 'Nağd'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Tərəf (Şəxs/Müştəri)</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{detail.party || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Tarix</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>
                    {dateLabel(detail.date || detail.createdAt)}
                  </div>
                </div>
              </div>

              {detail.description && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Açıqlama</div>
                  <div style={{ marginTop: '4px', color: '#334155', fontSize: '13px' }}>
                    {detail.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </Sheet>

        {/* Create Transaction Sheet */}
        <Sheet
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="Yeni Kassa Əməliyyatı"
        >
          <div style={{ padding: '8px 16px 32px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: form.type === 'income' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: form.type === 'income' ? '#dcfce7' : '#ffffff',
                  color: form.type === 'income' ? '#166534' : '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => setForm((p) => ({ ...p, type: 'income' }))}
              >
                + Mədaxil (Gəlir)
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: form.type === 'expense' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                  background: form.type === 'expense' ? '#fee2e2' : '#ffffff',
                  color: form.type === 'expense' ? '#991b1b' : '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => setForm((p) => ({ ...p, type: 'expense' }))}
              >
                - Məxaric (Xərc)
              </button>
            </div>

            <FormField label="Məbləğ (₺) *">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '16px',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </FormField>

            <FormField label="Kateqoriya">
              <input
                type="text"
                placeholder="Məs: Kirayə, Satış, Kommunal, Əməkhaqqı"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
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

            <FormField label="Ödəniş Metodu">
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Nağd">Nağd</option>
                <option value="Bank Kartı">Bank Kartı (POS)</option>
                <option value="Bank Köçürməsi">Bank Köçürməsi</option>
              </select>
            </FormField>

            <FormField label="Tərəf (Müştəri / Şəxs)">
              <input
                type="text"
                placeholder="Ad və ya şirkət"
                value={form.party}
                onChange={(e) => setForm((p) => ({ ...p, party: e.target.value }))}
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

            <FormField label="Açıqlama">
              <textarea
                rows={2}
                placeholder="Əlavə qeydlər..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
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
              Yadda Saxla
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
