import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import Select from '../components/Select';
import {
  Search, X, ExternalLink, RefreshCw, CreditCard, Calendar,
  TrendingUp, Clock, ChevronLeft, ChevronRight, Download, Filter,
} from 'lucide-react';

// ── Leaf-green brand palette ───────────────────────────────────────────────
const G   = '#3a7d44';   // primary leaf green
const GL  = '#e8f5ea';   // light green bg
const GH  = '#2e6437';   // hover / dark green

const CHANNEL_BADGE = {
  watchpays: { bg: '#ede9fe', color: '#6d28d9' },
  jazpays:   { bg: '#e0f2fe', color: '#0369a1' },
  bondpay:   { bg: '#ffedd5', color: '#c2410c' },
};
const CHANNEL_LABEL = { watchpays: 'WatchPays', jazpays: 'JazPays', bondpay: 'BondPay' };

const STATUS_CFG = {
  success:   { bg: '#dcfce7', color: '#15803d', label: 'Success'   },
  pending:   { bg: '#fef9c3', color: '#a16207', label: 'Pending'   },
  expired:   { bg: '#f3f4f6', color: '#6b7280', label: 'Expired'   },
  cancelled: { bg: '#f3f4f6', color: '#9ca3af', label: 'Cancelled' },
};

const inr = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const IST_OFFSET = 330 * 60000;
const getISTDateStr = () => new Date(Date.now() + IST_OFFSET).toISOString().split('T')[0];

// ── Shared input / select class strings ───────────────────────────────────
const inputCls =
  'w-full border border-gray-300 bg-white text-sm text-gray-800 px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400';

// ── Badge ──────────────────────────────────────────────────────────────────
const Badge = ({ bg, color, children }) => (
  <span
    className="inline-block px-2 py-0.5 text-xs font-semibold tracking-wide"
    style={{ background: bg, color }}
  >
    {children}
  </span>
);

