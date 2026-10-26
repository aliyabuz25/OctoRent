import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import FeatherIcon from "../common/FeatherIcon.jsx";

const QUICK_ACCESS_IDS = ["dashboard", "stock", "rentals", "cashflow", "invoices"];

// Unified, single-tone clean groups (short, clear labels)
const GROUPS = [
  {
    id: "platform",
    label: "Platform",
    icon: "Shield",
    ids: ["tenants"],
  },
  {
    id: "main",
    label: "Əsas Bölmələr",
    icon: "Activity",
    ids: ["dashboard", "stock", "movements", "audit"],
  },
  {
    id: "catalog",
    label: "Kataloq",
    icon: "Tag",
    ids: ["categories", "brands"],
  },
  {
    id: "partners",
    label: "Partnyorlar",
    icon: "Users",
    ids: ["suppliers", "customers"],
  },
  {
    id: "warehouse_docs",
    label: "Anbar & Ticarət",
    icon: "Package",
    ids: ["warehouses", "purchases", "sales", "rentals"],
  },
  {
    id: "finance_service",
    label: "Maliyyə & Servis",
    icon: "DollarSign",
    ids: ["invoices", "maintenance", "cashflow"],
  },
  {
    id: "reports_settings",
    label: "Hesabat & Sistem",
    icon: "Sliders",
    ids: ["reports", "employees", "settings"],
  },
];

export default function Sidebar({ tabs, activeTab, onSelect }) {
  const { can } = useAuth();
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(() => {
    const s = new Set();
    GROUPS.forEach((g) => s.add(g.id));
    s.add("quick_access");
    return s;
  });

  const toggleGroup = (gid) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  };

  const toggleAll = () => {
    if (expanded.size > 0) {
      setExpanded(new Set());
    } else {
      const s = new Set();
      GROUPS.forEach((g) => s.add(g.id));
      s.add("quick_access");
      setExpanded(s);
    }
  };

  const q = filter.trim().toLowerCase();

  // Filter tabs by permission and search query
  const allowedTabs = useMemo(() => {
    return tabs.filter((t) => can(t.perm));
  }, [tabs, can]);

  const quickAccessTabs = useMemo(() => {
    return allowedTabs.filter(
      (t) =>
        QUICK_ACCESS_IDS.includes(t.id) &&
        (!q || t.label.toLowerCase().includes(q))
    );
  }, [allowedTabs, q]);

  // Compute groups with their matching items
  const processedGroups = useMemo(() => {
    return GROUPS.map((g) => {
      const items = allowedTabs.filter(
        (t) =>
          g.ids.includes(t.id) &&
          (!q || t.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q))
      );
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
  }, [allowedTabs, q]);

  const totalVisible = useMemo(() => {
    const ids = new Set();
    processedGroups.forEach((g) => g.items.forEach((item) => ids.add(item.id)));
    return ids.size;
  }, [processedGroups]);

  return (
    <div className="win-explorer-sidebar">
      {/* Explorer Titlebar */}
      <div className="wes-titlebar">
        <div className="wes-title-left">
          <FeatherIcon name="FolderTree" size={14} color="#475569" className="wes-app-icon" />
          <span className="wes-title-text">Ağac Görünüşü (Tree View)</span>
        </div>
        <div className="wes-view-switch">
          <button
            type="button"
            className="wes-tool-btn"
            onClick={toggleAll}
            title={expanded.size > 0 ? "Bütün qovluqları yığ" : "Bütün qovluqları aç"}
          >
            <FeatherIcon name={expanded.size > 0 ? "Minimize2" : "Maximize2"} size={13} color="#64748b" />
          </button>
        </div>
      </div>

      {/* Explorer Search / Filter Box */}
      <div className="wes-search-box">
        <FeatherIcon name="Search" size={12} color="#94a3b8" className="wes-search-icon" />
        <input
          type="search"
          placeholder="Ağacda axtar..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="wes-search-input"
        />
        {filter && (
          <button
            type="button"
            className="wes-search-clear"
            onClick={() => setFilter("")}
            title="Təmizlə"
          >
            ×
          </button>
        )}
      </div>

      {/* Pure Explorer Tree View Body */}
      <div className="wes-body">
        <div className="wes-tree-container">
          {/* Quick Access / Tez Giriş Section */}
          {!q && quickAccessTabs.length > 0 && (
            <div className="wes-group">
              <div
                className="wes-group-header"
                onClick={() => toggleGroup("quick_access")}
                title="Tez Giriş (Sancaqlar)"
              >
                <FeatherIcon
                  name="ChevronRight"
                  size={11}
                  className={`wes-chevron ${expanded.has("quick_access") ? "open" : ""}`}
                />
                <FeatherIcon name="Star" size={13} color="#64748b" className="wes-group-icon" />
                <span className="wes-group-label">Tez Giriş</span>
                <span className="wes-group-badge">{quickAccessTabs.length}</span>
              </div>
              {expanded.has("quick_access") && (
                <div className="wes-group-children">
                  {quickAccessTabs.map((tab) => {
                    const isSelected = tab.id === activeTab;
                    return (
                      <div
                        key={`qa-${tab.id}`}
                        className={`wes-tree-item ${isSelected ? "selected" : ""}`}
                        onClick={() => onSelect(tab.id)}
                        title={`${tab.label} (Tez Giriş)`}
                      >
                        <span className="wes-item-indicator" />
                        <FeatherIcon name={tab.icon || "Circle"} size={13} className="wes-item-icon" />
                        <span className="wes-item-label">{tab.label}</span>
                        <FeatherIcon name="Bookmark" size={11} color="#94a3b8" className="wes-pin-icon" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Main Hierarchy Groups (Clean Single-Tone Folders) */}
          {processedGroups.map((group) => {
            const isOpen = expanded.has(group.id) || Boolean(q);
            return (
              <div key={group.id} className="wes-group">
                <div
                  className="wes-group-header"
                  onClick={() => toggleGroup(group.id)}
                  title={group.label}
                >
                  <FeatherIcon
                    name="ChevronRight"
                    size={11}
                    className={`wes-chevron ${isOpen ? "open" : ""}`}
                  />
                  <FeatherIcon
                    name={isOpen ? "FolderOpen" : "Folder"}
                    size={13.5}
                    color="#64748b"
                    className="wes-folder-icon"
                  />
                  <span className="wes-group-label">{group.label}</span>
                  <span className="wes-group-badge">{group.items.length}</span>
                </div>

                {isOpen && (
                  <div className="wes-group-children">
                    {group.items.map((tab) => {
                      const isSelected = tab.id === activeTab;
                      return (
                        <div
                          key={tab.id}
                          className={`wes-tree-item ${isSelected ? "selected" : ""}`}
                          onClick={() => onSelect(tab.id)}
                          title={tab.label}
                        >
                          <span className="wes-item-indicator" />
                          <FeatherIcon name={tab.icon || "Circle"} size={13} className="wes-item-icon" />
                          <span className="wes-item-label">{tab.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Explorer Status Bar Footer */}
      <div className="wes-statusbar">
        <div className="wes-status-left">
          <span className="wes-status-dot" />
          <span>Ağac Naviqasiyası</span>
        </div>
        <div className="wes-status-right">
          <span>{totalVisible} modul</span>
        </div>
      </div>
    </div>
  );
}
