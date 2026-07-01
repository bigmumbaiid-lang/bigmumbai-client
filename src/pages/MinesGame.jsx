import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import axios from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import {
  Bomb, Search, RefreshCw, Download, TrendingUp, Wallet,
  ChevronLeft, ChevronRight, X, Target, BarChart3,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'won', label: 'Won' },
  { value: 'cashed_out', label: 'Cashed Out' },
  { value: 'lost', label: 'Lost' },
  { value: 'active', label: 'Active' },
];

const STATUS_CFG = {
  won:        { label: 'Won',        cls: 'bg-emerald-100 text-emerald-700' },
  cashed_out: { label: 'Cashed Out', cls: 'bg-blue-100 text-blue-700' },
  lost:       { label: 'Lost',       cls: 'bg-rose-100 text-rose-700' },
  active:     { label: 'Active',     cls: 'bg-amber-100 text-amber-700' },
};

const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';
const inr = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const emptyFilters = {
  status: 'all', username: '', from: '', to: '',
  minBet: '', maxBet: '', minPayout: '', maxPayout: '',
  minesCount: '', minMultiplier: '', maxMultiplier: '',
};

const fmt = (d) => d.toISOString().split('T')[0];
const todayStr = fmt(new Date());
const todayFilters = { ...emptyFilters, from: todayStr, to: todayStr };

