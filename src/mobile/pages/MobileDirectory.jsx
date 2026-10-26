import { useCallback, useEffect, useMemo, useState } from 'react';
import { IonBackButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonItem, IonLabel, IonList, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonTitle, IonToast, IonToolbar, IonButton } from '@ionic/react';
import { useParams } from 'react-router-dom';
import BIcon from '../ui/BIcon.jsx';
import { api } from '../lib/api.js';
import { usePerms } from '../lib/perms.js';
import { useToast } from '../lib/useToast.js';
import EmptyState from '../ui/EmptyState.jsx';
import FormField from '../ui/FormField.jsx';
import Sheet from '../ui/Sheet.jsx';
import ConfirmSheet from '../ui/ConfirmSheet.jsx';

const CONFIG = {
  categories: { title: 'Kateqoriyalar', fields: ['name', 'code', 'description'] },
  brands: { title: 'Markalar', fields: ['name', 'code', 'country', 'description'] },
  suppliers: { title: 'Təchizatçılar', fields: ['name', 'taxNo', 'phone', 'email', 'address', 'note'] },
  customers: { title: 'Müştərilər', fields: ['name', 'phone', 'email', 'taxNo', 'address', 'note'] },
  warehouses: { title: 'Anbarlar', fields: ['name', 'code', 'manager', 'address', 'note'] },
};
const LABELS = { name: 'Ad', code: 'Kod', country: 'Ölkə', description: 'Açıqlama', taxNo: 'VÖEN', phone: 'Telefon', email: 'Email', address: 'Ünvan', note: 'Qeyd', manager: 'Müdir' };

export default function MobileDirectory() {
  const { entity } = useParams();
  const config = CONFIG[entity];
  const perms = usePerms();
  const { toast, show, showError, close } = useToast();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [removeRow, setRemoveRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!config) return;
    try { setRows(await api.list(entity)); } catch (e) { showError(e); }
  }, [config, entity, showError]);
  useEffect(() => { load(); }, [load]);
  const visible = useMemo(() => rows.filter((row) => Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(search.trim().toLowerCase()))), [rows, search]);
  const start = (row) => setEditor(row ? { ...row } : Object.fromEntries(config.fields.map((k) => [k, ''])));
  const save = async () => {
    if (!String(editor?.name || '').trim()) { show('Ad sahəsi mütləqdir', 'warning'); return; }
    setBusy(true);
    try {
      const data = Object.fromEntries(config.fields.map((k) => [k, String(editor[k] || '').trim()]));
      if (editor.id) await api.update(entity, editor.id, data); else await api.create(entity, data);
      setEditor(null); show('Məlumat yadda saxlanıldı', 'success'); await load();
    } catch (e) { showError(e); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api.delete(entity, removeRow.id); setRemoveRow(null); show('Qeyd silindi', 'success'); await load(); }
    catch (e) { showError(e); } finally { setBusy(false); }
  };
  if (!config) return <IonPage><IonContent><EmptyState title="Modul tapılmadı" subtitle="Bu siyahı mövcud deyil." /></IonContent></IonPage>;
  return <IonPage>
    <IonHeader>
      <IonToolbar><IonButtons slot="start"><IonBackButton defaultHref="/mobile/more" text="Geri" /></IonButtons><IonTitle>{config.title}</IonTitle></IonToolbar>
      <IonToolbar><IonSearchbar value={search} onIonInput={(e) => setSearch(e.detail.value || '')} placeholder="Axtar..." /></IonToolbar>
    </IonHeader>
    <IonContent>
      <IonRefresher slot="fixed" onIonRefresh={async (e) => { await load(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
      <div className="count-line">{visible.length} qeyd</div>
      {visible.length ? <div className="page-pad"><IonList className="m-list">{visible.map((row) => <IonItem key={row.id}>
        <IonLabel onClick={() => perms.can('write') && start(row)}><h2>{row.name}</h2><p>{config.fields.slice(1).map((key) => row[key]).filter(Boolean).join(' • ') || 'Əlavə məlumat yoxdur'}</p></IonLabel>
        {perms.can('write') && <><IonButton fill="clear" onClick={() => start(row)} aria-label="Redaktə et"><BIcon name="pencil" /></IonButton><IonButton fill="clear" color="medium" onClick={() => setRemoveRow(row)} aria-label="Sil"><BIcon name="trash" /></IonButton></>}
      </IonItem>)}</IonList></div> : <EmptyState title="Qeyd tapılmadı" subtitle={search ? 'Axtarış sözünü dəyişin.' : 'İlk qeydi əlavə edin.'} actionLabel={perms.can('write') ? 'Əlavə et' : undefined} onAction={() => start(null)} />}
      {perms.can('write') && <IonFab vertical="bottom" horizontal="end" slot="fixed"><IonFabButton onClick={() => start(null)}><BIcon name="plus-lg" /></IonFabButton></IonFab>}
      <Sheet isOpen={!!editor} title={`${editor?.id ? 'Redaktə et' : 'Yeni'} · ${config.title}`} onClose={() => setEditor(null)} size="tall" actions={<><IonButton expand="block" fill="outline" onClick={() => setEditor(null)} disabled={busy}>İmtina</IonButton><IonButton expand="block" onClick={save} disabled={busy}>{busy ? 'Yadda saxlanır…' : 'Yadda saxla'}</IonButton></>}>
        {config.fields.map((key) => <FormField key={key} label={LABELS[key]} value={editor?.[key]} textarea={['description', 'address', 'note'].includes(key)} required={key === 'name'} onInput={(value) => setEditor((old) => ({ ...old, [key]: value }))} />)}
      </Sheet>
      <ConfirmSheet isOpen={!!removeRow} title="Qeydi sil" message={`“${removeRow?.name || ''}” qeydini silmək istəyirsiniz?`} confirmLabel="Sil" destructive busy={busy} onConfirm={remove} onClose={() => setRemoveRow(null)} />
      <IonToast isOpen={toast.isOpen} message={toast.message} color={toast.color} duration={2200} position="top" onDidDismiss={close} />
    </IonContent>
  </IonPage>;
}
