// Shared modal shell with a sectioned Header / Body / Footer layout.
// Closes on backdrop click and on the ✕ button.
const ACCENTS = {
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
};

export default function Modal({ onClose, children, maxWidth = 'max-w-md' }) {
  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`modal-card w-full ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-900/5`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

Modal.Header = function ModalHeader({ icon, accent = 'blue', title, subtitle, onClose }) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 px-6 py-5">
      {icon && (
        <div
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${ACCENTS[accent] || ACCENTS.blue
            }`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-sm text-gray-500">{subtitle}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
};

Modal.Body = function ModalBody({ children, className = '' }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
};

Modal.Footer = function ModalFooter({ children }) {
  return (
    <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
      {children}
    </div>
  );
};