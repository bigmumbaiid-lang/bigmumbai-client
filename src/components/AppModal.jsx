import { useEffect } from 'react';
import { X } from 'lucide-react';

const ACCENT = {
    brand:   { bar: 'linear-gradient(90deg,#d9ad82,#b1835a)', bg: '#fef3ec', text: '#b1835a' },
    emerald: { bar: 'linear-gradient(90deg,#34d399,#059669)', bg: '#ecfdf5', text: '#059669' },
    rose:    { bar: 'linear-gradient(90deg,#fb7185,#e11d48)', bg: '#fff1f2', text: '#e11d48' },
    amber:   { bar: 'linear-gradient(90deg,#fbbf24,#d97706)', bg: '#fffbeb', text: '#d97706' },
    blue:    { bar: 'linear-gradient(90deg,#60a5fa,#2563eb)', bg: '#eff6ff', text: '#2563eb' },
    violet:  { bar: 'linear-gradient(90deg,#a78bfa,#7c3aed)', bg: '#f5f3ff', text: '#7c3aed' },
    indigo:  { bar: 'linear-gradient(90deg,#818cf8,#4f46e5)', bg: '#eef2ff', text: '#4f46e5' },
};

const SIZE = {
    sm:   'max-w-sm',
    md:   'max-w-md',
    lg:   'max-w-lg',
    xl:   'max-w-xl',
    '2xl':'max-w-2xl',
};

/**
 * Global modal shell.
 * - Esc  → onClose
 * - Enter → onConfirm (only when provided; useful for simple confirm-style modals)
 *           For <form> modals, omit onConfirm and let native form submit handle Enter.
 */
export default function AppModal({ onClose, onConfirm, children, size = 'md' }) {
    useEffect(() => {
        const h = (e) => {
            if (e.key === 'Escape') { onClose?.(); }
            if (e.key === 'Enter' && onConfirm) {
                if (document.activeElement?.tagName === 'TEXTAREA') return;
                e.preventDefault();
                onConfirm();
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose, onConfirm]);

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center px-4 pt-4 pb-[72px] sm:p-4"
            style={{ background: 'rgba(148,163,184,0.4)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
        >
            <div
                className={`w-full ${SIZE[size] || SIZE.md} bg-white shadow-2xl overflow-hidden`}
                style={{ borderRadius: '8px', animation: 'appModalIn .18s ease' }}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
            <style>{`@keyframes appModalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
        </div>
    );
}

AppModal.Header = function AppModalHeader({ icon, title, subtitle, onClose, accent = 'brand' }) {
    const a = ACCENT[accent] || ACCENT.brand;
    return (
        <>
            <div className="h-[3px] w-full shrink-0" style={{ background: a.bar }} />
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                {icon && (
                    <div className="h-9 w-9 flex items-center justify-center shrink-0"
                        style={{ background: a.bg, color: a.text, borderRadius: '6px' }}>
                        {icon}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-gray-900 leading-tight">{title}</h2>
                    {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
                </div>
                {onClose && (
                    <button onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition shrink-0"
                        style={{ borderRadius: '5px' }}>
                        <X size={14} />
                    </button>
                )}
            </div>
        </>
    );
};

AppModal.Body = function AppModalBody({ children, className = '', noPad = false }) {
    return (
        <div className={`${noPad ? '' : 'px-5 py-5'} overflow-y-auto max-h-[60vh] sm:max-h-[70vh] ${className}`}>
            {children}
        </div>
    );
};

AppModal.Footer = function AppModalFooter({ children, left }) {
    return (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2">{left}</div>
            <div className="flex items-center gap-2">{children}</div>
        </div>
    );
};

/* ── Shared styled sub-elements ─────────────────────────────────── */

export function ModalInput({ label, error, className = '', ...props }) {
    return (
        <div>
            {label && (
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {label}
                </label>
            )}
            <input
                {...props}
                className={`w-full border px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-gray-50 transition focus:bg-white focus:outline-none focus:ring-2 ${
                    error
                        ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-200/40'
                        : 'border-gray-200 focus:border-[#b1835a] focus:ring-[#d8ab83]/25'
                } ${className}`}
                style={{ borderRadius: '6px' }}
            />
            {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
        </div>
    );
}

export function ModalTextarea({ label, className = '', ...props }) {
    return (
        <div>
            {label && (
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {label}
                </label>
            )}
            <textarea
                {...props}
                className={`w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-gray-50 transition focus:bg-white focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 resize-none ${className}`}
                style={{ borderRadius: '6px' }}
            />
        </div>
    );
}

export function ModalBtn({ variant = 'secondary', className = '', style: extraStyle, ...props }) {
    const CLS = {
        secondary: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
        brand:     'text-white hover:opacity-90',
        emerald:   'bg-emerald-600 text-white hover:bg-emerald-700',
        rose:      'bg-rose-600 text-white hover:bg-rose-700',
        amber:     'bg-amber-500 text-white hover:bg-amber-600',
        blue:      'bg-blue-600 text-white hover:bg-blue-700',
        indigo:    'bg-indigo-600 text-white hover:bg-indigo-700',
    }[variant] || '';
    return (
        <button
            {...props}
            style={{ borderRadius: '6px', ...extraStyle }}
            className={`px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${CLS} ${className}`}
        />
    );
}

export function ModalInfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-gray-400 font-medium">{label}</span>
            <span className="text-xs font-semibold text-gray-800">{value}</span>
        </div>
    );
}
