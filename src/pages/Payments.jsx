import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import {
  Search, Calendar, X, ExternalLink, RefreshCw, CreditCard,
  TrendingUp, Clock, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';

const CHANNEL_BADGE = {
  watchpays: 'bg-violet-100 text-violet-700',
  jazpays:   'bg-sky-100 text-sky-700',
};
const CHANNEL_LABEL = { watchpays: 'WatchPays', jazpays: 'JazPays' };
const STATUS_COLOR = {
  success:   'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  expired:   'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-400',
};

const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';
const inr = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [exactUsername, setExactUsername] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('');

  const limit = 20;
  const fmt = (d) => d.toISOString().split('T')[0];

  const fetchPayments = async () => {
    if (minAmount && maxAmount && Number(minAmount) > Number(maxAmount)) {
      setError('Min amount cannot be greater than max amount');
      return;
    }
    try {
      setLoading(true); setError(null);
      const params = {
        page, limit,
        gatewayOnly: 1,
        ...(filterStatus && { status: filterStatus }),
        ...(filterChannel && { channel: filterChannel }),
        ...(search && { search: search.trim() }),
        ...(exactUsername && { exactUsername: exactUsername.trim() }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(minAmount && { minAmount: Number(minAmount) }),
        ...(maxAmount && { maxAmount: Number(maxAmount) }),
      };
      const { data } = await api.get('/payment/get-payments', { params });
      if (data.success) {
        setPayments(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
      } else {
        setError(data.message || 'Failed to load payments');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to server');
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/payment/stats', { params: { gatewayOnly: 1 } });
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

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (page > totalPages) setPage(totalPages || 1); }, [totalPages]); // eslint-disable-line

  useEffect(() => {
    if (!startDate || !endDate) { setActiveQuickFilter(''); return; }
    const today = fmt(new Date());
    if (startDate === today && endDate === today) { setActiveQuickFilter('today'); return; }
    const now = new Date();
    const fw = new Date(now); fw.setDate(now.getDate() - now.getDay());
    const lw = new Date(fw); lw.setDate(fw.getDate() + 6);
    if (startDate === fmt(fw) && endDate === fmt(lw)) { setActiveQuickFilter('week'); return; }
    const fm = new Date(now.getFullYear(), now.getMonth(), 1);
    const lm = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setActiveQuickFilter(startDate === fmt(fm) && endDate === fmt(lm) ? 'month' : '');
  }, [startDate, endDate]);

  const setToday = () => { const t = fmt(new Date()); setStartDate(t); setEndDate(t); setPage(1); };
  const setThisWeek = () => {
    const now = new Date();
    const fw = new Date(now); fw.setDate(now.getDate() - now.getDay());
    const lw = new Date(fw); lw.setDate(fw.getDate() + 6);
    setStartDate(fmt(fw)); setEndDate(fmt(lw)); setPage(1);
  };
  const setThisMonth = () => {
    const now = new Date();
    setStartDate(fmt(new Date(now.getFullYear(), now.getMonth(), 1)));
    setEndDate(fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    setPage(1);
  };
  const resetFilters = () => {
    setSearchInput(''); setSearch(''); setExactUsername('');
    setFilterStatus(''); setFilterChannel('');
    setStartDate(''); setEndDate(''); setMinAmount(''); setMaxAmount('');
    setPage(1); setActiveQuickFilter('');
  };

  const exportCsv = () => {
    if (!payments.length) return;
    const header = ['Order No', 'Merchant Order', 'User', 'Amount', 'Status', 'Channel', 'Date'];
    const rows = payments.map((p) => [
      p.order_no, p.merchant_order_no,
      p.userID?.username || 'N/A',
      p.amount, p.status, p.channel,
      new Date(p.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'payments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const StatCard = ({ label, value, sub, accent = 'text-gray-900', icon: Icon, iconColor, iconBg }) => (
    <div className="group bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-5 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-gray-500 font-medium">{label}</p>
          <p className={`text-[26px] leading-tight font-bold mt-2 tracking-tight ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
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

  const quickButtons = [
    { label: 'Today', key: 'today', fn: setToday },
    { label: 'This Week', key: 'week', fn: setThisWeek },
    { label: 'This Month', key: 'month', fn: setThisMonth },
  ];

  return (
    <div className="flex h-screen bg-[#f6f7fb]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payments</h1>
            <p className="text-xs text-gray-400 mt-0.5">Deposit transactions and channel breakdown</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchPayments(); fetchStats(); }} disabled={loading}
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
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              <StatCard
                label="Total Recharged" value={inr(stats.success.total)}
                sub={`${stats.success.count} successful`}
                accent="text-emerald-600" icon={TrendingUp} iconColor="#059669" iconBg="#ecfdf5"
              />
              <StatCard
                label="Today" value={inr(stats.today.total)}
                sub={`${stats.today.count} transactions`}
                icon={Calendar} iconColor="#2563eb" iconBg="#eff6ff"
              />
              <StatCard
                label="Pending" value={inr(stats.pending.total)}
                sub={`${stats.pending.count} awaiting`}
                accent="text-amber-600" icon={Clock} iconColor="#d97706" iconBg="#fffbeb"
              />
              <StatCard
                label="WatchPays / JazPays"
                value={inr((stats.channels?.watchpays?.total || 0) + (stats.channels?.jazpays?.total || 0))}
                sub={`WP: ${inr(stats.channels?.watchpays?.total || 0)} · JP: ${inr(stats.channels?.jazpays?.total || 0)}`}
                icon={CreditCard} iconColor="#7c3aed" iconBg="#f5f3ff"
              />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px] relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Search order / merchant order..."
                  value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                />
              </div>
              <div className="min-w-[180px] relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Exact username"
                  value={exactUsername} onChange={(e) => { setExactUsername(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                />
              </div>
              <select
                value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:border-[#b1835a]"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="success">Success</option>
              </select>
              <select
                value={filterChannel} onChange={(e) => { setFilterChannel(e.target.value); setPage(1); }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:border-[#b1835a]"
              >
                <option value="">All Channels</option>
                <option value="watchpays">WatchPays</option>
                <option value="jazpays">JazPays</option>
              </select>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min ₹" value={minAmount}
                  onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                  className="w-24 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a]" />
                <span className="text-gray-400">–</span>
                <input type="number" placeholder="Max ₹" value={maxAmount}
                  onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                  className="w-24 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a]" />
              </div>
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              >
                <X size={15} /> Reset
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              {quickButtons.map((btn) => (
                <button
                  key={btn.key} onClick={btn.fn}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${activeQuickFilter === btn.key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  style={activeQuickFilter === btn.key ? { background: BRAND } : undefined}
                >
                  {btn.label}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-1">
                <input type="date" value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a]" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="date" value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a]" />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px] text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-semibold">Order No</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Merchant Order</th>
                    <th className="px-5 py-3.5 text-left font-semibold">User</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Channel</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Date (IST)</th>
                    <th className="px-5 py-3.5 text-left font-semibold">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={8} className="px-5 py-3.5">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : error ? (
                    <tr><td colSpan={8} className="py-16 text-center text-rose-500">{error}</td></tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No payments found</p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const user = p.userID || {};
                      const displayName = user.name || user.username || 'N/A';
                      const channelBadge = CHANNEL_BADGE[p.channel] || 'bg-gray-100 text-gray-600';
                      const channelLabel = CHANNEL_LABEL[p.channel] || p.channel || '—';
                      const statusBadge = STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-600';
                      return (
                        <tr key={p._id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3.5 font-mono text-gray-900 whitespace-nowrap">{p.order_no}</td>
                          <td className="px-5 py-3.5 text-gray-600 font-medium whitespace-nowrap">{p.merchant_order_no}</td>
                          <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">{displayName}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">{inr(p.amount)}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge}`}>{p.status}</span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${channelBadge}`}>{channelLabel}</span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
                            {new Date(p.createdAt).toLocaleString('en-US', {
                              timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short',
                              day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
                            })}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {p.paymentUrl ? (
                              <a href={p.paymentUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-sm">
                                View <ExternalLink size={13} />
                              </a>
                            ) : <span className="text-gray-400 text-xs">N/A</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {total > 0 ? `Page ${page} of ${totalPages} · ${total} total` : '—'}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft size={17} />
                </button>
                <span className="px-2 text-sm font-medium text-gray-700">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40">
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
