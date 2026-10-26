import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IonButton, IonContent } from '@ionic/react';

/**
 * Native bottom sheet — pure CSS/JS, no IonModal.
 * Swipe down handle, snap-to-close, backdrop tap.
 *
 * size: 'half' | 'tall' | 'full' | 'auto'  (default: auto → tall)
 * className: 'tall-sheet' | 'half-sheet'    (legacy compat)
 */
export default function Sheet({ isOpen, title, onClose, children, actions, className = '', size }) {
  const sheetEl  = useRef(null);
  const backdropEl = useRef(null);
  const drag = useRef({ active: false, startY: 0, startTime: 0, dy: 0 });

  const resolvedSize = size
    || (className.includes('tall-sheet') ? 'tall'
      : className.includes('half-sheet') ? 'half'
      : className.includes('full-sheet') ? 'full'
      : 'tall');

  // ── open / close animation ──────────────────────────────────────
  useEffect(() => {
    const sheet   = sheetEl.current;
    const backdrop = backdropEl.current;
    if (!sheet || !backdrop) return;

    if (isOpen) {
      // make visible first, then animate
      sheet.style.visibility = 'visible';
      backdrop.style.display = 'block';
      // force reflow
      void sheet.offsetHeight;
      sheet.style.transition   = 'transform 340ms cubic-bezier(0.32,0.72,0,1)';
      backdrop.style.transition = 'opacity 280ms ease';
      sheet.style.transform    = 'translateY(0%)';
      backdrop.style.opacity   = '1';
      document.body.style.overflow = 'hidden';
    } else {
      sheet.style.transition   = 'transform 280ms cubic-bezier(0.32,0.72,0,1)';
      backdrop.style.transition = 'opacity 240ms ease';
      sheet.style.transform    = 'translateY(105%)';
      backdrop.style.opacity   = '0';
      document.body.style.overflow = '';
      setTimeout(() => {
        if (backdropEl.current) backdropEl.current.style.display = 'none';
        if (sheetEl.current)    sheetEl.current.style.visibility = 'hidden';
      }, 290);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── drag handle ──────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { active: true, startY: e.clientY, startTime: Date.now(), dy: 0 };
    if (sheetEl.current) sheetEl.current.style.transition = 'none';
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!drag.current.active) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    drag.current.dy = dy;
    if (sheetEl.current) sheetEl.current.style.transform = `translateY(${dy}px)`;
  }, []);

  const onPointerUp = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const { dy, startTime } = drag.current;
    const elapsed  = Date.now() - startTime;
    const velocity = dy / Math.max(elapsed, 1);

    if (dy > 100 || velocity > 0.55) {
      onClose?.();
    } else {
      if (sheetEl.current) {
        sheetEl.current.style.transition = 'transform 260ms cubic-bezier(0.32,0.72,0,1)';
        sheetEl.current.style.transform  = 'translateY(0)';
      }
    }
  }, [onClose]);

  const heightClass = `bs-size-${resolvedSize}`;

  return createPortal(
    <div className={`bs-root ${isOpen ? 'bs-root--open' : ''}`}>
      {/* Backdrop */}
      <div
        ref={backdropEl}
        className="bs-backdrop"
        style={{ display: 'none', opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetEl}
        className={`bs-sheet ${heightClass}`}
        style={{ transform: 'translateY(105%)', visibility: 'hidden' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle area */}
        <div
          className="bs-handle-area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="bs-handle" />
          {title && (
            <div className="bs-title-row">
              <span className="bs-title">{title}</span>
              <button className="bs-close-btn" onClick={onClose}>Bağla</button>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="bs-body">
          <div className="sheet-body">{children}</div>
        </div>

        {/* Sticky footer */}
        {actions && <div className="bs-footer sheet-actions">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}
