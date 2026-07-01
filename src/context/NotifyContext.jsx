import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotifyContext = createContext(null);

// ─── Toast ────────────────────────────────────────────────────────────────────

const TOAST_VARIANTS = {
  success: { Icon: CheckCircle, color: '#10b981', bar: '#10b981', bg: '#f0fdf4' },
  error:   { Icon: XCircle,     color: '#e11d48', bar: '#e11d48', bg: '#fff1f2' },
  warning: { Icon: AlertTriangle, color: '#f59e0b', bar: '#f59e0b', bg: '#fffbeb' },
  info:    { Icon: Info,        color: '#2563eb', bar: '#2563eb', bg: '#eff6ff' },
};

const DURATION = 3200;

function ToastItem({ toast, onRemove }) {
  const v = TOAST_VARIANTS[toast.type] || TOAST_VARIANTS.info;
  const { Icon } = v;
  const [alive, setAlive] = useState(false);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    setAlive(false);
    setTimeout(() => onRemove(toast.id), 280);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const t1 = setTimeout(() => setAlive(true), 10);
    timerRef.current = setTimeout(dismiss, DURATION);
    return () => { clearTimeout(t1); clearTimeout(timerRef.current); };
  }, [dismiss]);

  return (
    <div
      style={{
        transform: alive ? 'translateY(0)' : 'translateY(-14px)',
        opacity: alive ? 1 : 0,
        transition: 'transform 0.26s cubic-bezier(.22,.68,0,1.2), opacity 0.26s ease',
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
        minWidth: 260,
        maxWidth: 340,
        display: 'flex',
      }}
    >
      {/* left accent bar */}
      <div style={{ width: 4, flexShrink: 0, background: v.bar }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '12px 12px 12px 12px', gap: 10, flex: 1 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: v.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={15} style={{ color: v.color }} strokeWidth={2.4} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
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
              marginTop: 7, background: '#f9fafb', borderRadius: 6,
              padding: '5px 8px', fontSize: 11, fontFamily: 'monospace',
              color: '#374151', border: '1px solid #f3f4f6', wordBreak: 'break-all',
            }}>
              {toast.detail}
            </div>
          )}
        </div>

        <button
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9ca3af', padding: '2px', borderRadius: 5, flexShrink: 0,
            display: 'flex', alignItems: 'center', marginTop: -1,
          }}
        >
          <X size={13} />
        </button>
      </div>
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
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

const CONFIRM_VARIANTS = {
  danger:  { Icon: AlertTriangle, iconColor: '#e11d48', iconBg: '#fff1f2', btnBg: '#dc2626', btnHover: '#b91c1c' },
  primary: { Icon: Info,          iconColor: '#b1835a', iconBg: '#fdf3e8', btnBg: '#111827', btnHover: '#1f2937' },
  warning: { Icon: AlertTriangle, iconColor: '#f59e0b', iconBg: '#fffbeb', btnBg: '#d97706', btnHover: '#b45309' },
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
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(0,0,0,0.30)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 400, background: 'white',
          borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          animation: 'confirmPop .18s cubic-bezier(.22,.68,0,1.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* body */}
        <div style={{ padding: '24px 22px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, background: v.iconBg, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={20} style={{ color: v.iconColor }} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 6px', lineHeight: 1.3 }}>
              {modal.title}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-line' }}>
              {modal.message}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: '#9ca3af', borderRadius: 6, flexShrink: 0, marginTop: -4,
            display: 'flex', alignItems: 'center',
          }}>
            <X size={15} />
          </button>
        </div>

        {/* footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '14px 22px', borderTop: '1px solid #f3f4f6', background: '#fafafa',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: 'white', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {modal.cancelLabel || 'Cancel'}
          </button>
          <button
            ref={btnRef}
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: v.btnBg, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = v.btnHover)}
            onMouseLeave={e => (e.currentTarget.style.background = v.btnBg)}
          >
            {modal.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>

      <style>{`@keyframes confirmPop{from{opacity:0;transform:scale(.94) translateY(10px)}to{opacity:1;transform:none}}`}</style>
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
