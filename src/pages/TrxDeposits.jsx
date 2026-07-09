import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import Select from '../components/Select';
import { useNotify } from '../context/NotifyContext';
import AppModal, { ModalBtn } from '../components/AppModal';
import {
    RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
    ExternalLink, Send, Search, Download, Loader2, TrendingUp,
    Hash, IndianRupee, Key, Eye, EyeOff, Copy, X,
} from 'lucide-react';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const inr = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '—';

const STATUS_CFG = {
    pending:   { label: 'Pending',   bg: '#fef9c3', color: '#a16207', Icon: Clock        },
    completed: { label: 'Completed', bg: GL,         color: G,         Icon: CheckCircle  },
    expired:   { label: 'Expired',   bg: '#fff1f2',  color: '#be123c', Icon: XCircle      },
    cancelled: { label: 'Cancelled', bg: '#f3f4f6',  color: '#6b7280', Icon: XCircle      },
};

const TRONSCAN      = 'https://tronscan.org/#/transaction/';
const TRONSCAN_ADDR = 'https://tronscan.org/#/address/';

const IST = 330 * 60000;
const istStart = (d = new Date()) => {
    const x = new Date(d.getTime() + IST);
    x.setUTCHours(0, 0, 0, 0);
    return new Date(x.getTime() - IST);
};

const DATE_PRESETS = [
    { key: 'today',  label: 'Today'        },
    { key: 'last7',  label: 'Last 7 Days'  },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'all',    label: 'All time'     },
    { key: 'custom', label: 'Custom Range' },
];

function getPresetRange(key) {
    const now = new Date();
    const today = istStart(now);
    if (key === 'today')  return { from: today.toISOString(), to: now.toISOString() };
    if (key === 'last7')  return { from: istStart(new Date(now - 6  * 86400000)).toISOString(), to: now.toISOString() };
    if (key === 'last30') return { from: istStart(new Date(now - 29 * 86400000)).toISOString(), to: now.toISOString() };
    return {};
}

const inputCls =
    'border border-gray-300 bg-white text-sm text-gray-800 px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400';