export default function Payments() {
  const [payments, setPayments]             = useState([]);
  const [stats, setStats]                   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [total, setTotal]                   = useState(0);

  const [filterStatus, setFilterStatus]     = useState('');
  const [filterChannel, setFilterChannel]   = useState('');
  const [searchInput, setSearchInput]       = useState('');
  const [search, setSearch]                 = useState('');
  const [exactUsername, setExactUsername]   = useState('');
  const [startDate, setStartDate]           = useState(getISTDateStr);
  const [endDate, setEndDate]               = useState(getISTDateStr);
  const [minAmount, setMinAmount]           = useState('');
  const [maxAmount, setMaxAmount]           = useState('');
  const [activeQuick, setActiveQuick]       = useState('today');

  const limit = 20;

  // ── Data fetching ─────────────────────────────────────────────────────
  const fetchPayments = async () => {
    if (minAmount && maxAmount && Number(minAmount) > Number(maxAmount)) {
      setError('Min amount cannot be greater than max amount'); return;
    }
    try {
      setLoading(true); setError(null);
      const params = {
        page, limit, gatewayOnly: 1,
        ...(filterStatus    && { status: filterStatus }),
        ...(filterChannel   && { channel: filterChannel }),
        ...(search          && { search: search.trim() }),
        ...(exactUsername   && { exactUsername: exactUsername.trim() }),
        ...(startDate       && { startDate }),
        ...(endDate         && { endDate }),
        ...(minAmount       && { minAmount: Number(minAmount) }),
        ...(maxAmount       && { maxAmount: Number(maxAmount) }),
      };
      const { data } = await api.get('/payment/get-payments', { params });
      if (data.success) {
        setPayments(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
      } else { setError(data.message || 'Failed to load payments'); }
    } catch { setError('Failed to connect to server'); }
    finally  { setLoading(false); }
  };

  const fetchStats = async (from, to) => {
    try {
      const params = {
        gatewayOnly: 1,
        ...(from            && { startDate: from }),
        ...(to              && { endDate: to }),
        ...(filterStatus    && { status: filterStatus }),
        ...(filterChannel   && { channel: filterChannel }),
        ...(search          && { search: search.trim() }),
        ...(exactUsername   && { exactUsername: exactUsername.trim() }),
        ...(minAmount       && { minAmount: Number(minAmount) }),
        ...(maxAmount       && { maxAmount: Number(maxAmount) }),
      };
      const { data } = await api.get('/payment/stats', { params });
      if (data.success) setStats(data.stats);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStatus, filterChannel, search, exactUsername, startDate, endDate, minAmount, maxAmount]);

  useEffect(() => {
    fetchStats(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, filterStatus, filterChannel, search, exactUsername, minAmount, maxAmount]);

  useEffect(() => { if (page > totalPages) setPage(totalPages || 1); }, [totalPages]); // eslint-disable-line

  // ── Quick date helpers ────────────────────────────────────────────────
  const applyRange = (from, to, key) => { setStartDate(from); setEndDate(to); setActiveQuick(key); setPage(1); };
  const setAllTime = () => applyRange('', '', 'all');
  const setToday   = () => { const t = getISTDateStr(); applyRange(t, t, 'today'); };
  const setLast7   = () => { const t = getISTDateStr(); applyRange(new Date(Date.now() + IST_OFFSET - 6*86400000).toISOString().split('T')[0], t, 'last7'); };
  const setLast30  = () => { const t = getISTDateStr(); applyRange(new Date(Date.now() + IST_OFFSET - 29*86400000).toISOString().split('T')[0], t, 'last30'); };

  const PERIOD_LABEL = {
    all:    'All time',
    today:  'Today',
    last7:  'Last 7 days',
    last30: 'Last 30 days',
    custom: 'Custom range',
  };

  const resetFilters = () => {
    setSearchInput(''); setSearch(''); setExactUsername('');
    setFilterStatus(''); setFilterChannel('');
    setStartDate(''); setEndDate('');
    setMinAmount(''); setMaxAmount('');
    setPage(1); setActiveQuick('');
  };

  const exportCsv = () => {
    if (!payments.length) return;
    const header = ['Order No', 'Merchant Order', 'User', 'Amount', 'Status', 'Channel', 'Date'];
    const rows   = payments.map((p) => [
      p.order_no, p.merchant_order_no,
      p.userID?.username || 'N/A',
      p.amount, p.status, p.channel,
      new Date(p.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a   = document.createElement('a'); a.href = url; a.download = 'payments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const quickBtns = [
    { label: 'Today',        key: 'today',  fn: setToday   },
    { label: 'Last 7 Days',  key: 'last7',  fn: setLast7   },
    { label: 'Last 30 Days', key: 'last30', fn: setLast30  },
    { label: 'All time',     key: 'all',    fn: setAllTime  },
    { label: 'Custom Range', key: 'custom', fn: () => setActiveQuick('custom') },
  ];

  // ── Stat card ─────────────────────────────────────────────────────────
  const StatCard = ({ label, value, sub, valueColor = '#111827', icon: Icon, iconColor, iconBg }) => (
    <div className="bg-white border border-gray-200 p-3 md:p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
      <div className="min-w-0 mr-2">
        <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 md:mb-2 leading-tight">{label}</p>
        <p className="text-lg md:text-2xl font-bold leading-none tracking-tight" style={{ color: valueColor }}>{value}</p>
        {sub && <p className="text-[10px] md:text-xs text-gray-400 mt-1 md:mt-2">{sub}</p>}
      </div>
      <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={16} style={{ color: iconColor }} strokeWidth={2.2} />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between md:sticky md:top-0 z-10">
          <div className="min-w-0 mr-3">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Payments</h1>
            <p className="text-xs text-gray-400 mt-0.5 hidden md:block">Deposit transactions and channel breakdown</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { fetchPayments(); fetchStats(startDate, endDate); }}
              disabled={loading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3 md:px-4 py-2 text-white text-sm font-semibold transition active:opacity-90 whitespace-nowrap"
              style={{ background: G }}
              onMouseEnter={e => e.currentTarget.style.background = GH}
              onMouseLeave={e => e.currentTarget.style.background = G}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-5">

          {/* ── Stat cards ─────────────────────────────────────────────── */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                label={`Successful — ${PERIOD_LABEL[activeQuick] || 'Period'}`}
                value={inr(stats.success.total)}
                sub={`${stats.success.count} successful deposits`}
                valueColor="#15803d"
                icon={TrendingUp} iconColor={G} iconBg={GL}
              />
              <StatCard
                label={`All Deposits — ${PERIOD_LABEL[activeQuick] || 'Period'}`}
                value={inr(stats.today.total)}
                sub={`${stats.today.count} transactions`}
                icon={Calendar} iconColor="#2563eb" iconBg="#eff6ff"
              />
              <StatCard
                label="Pending"
                value={inr(stats.pending.total)}
                sub={`${stats.pending.count} awaiting`}
                valueColor="#a16207"
                icon={Clock} iconColor="#d97706" iconBg="#fef9c3"
              />
              <StatCard
                label="WatchPays / JazPays / BondPay"
                value={inr((stats.channels?.watchpays?.total || 0) + (stats.channels?.jazpays?.total || 0) + (stats.channels?.bondpay?.total || 0))}
                sub={`WP: ${inr(stats.channels?.watchpays?.total || 0)}  ·  JP: ${inr(stats.channels?.jazpays?.total || 0)}  ·  BP: ${inr(stats.channels?.bondpay?.total || 0)}`}
                icon={CreditCard} iconColor="#7c3aed" iconBg="#ede9fe"
              />
            </div>
          )}

          {/* ── Filter panel ───────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200">
            {/* Row 1 — search inputs + dropdowns + amount */}
            <div className="p-4 flex flex-wrap items-end gap-3 border-b border-gray-100">

              {/* Order search */}
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Order / Merchant ID</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search order or merchant ID…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              {/* Username */}
              <div className="min-w-[170px]">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Exact username"
                    value={exactUsername}
                    onChange={(e) => { setExactUsername(e.target.value); setPage(1); }}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                <Select
                  value={filterStatus}
                  onChange={(v) => { setFilterStatus(v); setPage(1); }}
                  width="150px"
                  options={[
                    { value: '',        label: 'All Status' },
                    { value: 'pending', label: 'Pending'    },
                    { value: 'success', label: 'Success'    },
                  ]}
                />
              </div>

              {/* Channel */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Channel</label>
                <Select
                  value={filterChannel}
                  onChange={(v) => { setFilterChannel(v); setPage(1); }}
                  width="160px"
                  options={[
                    { value: '',           label: 'All Channels' },
                    { value: 'watchpays',  label: 'WatchPays'    },
                    { value: 'jazpays',    label: 'JazPays'      },
                    { value: 'bondpay',    label: 'BondPay'      },
                  ]}
                />
              </div>

              {/* Amount range */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount (₹)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                    className={`${inputCls} w-24`}
                  />
                  <span className="text-gray-400 text-sm select-none">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                    className={`${inputCls} w-24`}
                  />
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-sm text-gray-600 font-medium hover:bg-gray-50 transition self-end"
              >
                <X size={13} /> Reset
              </button>
            </div>

            {/* Row 2 — date quick filters (2-up grid on mobile, scrollable row on desktop) */}
            <div className="px-4 py-3 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-2">
              <div className="col-span-2 hidden md:flex items-center gap-2">
                <Filter size={13} className="text-gray-400 shrink-0" />
                <span className="text-xs text-gray-400 font-medium mr-1">Date:</span>
              </div>
              {quickBtns.filter((btn) => btn.key !== 'custom').map((btn) => {
                const active = activeQuick === btn.key;
                return (
                  <button
                    key={btn.key}
                    onClick={btn.fn}
                    className="px-3 py-1.5 text-xs font-semibold border transition"
                    style={
                      active
                        ? { background: G, borderColor: G, color: '#fff' }
                        : { background: '#fff', borderColor: '#d1d5db', color: '#374151' }
                    }
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = G; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#d1d5db'; }}
                  >
                    {btn.label}
                  </button>
                );
              })}
              <button
                onClick={() => setActiveQuick('custom')}
                className="col-span-2 md:col-auto px-3 py-1.5 text-xs font-semibold border transition"
                style={
                  activeQuick === 'custom'
                    ? { background: G, borderColor: G, color: '#fff' }
                    : { background: '#fff', borderColor: '#d1d5db', color: '#374151' }
                }
              >
                Custom Range
              </button>
              {activeQuick === 'custom' && (
                <DateRangePicker
                  className="col-span-2 md:col-auto"
                  from={startDate}
                  to={endDate}
                  onChange={(f, t) => { setStartDate(f); setEndDate(t); setPage(1); }}
                  placeholder="Pick date range"
                />
              )}
            </div>
          </div>

          {/* ── Error banner ───────────────────────────────────────────── */}
          {error && (
            <div className="border border-red-300 bg-red-50 text-red-600 px-4 py-3 text-sm flex items-center gap-2">
              <X size={14} /> {error}
            </div>
          )}

          {/* ── Table ──────────────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px] text-sm">
                <thead>
                  <tr style={{ background: GL }} className="border-b border-gray-200 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: G }}>Order No</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: G }}>Merchant Order</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: G }}>User</th>
                    <th className="px-5 py-3 text-right font-semibold" style={{ color: G }}>Amount</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: G }}>Status</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: G }}>Channel</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: G }}>Created (IST)</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: G }}>Paid At (IST)</th>
                    <th className="px-5 py-3 text-left font-semibold" style={{ color: G }}>URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={9} className="px-5 py-4">
                          <div className="h-3.5 bg-gray-100 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center">
                        <CreditCard size={36} className="mx-auto mb-3" style={{ color: '#c4d8c6' }} />
                        <p className="text-gray-500 font-medium text-sm">No payments found</p>
                        <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or date range</p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const user         = p.userID || {};
                      const displayName  = user.name || user.username || 'N/A';
                      const chCfg        = CHANNEL_BADGE[p.channel] || { bg: '#f3f4f6', color: '#6b7280' };
                      const chLabel      = CHANNEL_LABEL[p.channel] || p.channel || '—';
                      const stCfg        = STATUS_CFG[p.status] || { bg: '#f3f4f6', color: '#6b7280', label: p.status };
                      return (
                        <tr key={p._id} className="hover:bg-[#f6fbf6] transition-colors">
                          <td className="px-5 py-3.5 font-mono text-gray-800 whitespace-nowrap text-xs">{p.order_no}</td>
                          <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap text-xs">{p.merchant_order_no}</td>
                          <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">{displayName}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                            {inr(p.amount)}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <Badge bg={stCfg.bg} color={stCfg.color}>{stCfg.label}</Badge>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <Badge bg={chCfg.bg} color={chCfg.color}>{chLabel}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
                            {new Date(p.createdAt).toLocaleString('en-US', {
                              timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short',
                              day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
                            })}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                            {(p.successAt || (p.status === 'success' && p.updatedAt)) ? (
                              <span className="font-medium" style={{ color: G }}>
                                {new Date(p.successAt || p.updatedAt).toLocaleString('en-US', {
                                  timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short',
                                  day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
                                })}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {p.paymentUrl ? (
                              <a
                                href={p.paymentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold transition"
                                style={{ color: G }}
                                onMouseEnter={e => e.currentTarget.style.color = GH}
                                onMouseLeave={e => e.currentTarget.style.color = G}
                              >
                                View <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {total > 0
                  ? <><span className="font-semibold text-gray-700">{total}</span> total · page <span className="font-semibold text-gray-700">{page}</span> of <span className="font-semibold text-gray-700">{totalPages}</span></>
                  : 'No records'}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span
                  className="px-4 py-1.5 text-xs font-semibold text-white"
                  style={{ background: G }}
                >
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
