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
  IonBackButton,
  IonButtons
} from '@ionic/react';
import { api } from '../lib/api.js';
import { useToast } from '../lib/useToast.js';
import { usePerms } from '../lib/perms.js';
import { dateTimeLabel } from '../lib/fmt.js';
import EmptyState from '../ui/EmptyState.jsx';

export default function MobileAudit() {
  const { toast, showError, close } = useToast();
  const perms = usePerms();
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setAudit(await api.audit());
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
    () => [...audit].sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))),
    [audit]
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/mobile/settings" text="Geri" />
          </IonButtons>
          <IonTitle>Audit</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="count-line">{list.length} qeyd</div>

        {list.length === 0 ? (
          <EmptyState title={loading ? 'Yüklənir…' : 'Qeyd yoxdur'} />
        ) : (
          <div className="page-pad">
            <IonList className="m-list">
              {list.map((a, i) => (
                <IonItem key={a.at || i}>
                  <IonLabel>
                    <h2>{a.action || 'Əməliyyat'}</h2>
                    <p>{a.entityId ? `ID: ${a.entityId}` : 'Qeyd yoxdur'}</p>
                  </IonLabel>
                  <div slot="end" style={{ textAlign: 'right', fontSize: 12, color: '#66708a' }}>
                    {dateTimeLabel(a.at)}
                  </div>
                </IonItem>
              ))}
            </IonList>
          </div>
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
