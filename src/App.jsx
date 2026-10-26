import { useEffect, useState } from "react";
import { TABS } from "./constants/navigation.js";
import { useAuth } from "./context/AuthContext.jsx";
import MenuBar from "./components/layout/MenuBar.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import FeatherIcon from "./components/common/FeatherIcon.jsx";
import LoginPage from "./components/auth/LoginPage.jsx";
import StockPanel from "./components/stock/StockPanel.jsx";
import CategoriesPanel from "./components/categories/CategoriesPanel.jsx";
import BrandsPanel from "./components/brands/BrandsPanel.jsx";
import SuppliersPanel from "./components/suppliers/SuppliersPanel.jsx";
import CustomersPanel from "./components/customers/CustomersPanel.jsx";
import WarehousesPanel from "./components/warehouses/WarehousesPanel.jsx";
import MovementsPanel from "./components/movements/MovementsPanel.jsx";
import PurchasesPanel from "./components/purchases/PurchasesPanel.jsx";
import SalesPanel from "./components/sales/SalesPanel.jsx";
import RentalsPanel from "./components/rentals/RentalsPanel.jsx";
import InvoicesPanel from "./components/invoices/InvoicesPanel.jsx";
import MaintenancePanel from "./components/maintenance/MaintenancePanel.jsx";
import CashflowPanel from "./components/cashflow/CashflowPanel.jsx";
import ReportsPanel from "./components/reports/ReportsPanel.jsx";
import AuditPanel from "./components/audit/AuditPanel.jsx";
import EmployeesPanel from "./components/employees/EmployeesPanel.jsx";
import TenantsPanel from "./components/tenants/TenantsPanel.jsx";
import SettingsPanel from "./components/settings/SettingsPanel.jsx";
import DashboardPanel from "./components/dashboard/DashboardPanel.jsx";

export default function App() {
  const { authed, loading, can } = useAuth();
  const [activeTab, setActiveTab] = useState(() => TABS.find((t) => can(t.perm))?.id || "stock");

  const active = TABS.find((tab) => tab.id === activeTab);

  useEffect(() => {
    if (active && !can(active.perm)) {
      const fallback = TABS.find((t) => can(t.perm))?.id;
      if (fallback && fallback !== activeTab) setActiveTab(fallback);
    }
  }, [active, activeTab, can]);

  if (loading) return <div className="login-loading">Yüklənir...</div>;
  if (!authed) return <LoginPage />;

  const activeLabel = active?.label;

  return (
    <div className="app">
      <MenuBar />
      <div className="workspace">
        <Sidebar tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />
        <div className="content">
          <div className="pane-title">
            {active?.icon && <FeatherIcon name={active.icon} size={15} color="#2563eb" />}
            <span>{activeLabel}</span>
          </div>
          <div className="pane-body">
            {activeTab === "tenants" && <TenantsPanel />}
            {activeTab === "dashboard" && <DashboardPanel />}
            {activeTab === "stock" && <StockPanel />}
            {activeTab === "categories" && <CategoriesPanel />}
            {activeTab === "brands" && <BrandsPanel />}
            {activeTab === "suppliers" && <SuppliersPanel />}
            {activeTab === "customers" && <CustomersPanel />}
            {activeTab === "warehouses" && <WarehousesPanel />}
            {activeTab === "movements" && <MovementsPanel />}
            {activeTab === "purchases" && <PurchasesPanel />}
            {activeTab === "sales" && <SalesPanel />}
            {activeTab === "rentals" && <RentalsPanel />}
            {activeTab === "invoices" && <InvoicesPanel />}
            {activeTab === "maintenance" && <MaintenancePanel />}
            {activeTab === "cashflow" && <CashflowPanel />}
            {activeTab === "reports" && <ReportsPanel />}
            {activeTab === "audit" && <AuditPanel />}
            {activeTab === "employees" && <EmployeesPanel />}
            {activeTab === "settings" && <SettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
