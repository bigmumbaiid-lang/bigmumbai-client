import React, { useEffect, useState, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import axios from '../utils/axios';
import {
  Spade, RefreshCw, Download, TrendingUp, Wallet,
  Users, BarChart3, ChevronLeft, ChevronRight, Search, Target,
} from 'lucide-react';

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const RESULTS = [
  { value: 'all', label: 'All Results' },
  { value: 'win', label: 'Win' },
  { value: 'blackjack', label: 'Blackjack' },
  { value: 'lose', label: 'Lose' },
  { value: 'push', label: 'Push' },
];

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highbet', label: 'Highest Bet' },
  { value: 'highpayout', label: 'Highest Payout' },
];

const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';
const inr = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);
const fmtDate = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

const RESULT_CLS = {
  blackjack: 'bg-amber-100 text-amber-700',
  win:       'bg-emerald-100 text-emerald-700',
  lose:      'bg-rose-100 text-rose-700',
  push:      'bg-gray-100 text-gray-600',
};

export default function BlackJack() {
  const [range, setRange] = useState('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState('all');
  const [doubled, setDoubled] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [data, setData] = useState({ rows: [], stats: null, pagination: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => { setPage(1); }, [range, from, to, result, doubled, sort, debouncedSearch]);

  const buildParams = useCallback((withPaging = true) => {
    const p = { range, result, doubled, sort };
    if (range === 'custom') { p.from = from; p.to = to; }
    if (debouncedSearch) p.search = debouncedSearch;
    if (withPaging) { p.page = page; p.limit = limit; }
    return p;
  }, [range, from, to, result, doubled, sort, debouncedSearch, page, limit]);

  const fetchData = useCallback(async () => {
    if (range === 'custom' && (!from || !to)) return;
    setLoading(true); setError('');
    try {
      const { data: d } = await axios.get('/admin/blackjack/games', { params: buildParams() });
      setData(d);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally { setLoading(false); }
  }, [buildParams, range, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    try {
      const res = await axios.get('/admin/blackjack/export', {
        params: buildParams(false), responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'blackjack-export.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Export failed'); }
  };

  const StatCard = ({ label, value, sub, accent = 'text-gray-900', icon: Icon, iconColor, iconBg }) => (
    <div className="group bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-5 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-gray-500 font-medium">{label}</p>
          <p className={`text-[22px] leading-tight font-bold mt-2 tracking-tight ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
          style={{ background: iconBg }}
        >
          <Icon size={19} style={{ color: iconColor }} strokeWidth={2.2} />
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
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Blackjack</h1>
            <p className="text-xs text-gray-400 mt-0.5">Game activity &amp; performance analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData} disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={handleExport}
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
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#b1835a]" />
              <span className="text-gray-400">to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#b1835a]" />
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
              <StatCard
                label="Total Games" value={stats.games?.toLocaleString('en-US')}
                sub={`${stats.uniquePlayers} players`}
                icon={Spade} iconColor="#b1835a" iconBg="#fef3ec"
              />
              <StatCard
                label="Total Wagered" value={inr(stats.wagered)}
                sub={`Avg bet ${inr(stats.avgBet)}`}
                icon={Wallet} iconColor="#2563eb" iconBg="#eff6ff" accent="text-blue-600"
              />
              <StatCard
                label="Total Paid Out" value={inr(stats.paidOut)}
                sub={`Win rate ${stats.winRate}%`}
                icon={TrendingUp} iconColor="#059669" iconBg="#ecfdf5" accent="text-emerald-600"
              />
              <StatCard
                label="House Profit"
                value={inr(Math.abs(stats.houseProfit))}
                sub={stats.houseProfit >= 0 ? 'House ahead' : 'Players ahead'}
                icon={BarChart3}
                iconColor={stats.houseProfit >= 0 ? '#059669' : '#e11d48'}
                iconBg={stats.houseProfit >= 0 ? '#ecfdf5' : '#fff1f2'}
                accent={stats.houseProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
              />
              <StatCard
                label="Blackjacks" value={stats.blackjacks?.toLocaleString('en-US')}
                icon={Target} iconColor="#7c3aed" iconBg="#f5f3ff"
              />
              <StatCard
                label="Doubles" value={stats.doubles?.toLocaleString('en-US')}
                icon={Users} iconColor="#d97706" iconBg="#fffbeb"
              />
              <StatCard
                label="W / L / P"
                value={`${stats.wins} / ${stats.losses} / ${stats.pushes}`}
                sub="Win · Loss · Push"
                icon={BarChart3} iconColor="#6b7280" iconBg="#f9fafb"
              />
              <StatCard
                label="Biggest Payout" value={inr(stats.biggestPayout)}
                sub={`Top bet ${inr(stats.biggestBet)}`}
                icon={TrendingUp} iconColor="#059669" iconBg="#ecfdf5" accent="text-emerald-600"
              />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-4 mb-6">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exact username..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25"
                />
              </div>
              <select
                value={result} onChange={(e) => setResult(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:border-[#b1835a]"
              >
                {RESULTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={doubled} onChange={(e) => setDoubled(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:border-[#b1835a]"
              >
                <option value="all">Doubled: All</option>
                <option value="true">Doubled only</option>
                <option value="false">Not doubled</option>
              </select>
              <select
                value={sort} onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:border-[#b1835a]"
              >
                {SORTS.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-semibold">Date (IST)</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Player</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Bet</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Result</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Payout</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Net</th>
                    <th className="px-5 py-3.5 text-center font-semibold">2X</th>
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
                  ) : data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <Spade size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No games found for this filter.</p>
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((g) => {
                      const positive = g.net > 0;
                      const zero = g.net === 0;
                      return (
                        <tr key={g._id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{fmtDate(g.createdAt)}</td>
                          <td className="px-5 py-3.5 font-semibold text-gray-900 truncate max-w-[160px]">{g.player}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">{inr(g.bet)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${RESULT_CLS[g.result] || 'bg-gray-100 text-gray-600'}`}>
                              {g.result}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-gray-700 whitespace-nowrap">{inr(g.payout)}</td>
                          <td className={`px-5 py-3.5 text-right font-mono font-semibold whitespace-nowrap ${zero ? 'text-gray-400' : positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {zero ? '—' : (positive ? '+' : '') + inr(g.net)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {g.doubled ? (
                              <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">2X</span>
                            ) : ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {pg && pg.total > 0 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Page {pg.page} of {pg.totalPages} · {pg.total.toLocaleString('en-US')} games
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pg.page <= 1 || loading}
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
