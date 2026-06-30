import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotifyContext = createContext(null);

const VARIANTS = {
    success: {
        icon: CheckCircle,
        iconCls: 'text-emerald-500',
        iconBg:  'bg-emerald-50',
        btnCls:  'bg-emerald-600 hover:bg-emerald-700',
        accent:  '#10b981',
        label:   'Success',
    },
    error: {
        icon: XCircle,
        iconCls: 'text-rose-500',
        iconBg:  'bg-rose-50',
        btnCls:  'bg-rose-600 hover:bg-rose-700',
        accent:  '#e11d48',
        label:   'Error',
    },
    warning: {
        icon: AlertTriangle,
        iconCls: 'text-amber-500',
        iconBg:  'bg-amber-50',
        btnCls:  'bg-amber-500 hover:bg-amber-600',
        accent:  '#f59e0b',
        label:   'Warning',
    },
    info: {
        icon: Info,
        iconCls: 'text-blue-500',
        iconBg:  'bg-blue-50',
        btnCls:  'bg-blue-600 hover:bg-blue-700',
        accent:  '#2563eb',
        label:   'Info',
    },
    danger: {
        icon: AlertTriangle,
        iconCls: 'text-rose-500',
        iconBg:  'bg-rose-50',
        btnCls:  'bg-rose-600 hover:bg-rose-700',
        accent:  '#e11d48',
        label:   'Confirm',
    },
    primary: {
        icon: Info,
        iconCls: 'text-amber-500',
        iconBg:  'bg-amber-50',
        btnCls:  'bg-gray-900 hover:bg-gray-800',
        accent:  '#111827',
        label:   'Confirm',
    },
};

function AppModal({ modal, onClose, onConfirm }) {
    const v    = VARIANTS[modal.variant || modal.type] || VARIANTS.info;
    const Icon = v.icon;
    const isConfirm = modal.kind === 'confirm';

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') { onClose(); }
            if (e.key === 'Enter')  { e.preventDefault(); isConfirm ? onConfirm() : onClose(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isConfirm, onClose, onConfirm]);

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(148,163,184,0.45)', backdropFilter: 'blur(6px)' }}
            onClick={!isConfirm ? onClose : undefined}
        >
            <div
                className="w-full max-w-sm bg-white shadow-2xl overflow-hidden"
                style={{ borderRadius: '10px', animation: 'modalPop .16s ease' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${v.iconBg}`}>
                            <Icon size={16} className={v.iconCls} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">{modal.title || v.label}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        style={{ borderRadius: '6px' }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                        {modal.message}
                    </p>
                    {modal.detail && (
                        <div className="mt-3 bg-gray-50 border border-gray-100 px-4 py-3 text-sm font-mono text-gray-800 break-all" style={{ borderRadius: '6px' }}>
                            {modal.detail}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/70">
                    {isConfirm && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                            style={{ borderRadius: '6px' }}
                        >
                            {modal.cancelLabel || 'Cancel'}
                        </button>
                    )}
                    <button
                        onClick={isConfirm ? onConfirm : onClose}
                        className={`px-4 py-2 text-white text-sm font-semibold transition-colors ${v.btnCls}`}
                        style={{ borderRadius: '6px' }}
                    >
                        {isConfirm ? (modal.confirmLabel || 'Confirm') : 'OK'}
                    </button>
                </div>
            </div>

            <style>{`@keyframes modalPop{from{opacity:0;transform:scale(.96) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
        </div>
    );
}

export function NotifyProvider({ children }) {
    const [modal, setModal] = useState(null);
    const resolveRef = useRef(null);

    const closeModal = () => {
        resolveRef.current?.(false);
        resolveRef.current = null;
        setModal(null);
    };

    const handleConfirm = () => {
        resolveRef.current?.(true);
        resolveRef.current = null;
        setModal(null);
    };

    const success = (message, title) =>
        setModal({ kind: 'alert', type: 'success', title: title || 'Success', message });

    const error = (message, title) =>
        setModal({ kind: 'alert', type: 'error', title: title || 'Error', message });

    const successDetail = (message, detail, title) =>
        setModal({ kind: 'alert', type: 'success', title: title || 'Success', message, detail });

    const confirm = ({ title, message, confirmLabel, cancelLabel, variant = 'danger' }) =>
        new Promise((resolve) => {
            resolveRef.current = resolve;
            setModal({ kind: 'confirm', variant, title, message, confirmLabel, cancelLabel });
        });

    return (
        <NotifyContext.Provider value={{ success, error, successDetail, confirm }}>
            {children}
            {modal && <AppModal modal={modal} onClose={closeModal} onConfirm={handleConfirm} />}
        </NotifyContext.Provider>
    );
}

export const useNotify = () => {
    const ctx = useContext(NotifyContext);
    if (!ctx) throw new Error('useNotify must be used inside NotifyProvider');
    return ctx;
};
