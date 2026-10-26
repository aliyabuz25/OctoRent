import React, { useEffect, useMemo } from 'react';
import { Route, Navigate } from 'react-router-dom';
import {
  IonApp,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonSpinner,
  IonIcon,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

import { usePerms } from './lib/perms.js';
import { initRealtimeNotifications } from './lib/notifications.js';
import MobileLogin from './pages/MobileLogin.jsx';
import MobileDashboard from './pages/MobileDashboard.jsx';
import MobileStock from './pages/MobileStock.jsx';
import MobileMovements from './pages/MobileMovements.jsx';
import MobileDocuments from './pages/MobileDocuments.jsx';
import MobileReports from './pages/MobileReports.jsx';
import MobileEmployees from './pages/MobileEmployees.jsx';
import MobileAudit from './pages/MobileAudit.jsx';
import MobileTenants from './pages/MobileTenants.jsx';
import MobileSettings from './pages/MobileSettings.jsx';
import MobileMore from './pages/MobileMore.jsx';
import MobileDirectory from './pages/MobileDirectory.jsx';
import MobileCashflow from './pages/MobileCashflow.jsx';
import MobileMaintenance from './pages/MobileMaintenance.jsx';
import FeatherIcon from '../components/common/FeatherIcon.jsx';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/mobile.css';

setupIonicReact({ mode: 'ios', swipeBackEnabled: true });

const BUSINESS_TABS = [
  { id: 'dashboard', label: 'Ana Səhifə', perm: 'read',      path: '/mobile/dashboard', feather: 'LayoutDashboard' },
  { id: 'stock',     label: 'Stok',       perm: 'read',      path: '/mobile/stock',     feather: 'Boxes' },
  { id: 'movements', label: 'Hərəkətlər', perm: 'stock',     path: '/mobile/movements', feather: 'ArrowLeftRight' },
  { id: 'documents', label: 'Sənədlər',   perm: 'documents', path: '/mobile/documents', feather: 'FileText' },
];

const PLATFORM_TABS = [
  { id: 'tenants', label: 'Müəssisələr', path: '/mobile/tenants', feather: 'ShieldCheck' },
];

const MORE_TAB = { id: 'more', label: 'Daha çox', path: '/mobile/more', feather: 'LayoutGrid' };

function HomeRedirect({ tabs }) {
  const target = tabs[0]?.path || '/mobile/settings';
  return <Navigate to={target} replace />;
}

export default function MobileMain() {
  const perms = usePerms();
  const { authed, loading } = perms;

  useEffect(() => {
    if (authed) {
      initRealtimeNotifications();
    }
  }, [authed]);

  const tabs = useMemo(() => {
    if (perms.realRole === 'superadmin' && !perms.actAs) return PLATFORM_TABS;
    return BUSINESS_TABS.filter((t) => perms.can(t.perm));
  }, [perms]);

  const routes = useMemo(() => {
    const list = [
      { path: '/mobile/dashboard', el: <MobileDashboard />, perm: 'read' },
      { path: '/mobile/stock',     el: <MobileStock />,     perm: 'read' },
      { path: '/mobile/movements', el: <MobileMovements />, perm: 'stock' },
      { path: '/mobile/documents', el: <MobileDocuments />, perm: 'documents' },
      { path: '/mobile/reports',   el: <MobileReports />,   perm: 'read' },
      { path: '/mobile/cashflow',  el: <MobileCashflow />,  perm: 'documents' },
      { path: '/mobile/maintenance', el: <MobileMaintenance />, perm: 'read' },
      { path: '/mobile/employees', el: <MobileEmployees />, perm: 'employees' },
      { path: '/mobile/audit',     el: <MobileAudit />,     perm: 'employees' },
      { path: '/mobile/tenants',   el: <MobileTenants /> },
      { path: '/mobile/settings',  el: <MobileSettings /> },
      { path: '/mobile/more',      el: <MobileMore /> },
      { path: '/mobile/directory/:entity', el: <MobileDirectory />, perm: 'write' },
    ];
    return list.filter((r) => {
      if (r.path === '/mobile/tenants') return perms.realRole === 'superadmin';
      if (r.path === '/mobile/more')    return true;
      if (r.path === '/mobile/settings') return true;
      if (perms.realRole === 'superadmin' && !perms.actAs) return false;
      return perms.can(r.perm);
    });
  }, [perms]);

  if (loading) {
    return (
      <IonApp>
        <div className="mobile-splash">
          <IonSpinner name="crescent" />
        </div>
      </IonApp>
    );
  }

  if (!authed) {
    return (
      <IonApp>
        <MobileLogin />
      </IonApp>
    );
  }

  const allTabs = [...tabs, MORE_TAB];

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            {routes.map((r) => (
              <Route key={r.path} path={r.path} element={r.el} />
            ))}
            <Route path="/mobile/rentals" element={<Navigate to="/mobile/documents" replace />} />
            <Route path="/mobile" element={<HomeRedirect tabs={allTabs} />} />
            <Route path="/"       element={<HomeRedirect tabs={allTabs} />} />
            <Route path="*"       element={<HomeRedirect tabs={allTabs} />} />
          </IonRouterOutlet>

          <IonTabBar slot="bottom" className="native-tab-bar">
            {allTabs.map((t) => (
              <IonTabButton key={t.id} tab={t.id} href={t.path} className="native-tab-btn">
                <FeatherIcon name={t.feather} size={20} style={{ marginBottom: '2px' }} />
                <IonLabel>{t.label}</IonLabel>
              </IonTabButton>
            ))}
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}
