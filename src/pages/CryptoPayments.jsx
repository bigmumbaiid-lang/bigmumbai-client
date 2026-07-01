import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import {
    Search, RefreshCw, Download, ChevronLeft, ChevronRight,
    TrendingUp, Clock, CheckCircle, Coins, X,
} from 'lucide-react';

const USDT_COLOR = '#26a17b';
const TRX_COLOR  = '#1d4ed8';
const BRAND      = 'linear-gradient(90deg,#d9ad82,#b1835a)';

const STATUS_COLOR = {
    completed: 'bg-emerald-100 text-emerald-700',
    pending:   'bg-amber-100 text-amber-700',
    expired:   'bg-gray-100 text-gray-500',
    cancelled: 'bg-gray-100 text-gray-400',
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
    { key: 'custom', label: 'Custom' },
];

function getPresetRange(key) {
    if (key === 'today')  return { from: getISTDate(0),   to: getISTDate(0) };
    if (key === 'last7')  return { from: getISTDate(-6),  to: getISTDate(0) };
    if (key === 'last30') return { from: getISTDate(-29), to: getISTDate(0) };
    return { from: '', to: '' };
}

const StatCard = ({ label, value, sub, accent, icon: Icon, iconBg, iconColor }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-5 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-start justify-between">
            <div className="min-w-0">
                <p className="text-[13px] text-gray-500 font-medium">{label}</p>
                <p className={`text-[26px] leading-tight font-bold mt-2 tracking-tight ${accent || 'text-gray-900'}`}>{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                <Icon size={21} style={{ color: iconColor }} strokeWidth={2.2} />
            </div>
        </div>
    </div>
);

export default function CryptoPayments() {
    const [tab, setTab]         = useState('usdt');
    const [deposits, setDeposits] = useState([]);
    const [summary, setSummary]   = useState(null);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading]   = useState(false);
    const [page, setPage]         = useState(1);
    const limit = 20;

    const [datePreset,     setDatePreset]     = useState('today');
    const [fromDate,       setFromDate]       = useState(() => getISTDate(0));
    const [toDate,         setToDate]         = useState(() => getISTDate(0));
    const [statusFilter,   setStatusFilter]   = useState('');
    const [usernameSearch, setUsernameSearch] = useState('');
    const [addressSearch,  setAddressSearch]  = useState('');

    const isUsdt       = tab === 'usdt';
    const accentColor  = isUsdt ? USDT_COLOR : TRX_COLOR;
    const endpoint     = isUsdt ? '/usdt/admin/all' : '/trx/admin/all';

    const fetchDeposits = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, limit };
            if (statusFilter)          params.status  = statusFilter;
            if (usernameSearch.trim()) params.search  = usernameSearch.trim();
            if (addressSearch.trim())  params.address = addressSearch.trim();
            if (fromDate) params.from = fromDate;
            if (toDate)   params.to   = toDate;

            const { data } = await api.get(endpoint, { params });
            if (data.success) {
                setDeposits(data.deposits || []);
                setSummary(data.summary   || null);
                setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [endpoint, page, statusFilter, usernameSearch, addressSearch, fromDate, toDate]);

    // Reset page when filters or tab change
    useEffect(() => { setPage(1); }, [tab, statusFilter, usernameSearch, addressSearch, fromDate, toDate]);

    useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

    const applyPreset = (key) => {
        setDatePreset(key);
        const range = getPresetRange(key);
        setFromDate(range.from);
        setToDate(range.to);
        setPage(1);
    };

    const resetFilters = () => {
        setStatusFilter(''); setUsernameSearch(''); setAddressSearch('');
        applyPreset('today');
    };

    const exportCSV = () => {
        if (!deposits.length) return;
        const header = ['Order ID', 'User', 'INR Amount', isUsdt ? 'USDT Amount' : 'TRX Amount', 'Status', 'Deposit Address', 'Tx ID', 'Date (IST)'];
        const rows = deposits.map(d => [
            d._id,
            d.user?.username || 'N/A',
            d.inrAmount,
            isUsdt ? (d.expectedUsdtAmount || '') : (d.expectedTrxAmount || ''),
            d.status,
            d.depositAddress || '',
            d.txId || '',
            new Date(d.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
        ]);
        const csv = [header, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = `${tab}-payments.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const successRate = summary
        ? Math.round(((summary.completed || 0) / Math.max(summary.total || 1, 1)) * 100)
        : 0;
    const cryptoTotal = isUsdt ? (summary?.totalUsdt || 0) : (summary?.totalTrx || 0);
    const cryptoSymbol = isUsdt ? 'USDT' : 'TRX';

    return (
        <div className="flex h-screen bg-[#f6f7fb]">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Crypto Payments</h1>
                        <p className="text-xs text-gray-400 mt-0.5">USDT &amp; TRX deposit transaction history</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchDeposits} disabled={loading}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm active:scale-95 transition"
                            style={{ background: BRAND }}
                        >
                            <Download size={15} /> Export CSV
                        </button>
                    </div>
                </header>

                <div className="p-6 lg:p-8">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] mb-6 w-fit">
                        {[
                            { key: 'usdt', label: 'USDT TRC20', color: USDT_COLOR },
                            { key: 'trx',  label: 'TRX TRC20',  color: TRX_COLOR  },
                        ].map(({ key, label, color }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${tab === key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                style={tab === key ? { background: color } : {}}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Stats */}
                    {summary && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                            <StatCard
                                label="Total Recharged (INR)"
                                value={inr(summary.totalInr)}
                                sub={`${summary.completed || 0} successful orders`}
                                accent="text-emerald-600"
                                icon={TrendingUp} iconColor="#059669" iconBg="#ecfdf5"
                            />
                            <StatCard
                                label={`${cryptoSymbol} Received`}
                                value={`${parseFloat(Number(cryptoTotal).toFixed(4))} ${cryptoSymbol}`}
                                sub={`across ${summary.total || 0} total orders`}
                                icon={Coins} iconColor={accentColor}
                                iconBg={isUsdt ? '#ecfdf5' : '#eff6ff'}
                            />
                            <StatCard
                                label="Pending / Expired"
                                value={summary.pending || 0}
                                sub={`${summary.expired || 0} expired`}
                                accent="text-amber-600"
                                icon={Clock} iconColor="#d97706" iconBg="#fffbeb"
                            />
                            <StatCard
                                label="Success Rate"
                                value={`${successRate}%`}
                                sub={`${summary.completed || 0} of ${summary.total || 0} completed`}
                                accent={successRate >= 50 ? 'text-emerald-600' : 'text-rose-600'}
                                icon={CheckCircle}
                                iconColor={successRate >= 50 ? '#059669' : '#e11d48'}
                                iconBg={successRate >= 50 ? '#ecfdf5' : '#fff1f2'}
                            />
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-4 mb-6">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {DATE_PRESETS.map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => applyPreset(key)}
                                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${datePreset === key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    style={datePreset === key ? { background: BRAND } : {}}
                                >
                                    {label}
                                </button>
                            ))}
                            {datePreset === 'custom' && (
                                <DateRangePicker
                                    from={fromDate} to={toDate}
                                    onChange={(f, t) => { setFromDate(f); setToDate(t); setPage(1); }}
                                    placeholder="Pick date range"
                                />
                            )}
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:border-[#b1835a]"
                            >
                                <option value="">All Status</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                                onClick={resetFilters}
                                className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition"
                            >
                                <X size={14} /> Reset
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text" placeholder="Exact username..."
                                    value={usernameSearch}
                                    onChange={(e) => { setUsernameSearch(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a] transition"
                                />
                            </div>
                            <div className="relative flex-1">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text" placeholder="Deposit address..."
                                    value={addressSearch}
                                    onChange={(e) => { setAddressSearch(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a] transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                                        <th className="px-5 py-3.5 text-left font-semibold">Order ID</th>
                                        <th className="px-5 py-3.5 text-left font-semibold">User</th>
                                        <th className="px-5 py-3.5 text-right font-semibold">INR Amount</th>
                                        <th className="px-5 py-3.5 text-right font-semibold">{cryptoSymbol} Amount</th>
                                        <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                                        <th className="px-5 py-3.5 text-left font-semibold">Deposit Address</th>
                                        <th className="px-5 py-3.5 text-left font-semibold">Date (IST)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        [...Array(6)].map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={7} className="px-5 py-3.5">
                                                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : deposits.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-16 text-center">
                                                <Coins size={40} className="mx-auto text-gray-300 mb-3" />
                                                <p className="text-gray-500 font-medium">No {cryptoSymbol} deposits found</p>
                                            </td>
                                        </tr>
                                    ) : deposits.map((d) => {
                                        const badge      = STATUS_COLOR[d.status] || 'bg-gray-100 text-gray-500';
                                        const cryptoAmt  = isUsdt ? d.expectedUsdtAmount : d.expectedTrxAmount;
                                        const shortAddr  = d.depositAddress
                                            ? `${d.depositAddress.slice(0, 8)}…${d.depositAddress.slice(-6)}`
                                            : '—';
                                        return (
                                            <tr key={d._id} className="hover:bg-gray-50/60">
                                                <td className="px-5 py-3.5 font-mono text-xs text-gray-400 whitespace-nowrap">
                                                    …{String(d._id).slice(-10)}
                                                </td>
                                                <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">
                                                    {d.user?.username || 'N/A'}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">
                                                    {inr(d.inrAmount)}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-mono text-gray-700 whitespace-nowrap">
                                                    {cryptoAmt != null
                                                        ? `${parseFloat(Number(cryptoAmt).toFixed(4))} ${cryptoSymbol}`
                                                        : '—'}
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badge}`}>
                                                        {d.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span
                                                        className="font-mono text-xs text-gray-500 cursor-default"
                                                        title={d.depositAddress || ''}
                                                    >
                                                        {shortAddr}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
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
                        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                            <p className="text-sm text-gray-500">
                                {pagination.total > 0
                                    ? `Page ${page} of ${pagination.pages} · ${pagination.total} total`
                                    : '—'}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                >
                                    <ChevronLeft size={17} />
                                </button>
                                <span className="px-2 text-sm font-medium text-gray-700">
                                    Page {page} of {pagination.pages || 1}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.pages || 1, p + 1))}
                                    disabled={page >= (pagination.pages || 1)}
                                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                >
                                    <ChevronRight size={17} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
