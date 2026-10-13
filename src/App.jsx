import { useState } from "react";
import { TABS } from "./constants/navigation.js";
import MenuBar from "./components/layout/MenuBar.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import StockPanel from "./components/stock/StockPanel.jsx";

const PLACEHOLDERS = {
  movements: "Stok hareketleri burada listelenecek.",
  reports: "Raporlar burada görüntülenecek.",
  settings: "Ayarlar burada yer alacak.",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("stock");
  const activeLabel = TABS.find((tab) => tab.id === activeTab)?.label;

  return (
    <div className="app">
      <MenuBar />
      <div className="workspace">
        <Sidebar tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />
        <div className="content">
          <div className="pane-title">{activeLabel}</div>
          <div className="pane-body">
            {activeTab === "stock" ? (
              <StockPanel />
            ) : (
              <p className="placeholder-text">{PLACEHOLDERS[activeTab]}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