function exportCSV(deposits) {
    const headers = ['User', 'Email', 'Deposit Address', 'Expected TRX', 'INR Credited', 'Rate', 'TxID', 'Status', 'Created', 'Completed'];
    const rows = deposits.map(d => [
        d.user?.username || '', d.user?.email || '', d.depositAddress || '',
        d.expectedTrxAmount, d.status === 'completed' ? d.inrAmount : '',
        d.rateAtCreation, d.txId || '', d.status, fmtDate(d.createdAt), fmtDate(d.completedAt),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `trx-deposits-${Date.now()}.csv`;
    a.click();
}

// ── Collect Modal ─────────────────────────────────────────────────────────────
function CollectModal({ deposit, onClose, onSuccess }) {
    const notify = useNotify();
    const [loading, setLoading]       = useState(false);
    const [balance, setBalance]       = useState(null);
    const [loadingBal, setLoadingBal] = useState(true);
    const [privKey, setPrivKey]       = useState(null);
    const [loadingKey, setLoadingKey] = useState(false);
    const [keyVisible, setKeyVisible] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get(`/trx/admin/deposit-balance/${deposit._id}`);
                if (!cancelled) setBalance(data.balance ?? 0);
            } catch { if (!cancelled) setBalance(0); }
            finally  { if (!cancelled) setLoadingBal(false); }
        })();
        return () => { cancelled = true; };
    }, [deposit._id]);

    const handleCollect = async () => {
        if (!balance || balance <= 0) return;
        setLoading(true);
        try {
            const { data } = await api.post('/trx/admin/collect', { orderId: deposit._id });
            if (data.success) {
                notify.success(`${data.message}${data.txid ? ` — TronScan: ${data.txid.slice(0, 12)}…` : ''}`);
                onSuccess?.(); onClose();
            } else { notify.error(data.message || 'Collection failed'); }
        } catch (err) {
            notify.error(err?.response?.data?.message || 'Collection failed');
        } finally { setLoading(false); }
    };

    return (
        <AppModal onClose={onClose} onConfirm={handleCollect} size="sm">
            <AppModal.Header icon={<Send size={15} />} title="Collect TRX" subtitle={deposit.user?.username || '—'} onClose={onClose} accent="rose" />
            <AppModal.Body className="space-y-3">
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Deposit Address</p>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-2.5">
                        <span className="font-mono text-xs text-gray-700 break-all flex-1">{deposit.depositAddress}</span>
                        <a href={`${TRONSCAN_ADDR}${deposit.depositAddress}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-400 hover:text-blue-600">
                            <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
                <div className="flex items-center justify-between border border-gray-100 px-3 py-2.5">
                    <span className="text-sm text-gray-500">Available Balance</span>
                    {loadingBal ? <Loader2 size={14} className="animate-spin text-gray-400" />
                        : <span className="text-sm font-bold text-gray-800">{Number(balance || 0).toFixed(4)} TRX</span>}
                </div>
                {!loadingBal && (!balance || balance <= 0) && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2.5">No TRX available at this address.</p>
                )}
                <div className="border border-amber-200 overflow-hidden">
                    <button
                        onClick={async () => {
                            if (privKey) { setKeyVisible(v => !v); return; }
                            setLoadingKey(true);
                            try {
                                const { data } = await api.get(`/trx/admin/deposit-key/${deposit._id}`);
                                if (data.success) { setPrivKey(data.privateKey); setKeyVisible(true); }
                                else notify.error(data.message || 'Failed to get private key');
                            } catch (err) { notify.error(err?.response?.data?.message || 'Failed to get private key'); }
                            finally { setLoadingKey(false); }
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 hover:bg-amber-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Key size={13} className="text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700">Manual Export — Show Private Key</span>
                        </div>
                        {loadingKey ? <Loader2 size={13} className="animate-spin text-amber-500" />
                            : privKey ? (keyVisible ? <EyeOff size={13} className="text-amber-500" /> : <Eye size={13} className="text-amber-500" />)
                            : <Eye size={13} className="text-amber-500" />}
                    </button>
                    {privKey && keyVisible && (
                        <div className="px-4 py-3 bg-white space-y-2">
                            <p className="text-[10px] text-red-500 font-semibold">⚠ Never share this key. Import into TronLink to send TRX manually.</p>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
                                <span className="font-mono text-xs text-gray-800 break-all flex-1 select-all">{privKey}</span>
                                <button onClick={() => { navigator.clipboard?.writeText(privKey); notify.success('Copied'); }}
                                    className="shrink-0 p-1.5 hover:bg-gray-200 transition-colors" title="Copy">
                                    <Copy size={13} className="text-gray-500" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </AppModal.Body>
            <AppModal.Footer>
                <ModalBtn variant="secondary" onClick={onClose}>Cancel</ModalBtn>
                <ModalBtn variant="rose" onClick={handleCollect} disabled={loading || loadingBal || !balance || balance <= 0} className="flex items-center gap-1.5">
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {loading ? 'Collecting…' : 'Collect All'}
                </ModalBtn>
            </AppModal.Footer>
        </AppModal>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TrxDeposits() {
    const notify = useNotify();
    const searchTimer = useRef(null);

    const [deposits, setDeposits]           = useState([]);
    const [loading, setLoading]             = useState(false);
    const [page, setPage]                   = useState(1);
    const [totalPages, setTotalPages]       = useState(1);
    const [total, setTotal]                 = useState(0);
    const [summary, setSummary]             = useState(null);
    const [filterStatus, setFilterStatus]   = useState('');
    const [datePreset, setDatePreset]       = useState('today');
    const [customFrom, setCustomFrom]       = useState('');
    const [customTo, setCustomTo]           = useState('');
    const [searchInput, setSearchInput]     = useState('');
    const [search, setSearch]               = useState('');
    const [autoRefresh, setAutoRefresh]     = useState(false);
    const [collectTarget, setCollectTarget] = useState(null);
    const [copied, setCopied]               = useState('');

    const copyText = (text, key) => {
        const done = () => { setCopied(key); setTimeout(() => setCopied(''), 1500); };
        if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done); return; }
        const el = document.createElement('textarea');
        el.value = text; el.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(el); el.select(); document.execCommand('copy');
        document.body.removeChild(el); done();
    };

    const limit = 20;

    const buildDateParams = useCallback(() => {
        if (datePreset === 'custom') {
            const p = {};
            if (customFrom) p.from = new Date(customFrom + 'T00:00:00+05:30').toISOString();
            if (customTo)   p.to   = new Date(customTo   + 'T23:59:59+05:30').toISOString();
            return p;
        }
        return getPresetRange(datePreset);
    }, [datePreset, customFrom, customTo]);

    const fetchDeposits = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page, limit,
                ...(filterStatus && { status: filterStatus }),
                ...(search       && { q: search }),
                ...buildDateParams(),
            };
            const { data } = await api.get('/trx/admin/all', { params });
            if (data.success) {
                setDeposits(data.deposits || []);
                setTotalPages(data.pagination?.pages || 1);
                setTotal(data.pagination?.total || 0);
                setSummary(data.summary || null);
            } else { notify.error(data.message || 'Failed to load deposits'); }
        } catch (err) {
            notify.error(err?.response?.data?.message || 'Failed to connect');
        } finally { setLoading(false); }
    }, [page, filterStatus, search, buildDateParams]); // eslint-disable-line

    useEffect(() => { fetchDeposits(); }, [fetchDeposits]);
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(fetchDeposits, 15000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchDeposits]);

    const handleSearch = (v) => { setSearchInput(v); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => { setSearch(v.trim()); setPage(1); }, 500); };
    const handlePreset = (key) => { setDatePreset(key); setPage(1); };

    const resetFilters = () => {
        setSearchInput(''); setSearch('');
        setFilterStatus(''); handlePreset('today');
    };

    const successRate = summary && summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

    return (
        <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
            <Sidebar />
            <main className="flex-1 overflow-auto">

                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between md:sticky md:top-0 z-10">
                    <div className="min-w-0">
                        <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">TRX Deposits</h1>
                        <p className="hidden md:block text-xs text-gray-400 mt-0.5">Native TRON coin deposits — auto-swept to main wallet on confirmation</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setAutoRefresh(p => !p)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border transition whitespace-nowrap"
                            style={autoRefresh
                                ? { background: GL, color: G, borderColor: G }
                                : { background: '#fff', color: '#6b7280', borderColor: '#d1d5db' }}
                        >
                            <RefreshCw size={13} className={autoRefresh ? 'animate-spin' : ''} />
                            {autoRefresh ? 'Live' : 'Auto'}
                        </button>
                        <button
                            onClick={() => exportCSV(deposits)} disabled={deposits.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition whitespace-nowrap"
                        >
                            <Download size={13} /> CSV
                        </button>
                        <button
                            onClick={() => { setPage(1); fetchDeposits(); }}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>
                </header>

                <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-5">

                    {/* Stat cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {[
                            { label: 'Total Deposits', value: summary?.total ?? total,     valueColor: '#111827', icon: Hash,        iconColor: '#2563eb', iconBg: '#eff6ff', fmt: v => v.toLocaleString() },
                            { label: 'TRX Expected',   value: summary?.totalTrx ?? 0,      valueColor: '#111827', icon: Send,        iconColor: '#d97706', iconBg: '#fef9c3', fmt: v => `${Number(v).toFixed(2)} TRX` },
                            { label: 'INR Credited',   value: summary?.totalInr ?? 0,      valueColor: '#15803d', icon: IndianRupee, iconColor: G,         iconBg: GL,        fmt: v => inr(v) },
                            { label: 'Success Rate',   value: successRate,                  valueColor: successRate >= 50 ? '#15803d' : '#be123c', icon: TrendingUp, iconColor: successRate >= 50 ? G : '#e11d48', iconBg: successRate >= 50 ? GL : '#fff1f2', fmt: v => `${v}%` },
                        ].map(({ label, value, valueColor, icon: Icon, iconColor, iconBg, fmt }) => (
                            <div key={label} className="bg-white border border-gray-200 p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
                                    <p className="text-2xl font-bold leading-none tracking-tight" style={{ color: valueColor }}>{fmt(value)}</p>
                                </div>
                                <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                                    <Icon size={19} style={{ color: iconColor }} strokeWidth={2.2} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filter panel */}
                    <div className="bg-white border border-gray-200">
                        {/* Row 1 — search */}
                        <div className="p-4 border-b border-gray-100">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input value={searchInput} onChange={e => handleSearch(e.target.value)}
                                    placeholder="Search by exact username or full deposit address…"
                                    className={inputCls + ' w-full pl-9'} />
                            </div>
                        </div>

                        {/* Row 2 — date presets (2-up grid on mobile, scrollable row on desktop) */}
                        <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-2 md:overflow-x-auto md:scrollbar-none border-b border-gray-100">
                            <span className="hidden md:inline text-xs text-gray-400 font-medium shrink-0">Date:</span>
                            {DATE_PRESETS.filter(p => p.key !== 'custom').map(p => (
                                <button key={p.key} onClick={() => handlePreset(p.key)}
                                    className="px-3 py-1.5 text-sm font-medium border transition md:shrink-0 md:whitespace-nowrap"
                                    style={datePreset === p.key
                                        ? { background: G, color: '#fff', borderColor: G }
                                        : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}>
                                    {p.label}
                                </button>
                            ))}
                            <button onClick={() => handlePreset('custom')}
                                className="col-span-2 md:col-auto px-3 py-1.5 text-sm font-medium border transition md:shrink-0 md:whitespace-nowrap"
                                style={datePreset === 'custom'
                                    ? { background: G, color: '#fff', borderColor: G }
                                    : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}>
                                Custom Range
                            </button>
                            {datePreset === 'custom' && (
                                <DateRangePicker
                                    className="col-span-2 md:col-auto"
                                    from={customFrom} to={customTo}
                                    onChange={(f, t) => { setCustomFrom(f); setCustomTo(t); setPage(1); }}
                                    placeholder="Pick date range"
                                />
                            )}
                        </div>

                        {/* Row 3 — status + reset + count */}
                        <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
                            <Select
                                value={filterStatus}
                                onChange={(v) => { setFilterStatus(v); setPage(1); }}
                                width="150px"
                                options={[
                                    { value: '',          label: 'All Status' },
                                    { value: 'pending',   label: 'Pending'    },
                                    { value: 'completed', label: 'Completed'  },
                                    { value: 'expired',   label: 'Expired'    },
                                    { value: 'cancelled', label: 'Cancelled'  },
                                ]}
                            />
                            <button onClick={resetFilters}
                                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-xs text-gray-500 hover:bg-gray-50 transition ml-auto">
                                <X size={12} /> Reset
                            </button>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{total} record{total !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ background: GL }}>
                                        {['User', 'Deposit Address', 'Expected TRX', 'INR Credited', 'Rate', 'TxID', 'Status', 'Created', 'Completed', 'Action'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: G }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        [...Array(6)].map((_, i) => (
                                            <tr key={i}><td colSpan={10} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse" /></td></tr>
                                        ))
                                    ) : deposits.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-16 text-center">
                                                <Search size={36} className="mx-auto text-gray-300 mb-3" />
                                                <p className="text-gray-500 font-medium">No TRX deposits found</p>
                                                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                                            </td>
                                        </tr>
                                    ) : deposits.map((dep) => {
                                        const cfg = STATUS_CFG[dep.status] || STATUS_CFG.expired;
                                        const Icon = cfg.Icon;
                                        return (
                                            <tr key={dep._id} className="hover:bg-[#f9fbf9]">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-gray-800 text-xs">{dep.user?.username || '—'}</p>
                                                    <p className="text-[10px] text-gray-400">{dep.user?.email || ''}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {dep.depositAddress ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-xs text-gray-600">
                                                                {dep.depositAddress.slice(0, 8)}…{dep.depositAddress.slice(-6)}
                                                            </span>
                                                            <button onClick={() => copyText(dep.depositAddress, dep._id + '_addr')}
                                                                className="text-gray-400 hover:text-gray-700 transition" title="Copy address">
                                                                {copied === dep._id + '_addr'
                                                                    ? <CheckCircle size={11} style={{ color: G }} />
                                                                    : <Copy size={11} />}
                                                            </button>
                                                            <a href={`${TRONSCAN_ADDR}${dep.depositAddress}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600">
                                                                <ExternalLink size={11} />
                                                            </a>
                                                        </div>
                                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-800 text-xs">{dep.expectedTrxAmount} TRX</td>
                                                <td className="px-4 py-3 font-semibold text-xs" style={{ color: G }}>
                                                    {dep.status === 'completed' ? inr(dep.inrAmount) : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">₹{dep.rateAtCreation}</td>
                                                <td className="px-4 py-3">
                                                    {dep.txId ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-xs text-gray-600 max-w-[80px] truncate">{dep.txId}</span>
                                                            <a href={`${TRONSCAN}${dep.txId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600">
                                                                <ExternalLink size={11} />
                                                            </a>
                                                        </div>
                                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                                                        <Icon size={9} />{cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(dep.createdAt)}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{dep.completedAt ? fmtDate(dep.completedAt) : '—'}</td>
                                                <td className="px-4 py-3">
                                                    {dep.depositAddress ? (
                                                        <button
                                                            onClick={() => setCollectTarget(dep)}
                                                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white transition hover:opacity-80"
                                                            style={{ background: G }}
                                                            onMouseEnter={e => e.currentTarget.style.background = GH}
                                                            onMouseLeave={e => e.currentTarget.style.background = G}
                                                        >
                                                            <Send size={9} /> Collect
                                                        </button>
                                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                                <span className="text-sm text-gray-500">{total} total · page {page} of {totalPages}</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                        className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                                        <ChevronLeft size={15} />
                                    </button>
                                    <span className="px-3 py-1.5 text-sm font-semibold text-white" style={{ background: G }}>
                                        Page {page} of {totalPages}
                                    </span>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                        className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {collectTarget && (
                <CollectModal deposit={collectTarget} onClose={() => setCollectTarget(null)} onSuccess={fetchDeposits} />
            )}
        </div>
    );
}
