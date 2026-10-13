import { useState } from "react";
import { TABS } from "./constants/navigation.js";
import MenuBar from "./components/layout/MenuBar.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import StockPanel from "./components/stock/StockPanel.jsx";
import CategoriesPanel from "./components/categories/CategoriesPanel.jsx";
import BrandsPanel from "./components/brands/BrandsPanel.jsx";
import SuppliersPanel from "./components/suppliers/SuppliersPanel.jsx";
import CustomersPanel from "./components/customers/CustomersPanel.jsx";
import WarehousesPanel from "./components/warehouses/WarehousesPanel.jsx";
import MovementsPanel from "./components/movements/MovementsPanel.jsx";
import PurchasesPanel from "./components/purchases/PurchasesPanel.jsx";
import SalesPanel from "./components/sales/SalesPanel.jsx";
import ReportsPanel from "./components/reports/ReportsPanel.jsx";
import AuditPanel from "./components/audit/AuditPanel.jsx";
import SettingsPanel from "./components/settings/SettingsPanel.jsx";
import DashboardPanel from "./components/dashboard/DashboardPanel.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const activeLabel = TABS.find((tab) => tab.id === activeTab)?.label;

  return (
    <div className="app">
      <MenuBar />
      <div className="workspace">
        <Sidebar tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />
        <div className="content">
          <div className="pane-title">{activeLabel}</div>
          <div className="pane-body">
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
            {activeTab === "reports" && <ReportsPanel />}
            {activeTab === "audit" && <AuditPanel />}
            {activeTab === "settings" && <SettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
