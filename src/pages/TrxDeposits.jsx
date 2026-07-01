import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import { useNotify } from '../context/NotifyContext';
import AppModal, { ModalBtn } from '../components/AppModal';
import {
    RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
    ExternalLink, Search, Download, Send, X, Loader2, TrendingUp,
    Hash, IndianRupee, Coins, Key, Eye, EyeOff, Copy,
} from 'lucide-react';

const TRX_RED   = '#EF0027';
const TRX_DARK  = '#1a0a00';

const inr = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const trxFmt = (n) => `${Number(n || 0).toFixed(4)} TRX`;

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '—';

const STATUS_CFG = {
    pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700',    Icon: Clock },
    completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
    expired:   { label: 'Expired',   cls: 'bg-rose-100 text-rose-700',       Icon: XCircle },
    cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500',       Icon: XCircle },
};

const TRONSCAN      = 'https://tronscan.org/#/transaction/';
const TRONSCAN_ADDR = 'https://tronscan.org/#/address/';

// IST helpers
const IST = 330 * 60000;
const istStart = (d = new Date()) => {
    const x = new Date(d.getTime() + IST);
    x.setUTCHours(0, 0, 0, 0);
    return new Date(x.getTime() - IST);
};

const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';

const DATE_PRESETS = [
    { key: 'today',  label: 'Today' },
    { key: 'last7',  label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'custom', label: 'Custom' },
];

function getPresetRange(key) {
    const now = new Date();
    const today = istStart(now);
    if (key === 'today') return { from: today.toISOString(), to: now.toISOString() };
    if (key === 'last7') {
        const s = new Date(now.getTime() - 6 * 86400000);
        return { from: istStart(s).toISOString(), to: now.toISOString() };
    }
    if (key === 'last30') {
        const s = new Date(now.getTime() - 29 * 86400000);
        return { from: istStart(s).toISOString(), to: now.toISOString() };
    }
    return {};
}

