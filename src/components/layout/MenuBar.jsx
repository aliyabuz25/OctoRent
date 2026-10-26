import { useEffect, useState } from "react";
import { MENUS } from "../../constants/navigation.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../lib/api.js";
import FeatherIcon from "../common/FeatherIcon.jsx";
import DevicePairModal from "../auth/DevicePairModal.jsx";

export default function MenuBar() {
  const { user, logout } = useAuth();
  const [tenant, setTenant] = useState("");
  const [showPair, setShowPair] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const command = (key) => {
    setOpenMenu(null);
    if (key === "new") document.querySelector(".grid-toolbar .default")?.click();
    if (key === "export") {
      const button = [...document.querySelectorAll(".grid-toolbar button")].find((el) => el.textContent.trim().toLowerCase() === "csv");
      button?.click();
    }
    if (key === "refresh") window.location.reload();
    if (key === "logout") logout();
    if (key === "fullscreen") {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.();
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".app-menubar")) {
        setOpenMenu(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    const shortcuts = (event) => {
      if (event.altKey && event.key.toLowerCase() === "q") { event.preventDefault(); command("logout"); }
      else if (event.ctrlKey && event.key.toLowerCase() === "n") { event.preventDefault(); command("new"); }
      else if (event.ctrlKey && event.key.toLowerCase() === "e") { event.preventDefault(); command("export"); }
      else if (event.key === "F5") { event.preventDefault(); command("refresh"); }
      else if (event.key === "F11") { event.preventDefault(); command("fullscreen"); }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [logout]);

  useEffect(() => {
    let alive = true;
    api
      .getTenant()
      .then((res) => alive && setTenant(res?.tenant?.name || res?.name || ""))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <header className="app-menubar">
      {/* Sol Menyu: Fayl, Baxış */}
      <nav className="menubar-left-nav">
        {MENUS.map((menu) => {
          const isOpen = openMenu === menu.label;
          return (
            <div key={menu.label} className="menubar-menu-wrapper">
              <button
                type="button"
                className={`menubar-nav-trigger ${isOpen ? "is-open" : ""}`}
                onClick={() => setOpenMenu(isOpen ? null : menu.label)}
                onMouseEnter={() => {
                  if (openMenu) setOpenMenu(menu.label);
                }}
              >
                <span>{menu.label}</span>
              </button>

              {isOpen && (
                <div className="menubar-dropdown">
                  {menu.items.map((item, index) =>
                    item ? (
                      <button
                        key={item[0]}
                        type="button"
                        className="menubar-dropdown-item"
                        onClick={() => command(item[2])}
                      >
                        <span className="dropdown-label">{item[0]}</span>
                        {item[1] && <span className="dropdown-shortcut">{item[1]}</span>}
                      </button>
                    ) : (
                      <div key={`sep-${index}`} className="menubar-dropdown-divider" />
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sağ Hissə: Aksiyalar və İstifadəçi Məlumatı */}
      <div className="menubar-right">
        <button
          type="button"
          className="menubar-btn pair"
          onClick={() => setShowPair(true)}
          title="Mobil Cihaz Eşləməsi (QR Kod)"
        >
          <FeatherIcon name="Smartphone" size={13} color="#475569" strokeWidth={2} />
          <span>Cihaz Eşlə</span>
        </button>

        <a
          href="/mobile"
          target="_blank"
          rel="noopener noreferrer"
          className="menubar-btn mobile"
          title="Mobil Tətbiqi Aç"
        >
          <FeatherIcon name="ExternalLink" size={12} color="#64748b" />
          <span>Mobil App</span>
        </a>

        {tenant && (
          <div className="menubar-info-pill tenant" title={`Şirkət / Mağaza: ${tenant}`}>
            <FeatherIcon name="Building2" size={13} color="#2563eb" />
            <span className="truncate-text">{tenant}</span>
          </div>
        )}

        {user && (
          <div className="menubar-info-pill user" title={`İstifadəçi: ${user.name || user.username}`}>
            <FeatherIcon name="User" size={13} color="#64748b" />
            <span className="truncate-text">{user.name || user.username}</span>
          </div>
        )}

        <button
          type="button"
          className="menubar-btn logout"
          onClick={logout}
          title="Sistemdən Çıxış (Alt+Q)"
        >
          <FeatherIcon name="LogOut" size={12} color="#dc2626" />
          <span>Çıxış</span>
        </button>
      </div>

      <DevicePairModal isOpen={showPair} onClose={() => setShowPair(false)} />
    </header>
  );
}
