import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import {
    Search, RefreshCw, Download, ChevronLeft, ChevronRight,
    TrendingUp, Clock, CheckCircle, ArrowDownToLine, X, Copy, Check,
} from 'lucide-react';
import Select from '../components/Select';

const G   = '#3a7d44';
const GL  = '#e8f5ea';
const GH  = '#2e6437';

const STATUS_CFG = {
    completed: { bg: '#dcfce7', color: '#15803d' },
    pending:   { bg: '#fef9c3', color: '#a16207' },
    expired:   { bg: '#f3f4f6', color: '#6b7280' },
    cancelled: { bg: '#f3f4f6', color: '#9ca3af' },
};

const inr = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

function getISTDate(offsetDays = 0) {
    const d = new Date(Date.now() + 330 * 60 * 1000 + offsetDays * 864e5);
    return d.toISOString().split('T')[0];
}

const DATE_PRESETS = [
    { key: 'today',  label: 'Today' },
    { key: 'last7',  label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'all',    label: 'All time' },
    { key: 'custom', label: 'Custom Range' },
];

function getPresetRange(key) {
    if (key === 'today')  return { from: getISTDate(0),   to: getISTDate(0) };
    if (key === 'last7')  return { from: getISTDate(-6),  to: getISTDate(0) };
    if (key === 'last30') return { from: getISTDate(-29), to: getISTDate(0) };
    return { from: '', to: '' };
}

const inputCls =
    'w-full border border-gray-300 bg-white text-sm text-gray-800 px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400';

const StatCard = ({ label, value, sub, valueColor = '#111827', icon: Icon, iconBg, iconColor }) => (
    <div className="bg-white border border-gray-200 p-3 md:p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
        <div className="min-w-0 mr-2">
            <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 md:mb-2 leading-tight">{label}</p>
            <p className="text-lg md:text-2xl font-bold leading-none tracking-tight" style={{ color: valueColor }}>{value}</p>
            {sub && <p className="text-[10px] md:text-xs text-gray-400 mt-1 md:mt-2 leading-tight">{sub}</p>}
        </div>
        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
            <Icon size={16} style={{ color: iconColor }} strokeWidth={2.2} />
        </div>
    </div>
);

