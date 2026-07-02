import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotifyContext = createContext(null);

// ─── Toast ────────────────────────────────────────────────────────────────────

const TOAST_VARIANTS = {
  success: { Icon: CheckCircle,   accent: '#3a7d44', iconColor: '#3a7d44', iconBg: '#e8f5ea', borderColor: '#c8e6c9' },
  error:   { Icon: XCircle,       accent: '#dc2626', iconColor: '#dc2626', iconBg: '#fff1f2', borderColor: '#fecaca' },
  warning: { Icon: AlertTriangle, accent: '#d97706', iconColor: '#d97706', iconBg: '#fffbeb', borderColor: '#fde68a' },
  info:    { Icon: Info,          accent: '#2563eb', iconColor: '#2563eb', iconBg: '#eff6ff', borderColor: '#bfdbfe' },
};

const DURATION = 3500;

function ToastItem({ toast, onRemove }) {
  const v = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.info;
  const { Icon } = v;
  const [alive, setAlive] = useState(false);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    setAlive(false);
    setTimeout(() => onRemove(toast.id), 260);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const t1 = setTimeout(() => setAlive(true), 10);
    timerRef.current = setTimeout(dismiss, DURATION);
    return () => { clearTimeout(t1); clearTimeout(timerRef.current); };
  }, [dismiss]);

  return (
    <div
      style={{
        transform: alive ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.97)',
        opacity: alive ? 1 : 0,
        transition: 'transform 0.24s cubic-bezier(.22,.68,0,1.15), opacity 0.22s ease',
        background: 'white',
        borderRadius: 0,
        border: `1px solid ${v.borderColor}`,
        borderLeft: `3px solid ${v.accent}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        minWidth: 280,
        maxWidth: 360,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '12px 14px', gap: 10, flex: 1 }}>
        {/* Icon */}
        <div style={{
          width: 32, height: 32, flexShrink: 0, background: v.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} style={{ color: v.iconColor }} strokeWidth={2.4} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>
            {toast.title}
          </p>
          {toast.message && (
            <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0', lineHeight: 1.45 }}>
              {toast.message}
            </p>
          )}
          {toast.detail && (
            <div style={{
              marginTop: 6, background: '#f9fafb', border: '1px solid #e5e7eb',
              padding: '4px 8px', fontSize: 11, fontFamily: 'monospace',
              color: '#374151', wordBreak: 'break-all',
            }}>
              {toast.detail}
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', padding: '2px', flexShrink: 0,
            display: 'flex', alignItems: 'center', marginTop: 1,
            lineHeight: 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 2,
        background: v.accent, opacity: 0.35,
        animation: `toastProgress ${DURATION}ms linear forwards`,
      }} />
    </div>
  );
}

function ToastStack({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'center', pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
      `}</style>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto', position: 'relative', width: '100%' }}>
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

const CONFIRM_VARIANTS = {
  danger:  { Icon: AlertTriangle, iconColor: '#e11d48', iconBg: '#fff1f2', btnBg: '#dc2626', btnHover: '#b91c1c' },
  primary: { Icon: Info,          iconColor: '#3a7d44', iconBg: '#e8f5ea', btnBg: '#3a7d44', btnHover: '#2e6437' },
  success: { Icon: CheckCircle,   iconColor: '#3a7d44', iconBg: '#e8f5ea', btnBg: '#3a7d44', btnHover: '#2e6437' },
  warning: { Icon: AlertTriangle, iconColor: '#d97706', iconBg: '#fffbeb', btnBg: '#d97706', btnHover: '#b45309' },
};

function ConfirmModal({ modal, onClose, onConfirm }) {
  const v = CONFIRM_VARIANTS[modal.variant] || CONFIRM_VARIANTS.danger;
  const { Icon } = v;
  const btnRef = useRef(null);

  useEffect(() => {
    btnRef.current?.focus();
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, onConfirm]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px 16px 72px',
        background: 'rgba(0,0,0,0.35)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 420, background: 'white',
          borderRadius: 0, border: '1px solid #e5e7eb',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          animation: 'confirmPop .18s cubic-bezier(.22,.68,0,1.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: v.btnBg }} />

        {/* Body */}
        <div style={{ padding: '20px 22px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 40, height: 40, flexShrink: 0, background: v.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={19} style={{ color: v.iconColor }} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 5px', lineHeight: 1.3 }}>
              {modal.title}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-line' }}>
              {modal.message}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: '#9ca3af', flexShrink: 0, marginTop: -2,
            display: 'flex', alignItems: 'center',
          }}>
            <X size={15} />
          </button>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 22px 16px', borderTop: '1px solid #f3f4f6',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 0,
              background: 'white', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            {modal.cancelLabel || 'Cancel'}
          </button>
          <button
            ref={btnRef}
            onClick={onConfirm}
            style={{
              padding: '8px 20px', border: 'none', borderRadius: 0,
              background: v.btnBg, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = v.btnHover)}
            onMouseLeave={e => (e.currentTarget.style.background = v.btnBg)}
          >
            {modal.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>

      <style>{`@keyframes confirmPop{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let toastId = 0;

export function NotifyProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const resolveRef = useRef(null);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type, titleOrMsg, message, detail) => {
    const isShort = !message;
    setToasts(prev => [...prev, {
      id: ++toastId,
      type,
      title: isShort ? (type.charAt(0).toUpperCase() + type.slice(1)) : titleOrMsg,
      message: isShort ? titleOrMsg : message,
      detail,
    }]);
  }, []);

  const success      = useCallback((msg, title)           => addToast('success', title || 'Success', msg),       [addToast]);
  const error        = useCallback((msg, title)           => addToast('error',   title || 'Error',   msg),       [addToast]);
  const successDetail= useCallback((msg, detail, title)   => addToast('success', title || 'Success', msg, detail),[addToast]);
  const info         = useCallback((msg, title)           => addToast('info',    title || 'Info',    msg),       [addToast]);
  const warning      = useCallback((msg, title)           => addToast('warning', title || 'Warning', msg),       [addToast]);

  const confirm = useCallback(({ title, message, confirmLabel, cancelLabel, variant = 'danger' }) =>
    new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmModal({ variant, title, message, confirmLabel, cancelLabel });
    }), []);

  const closeConfirm = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setConfirmModal(null);
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setConfirmModal(null);
  }, []);

  return (
    <NotifyContext.Provider value={{ success, error, successDetail, info, warning, confirm }}>
      {children}
      <ToastStack toasts={toasts} onRemove={removeToast} />
      {confirmModal && (
        <ConfirmModal modal={confirmModal} onClose={closeConfirm} onConfirm={handleConfirm} />
      )}
    </NotifyContext.Provider>
  );
}

export const useNotify = () => {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify must be used inside NotifyProvider');
  return ctx;
};
