import React, { useCallback, useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonNote, IonListHeader,
  IonButton, IonToast, IonChip
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { usePerms } from '../lib/perms.js';
import { api } from '../lib/api.js';
import { useToast } from '../lib/useToast.js';
import ConfirmSheet from '../ui/ConfirmSheet.jsx';
import { requestNotificationPermission, showSystemNotification } from '../lib/notifications.js';
import FeatherIcon from '../../components/common/FeatherIcon.jsx';

export default function MobileSettings() {
  const perms  = usePerms();
  const router = useIonRouter();
  const { toast, show, close } = useToast();
  const [tenant, setTenant]           = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [notifPerm, setNotifPerm] = useState(() => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'));

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPerm(res);
    if (res === 'granted') {
      show('Bildirişlər aktivləşdirildi!', 'success');
      showSystemNotification('OctoRent Bildirişləri Aktivdir', {
        body: 'Artıq stok və icarə dəyişiklikləri zamanı anında bildiriş alacaqsınız.',
      });
    } else {
      show('Bildiriş icazəsi verilmədi.', 'warning');
    }
  };

  const handleTestNotification = async () => {
    if (notifPerm !== 'granted') {
      const res = await requestNotificationPermission();
      setNotifPerm(res);
      if (res !== 'granted') {
        show('Zəhmət olmasa əvvəlcə bildirişlərə icazə verin', 'warning');
        return;
      }
    }
    try {
      await api.testNotification();
      show('Serverdən real-time sınaq bildirişi göndərildi!', 'success');
    } catch {
      showSystemNotification('OctoRent Sınaq Bildirişi', {
        body: 'OR-001 (Sony FX3 Kamera): Stok dəyişdi. Cari qalıq: 12 ədəd.',
        url: '/mobile/stock',
        tag: 'test-ping',
      });
      show('Sınaq bildirişi göndərildi!', 'success');
    }
  };

  const load = useCallback(async () => {
    if (!perms.actAs) {
      api.getTenant().then((res) => setTenant(res?.tenant || null)).catch(() => null);
    } else {
      setTenant(perms.actAs);
    }
  }, [perms.actAs]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    setConfirmLogout(false);
    try {
      await perms.logout();
    } catch (e) {
      show(e.message || 'Xəta baş verdi', 'danger');
    }
  };

  const exitTenant = () => {
    perms.clearTenant();
    show('Platformaya qayıdıldı', 'success');
  };

  const initial = (perms.user?.name || perms.user?.username || 'U').charAt(0).toUpperCase();

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Ayarlar</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="settings-content">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Ayarlar</IonTitle>
          </IonToolbar>
        </IonHeader>

        {/* Profile card */}
        <div className="settings-profile">
          <div className="settings-avatar">{initial}</div>
          <div className="settings-profile-info">
            <div className="settings-profile-name">{perms.user?.name || perms.user?.username}</div>
            <div className="settings-profile-role">{perms.roleLabel}</div>
            {perms.actAs && <div className="settings-profile-ctx">{perms.actAs.name}</div>}
          </div>
        </div>

        {/* Account info */}
        <IonList inset className="settings-list">
          <IonListHeader><IonLabel>Hesab</IonLabel></IonListHeader>
          <IonItem>
            <IonLabel>İstifadəçi adı</IonLabel>
            <IonNote slot="end">{perms.user?.username}</IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>Rol</IonLabel>
            <IonNote slot="end">{perms.roleLabel}</IonNote>
          </IonItem>
          {tenant && (
            <IonItem>
              <IonLabel>Müəssisə</IonLabel>
              <IonNote slot="end">{tenant.name}</IonNote>
            </IonItem>
          )}
        </IonList>

        {/* Navigation shortcuts */}
        {(perms.can('read') || perms.can('employees')) && (
          <IonList inset className="settings-list">
            <IonListHeader><IonLabel>Keçidlər</IonLabel></IonListHeader>
            {perms.can('read') && (
              <IonItem button detail onClick={() => router.push('/mobile/reports')}>
                <div slot="start" className="swift-tile">
                  <FeatherIcon name="BarChart3" size={16} strokeWidth={2.2} />
                </div>
                <IonLabel>Hesabatlar</IonLabel>
              </IonItem>
            )}
            {perms.can('employees') && (
              <IonItem button detail onClick={() => router.push('/mobile/employees')}>
                <div slot="start" className="swift-tile">
                  <FeatherIcon name="UserCheck" size={16} strokeWidth={2.2} />
                </div>
                <IonLabel>İstifadəçilər</IonLabel>
              </IonItem>
            )}
            {perms.can('employees') && (
              <IonItem button detail onClick={() => router.push('/mobile/audit')}>
                <div slot="start" className="swift-tile">
                  <FeatherIcon name="Clock" size={16} strokeWidth={2.2} />
                </div>
                <IonLabel>Audit Loqu</IonLabel>
              </IonItem>
            )}
          </IonList>
        )}

        {/* Push Notifications Section */}
        <IonList inset className="settings-list">
          <IonListHeader><IonLabel>Bildirişlər (PWA & Android)</IonLabel></IonListHeader>
          <IonItem>
            <div slot="start" className="swift-tile">
              <FeatherIcon name="Bell" size={16} strokeWidth={2.2} />
            </div>
            <IonLabel>
              <h3>Məhsul & İcarə Bildirişləri</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>
                Stok dəyişdikdə və ya yeni məhsul əlavə edildikdə bildiriş al
              </p>
            </IonLabel>
            <IonChip color={notifPerm === 'granted' ? 'success' : 'medium'} slot="end">
              {notifPerm === 'granted' ? 'Aktivdir' : 'Deaktiv'}
            </IonChip>
          </IonItem>
          {notifPerm !== 'granted' && (
            <IonItem button onClick={handleEnableNotifications}>
              <IonLabel color="primary">Bildirişlərə İcazə Ver</IonLabel>
            </IonItem>
          )}
          <IonItem button onClick={handleTestNotification}>
            <IonLabel color="primary">Sınaq Bildirişi Göndər (Test)</IonLabel>
          </IonItem>
        </IonList>

        {/* Actions */}
        <IonList inset className="settings-list">
          <IonListHeader><IonLabel>Əməliyyatlar</IonLabel></IonListHeader>
          <IonItem button detail onClick={() => { window.location.href = '/'; }}>
            <div slot="start" className="swift-tile">
              <FeatherIcon name="Monitor" size={16} strokeWidth={2.2} />
            </div>
            <IonLabel color="primary">Masaüstü Rejimi (Desktop UI)</IonLabel>
            <IonNote slot="end">Kompüter görünüşü</IonNote>
          </IonItem>
          {perms.actAs && (
            <IonItem button onClick={exitTenant}>
              <IonLabel color="primary">Müəssisə seçiminə qayıt</IonLabel>
            </IonItem>
          )}
          <IonItem button onClick={() => setConfirmLogout(true)}>
            <div slot="start" className="swift-tile is-danger">
              <FeatherIcon name="LogOut" size={16} strokeWidth={2.2} />
            </div>
            <IonLabel color="danger">Hesabdan çıx</IonLabel>
          </IonItem>
        </IonList>

        <ConfirmSheet
          isOpen={confirmLogout}
          title="Hesabdan çıxış"
          message="Hesabdan çıxmaq istəyirsinizmi?"
          confirmLabel="Çıxış et"
          destructive
          onConfirm={handleLogout}
          onClose={() => setConfirmLogout(false)}
        />

        <IonToast
          isOpen={toast.isOpen}
          message={toast.message}
          color={toast.color}
          duration={2000}
          position="top"
          onDidDismiss={close}
        />
      </IonContent>
    </IonPage>
  );
}
