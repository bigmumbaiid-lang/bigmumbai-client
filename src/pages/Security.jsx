import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotify } from '../context/NotifyContext';
import {
    Shield, Smartphone, Tablet, Monitor, Ban, Search,
    RefreshCw, Plus, Trash2, Globe, Clock, ChevronLeft,
    ChevronRight, Calendar, Filter, X, Download, Users,
    Wifi, LayoutGrid, ChevronDown,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { securityApi } from '../api/security';
import DateRangePicker from '../components/DateRangePicker';

const G     = '#3a7d44';
const GL    = '#e8f5ea';
const BRAND = G;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DeviceIcon({ type, size = 14 }) {
    if (type === 'Mobile') return <Smartphone size={size} className="shrink-0" />;
    if (type === 'Tablet') return <Tablet     size={size} className="shrink-0" />;
    return                        <Monitor    size={size} className="shrink-0" />;
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

function Badge({ children, color = 'slate' }) {
    const map = {
        slate:  'bg-slate-100 text-slate-600',
        blue:   'bg-blue-50 text-blue-700',
        green:  'bg-emerald-50 text-emerald-700',
        amber:  'bg-amber-50 text-amber-700',
        violet: 'bg-violet-50 text-violet-700',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ${map[color] ?? map.slate}`}>
            {children}
        </span>
    );
}

// Format a Date as YYYY-MM-DD using the browser's LOCAL timezone (not UTC).
// toISOString() converts to UTC first, which shifts the date in non-UTC timezones.
function localDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Convert a YYYY-MM-DD string to the start/end of that local calendar day as a UTC ISO string.
// The server then does new Date(isoStr) and gets exactly the right UTC boundary.
function toLocalDayStart(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}
function toLocalDayEnd(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

// Date preset helpers — returns YYYY-MM-DD in LOCAL time (not UTC).
function getPresetDates(preset) {
    const now     = new Date();
    const todayStr = localDateStr(now);

    if (preset === 'today')
        return { dateFrom: todayStr, dateTo: todayStr };

    if (preset === 'last7') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        return { dateFrom: localDateStr(start), dateTo: todayStr };
    }
    if (preset === 'last30') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        return { dateFrom: localDateStr(start), dateTo: todayStr };
    }
    return { dateFrom: '', dateTo: '' };
}

const DEVICE_OPTS  = ['all', 'Mobile', 'Tablet', 'Desktop'];
const BROWSER_OPTS = ['all', 'Safari', 'Chrome', 'Firefox', 'Edge', 'Samsung', 'Opera'];
const PRESET_OPTS  = [
    { key: 'today',  label: 'Today'        },
    { key: 'last7',  label: 'Last 7 Days'  },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'custom', label: 'Custom'       },
];

// Export sessions to CSV
function exportCSV(sessions) {
    if (!sessions.length) return;
    const rows = [
        ['Username', 'IP Address', 'Device Type', 'Model', 'OS', 'Browser', 'Login Time'],
        ...sessions.map((s) => [
            s.username,
            s.ipAddress,
            s.device?.type  || '',
            s.device?.model || '',
            s.device?.os    || '',
            s.device?.browser || '',
            s.loginAt ? new Date(s.loginAt).toISOString() : '',
        ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `login-sessions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color = 'green', sub }) {
    const colors = {
        green:  { bg: GL,          icon: G,         ring: '#c8e6c9' },
        blue:   { bg: '#eff6ff',   icon: '#2563eb', ring: '#dbeafe' },
        violet: { bg: '#f5f3ff',   icon: '#7c3aed', ring: '#ede9fe' },
        emerald:{ bg: '#ecfdf5',   icon: '#059669', ring: '#d1fae5' },
    };
    const c = colors[color] || colors.green;
    return (
        <div className="border border-gray-200 p-3 md:p-4 flex items-center gap-3" style={{ background: c.bg }}>
            <div className="p-2.5 shrink-0" style={{ background: c.ring }}>
                <Icon size={18} style={{ color: c.icon }} />
            </div>
            <div>
                <p className="text-lg md:text-xl font-bold text-slate-800 leading-none">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Browser Dropdown ─────────────────────────────────────────────────────────

function BrowserSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border transition whitespace-nowrap"
                style={value !== 'all'
                    ? { borderColor: G, background: GL, color: G }
                    : { borderColor: '#d1d5db', background: '#fff', color: '#374151' }}
            >
                <Wifi size={13} />
                {value === 'all' ? 'Browser' : value}
                <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 shadow-lg py-1 min-w-[130px]">
                    {BROWSER_OPTS.map((b) => (
                        <button
                            key={b}
                            onClick={() => { onChange(b); setOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm transition"
                            style={value === b
                                ? { background: GL, color: G, fontWeight: 600 }
                                : { color: '#374151' }}
                            onMouseEnter={e => { if (value !== b) e.currentTarget.style.background = '#f9fafb'; }}
                            onMouseLeave={e => { if (value !== b) e.currentTarget.style.background = ''; }}
                        >
                            {b === 'all' ? 'All Browsers' : b}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Tab: Login History ───────────────────────────────────────────────────────

function LoginHistory({ onBlockIP }) {
    const notify = useNotify();

    // Core data
    const [sessions,    setSessions]    = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [page,        setPage]        = useState(1);
    const [pagination,  setPagination]  = useState({ total: 0, pages: 1 });
    const [stats,       setStats]       = useState({ total: 0, uniqueIPs: 0 });

    // Filter state
    const [search,      setSearch]      = useState('');
    const [inputVal,    setInputVal]    = useState('');
    const [preset,      setPreset]      = useState('today');
    const [dateFrom,    setDateFrom]    = useState('');
    const [dateTo,      setDateTo]      = useState('');
    const [deviceType,  setDeviceType]  = useState('all');
    const [browser,     setBrowser]     = useState('all');
    const [showCustom,  setShowCustom]  = useState(false);

    const LIMIT = 30;

    const activeFilterCount = [
        search ? 1 : 0,
        deviceType !== 'all' ? 1 : 0,
        browser    !== 'all' ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const load = useCallback(async (opts = {}) => {
        setLoading(true);
        try {
            const df = opts.dateFrom ?? dateFrom;
            const dt = opts.dateTo   ?? dateTo;
            // Convert YYYY-MM-DD to exact local-day UTC boundaries so the server
            // doesn't have to guess the timezone. Already-converted ISO strings pass through.
            const isoFrom = df && !df.includes('T') ? toLocalDayStart(df) : df;
            const isoTo   = dt && !dt.includes('T') ? toLocalDayEnd(dt)   : dt;
            const res = await securityApi.getSessions({
                page:       opts.page       ?? page,
                limit:      LIMIT,
                search:     opts.search     ?? search,
                dateFrom:   isoFrom,
                dateTo:     isoTo,
                deviceType: opts.deviceType ?? deviceType,
                browser:    opts.browser    ?? browser,
            });
            setSessions(res.data || []);
            setPagination(res.pagination || { total: 0, pages: 1 });
            setStats(res.stats || { total: 0, uniqueIPs: 0 });
        } catch {
            notify.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }, [page, search, dateFrom, dateTo, deviceType, browser]);

    useEffect(() => {
        const { dateFrom: df, dateTo: dt } = getPresetDates('today');
        setDateFrom(df); setDateTo(dt);
        load({ page: 1, dateFrom: df, dateTo: dt });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handlers ──

    const applySearch = (e) => {
        e?.preventDefault();
        const s = inputVal.trim();
        setSearch(s); setPage(1);
        load({ page: 1, search: s });
    };

    const applyPreset = (key) => {
        setPreset(key);
        setShowCustom(key === 'custom');
        if (key === 'custom') return; // wait for user to set dates
        const { dateFrom: df, dateTo: dt } = getPresetDates(key);
        setDateFrom(df); setDateTo(dt); setPage(1);
        load({ page: 1, dateFrom: df, dateTo: dt });
    };

    const applyCustom = () => {
        setPage(1);
        load({ page: 1, dateFrom, dateTo });
    };

    const applyDevice = (d) => {
        setDeviceType(d); setPage(1);
        load({ page: 1, deviceType: d });
    };

    const applyBrowser = (b) => {
        setBrowser(b); setPage(1);
        load({ page: 1, browser: b });
    };

    const clearAll = () => {
        setInputVal(''); setSearch('');
        const { dateFrom: df, dateTo: dt } = getPresetDates('today');
        setPreset('today'); setDateFrom(df); setDateTo(dt);
        setDeviceType('all'); setBrowser('all');
        setShowCustom(false); setPage(1);
        load({ page: 1, search: '', dateFrom: df, dateTo: dt, deviceType: 'all', browser: 'all' });
    };

    const handlePage = (p) => { setPage(p); load({ page: p }); };

    // ── Mobile %, top device ──
    const mobileCount  = sessions.filter((s) => s.device?.type === 'Mobile').length;
    const mobilePct    = sessions.length ? Math.round((mobileCount / sessions.length) * 100) : 0;

    return (
        <div className="space-y-4">

            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard icon={Users}      label="Total Sessions"  value={stats.total.toLocaleString()}    color="green"   />
                <StatCard icon={Wifi}       label="Unique IPs"      value={stats.uniqueIPs.toLocaleString()} color="blue"   />
                <StatCard icon={Smartphone} label="Mobile"          value={`${mobilePct}%`}                  color="violet" sub="of visible sessions" />
                <StatCard icon={LayoutGrid} label="This Page"       value={sessions.length}                  color="emerald" sub={`of ${stats.total} total`} />
            </div>

            {/* ── Date preset chips ── */}
            <div className="bg-white border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-2 md:overflow-x-auto md:scrollbar-none">
                    <span className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">
                        <Calendar size={12} /> Date Range
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 w-full md:flex md:w-auto md:shrink-0">
                        {PRESET_OPTS.filter(({ key }) => key !== 'custom').map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => applyPreset(key)}
                                className="px-3 py-1.5 text-xs font-semibold border transition md:whitespace-nowrap"
                                style={preset === key
                                    ? { background: G, borderColor: G, color: '#fff' }
                                    : { background: '#fff', borderColor: '#d1d5db', color: '#374151' }}
                            >
                                {label}
                            </button>
                        ))}
                        <button
                            onClick={() => applyPreset('custom')}
                            className="col-span-2 md:col-auto px-3 py-1.5 text-xs font-semibold border transition md:whitespace-nowrap"
                            style={preset === 'custom'
                                ? { background: G, borderColor: G, color: '#fff' }
                                : { background: '#fff', borderColor: '#d1d5db', color: '#374151' }}
                        >
                            Custom
                        </button>
                    </div>
                </div>

                {/* Custom date picker */}
                {showCustom && (
                    <div className="pt-1 border-t border-gray-100">
                        <DateRangePicker
                            from={dateFrom} to={dateTo}
                            onChange={(f, t) => {
                                setDateFrom(f); setDateTo(t);
                                if (f && t) { setPage(1); load({ page: 1, dateFrom: f, dateTo: t }); }
                            }}
                            placeholder="Pick date range"
                        />
                    </div>
                )}

                {/* Device type row — scrollable (no dropdowns) */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1 border-t border-gray-100">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">
                        <Filter size={12} /> Filters
                    </span>

                    {/* Device chips */}
                    <div className="flex gap-1.5 shrink-0">
                        {DEVICE_OPTS.map((d) => (
                            <button
                                key={d}
                                onClick={() => applyDevice(d)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border transition whitespace-nowrap"
                                style={deviceType === d
                                    ? { background: G, borderColor: G, color: '#fff' }
                                    : { background: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' }}
                            >
                                {d === 'Mobile'  && <Smartphone size={11} />}
                                {d === 'Tablet'  && <Tablet     size={11} />}
                                {d === 'Desktop' && <Monitor    size={11} />}
                                {d === 'all' ? 'All Devices' : d}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Browser + Clear — separate row so dropdown isn't clipped */}
                <div className="flex items-center gap-2 flex-wrap">
                    <BrowserSelect value={browser} onChange={applyBrowser} />

                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition ml-auto"
                        >
                            <X size={11} />
                            Clear ({activeFilterCount})
                        </button>
                    )}
                </div>
            </div>

            {/* ── Search + actions row ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <form onSubmit={applySearch} className="flex gap-2 flex-1 min-w-0">
                    <div className="relative flex-1 min-w-0">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder="Search username or IP…"
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/20"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-semibold text-white transition"
                        style={{ background: G }}
                        onMouseEnter={e => e.currentTarget.style.background = '#2e6437'}
                        onMouseLeave={e => e.currentTarget.style.background = G}
                    >
                        Search
                    </button>
                </form>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => exportCSV(sessions)}
                        disabled={!sessions.length}
                        title="Export current page to CSV"
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                        <Download size={13} /> Export
                    </button>
                    <button
                        onClick={() => load({ page: 1 })}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-300 hover:bg-gray-50"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-hidden border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200" style={{ background: GL }}>
                                {['Username', 'IP Address', 'Device', 'OS / Browser', 'Login Time', 'Action'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: G }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-14 text-center">
                                        <div className="inline-flex flex-col items-center gap-2 text-slate-400">
                                            <RefreshCw size={20} className="animate-spin" />
                                            <span className="text-sm">Loading…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-14 text-center">
                                        <div className="inline-flex flex-col items-center gap-2 text-slate-400">
                                            <Search size={20} />
                                            <span className="text-sm">No sessions match your filters</span>
                                            {activeFilterCount > 0 && (
                                                <button onClick={clearAll} className="text-xs text-amber-600 hover:underline">
                                                    Clear all filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : sessions.map((s) => (
                                <tr key={s._id} className="hover:bg-[#f6fbf6] transition-colors group">
                                    <td className="px-4 py-3 font-semibold text-gray-800">
                                        {s.username}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-gray-600 text-xs bg-gray-100 px-2 py-0.5">
                                            {s.ipAddress}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <DeviceIcon type={s.device?.type} />
                                            <span className="text-xs">
                                                {s.device?.type || 'Unknown'}
                                                {s.device?.model ? ` · ${s.device.model}` : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-0.5">
                                            <Badge color="blue">{s.device?.os || 'Unknown OS'}</Badge>
                                            <Badge color="slate">{s.device?.browser || 'Unknown'}</Badge>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Clock size={11} className="text-gray-400" />
                                            {fmtDate(s.loginAt)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => onBlockIP(s.ipAddress)}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Ban size={12} /> Block IP
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                        {stats.total > 0
                            ? `Showing ${((page - 1) * LIMIT) + 1}–${Math.min(page * LIMIT, stats.total)} of ${stats.total} sessions`
                            : 'No sessions'}
                    </span>
                    {pagination.pages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePage(page - 1)}
                                disabled={page <= 1}
                                className="px-3 py-1.5 border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                                .reduce((acc, p, i, arr) => {
                                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === '…'
                                        ? <span key={`dots-${i}`} className="px-1 text-gray-400 text-xs">…</span>
                                        : (
                                            <button
                                                key={p}
                                                onClick={() => handlePage(p)}
                                                className="px-3 py-1.5 text-xs font-semibold border transition"
                                                style={p === page
                                                    ? { background: G, borderColor: G, color: '#fff' }
                                                    : { borderColor: '#d1d5db', color: '#374151' }}
                                            >
                                                {p}
                                            </button>
                                        )
                                )
                            }
                            <button
                                onClick={() => handlePage(page + 1)}
                                disabled={page >= pagination.pages}
                                className="px-3 py-1.5 border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Blocked IPs ─────────────────────────────────────────────────────────

function BlockedIPs({ pendingIP, onClearPending }) {
    const notify = useNotify();
    const [blocked,  setBlocked]  = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [ipInput,  setIpInput]  = useState('');
    const [reason,   setReason]   = useState('');
    const [adding,   setAdding]   = useState(false);
    const [search,   setSearch]   = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await securityApi.getBlockedIPs();
            setBlocked(res.data || []);
        } catch {
            notify.error('Failed to load blocked IPs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (pendingIP) { setIpInput(pendingIP); onClearPending(); }
    }, [pendingIP, onClearPending]);

    const handleBlock = async (e) => {
        e.preventDefault();
        if (!ipInput.trim()) return;
        setAdding(true);
        try {
            await securityApi.blockIP({ ip: ipInput.trim(), reason });
            notify.success(`IP ${ipInput.trim()} blocked`);
            setIpInput(''); setReason('');
            load();
        } catch (err) {
            notify.error(err?.response?.data?.message || 'Failed to block IP');
        } finally {
            setAdding(false);
        }
    };

    const handleUnblock = async (ip) => {
        const ok = await notify.confirm({
            title: 'Unblock IP',
            message: `Allow traffic from ${ip} again?`,
            confirmLabel: 'Unblock',
            variant: 'primary',
        });
        if (!ok) return;
        try {
            await securityApi.unblockIP(ip);
            notify.success(`IP ${ip} unblocked`);
            setBlocked((prev) => prev.filter((b) => b.ip !== ip));
        } catch {
            notify.error('Failed to unblock IP');
        }
    };

    const filtered = search.trim()
        ? blocked.filter((b) => b.ip.includes(search.trim()) || (b.reason || '').toLowerCase().includes(search.trim().toLowerCase()))
        : blocked;

    return (
        <div className="space-y-6">
            {/* Add IP form */}
            <div className="bg-white border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Ban size={15} className="text-red-500" /> Block an IP address
                </h3>
                <form onSubmit={handleBlock} className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-medium">IP Address</label>
                        <input
                            value={ipInput}
                            onChange={(e) => setIpInput(e.target.value)}
                            placeholder="e.g. 192.168.1.1"
                            required
                            className="px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/20 w-48 font-mono"
                        />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                        <label className="text-xs text-gray-500 font-medium">Reason (optional)</label>
                        <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Fraudulent activity"
                            className="px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/20"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={adding}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors"
                    >
                        <Plus size={14} /> {adding ? 'Blocking…' : 'Block IP'}
                    </button>
                </form>
            </div>

            {/* Blocked list */}
            <div className="overflow-hidden border border-gray-200 bg-white">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Globe size={14} className="text-gray-500" />
                        Blocked IPs
                        <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium">
                            {blocked.length}
                        </span>
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filter IP or reason…"
                                className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/20 w-44"
                            />
                        </div>
                        <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1.5">
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200" style={{ background: GL }}>
                                {['IP Address', 'Reason', 'Blocked At', 'Action'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: G }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">Loading…</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                                        {search ? 'No results match your search' : 'No IPs are currently blocked'}
                                    </td>
                                </tr>
                            ) : filtered.map((b) => (
                                <tr key={b._id} className="hover:bg-red-50/20 transition-colors group">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-sm font-medium text-gray-800 bg-red-50 border border-red-200 px-2 py-0.5">
                                            {b.ip}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                                        {b.reason || <span className="text-gray-300 italic">No reason</span>}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Clock size={11} className="text-gray-400" />
                                            {fmtDate(b.blockedAt)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleUnblock(b.ip)}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={12} /> Unblock
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Login History', 'Blocked IPs'];

export default function Security() {
    const [activeTab, setActiveTab] = useState(0);
    const [pendingIP, setPendingIP] = useState('');

    const handleBlockFromHistory = (ip) => {
        setPendingIP(ip);
        setActiveTab(1);
    };

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7f4' }}>
            <Sidebar />

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-5 flex items-center gap-3 md:sticky md:top-0 z-10">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: BRAND }}>
                        <Shield size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Security</h1>
                        <p className="text-xs text-slate-500 hidden md:block">Monitor login activity and manage IP access control</p>
                    </div>
                </header>

                {/* Tab bar */}
                <div className="bg-white border-b border-gray-200 px-4 md:px-8 overflow-x-auto scrollbar-none">
                    <nav className="flex gap-0 min-w-max">
                        {TABS.map((tab, i) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(i)}
                                className={`relative px-5 py-3.5 text-sm font-medium transition-colors focus:outline-none whitespace-nowrap ${
                                    activeTab === i ? 'text-[#3a7d44] font-semibold' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab}
                                {activeTab === i && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: BRAND }} />
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {activeTab === 0 && <LoginHistory onBlockIP={handleBlockFromHistory} />}
                    {activeTab === 1 && <BlockedIPs pendingIP={pendingIP} onClearPending={() => setPendingIP('')} />}
                </div>
            </main>
        </div>
    );
}
