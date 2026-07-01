import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function parseYmd(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toYmd(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dispFmt(d) {
  if (!d) return '';
  return `${SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function midnight(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}

export default function DateRangePicker({ from, to, onChange, placeholder = 'Select date range' }) {
  const [open, setOpen]           = useState(false);
  const [viewYear, setViewYear]   = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [hover, setHover]         = useState(null);
  const ref = useRef(null);

  const fromDate = parseYmd(from);
  const toDate   = parseYmd(to);
  const phase    = from && !to ? 1 : 0; // 1 = waiting for end date

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (day) => {
    const clicked = new Date(viewYear, viewMonth, day);
    if (phase === 0) {
      onChange(toYmd(clicked), '');
    } else {
      const start = fromDate;
      if (clicked < start) { onChange(toYmd(clicked), toYmd(start)); }
      else                  { onChange(toYmd(start),   toYmd(clicked)); setOpen(false); }
    }
  };

  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow  = new Date(viewYear, viewMonth, 1).getDay();
  const cells     = [...Array(startDow).fill(null), ...Array.from({length: totalDays}, (_, i) => i + 1)];
  const todayMid  = midnight(new Date());

  const getCellStyle = (day) => {
    const d     = midnight(new Date(viewYear, viewMonth, day));
    const isStart = fromDate && d.getTime() === midnight(fromDate).getTime();
    const isEnd   = toDate   && d.getTime() === midnight(toDate).getTime();
    const isToday = d.getTime() === todayMid.getTime();

    let inRange = false, inHover = false;
    if (fromDate && toDate) {
      inRange = d > midnight(fromDate) && d < midnight(toDate);
    } else if (fromDate && hover && phase === 1) {
      const h = midnight(hover), f = midnight(fromDate);
      inHover = h > f ? (d > f && d < h) : (d < f && d > h);
    }

    const endpoint = isStart || isEnd;
    return {
      btn: {
        border: 'none', cursor: 'pointer', padding: '7px 0',
        borderRadius: endpoint ? 8 : (inRange || inHover) ? 3 : 8,
        fontSize: 12, fontWeight: (endpoint || isToday) ? 700 : 400,
        background: endpoint ? 'linear-gradient(90deg,#d9ad82,#b1835a)' : (inRange || inHover) ? '#fdf3e8' : 'transparent',
        color: endpoint ? 'white' : isToday ? '#b1835a' : '#374151',
        transition: 'background 0.1s',
        position: 'relative',
      },
      dot: isToday && !endpoint,
    };
  };

  const hasValue = from || to;
  const label = fromDate && toDate
    ? `${dispFmt(fromDate)} → ${dispFmt(toDate)}`
    : fromDate ? `${dispFmt(fromDate)} → …`
    : placeholder;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
          border: open ? '1.5px solid #b1835a' : '1px solid #e5e7eb',
          background: 'white', fontSize: 13,
          color: hasValue ? '#374151' : '#9ca3af',
          boxShadow: open ? '0 0 0 3px rgba(217,173,130,0.15)' : 'none',
          transition: 'all 0.15s', whiteSpace: 'nowrap', minWidth: 230,
        }}
      >
        <Calendar size={14} style={{ color: '#b1835a', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        {hasValue && (
          <span
            onClick={e => { e.stopPropagation(); onChange('', ''); }}
            style={{ display: 'flex', alignItems: 'center', color: '#d1d5db', cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
            onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
          >
            <X size={12} />
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
          background: 'white', borderRadius: 14, width: 292,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.07)', padding: 16,
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: '#9ca3af', display: 'flex' }}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, color: '#9ca3af', display: 'flex' }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em', paddingBottom: 2 }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }} onMouseLeave={() => setHover(null)}>
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const { btn, dot } = getCellStyle(day);
              return (
                <button
                  key={i}
                  onClick={() => handleDay(day)}
                  onMouseEnter={() => phase === 1 && setHover(new Date(viewYear, viewMonth, day))}
                  style={btn}
                >
                  {day}
                  {dot && (
                    <span style={{
                      position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                      width: 3, height: 3, borderRadius: '50%', background: '#b1835a',
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {!from ? 'Click start date' : phase === 1 ? 'Click end date' : '✓ Range selected'}
            </span>
            {hasValue && (
              <button onClick={() => onChange('', '')} style={{ fontSize: 11, color: '#b1835a', background: 'none', border: 'none', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
