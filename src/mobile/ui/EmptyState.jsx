import { IonButton } from '@ionic/react';
import BIcon from './BIcon.jsx';

export default function EmptyState({ title = 'Məlumat yoxdur', subtitle, actionLabel, onAction, tone = 'default' }) {
  return (
    <div className="empty-state">
      <div className={`empty-icon ${tone === 'warning' ? 'is-warning' : ''}`}>
        <BIcon name={tone === 'warning' ? 'AlertTriangle' : 'Inbox'} size={32} />
      </div>
      <div className="empty-title">{title}</div>
      {subtitle && <div className="empty-sub">{subtitle}</div>}
      {actionLabel && (
        <IonButton size="small" fill="outline" className="empty-btn" onClick={onAction}>
          {actionLabel}
        </IonButton>
      )}
    </div>
  );
}
