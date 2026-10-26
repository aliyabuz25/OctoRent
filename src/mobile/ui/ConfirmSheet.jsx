import { IonButton, IonText } from '@ionic/react';
import Sheet from './Sheet.jsx';

export default function ConfirmSheet({
  isOpen,
  title = 'Təsdiqlə',
  message,
  confirmLabel = 'Bəli',
  cancelLabel = 'İmtina',
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}) {
  return (
    <Sheet
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      size="half"
      actions={
        <div className="confirm-actions">
          <IonButton expand="block" fill="outline" color="medium" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </IonButton>
          <IonButton
            expand="block"
            color={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Gözləyin…' : confirmLabel}
          </IonButton>
        </div>
      }
    >
      <IonText color="medium">
        <p className="confirm-message">{message}</p>
      </IonText>
    </Sheet>
  );
}
