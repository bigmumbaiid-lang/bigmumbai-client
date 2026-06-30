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

const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';

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
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${map[color] ?? map.slate}`}>
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

    if (preset === 'week') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        return { dateFrom: localDateStr(start), dateTo: todayStr };
    }
    if (preset === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { dateFrom: localDateStr(start), dateTo: todayStr };
    }
    return { dateFrom: '', dateTo: '' };
}

const DEVICE_OPTS  = ['all', 'Mobile', 'Tablet', 'Desktop'];
const BROWSER_OPTS = ['all', 'Safari', 'Chrome', 'Firefox', 'Edge', 'Samsung', 'Opera'];
const PRESET_OPTS  = [
    { key: 'all',   label: 'All Time' },
    { key: 'today', label: 'Today'    },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom' },
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

function StatCard({ icon: Icon, label, value, color = 'amber', sub }) {
    const colors = {
        amber:  { bg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'bg-amber-100' },
        blue:   { bg: 'bg-blue-50',    icon: 'text-blue-600',    ring: 'bg-blue-100'  },
        violet: { bg: 'bg-violet-50',  icon: 'text-violet-600',  ring: 'bg-violet-100' },
        emerald:{ bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'bg-emerald-100' },
    };
    const c = colors[color];
    return (
        <div className={`${c.bg} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`${c.ring} rounded-xl p-2.5`}>
                <Icon size={18} className={c.icon} />
            </div>
            <div>
                <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
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
                className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition whitespace-nowrap ${
                    value !== 'all'
                        ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
                <Wifi size={13} />
                {value === 'all' ? 'Browser' : value}
                <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                    {BROWSER_OPTS.map((b) => (
                        <button
                            key={b}
                            onClick={() => { onChange(b); setOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm transition ${
                                value === b
                                    ? 'bg-amber-50 text-amber-700 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                            }`}
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
    const [preset,      setPreset]      = useState('all');
    const [dateFrom,    setDateFrom]    = useState('');
    const [dateTo,      setDateTo]      = useState('');
    const [deviceType,  setDeviceType]  = useState('all');
    const [browser,     setBrowser]     = useState('all');
    const [showCustom,  setShowCustom]  = useState(false);

    const LIMIT = 30;

    const activeFilterCount = [
        search       ? 1 : 0,
        preset !== 'all' ? 1 : 0,
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

    useEffect(() => { load({ page: 1 }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setPreset('all'); setDateFrom(''); setDateTo('');
        setDeviceType('all'); setBrowser('all');
        setShowCustom(false); setPage(1);
        load({ page: 1, search: '', dateFrom: '', dateTo: '', deviceType: 'all', browser: 'all' });
    };

    const handlePage = (p) => { setPage(p); load({ page: p }); };

    // ── Mobile %, top device ──
    const mobileCount  = sessions.filter((s) => s.device?.type === 'Mobile').length;
    const mobilePct    = sessions.length ? Math.round((mobileCount / sessions.length) * 100) : 0;

    return (
        <div className="space-y-4">

            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Users}      label="Total Sessions"  value={stats.total.toLocaleString()}    color="amber"   />
                <StatCard icon={Wifi}       label="Unique IPs"      value={stats.uniqueIPs.toLocaleString()} color="blue"   />
                <StatCard icon={Smartphone} label="Mobile"          value={`${mobilePct}%`}                  color="violet" sub="of visible sessions" />
                <StatCard icon={LayoutGrid} label="This Page"       value={sessions.length}                  color="emerald" sub={`of ${stats.total} total`} />
            </div>

            {/* ── Date preset chips ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <Calendar size={12} /> Date Range
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                        {PRESET_OPTS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => applyPreset(key)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                                    preset === key
                                        ? 'text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                style={preset === key ? { background: BRAND } : {}}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom date pickers */}
                {showCustom && (
                    <div className="flex items-end gap-3 flex-wrap pt-1 border-t border-slate-100">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-500 font-medium">From</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-500 font-medium">To</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                            />
                        </div>
                        <button
                            onClick={applyCustom}
                            disabled={!dateFrom && !dateTo}
                            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                            style={{ background: BRAND }}
                        >
                            Apply
                        </button>
                    </div>
                )}

                {/* Device type + Browser row */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <Filter size={12} /> Filters
                    </span>

                    {/* Device chips */}
                    <div className="flex gap-1.5">
                        {DEVICE_OPTS.map((d) => (
                            <button
                                key={d}
                                onClick={() => applyDevice(d)}
                                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                                    deviceType === d
                                        ? 'text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                style={deviceType === d ? { background: BRAND } : {}}
                            >
                                {d === 'Mobile'  && <Smartphone size={11} />}
                                {d === 'Tablet'  && <Tablet     size={11} />}
                                {d === 'Desktop' && <Monitor    size={11} />}
                                {d === 'all' ? 'All Devices' : d}
                            </button>
                        ))}
                    </div>

                    {/* Browser dropdown */}
                    <BrowserSelect value={browser} onChange={applyBrowser} />

                    {/* Clear all */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition ml-auto"
                        >
                            <X size={11} />
                            Clear filters
                            <span className="ml-0.5 bg-rose-200 text-rose-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                                {activeFilterCount}
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Search + actions row ── */}
            <div className="flex items-center gap-3 flex-wrap">
                <form onSubmit={applySearch} className="flex gap-2 flex-1 min-w-0">
                    <div className="relative flex-1 min-w-0 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder="Search username or IP…"
                            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                        style={{ background: BRAND }}
                    >
                        Search
                    </button>
                </form>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => exportCSV(sessions)}
                        disabled={!sessions.length}
                        title="Export current page to CSV"
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
                    >
                        <Download size={13} /> Export
                    </button>
                    <button
                        onClick={() => load({ page: 1 })}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {['Username', 'IP Address', 'Device', 'OS / Browser', 'Login Time', 'Action'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
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
                                <tr key={s._id} className="hover:bg-slate-50/60 transition-colors group">
                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                        {s.username}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-slate-600 text-xs bg-slate-100 px-2 py-0.5 rounded">
                                            {s.ipAddress}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 text-slate-600">
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
                                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Clock size={11} className="text-slate-400" />
                                            {fmtDate(s.loginAt)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => onBlockIP(s.ipAddress)}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-500">
                        {stats.total > 0
                            ? `Showing ${((page - 1) * LIMIT) + 1}–${Math.min(page * LIMIT, stats.total)} of ${stats.total} sessions`
                            : 'No sessions'}
                    </span>
                    {pagination.pages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePage(page - 1)}
                                disabled={page <= 1}
                                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {/* Page number pills */}
                            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                                .reduce((acc, p, i, arr) => {
                                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === '…'
                                        ? <span key={`dots-${i}`} className="px-1 text-slate-400 text-xs">…</span>
                                        : (
                                            <button
                                                key={p}
                                                onClick={() => handlePage(p)}
                                                className={`w-7 h-7 rounded text-xs font-medium transition ${
                                                    p === page
                                                        ? 'text-white shadow-sm'
                                                        : 'text-slate-600 hover:bg-slate-200'
                                                }`}
                                                style={p === page ? { background: BRAND } : {}}
                                            >
                                                {p}
                                            </button>
                                        )
                                )
                            }
                            <button
                                onClick={() => handlePage(page + 1)}
                                disabled={page >= pagination.pages}
                                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
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
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Ban size={15} className="text-red-500" /> Block an IP address
                </h3>
                <form onSubmit={handleBlock} className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-500 font-medium">IP Address</label>
                        <input
                            value={ipInput}
                            onChange={(e) => setIpInput(e.target.value)}
                            placeholder="e.g. 192.168.1.1"
                            required
                            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400/40 w-48 font-mono"
                        />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                        <label className="text-xs text-slate-500 font-medium">Reason (optional)</label>
                        <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Fraudulent activity"
                            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400/40"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={adding}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-60 transition-colors"
                    >
                        <Plus size={14} /> {adding ? 'Blocking…' : 'Block IP'}
                    </button>
                </form>
            </div>

            {/* Blocked list */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Globe size={14} className="text-slate-500" />
                        Blocked IPs
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            {blocked.length}
                        </span>
                    </h3>
                    <div className="flex items-center gap-2">
                        {/* Inline search for blocked list */}
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filter IP or reason…"
                                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 w-44"
                            />
                        </div>
                        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {['IP Address', 'Reason', 'Blocked At', 'Action'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
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
                                <tr key={b._id} className="hover:bg-red-50/30 transition-colors group">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-sm font-medium text-slate-800 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                                            {b.ip}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                                        {b.reason || <span className="text-slate-300 italic">No reason</span>}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Clock size={11} className="text-slate-400" />
                                            {fmtDate(b.blockedAt)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleUnblock(b.ip)}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
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
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 pl-14 pr-4 md:px-8 py-5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: BRAND }}>
                        <Shield size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Security</h1>
                        <p className="text-xs text-slate-500">Monitor login activity and manage IP access control</p>
                    </div>
                </header>

                {/* Tab bar */}
                <div className="bg-white border-b border-slate-200 px-8">
                    <nav className="flex gap-0">
                        {TABS.map((tab, i) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(i)}
                                className={`relative px-5 py-3.5 text-sm font-medium transition-colors focus:outline-none ${
                                    activeTab === i ? 'text-amber-700' : 'text-slate-500 hover:text-slate-700'
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
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {activeTab === 0 && <LoginHistory onBlockIP={handleBlockFromHistory} />}
                    {activeTab === 1 && <BlockedIPs pendingIP={pendingIP} onClearPending={() => setPendingIP('')} />}
                </div>
            </main>
        </div>
    );
}
