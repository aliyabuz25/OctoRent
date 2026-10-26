import { useEffect, useState } from 'react';
import { IonButton, IonInput, IonItem, IonLabel, IonSegment, IonSegmentButton } from '@ionic/react';
import Sheet from './Sheet.jsx';
import { num, stockState, STOCK_STATE_COLOR, STOCK_STATE_LABEL } from '../lib/fmt.js';

export default function StockSheet({ isOpen, item, initialMode = 'in', onClose, onSubmit }) {
  const [mode, setMode] = useState('in');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setQty(1);
      setNote('');
      setBusy(false);
    }
  }, [isOpen, item?.id, initialMode]);

  const current = num(item?.quantity);
  const amount = num(qty);
  const after = mode === 'in' ? current + amount : Math.max(0, current - amount);

  const submit = async () => {
    if (amount <= 0) return;
    setBusy(true);
    try {
      await onSubmit({ mode, qty: amount, note: note.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      title={mode === 'in' ? 'Stok girişi' : 'Stok çıxışı'}
      onClose={onClose}
      size="tall"
      actions={
        <>
          <IonButton className="btn-grow" fill="outline" color="medium" onClick={onClose} disabled={busy}>
            İmtina
          </IonButton>
          <IonButton
            className="btn-grow"
            color={mode === 'in' ? 'success' : 'danger'}
            onClick={submit}
            disabled={busy || amount <= 0}
          >
            {busy ? 'Gözləyin…' : mode === 'in' ? 'Mədaxil et' : 'Məxaric et'}
          </IonButton>
        </>
      }
    >
      <div className="sheet-hero">
        <div>
          <h2>{item?.name || '—'}</h2>
          <p>SKU: {item?.sku || '—'}</p>
        </div>
        <div className={`qty-badge tone-${STOCK_STATE_COLOR[stockState(current, item?.minStock)]}`}>
          {current}
        </div>
      </div>

      <IonSegment value={mode} onIonChange={(e) => setMode(e.detail.value)} className="kind-seg" style={{ padding: 0 }}>
        <IonSegmentButton value="in">Giriş</IonSegmentButton>
        <IonSegmentButton value="out">Çıxış</IonSegmentButton>
      </IonSegment>

      <IonItem lines="full">
        <IonLabel position="stacked">Miqdar</IonLabel>
        <IonInput
          type="number"
          value={String(qty)}
          onIonInput={(e) => setQty(Number(e.detail.value || 0))}
          inputMode="numeric"
        />
      </IonItem>

      <div className="filter-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
        {[1, 5, 10, 25].map((n) => (
          <IonButton key={n} size="small" fill="outline" onClick={() => setQty(n)} style={{ margin: 0 }}>
            {n}
          </IonButton>
        ))}
      </div>

      <IonItem lines="full">
        <IonLabel position="stacked">Qeyd</IonLabel>
        <IonInput
          value={note}
          placeholder="Məs: mal qəbulu, satış"
          onIonInput={(e) => setNote(e.detail.value || '')}
        />
      </IonItem>

      <div className="form-total">
        <span>Cari vəziyyət: {STOCK_STATE_LABEL[stockState(current, item?.minStock)]}</span>
        <span>
          {current} → {after}
        </span>
      </div>
    </Sheet>
  );
}
