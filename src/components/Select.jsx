import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom Select dropdown — square corners, leaf-green accents.
 *
 * Props:
 *   value       – current value string
 *   onChange    – fn(value)
 *   options     – [{ value, label }]
 *   placeholder – shown when value is ''  (default 'Select…')
 *   width       – optional min-width CSS string (default '160px')
 */
export default function Select({ value, onChange, options = [], placeholder = 'Select…', width = '160px' }) {
  const [open, setOpen]     = useState(false);
  const ref                 = useRef(null);

  const selected = options.find((o) => o.value === value);
  const G  = '#3a7d44';
  const GL = '#e8f5ea';

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (v) => { onChange(v); setOpen(false); };

  return (
    <div ref={ref} className="relative select-none" style={{ minWidth: width }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-white border text-sm text-gray-800 transition"
        style={{
          borderColor: open ? G : '#d1d5db',
          boxShadow:   open ? `0 0 0 2px ${G}22` : 'none',
        }}
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className="shrink-0 text-gray-400 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 top-full mt-0.5 w-full bg-white border border-gray-200 z-50 shadow-lg overflow-hidden"
          style={{ borderColor: '#d1d5db' }}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => pick(opt.value)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition"
                style={{
                  background: active ? GL : undefined,
                  color:      active ? G  : '#374151',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = '';         }}
              >
                <span className={active ? 'font-semibold' : ''}>{opt.label}</span>
                {active && <Check size={13} style={{ color: G }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
