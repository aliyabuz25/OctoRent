import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonFab,
  IonFabButton,
  IonButton
} from '@ionic/react';
import BIcon from '../ui/BIcon.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../lib/useToast.js';
import { usePerms } from '../lib/perms.js';
import { dateTimeLabel } from '../lib/fmt.js';
import Sheet from '../ui/Sheet.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import FormField from '../ui/FormField.jsx';

export default function MobileTenants() {
  const { toast, show, showError, close } = useToast();
  const perms = usePerms();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setTenants(await api.listTenants());
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const doRefresh = async (e) => {
    await load();
    e.detail.complete();
  };

  const list = useMemo(
    () => [...tenants].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))),
    [tenants]
  );

  const openNew = () => setEditor({ tenantName: '', name: '', username: '', password: '' });
  const setField = (k) => (v) => setEditor((e) => ({ ...e, [k]: v }));

  const save = async () => {
    const p = editor;
    if (!String(p.tenantName || '').trim() || !String(p.username || '').trim() || String(p.password || '').length < 4) {
      show('Müəssisə adı, istifadəçi adı və şifrə (ən az 4 simvol) mütləqdir', 'warning');
      return;
    }
    setBusy(true);
    try {
      await api.createTenant({
        tenantName: String(p.tenantName).trim(),
        name: String(p.name).trim() || 'Admin',
        username: String(p.username).trim().toLowerCase(),
        password: String(p.password).trim()
      });
      setEditor(null);
      show('Müəssisə yaradıldı', 'success');
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const enter = (t) => {
    perms.switchTenant({ id: t.id, name: t.name });
    show(`"${t.name}" kontekstinə daxil olundu`, 'success');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Müəssisələr</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="count-line">{list.length} müəssisə</div>

        {list.length === 0 ? (
          <EmptyState
            title={loading ? 'Yüklənir…' : 'Müəssisə yoxdur'}
            subtitle="Yeni müəssisə yaradın"
            actionLabel="Yeni müəssisə"
            onAction={openNew}
          />
        ) : (
          <div className="page-pad">
            <IonList className="m-list">
              {list.map((t) => (
                <IonItem key={t.id}>
                  <IonLabel>
                    <h2>{t.name}</h2>
                    <p>
                      İstifadəçi: {t.userCount || 0} • Adminlər: {(t.admins || []).join(', ') || '—'}
                    </p>
                    <p>{dateTimeLabel(t.createdAt)}</p>
                  </IonLabel>
                  <IonButton slot="end" fill="outline" onClick={() => enter(t)}>
                    <BIcon name="box-arrow-in-right" slot="start" />
                    İdarə et
                  </IonButton>
                </IonItem>
              ))}
            </IonList>
          </div>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openNew}>
            <BIcon name="plus-lg" />
          </IonFabButton>
        </IonFab>

        <Sheet
          isOpen={!!editor}
          title="Yeni müəssisə"
          onClose={() => setEditor(null)}
          size="tall"
          actions={
            <>
              <IonButton className="btn-grow" fill="outline" color="medium" onClick={() => setEditor(null)} disabled={busy}>
                İmtina
              </IonButton>
              <IonButton className="btn-grow" onClick={save} disabled={busy}>
                {busy ? 'Gözləyin…' : 'Yarat'}
              </IonButton>
            </>
          }
        >
          {editor && (
            <div className="form-list">
              <FormField label="Müəssisə adı" value={editor.tenantName} required onInput={setField('tenantName')} placeholder="Məs. OctoRent Mərkəz" />
              <FormField label="Admin adı Soyadı" value={editor.name} onInput={setField('name')} />
              <FormField label="Admin istifadəçi adı" value={editor.username} required onInput={setField('username')} />
              <FormField label="Admin şifrəsi" type="password" value={editor.password} required onInput={setField('password')} />
            </div>
          )}
        </Sheet>

        <IonToast
          isOpen={toast.isOpen}
          message={toast.message}
          color={toast.color}
          duration={2200}
          position="top"
          onDidDismiss={close}
        />
      </IonContent>
    </IonPage>
  );
}