function exportCSV(deposits) {
    const headers = ['User', 'Email', 'Deposit Address', 'Expected TRX', 'INR Credited', 'Rate', 'TxID', 'Status', 'Created', 'Completed'];
    const rows = deposits.map(d => [
        d.user?.username || '',
        d.user?.email || '',
        d.depositAddress || '',
        d.expectedTrxAmount,
        d.status === 'completed' ? d.inrAmount : '',
        d.rateAtCreation,
        d.txId || '',
        d.status,
        fmtDate(d.createdAt),
        fmtDate(d.completedAt),
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
                onSuccess?.();
                onClose();
            } else {
                notify.error(data.message || 'Collection failed');
            }
        } catch (err) {
            notify.error(err?.response?.data?.message || 'Collection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppModal onClose={onClose} onConfirm={handleCollect} size="sm">
            <AppModal.Header
                icon={<Coins size={15} />}
                title="Collect TRX"
                subtitle={deposit.user?.username || '—'}
                onClose={onClose}
                accent="rose"
            />
            <AppModal.Body className="space-y-3">
                {/* Deposit Address */}
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Deposit Address</p>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-2.5" style={{ borderRadius: '6px' }}>
                        <span className="font-mono text-xs text-gray-700 break-all flex-1">{deposit.depositAddress}</span>
                        <a href={`${TRONSCAN_ADDR}${deposit.depositAddress}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-400 hover:text-blue-600">
                            <ExternalLink size={12} />
                        </a>
                    </div>
                </div>

                {/* Balance */}
                <div className="flex items-center justify-between border border-gray-100 px-3 py-2.5" style={{ borderRadius: '6px' }}>
                    <span className="text-sm text-gray-500">Available Balance</span>
                    {loadingBal
                        ? <Loader2 size={14} className="animate-spin text-gray-400" />
                        : <span className="text-sm font-bold text-gray-800">{trxFmt(balance)}</span>
                    }
                </div>

                {/* No balance warning */}
                {!loadingBal && (!balance || balance <= 0) && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2.5" style={{ borderRadius: '6px' }}>
                        No TRX available at this address.
                    </p>
                )}

                {/* Private Key */}
                <div className="border border-amber-200 overflow-hidden" style={{ borderRadius: '6px' }}>
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
                        {loadingKey
                            ? <Loader2 size={13} className="animate-spin text-amber-500" />
                            : privKey
                                ? (keyVisible ? <EyeOff size={13} className="text-amber-500" /> : <Eye size={13} className="text-amber-500" />)
                                : <Eye size={13} className="text-amber-500" />
                        }
                    </button>
                    {privKey && keyVisible && (
                        <div className="px-4 py-3 bg-white space-y-2">
                            <p className="text-[10px] text-red-500 font-semibold">⚠ Never share this key. Import into TronLink to send TRX manually.</p>
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2" style={{ borderRadius: '6px' }}>
                                <span className="font-mono text-xs text-gray-800 break-all flex-1 select-all">{privKey}</span>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(privKey); notify.success('Private key copied'); }}
                                    className="shrink-0 p-1.5 hover:bg-gray-200 transition-colors" style={{ borderRadius: '5px' }}
                                    title="Copy private key"
                                >
                                    <Copy size={13} className="text-gray-500" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </AppModal.Body>
            <AppModal.Footer>
                <ModalBtn variant="secondary" onClick={onClose}>Cancel</ModalBtn>
                <ModalBtn
                    variant="rose"
                    onClick={handleCollect}
                    disabled={loading || loadingBal || !balance || balance <= 0}
                    className="flex items-center gap-1.5"
                >
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

    const [deposits, setDeposits]         = useState([]);
    const [loading, setLoading]           = useState(false);
    const [page, setPage]                 = useState(1);
    const [totalPages, setTotalPages]     = useState(1);
    const [total, setTotal]               = useState(0);
    const [summary, setSummary]           = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [datePreset, setDatePreset]     = useState('today');
    const [customFrom, setCustomFrom]     = useState('');
    const [customTo, setCustomTo]         = useState('');
    const [search, setSearch]             = useState('');
    const [searchInput, setSearchInput]   = useState('');
    const [address, setAddress]           = useState('');
    const [addressInput, setAddressInput] = useState('');
    const [autoRefresh, setAutoRefresh]   = useState(false);
    const [collectTarget, setCollectTarget] = useState(null);

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
                ...(search  && { search }),
                ...(address && { address }),
                ...buildDateParams(),
            };
            const { data } = await api.get('/trx/admin/all', { params });
            if (data.success) {
                setDeposits(data.deposits || []);
                setTotalPages(data.pagination?.pages || 1);
                setTotal(data.pagination?.total || 0);
                setSummary(data.summary || null);
            } else {
                notify.error(data.message || 'Failed to load deposits');
            }
        } catch (err) {
            console.error(err);
            notify.error(err?.response?.data?.message || 'Failed to connect to server');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, filterStatus, search, address, buildDateParams]);

    useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(fetchDeposits, 15000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchDeposits]);

    // Debounced username search
    const handleSearchInput = (v) => {
        setSearchInput(v);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setSearch(v.trim());
            setPage(1);
        }, 500);
    };

    // Debounced address search
    const handleAddressInput = (v) => {
        setAddressInput(v);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setAddress(v.trim());
            setPage(1);
        }, 500);
    };

    const handlePreset = (key) => {
        setDatePreset(key);
        setPage(1);
    };

    const handleStatusFilter = (s) => {
        setFilterStatus(s);
        setPage(1);
    };

    const statCards = [
        {
            label: 'Total Deposits',
            value: summary?.total ?? total,
            icon: Hash,
            color: '#6366f1',
            bg: '#eef2ff',
            fmt: (v) => v,
        },
        {
            label: 'TRX Expected',
            value: summary?.totalTrx ?? 0,
            icon: Coins,
            color: '#f59e0b',
            bg: '#fffbeb',
            fmt: (v) => `${Number(v).toFixed(2)} TRX`,
        },
        {
            label: 'INR Credited',
            value: summary?.totalInr ?? 0,
            icon: IndianRupee,
            color: '#10b981',
            bg: '#ecfdf5',
            fmt: (v) => inr(v),
        },
        {
            label: 'Success Rate',
            value: summary ? (summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0) : 0,
            icon: TrendingUp,
            color: TRX_RED,
            bg: '#fff0f1',
            fmt: (v) => `${v}%`,
        },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">TRX Deposits</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Native TRON coin deposits — auto-swept to main wallet on confirmation</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Auto-refresh toggle */}
                        <button
                            onClick={() => setAutoRefresh(p => !p)}
                            title={autoRefresh ? 'Auto-refresh ON (15s)' : 'Auto-refresh OFF'}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${autoRefresh ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                        >
                            <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} />
                            {autoRefresh ? 'Live' : 'Auto'}
                        </button>

                        {/* Export */}
                        <button
                            onClick={() => exportCSV(deposits)}
                            disabled={deposits.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
                        >
                            <Download size={12} />
                            CSV
                        </button>

                        {/* Refresh */}
                        <button
                            onClick={() => { setPage(1); fetchDeposits(); }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className="px-6 pt-4 grid grid-cols-4 gap-3 shrink-0">
                    {statCards.map(({ label, value, icon: Icon, color, bg, fmt }) => (
                        <div key={label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                                <Icon size={16} style={{ color }} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{label}</p>
                                <p className="text-sm font-bold text-gray-800 truncate">{fmt(value)}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Filters ── */}
                <div className="bg-white border-b border-gray-100 px-6 py-3 mt-3 shrink-0 space-y-2">
                    {/* Row 1: date + status filters + record count */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {DATE_PRESETS.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => handlePreset(p.key)}
                                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${datePreset === p.key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    style={datePreset === p.key ? { background: BRAND } : undefined}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-5 bg-gray-200 hidden sm:block" />

                        <div className="flex items-center gap-1.5 flex-wrap">
                            {['', 'pending', 'completed', 'expired', 'cancelled'].map(s => (
                                <button
                                    key={s || 'all'}
                                    onClick={() => handleStatusFilter(s)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${filterStatus === s ? 'text-white border-transparent shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                    style={filterStatus === s ? { background: '#374151' } : {}}
                                >
                                    {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}
                                </button>
                            ))}
                        </div>

                        <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">{total} record{total !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Row 2: search boxes */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={searchInput}
                                onChange={e => handleSearchInput(e.target.value)}
                                placeholder="Search exact username…"
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
                            <input
                                value={addressInput}
                                onChange={e => handleAddressInput(e.target.value)}
                                placeholder="Search deposit address…"
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-blue-200 bg-blue-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors font-mono"
                            />
                        </div>
                    </div>

                    {/* Custom date range */}
                    {datePreset === 'custom' && (
                        <div className="pt-1">
                            <DateRangePicker
                                from={customFrom} to={customTo}
                                onChange={(f, t) => { setCustomFrom(f); setCustomTo(t); setPage(1); }}
                                placeholder="Pick date range"
                            />
                        </div>
                    )}
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto px-6 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="w-8 h-8 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                        </div>
                    ) : deposits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2">
                            <Search size={32} className="text-gray-200" />
                            <p>No TRX deposits found</p>
                            <p className="text-xs text-gray-300">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        {['User', 'Deposit Address', 'Expected TRX', 'INR Credited', 'Rate', 'TxID', 'Status', 'Created', 'Completed', 'Action'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {deposits.map((dep, i) => {
                                        const cfg  = STATUS_CFG[dep.status] || STATUS_CFG.pending;
                                        const Icon = cfg.Icon;
                                        return (
                                            <tr key={dep._id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
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
                                                            <a href={`${TRONSCAN_ADDR}${dep.depositAddress}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 shrink-0">
                                                                <ExternalLink size={11} />
                                                            </a>
                                                        </div>
                                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-800 text-xs">{dep.expectedTrxAmount} TRX</td>
                                                <td className="px-4 py-3 font-semibold text-emerald-600 text-xs">
                                                    {dep.status === 'completed' ? inr(dep.inrAmount) : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">₹{dep.rateAtCreation}</td>
                                                <td className="px-4 py-3">
                                                    {dep.txId ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-xs text-gray-600 max-w-[80px] truncate">{dep.txId}</span>
                                                            <a href={`${TRONSCAN}${dep.txId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 shrink-0">
                                                                <ExternalLink size={11} />
                                                            </a>
                                                        </div>
                                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>
                                                        <Icon size={9} />
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(dep.createdAt)}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{dep.completedAt ? fmtDate(dep.completedAt) : '—'}</td>
                                                <td className="px-4 py-3">
                                                    {dep.depositAddress ? (
                                                        <button
                                                            onClick={() => setCollectTarget(dep)}
                                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white transition-all hover:opacity-80 active:scale-95"
                                                            style={{ background: `linear-gradient(135deg, ${TRX_DARK}, ${TRX_RED})` }}
                                                        >
                                                            <Send size={9} />
                                                            Collect
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-4">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Collect Modal */}
            {collectTarget && (
                <CollectModal
                    deposit={collectTarget}
                    onClose={() => setCollectTarget(null)}
                    onSuccess={fetchDeposits}
                />
            )}
        </div>
    );
}
