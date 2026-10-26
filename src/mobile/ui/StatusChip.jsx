import { IonChip, IonLabel } from '@ionic/react';
import { statusMeta } from '../lib/fmt.js';

export default function StatusChip({ status, code }) {
  const meta = code ? statusMeta(code) : statusMeta(status);
  return (
    <IonChip color={meta.color} outline className="status-chip">
      <IonLabel>{meta.label}</IonLabel>
    </IonChip>
  );
}
