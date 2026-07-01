import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import axios from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import {
  Download, RefreshCw, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, ArrowLeftRight, BarChart3,
} from 'lucide-react';

const RANGES = [
  { value: 'today',  label: 'Today' },
  { value: 'last7',  label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

const TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'payment', label: 'Recharge' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'gift', label: 'Gift' },
  { value: 'mines', label: 'Mines' },
  { value: 'blackjack', label: 'Blackjack' },
];

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest', label: 'Highest Amount' },
  { value: 'lowest', label: 'Lowest Amount' },
];

const TYPE_BADGE = {
  payment:    'bg-emerald-100 text-emerald-700',
  withdrawal: 'bg-rose-100 text-rose-700',
  transfer:   'bg-blue-100 text-blue-700',
  gift:       'bg-purple-100 text-purple-700',
  mines:      'bg-amber-100 text-amber-700',
  blackjack:  'bg-orange-100 text-orange-700',
};

const TITLE_COLOR = {
  payment:    'text-emerald-600 font-semibold',
  withdrawal: 'text-rose-600 font-semibold',
  transfer:   'text-blue-600 font-semibold',
  gift:       'text-purple-600 font-semibold',
  mines:      'text-amber-600 font-semibold',
  blackjack:  'text-orange-600 font-semibold',
};

const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';
const inr = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);
const fmtDate = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

export default function AdminTransactions() {
  const [type, setType] = useState('all');
  const [range, setRange] = useState('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [username, setUsername] = useState('');
  const [debouncedUser, setDebouncedUser] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [data, setData] = useState({ transactions: [], stats: null, pagination: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    if (minAmount) p.minAmount = minAmount;
    if (maxAmount) p.maxAmount = maxAmount;
    if (debouncedUser) p.username = debouncedUser;
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

  const StatCard = ({ label, value, sub, accent = 'text-gray-900', icon: Icon, iconColor, iconBg }) => (
    <div className="group bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-5 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-gray-500 font-medium">{label}</p>
          <p className={`text-[24px] leading-tight font-bold mt-2 tracking-tight ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
          style={{ background: iconBg }}
        >
          <Icon size={21} style={{ color: iconColor }} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );

  const stats = data.stats;
  const pg = data.pagination;

  return (
    <div className="flex h-screen bg-[#f6f7fb]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transactions</h1>
            <p className="text-xs text-gray-400 mt-0.5">All money movement across the platform</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData} disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm active:scale-95 transition"
              style={{ background: BRAND }}
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          {/* Range presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {RANGES.map((r) => (
              <button
                key={r.value} onClick={() => setRange(r.value)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${range === r.value ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                style={range === r.value ? { background: BRAND } : undefined}
              >
                {r.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <DateRangePicker
                from={from} to={to}
                onChange={(f, t) => { setFrom(f); setTo(t); }}
                placeholder="Pick date range"
              />
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
              <StatCard
                label="Transactions" value={stats.count?.toLocaleString('en-US')}
                sub="In this period"
                icon={ArrowLeftRight} iconColor="#2563eb" iconBg="#eff6ff"
              />
              <StatCard
                label="Total Credit" value={inr(stats.credit)}
                accent="text-emerald-600" icon={TrendingUp} iconColor="#059669" iconBg="#ecfdf5"
              />
              <StatCard
                label="Total Debit" value={inr(stats.debit)}
                accent="text-rose-600" icon={TrendingDown} iconColor="#e11d48" iconBg="#fff1f2"
              />
              <StatCard
                label="Net Flow"
                value={(stats.net >= 0 ? '+' : '') + inr(stats.net)}
                sub={Object.entries(stats.byType || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                accent={stats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                icon={BarChart3}
                iconColor={stats.net >= 0 ? '#059669' : '#e11d48'}
                iconBg={stats.net >= 0 ? '#ecfdf5' : '#fff1f2'}
              />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <input
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Exact username"
                className="lg:col-span-2 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25"
              />
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:border-[#b1835a]">
                {TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:border-[#b1835a]">
                {SORTS.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
              </select>
              <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)}
                placeholder="Min ₹"
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#b1835a]" />
              <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Max ₹"
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#b1835a]" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-semibold">Date (IST)</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Username</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Type</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Prev. Balance</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Amount</th>
                    <th className="px-5 py-3.5 text-left font-semibold">New Balance</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-5 py-3.5">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : data.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <ArrowLeftRight size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No transactions found.</p>
                      </td>
                    </tr>
                  ) : (
                    data.transactions.map((t, i) => {
                      const positive = t.amount >= 0;
                      const hasBal = t.balanceBefore != null;
                      return (
                        <tr key={i} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{fmtDate(t.date)}</td>
                          <td className="px-5 py-3.5 font-semibold text-gray-900 truncate max-w-[140px]">{t.username}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${TYPE_BADGE[t.type] || 'bg-gray-100 text-gray-600'}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono text-gray-400 whitespace-nowrap text-xs">
                            {hasBal ? inr(t.balanceBefore) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className={`px-5 py-3.5 text-left font-mono font-semibold whitespace-nowrap ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {positive ? '+' : ''}{inr(t.amount)}
                          </td>
                          <td className="px-5 py-3.5 text-left font-mono text-gray-800 font-semibold whitespace-nowrap text-xs">
                            {hasBal ? inr(t.balanceAfter) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3.5 max-w-[220px] text-sm">
                            <span className="truncate block text-gray-500">
                              <span className={TITLE_COLOR[t.type] || 'text-gray-700'}>{t.title}</span>
                              {t.admin && <span className="text-indigo-500 font-medium"> · {t.admin}</span>}
                              {t.remark && t.type !== 'transfer' ? <span className="text-gray-400"> · {t.remark}</span> : ''}
                              {t.multiplier ? <span className="text-gray-400"> · {t.multiplier}x</span> : ''}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {pg && pg.totalItems > 0 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Page {pg.currentPage} of {pg.totalPages} · {pg.totalItems.toLocaleString('en-US')} records
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pg.currentPage <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    disabled={!pg.hasMore || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight size={17} />
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
