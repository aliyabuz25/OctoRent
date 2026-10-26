import { useMemo, useState } from 'react';
import { IonSearchbar, IonList, IonItem, IonLabel, IonChip } from '@ionic/react';
import Sheet from './Sheet.jsx';
import EmptyState from './EmptyState.jsx';
import { num, stockState, STOCK_STATE_COLOR, money } from '../lib/fmt.js';

export default function ItemPicker({ isOpen, title = 'Məhsul seç', items = [], onPick, onClose }) {
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return items;
    return items.filter((i) =>
      [i.name, i.sku, i.category, i.brand].some((v) => String(v || '').toLowerCase().includes(s))
    );
  }, [items, q]);

  return (
    <Sheet isOpen={isOpen} title={title} onClose={onClose} className="tall-sheet">
      <div className="sheet-search">
        <IonSearchbar
          value={q}
          onIonInput={(e) => setQ(e.detail.value || '')}
          placeholder="Məhsul / SKU axtar"
        />
      </div>
      {list.length === 0 ? (
        <EmptyState title="Məhsul tapılmadı" subtitle="Axtarış sözünü dəyişin" />
      ) : (
        <IonList>
          {list.map((it) => (
            <IonItem key={it.id} button onClick={() => onPick(it)}>
              <IonLabel>
                <h2>{it.name}</h2>
                <p>
                  SKU: {it.sku || '—'} • {it.category || '—'} • {money(it.price)}
                </p>
              </IonLabel>
              <IonChip color={STOCK_STATE_COLOR[stockState(it.quantity, it.minStock)]} slot="end">
                {num(it.quantity)}
              </IonChip>
            </IonItem>
          ))}
        </IonList>
      )}
    </Sheet>
  );
}
