import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import axios from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import {
  Download, RefreshCw, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, ArrowLeftRight, BarChart3, X,
} from 'lucide-react';
import Select from '../components/Select';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const inr = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

const IST_OFFSET = 330 * 60000;
const getISTDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + IST_OFFSET + offsetDays * 86400000);
  return d.toISOString().split('T')[0];
};

const RANGES = [
  { value: 'today',  label: 'Today' },
  { value: 'last7',  label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'all',    label: 'All time' },
  { value: 'custom', label: 'Custom Range' },
];

const TYPES = [
  { value: 'all',        label: 'All Types'   },
  { value: 'payment',    label: 'Recharge'    },
  { value: 'withdrawal', label: 'Withdrawal'  },
  { value: 'transfer',   label: 'Transfer'    },
  { value: 'gift',       label: 'Gift'        },
  { value: 'mines',      label: 'Mines'       },
  { value: 'blackjack',  label: 'Blackjack'   },
];

const SORTS = [
  { value: 'newest',  label: 'Newest'         },
  { value: 'oldest',  label: 'Oldest'         },
  { value: 'highest', label: 'Highest Amount' },
  { value: 'lowest',  label: 'Lowest Amount'  },
];

const TYPE_BADGE = {
  payment:    { bg: GL,        color: G        },
  withdrawal: { bg: '#fff1f2', color: '#be123c'},
  transfer:   { bg: '#eff6ff', color: '#2563eb'},
  gift:       { bg: '#f5f3ff', color: '#7c3aed'},
  mines:      { bg: '#fef9c3', color: '#a16207'},
  blackjack:  { bg: '#fff7ed', color: '#c2410c'},
};

const DETAIL_COLOR = {
  payment:    G,
  withdrawal: '#be123c',
  transfer:   '#2563eb',
  gift:       '#7c3aed',
  mines:      '#a16207',
  blackjack:  '#c2410c',
};

const inputCls =
  'border border-gray-300 bg-white text-sm text-gray-800 px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400';