export default function CryptoPayments() {
    const [copied, setCopied] = useState('');
    const copyText = (text, key) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500); });
        } else {
            const el = document.createElement('textarea');
            el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
            document.body.appendChild(el); el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(key); setTimeout(() => setCopied(''), 1500);
        }
    };

    const [coinType, setCoinType]       = useState('all');
    const [deposits, setDeposits]       = useState([]);
    const [summary, setSummary]         = useState(null);
    const [pagination, setPagination]   = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading]         = useState(false);
    const [page, setPage]               = useState(1);
    const limit = 20;

    const [datePreset,     setDatePreset]     = useState('today');
    const [fromDate,       setFromDate]       = useState(() => getISTDate(0));
    const [toDate,         setToDate]         = useState(() => getISTDate(0));
    const [statusFilter,   setStatusFilter]   = useState('');
    const [unifiedSearch,  setUnifiedSearch]  = useState('');

    const fetchDeposits = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, limit };
            if (statusFilter)            params.status = statusFilter;
            if (unifiedSearch.trim())    params.q      = unifiedSearch.trim();
            if (fromDate) params.from = fromDate;
            if (toDate)   params.to   = toDate;

            if (coinType === 'all') {
                const [usdtRes, trxRes] = await Promise.all([
                    api.get('/usdt/admin/all', { params }),
                    api.get('/trx/admin/all',  { params }),
                ]);
                const ud = usdtRes.data;
                const td = trxRes.data;

                // Merge deposits, tag each with its type, sort newest first
                const combined = [
                    ...(ud.deposits || []).map(d => ({ ...d, _coin: 'USDT' })),
                    ...(td.deposits || []).map(d => ({ ...d, _coin: 'TRX'  })),
                ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setDeposits(combined);

                // Merge summaries
                const us = ud.summary || {};
                const ts = td.summary || {};
                setSummary({
                    totalInr:  (us.totalInr  || 0) + (ts.totalInr  || 0),
                    totalUsdt: us.totalUsdt || 0,
                    totalTrx:  ts.totalTrx  || 0,
                    completed: (us.completed || 0) + (ts.completed || 0),
                    pending:   (us.pending   || 0) + (ts.pending   || 0),
                    expired:   (us.expired   || 0) + (ts.expired   || 0),
                    cancelled: (us.cancelled || 0) + (ts.cancelled || 0),
                    total:     (us.total     || 0) + (ts.total     || 0),
                });

                const up = ud.pagination || {};
                const tp = td.pagination || {};
                setPagination({
                    page,
                    pages: Math.max(up.pages || 1, tp.pages || 1),
                    total: (up.total || 0) + (tp.total || 0),
                });
            } else {
                const endpoint = coinType === 'usdt' ? '/usdt/admin/all' : '/trx/admin/all';
                const { data } = await api.get(endpoint, { params });
                if (data.success) {
                    setDeposits((data.deposits || []).map(d => ({ ...d, _coin: coinType.toUpperCase() })));
                    setSummary(data.summary || null);
                    setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [coinType, page, statusFilter, unifiedSearch, fromDate, toDate]);

    useEffect(() => { setPage(1); }, [coinType, statusFilter, unifiedSearch, fromDate, toDate]);
    useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

    const applyPreset = (key) => {
        setDatePreset(key);
        if (key !== 'custom') {
            const range = getPresetRange(key);
            setFromDate(range.from);
            setToDate(range.to);
        }
        setPage(1);
    };

    const resetFilters = () => {
        setStatusFilter(''); setUnifiedSearch('');
        setCoinType('all');
        applyPreset('today');
    };

    const exportCSV = () => {
        if (!deposits.length) return;
        const header = ['Coin', 'Order ID', 'User', 'INR Amount', 'Crypto Amount', 'Status', 'Deposit Address', 'Tx ID', 'Date (IST)'];
        const rows = deposits.map(d => [
            d._coin,
            d._id,
            d.user?.username || 'N/A',
            d.inrAmount,
            d._coin === 'USDT' ? (d.expectedUsdtAmount || '') : (d.expectedTrxAmount || ''),
            d.status,
            d.depositAddress || '',
            d.txId || '',
            new Date(d.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
        ]);
        const csv = [header, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = `crypto-payments.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const successRate = summary
        ? Math.round(((summary.completed || 0) / Math.max(summary.total || 1, 1)) * 100)
        : 0;

    const cryptoSymbol  = coinType === 'trx' ? 'TRX' : 'USDT';
    const cryptoReceived = coinType === 'trx'
        ? parseFloat(Number(summary?.totalTrx  || 0).toFixed(4))
        : parseFloat(Number(summary?.totalUsdt || 0).toFixed(4));

    return (
        <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
            <Sidebar />
            <main className="flex-1 overflow-auto">

                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between md:sticky md:top-0 z-10">
                    <div className="min-w-0 mr-3">
                        <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Crypto Payments</h1>
                        <p className="text-xs text-gray-400 mt-0.5 hidden md:block">USDT &amp; TRX deposit transaction history</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={fetchDeposits} disabled={loading}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition disabled:opacity-50 whitespace-nowrap"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 text-white text-sm font-semibold transition active:opacity-90 whitespace-nowrap"
                            style={{ background: G }}
                            onMouseEnter={e => e.currentTarget.style.background = GH}
                            onMouseLeave={e => e.currentTarget.style.background = G}
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </header>

                <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-5">

                    {/* Stat cards */}
                    {summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                            <StatCard
                                label="Total Recharged (INR)"
                                value={inr(summary.totalInr)}
                                sub={`${summary.completed || 0} successful orders`}
                                valueColor="#15803d"
                                icon={TrendingUp} iconColor={G} iconBg={GL}
                            />
                            <StatCard
                                label="Pending / Expired / Cancelled"
                                value={(summary.pending || 0) + (summary.expired || 0) + (summary.cancelled || 0)}
                                sub={`${summary.pending || 0} pending · ${summary.expired || 0} expired · ${summary.cancelled || 0} cancelled`}
                                valueColor="#a16207"
                                icon={Clock} iconColor="#d97706" iconBg="#fef9c3"
                            />
                            <StatCard
                                label="Success Rate"
                                value={`${successRate}%`}
                                sub={`${summary.completed || 0} of ${summary.total || 0} completed`}
                                valueColor={successRate >= 50 ? '#15803d' : '#be123c'}
                                icon={CheckCircle}
                                iconColor={successRate >= 50 ? G : '#e11d48'}
                                iconBg={successRate >= 50 ? GL : '#fff1f2'}
                            />
                        </div>
                    )}

                    {/* Filter panel */}
                    <div className="bg-white border border-gray-200">

                        {/* Row 1 — search */}
                        <div className="p-4 border-b border-gray-100">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by exact username or full deposit address…"
                                    value={unifiedSearch}
                                    onChange={(e) => { setUnifiedSearch(e.target.value); setPage(1); }}
                                    className={inputCls + ' w-full pl-9'}
                                />
                            </div>
                        </div>

                        {/* Row 2 — date presets (2-up grid on mobile, scrollable row on desktop) */}
                        <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-2 md:overflow-x-auto md:scrollbar-none">
                            <span className="hidden md:inline text-xs text-gray-400 font-medium shrink-0">Date:</span>
                            {DATE_PRESETS.filter(({ key }) => key !== 'custom').map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => applyPreset(key)}
                                    className="px-3 py-1.5 text-sm font-medium border transition md:shrink-0"
                                    style={datePreset === key
                                        ? { background: G, color: '#fff', borderColor: G }
                                        : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
                                >
                                    {label}
                                </button>
                            ))}
                            <button
                                onClick={() => applyPreset('custom')}
                                className="col-span-2 md:col-auto px-3 py-1.5 text-sm font-medium border transition md:shrink-0"
                                style={datePreset === 'custom'
                                    ? { background: G, color: '#fff', borderColor: G }
                                    : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
                            >
                                Custom Range
                            </button>
                            {datePreset === 'custom' && (
                                <DateRangePicker
                                    className="col-span-2 md:col-auto"
                                    from={fromDate} to={toDate}
                                    onChange={(f, t) => { setFromDate(f); setToDate(t); setPage(1); }}
                                    placeholder="Pick date range"
                                />
                            )}
                        </div>

                        {/* Row 3 — coin + status + reset */}
                        <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                            <Select
                                value={coinType}
                                onChange={(v) => { setCoinType(v); setPage(1); }}
                                options={[
                                    { value: 'all',  label: 'All Coins'  },
                                    { value: 'usdt', label: 'USDT TRC20' },
                                    { value: 'trx',  label: 'TRX TRC20'  },
                                ]}
                            />
                            <Select
                                value={statusFilter}
                                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                                options={[
                                    { value: '',          label: 'All Status' },
                                    { value: 'completed', label: 'Completed'  },
                                    { value: 'pending',   label: 'Pending'    },
                                    { value: 'expired',   label: 'Expired'    },
                                    { value: 'cancelled', label: 'Cancelled'  },
                                ]}
                            />
                            <button
                                onClick={resetFilters}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm text-gray-500 hover:bg-gray-50 transition whitespace-nowrap"
                            >
                                <X size={13} /> Reset
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ background: GL }}>
                                        {['Order ID', 'Coin', 'User', 'INR Amount', 'Crypto Amount', 'Status', 'Deposit Address', 'Date (IST)'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: G }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        [...Array(6)].map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={8} className="px-5 py-3">
                                                    <div className="h-4 bg-gray-100 animate-pulse" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : deposits.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-16 text-center">
                                                <ArrowDownToLine size={36} className="mx-auto text-gray-300 mb-3" />
                                                <p className="text-gray-500 font-medium">No deposits found</p>
                                            </td>
                                        </tr>
                                    ) : deposits.map((d) => {
                                        const cfg       = STATUS_CFG[d.status] || { bg: '#f3f4f6', color: '#6b7280' };
                                        const cryptoAmt = d._coin === 'USDT' ? d.expectedUsdtAmount : d.expectedTrxAmount;
                                        const shortAddr = d.depositAddress
                                            ? `${d.depositAddress.slice(0, 8)}…${d.depositAddress.slice(-6)}`
                                            : '—';
                                        const coinBg    = d._coin === 'USDT' ? '#ecfdf5' : '#eff6ff';
                                        const coinColor = d._coin === 'USDT' ? '#059669' : '#2563eb';
                                        return (
                                            <tr key={d._id + d._coin} className="hover:bg-[#f9fbf9]">
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <button
                                                        onClick={() => copyText(String(d._id), `id-${d._id}`)}
                                                        className="flex items-center gap-1.5 font-mono text-xs text-gray-400 hover:text-gray-700 transition group"
                                                        title={d._id}
                                                    >
                                                        …{String(d._id).slice(-10)}
                                                        {copied === `id-${d._id}`
                                                            ? <Check size={11} className="text-green-500" />
                                                            : <Copy size={11} className="opacity-0 group-hover:opacity-100 transition" />}
                                                    </button>
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span
                                                        className="inline-block px-2 py-0.5 text-xs font-semibold tracking-wide"
                                                        style={{ background: coinBg, color: coinColor }}
                                                    >
                                                        {d._coin}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                                    {d.user?.username || 'N/A'}
                                                </td>
                                                <td className="px-5 py-3 font-mono font-semibold text-gray-900 whitespace-nowrap">
                                                    {inr(d.inrAmount)}
                                                </td>
                                                <td className="px-5 py-3 font-mono text-gray-700 whitespace-nowrap">
                                                    {cryptoAmt != null
                                                        ? `${parseFloat(Number(cryptoAmt).toFixed(4))} ${d._coin}`
                                                        : '—'}
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span
                                                        className="inline-block px-2 py-0.5 text-xs font-semibold tracking-wide"
                                                        style={{ background: cfg.bg, color: cfg.color }}
                                                    >
                                                        {d.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    {d.depositAddress ? (
                                                        <button
                                                            onClick={() => copyText(d.depositAddress, `addr-${d._id}`)}
                                                            className="flex items-center gap-1.5 font-mono text-xs text-gray-500 hover:text-gray-800 transition group"
                                                            title={d.depositAddress}
                                                        >
                                                            {shortAddr}
                                                            {copied === `addr-${d._id}`
                                                                ? <Check size={11} className="text-green-500" />
                                                                : <Copy size={11} className="opacity-0 group-hover:opacity-100 transition" />}
                                                        </button>
                                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">
                                                    {new Date(d.createdAt).toLocaleString('en-US', {
                                                        timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short',
                                                        day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
                                                    })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                            <p className="text-sm text-gray-500">
                                {pagination.total > 0
                                    ? `${pagination.total} total · page ${page} of ${pagination.pages}`
                                    : '—'}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                                >
                                    <ChevronLeft size={15} />
                                </button>
                                <span
                                    className="px-3 py-1.5 text-sm font-semibold text-white"
                                    style={{ background: G }}
                                >
                                    Page {page} of {pagination.pages || 1}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.pages || 1, p + 1))}
                                    disabled={page >= (pagination.pages || 1)}
                                    className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
