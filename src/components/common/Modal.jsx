export default function Modal({ title, size = "md", onClose, children }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal${size === "lg" ? " modal-lg" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button type="button" className="modal-close" aria-label="Kapat" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
