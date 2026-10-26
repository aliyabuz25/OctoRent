import { IonCard, IonCardHeader, IonCardContent, IonCardSubtitle } from '@ionic/react';
import FeatherIcon from '../../components/common/FeatherIcon.jsx';

export default function StatCard({ label, value, sub, color = 'primary', icon, onClick }) {
  return (
    <IonCard className={`stat-card ${onClick ? 'is-tappable' : ''}`} onClick={onClick} button={!!onClick}>
      <IonCardHeader className="stat-head" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IonCardSubtitle className="stat-label">{label}</IonCardSubtitle>
        {icon && (
          <div className={`stat-card-badge tone-${color}`}>
            <FeatherIcon name={icon} size={15} strokeWidth={2.2} />
          </div>
        )}
      </IonCardHeader>
      <IonCardContent className={`stat-value tone-${color}`}>{value}</IonCardContent>
      {sub && <div className="stat-sub">{sub}</div>}
    </IonCard>
  );
}