const StatCard = ({ label, value, sub, valueColor = '#111827', icon: Icon, iconBg, iconColor }) => (
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

export default function AdminTransactions() {
  const [type,          setType]         = useState('all');
  const [range,         setRange]        = useState('today');
  const [from,          setFrom]         = useState('');
  const [to,            setTo]           = useState('');
  const [sort,          setSort]         = useState('newest');
  const [minAmount,     setMinAmount]    = useState('');
  const [maxAmount,     setMaxAmount]    = useState('');
  const [username,      setUsername]     = useState('');
  const [debouncedUser, setDebouncedUser] = useState('');
  const [page,          setPage]         = useState(1);
  const limit = 20;
  const [data,    setData]    = useState({ transactions: [], stats: null, pagination: null });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const tmr = useRef(null);

  useEffect(() => {
    clearTimeout(tmr.current);
    tmr.current = setTimeout(() => setDebouncedUser(username.trim()), 400);
    return () => clearTimeout(tmr.current);
  }, [username]);

  useEffect(() => { setPage(1); }, [type, range, from, to, sort, minAmount, maxAmount, debouncedUser]);

  const buildParams = useCallback(() => {
    const p = { type, range, sort, page, limit };
    if (range === 'custom') { p.from = from; p.to = to; }
    if (minAmount)     p.minAmount = minAmount;
    if (maxAmount)     p.maxAmount = maxAmount;
    if (debouncedUser) p.username  = debouncedUser;
    return p;
  }, [type, range, from, to, sort, minAmount, maxAmount, debouncedUser, page]);

  const fetchData = useCallback(async () => {
    if (range === 'custom' && (!from || !to)) return;
    setLoading(true); setError('');
    try {
      const { data: d } = await axios.get('/admin/transactions', { params: buildParams() });
      setData(d);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally { setLoading(false); }
  }, [buildParams, range, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyRange = (val) => {
    setRange(val);
    if (val !== 'custom') { setFrom(''); setTo(''); }
  };

  const resetFilters = () => {
    setUsername(''); setDebouncedUser('');
    setType('all'); setSort('newest');
    setMinAmount(''); setMaxAmount('');
    applyRange('today');
    setPage(1);
  };

  const exportCsv = () => {
    const rows = data.transactions;
    if (!rows.length) return;
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = ['Date,Username,Type,Title,Amount,Balance Before,Balance After'];
    rows.forEach((t) => lines.push([
      new Date(t.date).toISOString(), esc(t.username), t.type, esc(t.title), t.amount,
      t.balanceBefore ?? '', t.balanceAfter ?? '',
    ].join(',')));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = data.stats;
  const pg    = data.pagination;

  return (
    <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between md:sticky md:top-0 z-10">
          <div className="min-w-0 mr-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Transactions</h1>
            <p className="text-xs text-gray-400 mt-0.5 hidden md:block">All money movement across the platform</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchData} disabled={loading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={exportCsv}
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
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                label="Transactions" value={stats.count?.toLocaleString('en-US')}
                sub="In this period"
                icon={ArrowLeftRight} iconColor="#2563eb" iconBg="#eff6ff"
              />
              <StatCard
                label="Total Credit" value={inr(stats.credit)}
                valueColor="#15803d"
                icon={TrendingUp} iconColor={G} iconBg={GL}
              />
              <StatCard
                label="Total Debit" value={inr(stats.debit)}
                valueColor="#be123c"
                icon={TrendingDown} iconColor="#e11d48" iconBg="#fff1f2"
              />
              <StatCard
                label="Net Flow"
                value={(stats.net >= 0 ? '+' : '') + inr(stats.net)}
                sub={Object.entries(stats.byType || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                valueColor={stats.net >= 0 ? '#15803d' : '#be123c'}
                icon={BarChart3}
                iconColor={stats.net >= 0 ? G : '#e11d48'}
                iconBg={stats.net >= 0 ? GL : '#fff1f2'}
              />
            </div>
          )}

          {/* Filter panel */}
          <div className="bg-white border border-gray-200">

            {/* Row 1 — date presets (2-up grid on mobile, scrollable row on desktop) */}
            <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-2 md:overflow-x-auto md:scrollbar-none border-b border-gray-100">
              <span className="hidden md:inline text-xs text-gray-400 font-medium shrink-0">Date:</span>
              {RANGES.filter((r) => r.value !== 'custom').map((r) => (
                <button
                  key={r.value}
                  onClick={() => applyRange(r.value)}
                  className="px-3 py-1.5 text-xs font-semibold border transition md:shrink-0 md:whitespace-nowrap"
                  style={range === r.value
                    ? { background: G, color: '#fff', borderColor: G }
                    : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
                >
                  {r.label}
                </button>
              ))}
              <button
                onClick={() => applyRange('custom')}
                className="col-span-2 md:col-auto px-3 py-1.5 text-xs font-semibold border transition md:shrink-0 md:whitespace-nowrap"
                style={range === 'custom'
                  ? { background: G, color: '#fff', borderColor: G }
                  : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
              >
                Custom Range
              </button>
              {range === 'custom' && (
                <DateRangePicker
                  className="col-span-2 md:col-auto"
                  from={from} to={to}
                  onChange={(f, t) => { setFrom(f); setTo(t); }}
                  placeholder="Pick date range"
                />
              )}
            </div>

            {/* Row 2 — type + sort + amount + reset (no overflow-x-auto so Selects work) */}
            <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-gray-100">
              <Select value={type} onChange={setType} options={TYPES} />
              <Select value={sort} onChange={setSort} options={SORTS} />

              <div className="flex items-center gap-1">
                <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="Min ₹" className={inputCls + ' w-24'} />
                <span className="text-gray-400 text-sm">—</span>
                <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="Max ₹" className={inputCls + ' w-24'} />
              </div>

              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm text-gray-500 hover:bg-gray-50 transition whitespace-nowrap"
              >
                <X size={13} /> Reset
              </button>
            </div>

            {/* Row 3 — username search */}
            <div className="p-4">
              <input
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Exact username…"
                className={inputCls + ' w-full'}
              />
            </div>
          </div>

          {error && (
            <div className="border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-sm">{error}</div>
          )}

          {/* Table */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr style={{ background: GL }}>
                    {['Date (IST)', 'Username', 'Type', 'Prev. Balance', 'Amount', 'New Balance', 'Detail'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: G }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-5 py-3">
                          <div className="h-4 bg-gray-100 animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : data.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <ArrowLeftRight size={36} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No transactions found</p>
                      </td>
                    </tr>
                  ) : data.transactions.map((t, i) => {
                    const positive = t.amount >= 0;
                    const hasBal   = t.balanceBefore != null;
                    const badge    = TYPE_BADGE[t.type] || { bg: '#f3f4f6', color: '#6b7280' };
                    const detColor = DETAIL_COLOR[t.type] || '#374151';
                    return (
                      <tr key={i} className="hover:bg-[#f9fbf9]">
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">{fmtDate(t.date)}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900 max-w-[140px] truncate">{t.username}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-block px-2 py-0.5 text-xs font-semibold tracking-wide capitalize"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-gray-400 whitespace-nowrap text-xs">
                          {hasBal ? inr(t.balanceBefore) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className={`px-5 py-3.5 font-mono font-semibold whitespace-nowrap ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {positive ? '+' : ''}{inr(t.amount)}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-gray-800 font-semibold whitespace-nowrap text-xs">
                          {hasBal ? inr(t.balanceAfter) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 max-w-[220px] text-sm">
                          <span className="truncate block">
                            <span style={{ color: detColor, fontWeight: 600 }}>{t.title}</span>
                            {t.silent && (
                              <span className="ml-1.5 inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gray-200 text-gray-600 align-middle">
                                Silent
                              </span>
                            )}
                            {t.admin      && <span className="text-indigo-500 font-medium"> · {t.admin}</span>}
                            {t.remark && t.type !== 'transfer' && <span className="text-gray-400"> · {t.remark}</span>}
                            {t.multiplier && <span className="text-gray-400"> · {t.multiplier}x</span>}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pg && pg.totalItems > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  {pg.totalItems.toLocaleString('en-US')} total · page {pg.currentPage} of {pg.totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pg.currentPage <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="px-3 py-1.5 text-sm font-semibold text-white" style={{ background: G }}>
                    Page {pg.currentPage} of {pg.totalPages}
                  </span>
                  <button
                    disabled={!pg.hasMore || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
