import { useEffect, useRef } from "react";

const MENU_WIDTH = 236;
const ITEM_HEIGHT = 30;
const SEPARATOR_HEIGHT = 9;

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const height = items.reduce(
    (total, item) => total + (item === null ? SEPARATOR_HEIGHT : ITEM_HEIGHT),
    8
  );

  const style = {
    left: Math.max(4, Math.min(x, window.innerWidth - MENU_WIDTH - 8)),
    top: Math.max(4, Math.min(y, window.innerHeight - height - 8)),
  };

  return (
    <div className="context-menu" style={style} ref={menuRef} role="menu">
      {items.map((item, index) =>
        item === null ? (
          <div key={`sep-${index}`} className="menu-separator" role="separator" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className={`menu-item${item.danger ? " danger" : ""}`}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.action();
              onClose();
            }}
          >
            <span className="menu-label">{item.label}</span>
            {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
          </button>
        )
      )}
    </div>
  );
}
