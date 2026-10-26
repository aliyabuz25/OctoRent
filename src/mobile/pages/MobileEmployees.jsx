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
  IonChip,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonFab,
  IonFabButton,
  IonBackButton,
  IonButtons,
  IonSearchbar
} from '@ionic/react';
import BIcon from '../ui/BIcon.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../lib/useToast.js';
import { usePerms } from '../lib/perms.js';
import { dateTimeLabel } from '../lib/fmt.js';
import Sheet from '../ui/Sheet.jsx';
import ConfirmSheet from '../ui/ConfirmSheet.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import FormField from '../ui/FormField.jsx';
import { ROLE_LABELS } from '../../context/AuthContext.jsx';

const ROLE_OPTIONS = [
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'manager', label: ROLE_LABELS.manager },
  { value: 'worker', label: ROLE_LABELS.worker }
];

export default function MobileEmployees() {
  const { toast, show, showError, close } = useToast();
  const perms = usePerms();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editor, setEditor] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users
      .filter((u) => {
        if (!q) return true;
        return [u.name, u.username, ROLE_LABELS[u.role]].some((v) => String(v || '').toLowerCase().includes(q));
      })
      .sort((a, b) => String(a.username).localeCompare(String(b.username)));
  }, [users, search]);

  const doRefresh = async (e) => {
    await load();
    e.detail.complete();
  };

  const openNew = () => setEditor({ mode: 'create', name: '', username: '', password: '', role: 'worker', active: true });
  const setField = (k) => (v) => setEditor((e) => ({ ...e, [k]: v }));
  const setBool = (k, v) => setEditor((e) => ({ ...e, [k]: v }));

  const save = async () => {
    const p = editor;
    if (!String(p.name || '').trim() || !String(p.username || '').trim()) {
      show('Ad və istifadəçi adı mütləqdir', 'warning');
      return;
    }
    if (p.mode === 'create' && String(p.password || '').trim().length < 4) {
      show('Şifrə ən az 4 simvol olmalıdır', 'warning');
      return;
    }
    setBusy(true);
    try {
      if (p.mode === 'edit') {
        const payload = { name: String(p.name).trim(), role: p.role, active: !!p.active };
        if (String(p.password || '').trim()) payload.password = String(p.password).trim();
        await api.updateUser(p.id, payload);
        show('İstifadəçi yeniləndi', 'success');
      } else {
        await api.createUser({
          name: String(p.name).trim(),
          username: String(p.username).trim().toLowerCase(),
          password: String(p.password).trim(),
          role: p.role,
          active: !!p.active
        });
        show('İstifadəçi yaradıldı', 'success');
      }
      setEditor(null);
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteUser(toDelete.id);
      setToDelete(null);
      show('İstifadəçi silindi', 'success');
      load();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/mobile/settings" text="Geri" />
          </IonButtons>
          <IonTitle>İstifadəçilər</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={search}
            onIonInput={(e) => setSearch(e.detail.value || '')}
            placeholder="Ad / istifadəçi adı / rol"
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="count-line">{visible.length} istifadəçi</div>

        {visible.length === 0 ? (
          <EmptyState
            title={loading ? 'Yüklənir…' : 'İstifadəçi yoxdur'}
            subtitle="Yeni işçi əlavə edin"
            actionLabel={perms.can('employees') ? 'Əlavə et' : undefined}
            onAction={openNew}
          />
        ) : (
          <div className="page-pad">
            <IonList className="m-list">
              {visible.map((u) => (
                <IonItem
                  key={u.id}
                  button
                  onClick={() => {
                    if (!perms.can('employees')) return;
                    setEditor({ mode: 'edit', id: u.id, name: u.name, username: u.username, password: '', role: u.role, active: u.active });
                  }}
                >
                  <IonLabel>
                    <h2>{u.name}</h2>
                    <p>
                      İstifadəçi: {u.username} • {dateTimeLabel(u.createdAt)}
                    </p>
                  </IonLabel>
                  <div slot="end" style={{ textAlign: 'right' }}>
                    <IonChip color={u.active ? 'success' : 'danger'} outline>
                      {u.active ? 'Aktiv' : 'Deaktiv'}
                    </IonChip>
                    <div style={{ fontSize: 11, color: '#66708a' }}>{ROLE_LABELS[u.role]}</div>
                  </div>
                </IonItem>
              ))}
            </IonList>
          </div>
        )}

        {perms.can('employees') && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={openNew}>
              <BIcon name="plus-lg" />
            </IonFabButton>
          </IonFab>
        )}

        <Sheet
          isOpen={!!editor}
          title={editor?.mode === 'edit' ? 'İstifadəçini redaktə et' : 'Yeni istifadəçi'}
          onClose={() => setEditor(null)}
          size="tall"
          actions={
            <>
              <IonButton className="btn-grow" fill="outline" color="medium" onClick={() => setEditor(null)} disabled={busy}>
                İmtina
              </IonButton>
              <IonButton className="btn-grow" onClick={save} disabled={busy}>
                {busy ? 'Gözləyin…' : 'Yadda saxla'}
              </IonButton>
            </>
          }
        >
          {editor && (
            <div className="form-list">
              <FormField label="Ad Soyad" value={editor.name} required onInput={setField('name')} />
              <FormField
                label="İstifadəçi adı"
                value={editor.username}
                required
                disabled={editor.mode === 'edit'}
                onInput={setField('username')}
              />
              <FormField
                label={editor.mode === 'edit' ? 'Şifrə (dəyişmək üçün daxil edin)' : 'Şifrə'}
                value={editor.password}
                type="password"
                required={editor.mode === 'create'}
                onInput={setField('password')}
              />
              <FormField label="Rol" value={editor.role} options={ROLE_OPTIONS} onInput={setField('role')} />
              <IonItem lines="full">
                <IonLabel>Aktiv hesab</IonLabel>
                <IonChip
                  color={editor.active ? 'success' : 'danger'}
                  outline={!editor.active}
                  onClick={() => setBool('active', !editor.active)}
                >
                  {editor.active ? 'Aktiv' : 'Deaktiv'}
                </IonChip>
              </IonItem>
            </div>
          )}
        </Sheet>

        {perms.can('employees') && (
          <ConfirmSheet
            isOpen={!!toDelete}
            title="İstifadəçini sil"
            message={`"${toDelete?.name}" silinsinmi?`}
            confirmLabel="Sil"
            destructive
            busy={busy}
            onConfirm={remove}
            onClose={() => setToDelete(null)}
          />
        )}

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
