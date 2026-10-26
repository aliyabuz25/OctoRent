import {
  IonContent, IonHeader, IonItem, IonLabel, IonList,
  IonPage, IonTitle, IonToolbar, IonListHeader, IonNote
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { usePerms } from '../lib/perms.js';
import FeatherIcon from '../../components/common/FeatherIcon.jsx';

// Single-tone clean catalog list
const DIRECTORIES = [
  { id: 'categories', label: 'Kateqoriyalar', note: 'Məhsul qrupları', icon: 'FolderTree' },
  { id: 'brands',     label: 'Markalar',       note: 'Marka siyahısı', icon: 'Tag' },
  { id: 'suppliers',  label: 'Təchizatçılar',  note: 'Tədarükçülər',   icon: 'Truck' },
  { id: 'customers',  label: 'Müştərilər',     note: 'Müştəri bazası', icon: 'Users' },
  { id: 'warehouses', label: 'Anbarlar',       note: 'Saxlama yerləri', icon: 'Warehouse' },
];

export default function MobileMore() {
  const perms = usePerms();
  const router = useIonRouter();
  const go = (path) => router.push(path);

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Daha çox</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="more-content">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Daha çox</IonTitle>
          </IonToolbar>
        </IonHeader>

        {perms.can('write') && (
          <IonList inset className="more-list">
            <IonListHeader>
              <IonLabel>Kataloqlar</IonLabel>
            </IonListHeader>
            {DIRECTORIES.map(({ id, label, note, icon }) => (
              <IonItem key={id} button detail onClick={() => go(`/mobile/directory/${id}`)}>
                <div slot="start" className="swift-tile">
                  <FeatherIcon name={icon} size={16} strokeWidth={2.2} />
                </div>
                <IonLabel>{label}</IonLabel>
                <IonNote slot="end">{note}</IonNote>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonList inset className="more-list">
          <IonListHeader>
            <IonLabel>Əməliyyatlar</IonLabel>
          </IonListHeader>
          {perms.can('documents') && (
            <IonItem button detail onClick={() => go('/mobile/cashflow')}>
              <div slot="start" className="swift-tile">
                <FeatherIcon name="Wallet" size={16} strokeWidth={2.2} />
              </div>
              <IonLabel>Kassa & Maliyyə</IonLabel>
              <IonNote slot="end">Gəlir / Xərc</IonNote>
            </IonItem>
          )}
          {perms.can('read') && (
            <IonItem button detail onClick={() => go('/mobile/maintenance')}>
              <div slot="start" className="swift-tile">
                <FeatherIcon name="Wrench" size={16} strokeWidth={2.2} />
              </div>
              <IonLabel>Servis & Təmir</IonLabel>
              <IonNote slot="end">Texniki baxış</IonNote>
            </IonItem>
          )}
          {perms.can('read') && (
            <IonItem button detail onClick={() => go('/mobile/reports')}>
              <div slot="start" className="swift-tile">
                <FeatherIcon name="BarChart3" size={16} strokeWidth={2.2} />
              </div>
              <IonLabel>Hesabatlar</IonLabel>
              <IonNote slot="end">Statistika</IonNote>
            </IonItem>
          )}
          {perms.can('employees') && (
            <IonItem button detail onClick={() => go('/mobile/employees')}>
              <div slot="start" className="swift-tile">
                <FeatherIcon name="UserCheck" size={16} strokeWidth={2.2} />
              </div>
              <IonLabel>İstifadəçilər</IonLabel>
              <IonNote slot="end">Komanda</IonNote>
            </IonItem>
          )}
          {perms.can('employees') && (
            <IonItem button detail onClick={() => go('/mobile/audit')}>
              <div slot="start" className="swift-tile">
                <FeatherIcon name="Clock" size={16} strokeWidth={2.2} />
              </div>
              <IonLabel>Audit Loqu</IonLabel>
              <IonNote slot="end">Tarixçə</IonNote>
            </IonItem>
          )}
          {perms.realRole === 'superadmin' && !perms.actAs && (
            <IonItem button detail onClick={() => go('/mobile/tenants')}>
              <div slot="start" className="swift-tile">
                <FeatherIcon name="Building2" size={16} strokeWidth={2.2} />
              </div>
              <IonLabel>Müəssisələr</IonLabel>
              <IonNote slot="end">Platform</IonNote>
            </IonItem>
          )}
        </IonList>

        <IonList inset className="more-list">
          <IonListHeader>
            <IonLabel>Sistem & Hesab</IonLabel>
          </IonListHeader>
          <IonItem button detail onClick={() => go('/mobile/settings')}>
            <div slot="start" className="swift-tile">
              <FeatherIcon name="Settings" size={16} strokeWidth={2.2} />
            </div>
            <IonLabel>Ayarlar & Profil</IonLabel>
            <IonNote slot="end">Tənzimləmələr</IonNote>
          </IonItem>
          <IonItem button detail onClick={() => { window.location.href = '/'; }}>
            <div slot="start" className="swift-tile">
              <FeatherIcon name="Monitor" size={16} strokeWidth={2.2} />
            </div>
            <IonLabel>Masaüstü Rejimi</IonLabel>
            <IonNote slot="end">Kompüter UI</IonNote>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}