export default function MinesGame() {
  const [filters, setFilters] = useState(todayFilters);
  const [applied, setApplied] = useState(todayFilters);
  const [quickFilter, setQuickFilter] = useState('today');
  const [stats, setStats] = useState(null);
  const [games, setGames] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const cleanParams = (obj, extra = {}) => {
    const params = { ...extra };
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined && v !== 'all') params[k] = v;
      if (k === 'status' && v === 'all') params.status = 'all';
    });
    return params;
  };

  const fetchStats = useCallback(async (f) => {
    try {
      const { data } = await axios.get('/admin/mines/stats', { params: cleanParams(f) });
      setStats(data.stats);
    } catch (err) { console.error('stats error', err); }
  }, []);

  const fetchGames = useCallback(async (f, pageNum) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/admin/mines/games', {
        params: cleanParams(f, { page: pageNum, limit: 20 }),
      });
      setGames(data.results);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) { console.error('games error', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats(applied);
    fetchGames(applied, 1);
  }, [applied, fetchStats, fetchGames]);

  const handleChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const applyFilters = () => setApplied(filters);
  const resetFilters = () => { setFilters(emptyFilters); setApplied(emptyFilters); setQuickFilter(''); };
  const goToPage = (p) => { if (p < 1 || p > totalPages) return; fetchGames(applied, p); };

  const applyDatePreset = (from, to, key) => {
    const updated = { ...filters, from, to };
    setFilters(updated);
    setApplied(updated);
    setQuickFilter(key);
  };
  const setToday  = () => { const t = fmt(new Date()); applyDatePreset(t, t, 'today'); };
  const setLast7  = () => { const n = new Date(); applyDatePreset(fmt(new Date(n-6*86400000)), fmt(n), 'last7'); };
  const setLast30 = () => { const n = new Date(); applyDatePreset(fmt(new Date(n-29*86400000)), fmt(n), 'last30'); };

  const quickButtons = [
    { label: 'Today',        key: 'today',  fn: setToday  },
    { label: 'Last 7 Days',  key: 'last7',  fn: setLast7  },
    { label: 'Last 30 Days', key: 'last30', fn: setLast30 },
    { label: 'Custom',       key: 'custom', fn: () => setQuickFilter('custom') },
  ];

  const exportCsv = () => {
    if (!games.length) return;
    const header = ['Username', 'Status', 'Bet', 'Mines', 'Tiles Revealed', 'Multiplier', 'Payout', 'Date'];
    const rows = games.map((g) => [
      g.username, g.status, g.betAmount, g.minesCount,
      g.tilesRevealed, g.multiplier, g.payout,
      new Date(g.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'mines-games.csv'; a.click();
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

  return (
    <div className="flex h-screen bg-[#f6f7fb]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mines Game</h1>
            <p className="text-xs text-gray-400 mt-0.5">Game activity &amp; performance analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchStats(applied); fetchGames(applied, page); }}
              disabled={loading}
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
          {stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
              <StatCard label="Total Games" value={stats.totalGames?.toLocaleString('en-US')} sub="All-time" icon={Bomb} iconColor="#b1835a" iconBg="#fef3ec" />
              <StatCard label="Total Wagered" value={inr(stats.totalWagered)} icon={Wallet} iconColor="#2563eb" iconBg="#eff6ff" accent="text-blue-600" />
              <StatCard label="Total Paid Out" value={inr(stats.totalPaidOut)} icon={TrendingUp} iconColor="#059669" iconBg="#ecfdf5" accent="text-emerald-600" />
              <StatCard
                label="House Profit"
                value={inr(stats.houseProfit)}
                icon={BarChart3}
                iconColor={stats.houseProfit >= 0 ? '#059669' : '#e11d48'}
                iconBg={stats.houseProfit >= 0 ? '#ecfdf5' : '#fff1f2'}
                accent={stats.houseProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
              />
              <StatCard label="Win Rate" value={`${stats.winRate ?? 0}%`} sub="Players' win rate" icon={Target} iconColor="#7c3aed" iconBg="#f5f3ff" />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
                  <div className="h-7 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-4 mb-6">
            {/* Date preset buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              {quickButtons.map((btn) => (
                <button
                  key={btn.key} onClick={btn.fn}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${quickFilter === btn.key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  style={quickFilter === btn.key ? { background: BRAND } : undefined}
                >
                  {btn.label}
                </button>
              ))}
              {quickFilter === 'custom' && (
                <DateRangePicker
                  from={filters.from} to={filters.to}
                  onChange={(f, t) => setFilters(prev => ({ ...prev, from: f, to: t }))}
                  placeholder="Pick date range"
                />
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25"
                >
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5">Username (exact)</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={filters.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder="exact username"
                    className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5">Min Bet (₹)</label>
                <input
                  type="number" value={filters.minBet}
                  onChange={(e) => handleChange('minBet', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b1835a]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5">Max Bet (₹)</label>
                <input
                  type="number" value={filters.maxBet}
                  onChange={(e) => handleChange('maxBet', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b1835a]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5">Mines Count</label>
                <input
                  type="number" min="1" max="24" value={filters.minesCount}
                  onChange={(e) => handleChange('minesCount', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b1835a]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5">Min Multiplier</label>
                <input
                  type="number" step="0.01" value={filters.minMultiplier}
                  onChange={(e) => handleChange('minMultiplier', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#b1835a]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={applyFilters}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold active:scale-95 transition"
                style={{ background: BRAND }}
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
              >
                <X size={14} /> Reset
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-semibold">User</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Bet</th>
                    <th className="px-5 py-3.5 text-center font-semibold">Mines</th>
                    <th className="px-5 py-3.5 text-center font-semibold">Tiles</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Multiplier</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Payout</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Date (IST)</th>
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
                  ) : games.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Bomb size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No games found</p>
                        <p className="text-gray-400 text-sm">Try adjusting your filters.</p>
                      </td>
                    </tr>
                  ) : (
                    games.map((g) => {
                      const sc = STATUS_CFG[g.status] || { label: g.status, cls: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={g.id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-gray-900">{g.username}</div>
                            {g.phone && <div className="text-xs text-gray-400 mt-0.5">{g.phone}</div>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.cls}`}>{sc.label}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-900">{inr(g.betAmount)}</td>
                          <td className="px-5 py-3.5 text-center font-medium text-gray-700">{g.minesCount}</td>
                          <td className="px-5 py-3.5 text-center font-medium text-gray-700">{g.tilesRevealed}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-medium text-gray-700">{g.multiplier?.toFixed(2)}x</td>
                          <td className={`px-5 py-3.5 text-right font-mono font-semibold ${g.status === 'lost' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {inr(g.payout)}
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(g.createdAt).toLocaleString('en-US', {
                              timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
                              year: '2-digit', hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                {total.toLocaleString('en-US')} games · Page {page} of {totalPages || 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)} disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
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
