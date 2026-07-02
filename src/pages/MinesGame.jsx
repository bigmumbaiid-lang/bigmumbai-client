import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import axios from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import Select from '../components/Select';
import {
  Bomb, Search, RefreshCw, Download, TrendingUp, Wallet,
  ChevronLeft, ChevronRight, X, Target, BarChart3,
} from 'lucide-react';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const STATUS_CFG = {
  won:        { label: 'Won',        bg: GL,        color: G         },
  cashed_out: { label: 'Cashed Out', bg: '#eff6ff',  color: '#2563eb' },
  lost:       { label: 'Lost',       bg: '#fff1f2',  color: '#be123c' },
  active:     { label: 'Active',     bg: '#fef9c3',  color: '#a16207' },
};

const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const inputCls =
  'border border-gray-300 bg-white text-sm text-gray-800 px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400 w-full';

const emptyFilters = {
  status: 'all', username: '', from: '', to: '',
  minBet: '', maxBet: '', minesCount: '', minMultiplier: '',
};

const IST_OFFSET = 330 * 60000;
const getISTDateStr = () => new Date(Date.now() + IST_OFFSET).toISOString().split('T')[0];
const todayStr = getISTDateStr();
const todayFilters = { ...emptyFilters, from: todayStr, to: todayStr };

const DATE_PRESETS = [
  { key: 'today',  label: 'Today'        },
  { key: 'last7',  label: 'Last 7 Days'  },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'all',    label: 'All time'     },
  { key: 'custom', label: 'Custom Range' },
];

export default function MinesGame() {
  const [filters, setFilters]       = useState(todayFilters);
  const [applied, setApplied]       = useState(todayFilters);
  const [quickFilter, setQuickFilter] = useState('today');
  const [stats, setStats]           = useState(null);
  const [games, setGames]           = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);

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
    } catch { /* silent */ }
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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats(applied);
    fetchGames(applied, 1);
  }, [applied, fetchStats, fetchGames]);

  const handleChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const applyFilters = () => setApplied(filters);
  const resetFilters = () => { setFilters(emptyFilters); setApplied(emptyFilters); setQuickFilter(''); };
  const goToPage = (p) => { if (p < 1 || p > totalPages) return; fetchGames(applied, p); };

  const applyPreset = (key) => {
    setQuickFilter(key);
    if (key === 'custom') return;
    if (key === 'all') {
      const updated = { ...filters, from: '', to: '' };
      setFilters(updated); setApplied(updated); return;
    }
    const t = getISTDateStr();
    const offsets = { today: 0, last7: 6, last30: 29 };
    const f = key === 'today' ? t : new Date(Date.now() + IST_OFFSET - offsets[key] * 86400000).toISOString().split('T')[0];
    const updated = { ...filters, from: f, to: t };
    setFilters(updated); setApplied(updated);
  };

  const exportCsv = () => {
    if (!games.length) return;
    const header = ['Username', 'Status', 'Bet', 'Mines', 'Tiles Revealed', 'Multiplier', 'Payout', 'Date'];
    const rows = games.map(g => [
      g.username, g.status, g.betAmount, g.minesCount,
      g.tilesRevealed, g.multiplier, g.payout,
      new Date(g.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'mines-games.csv'; a.click();
  };

  return (
    <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between md:sticky md:top-0 z-10">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Mines Game</h1>
            <p className="hidden md:block text-xs text-gray-400 mt-0.5">Game activity &amp; performance analytics</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { fetchStats(applied); fetchGames(applied, page); }} disabled={loading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition whitespace-nowrap">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={exportCsv}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition whitespace-nowrap">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-5">

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {stats ? [
              { label: 'Total Games',   value: stats.totalGames?.toLocaleString('en-IN'), sub: 'All-time',          icon: Bomb,     iconColor: '#2563eb', iconBg: '#eff6ff', vc: '#111827' },
              { label: 'Total Wagered', value: inr(stats.totalWagered),                   sub: null,                icon: Wallet,   iconColor: '#7c3aed', iconBg: '#f5f3ff', vc: '#7c3aed' },
              { label: 'Total Paid Out',value: inr(stats.totalPaidOut),                   sub: null,                icon: TrendingUp,iconColor: G,         iconBg: GL,        vc: G         },
              { label: 'House Profit',  value: inr(stats.houseProfit),                    sub: null,
                icon: BarChart3,
                iconColor: stats.houseProfit >= 0 ? G : '#e11d48',
                iconBg:    stats.houseProfit >= 0 ? GL : '#fff1f2',
                vc:        stats.houseProfit >= 0 ? G  : '#be123c' },
              { label: 'Win Rate',      value: `${stats.winRate ?? 0}%`,                  sub: "Players' win rate", icon: Target,   iconColor: '#d97706', iconBg: '#fef9c3', vc: '#111827' },
            ].map(({ label, value, sub, icon: Icon, iconColor, iconBg, vc }) => (
              <div key={label} className="bg-white border border-gray-200 p-3 md:p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
                  <p className="text-lg md:text-2xl font-bold leading-none tracking-tight" style={{ color: vc }}>{value}</p>
                  {sub && <p className="text-[10px] md:text-xs text-gray-400 mt-1.5">{sub}</p>}
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                  <Icon size={16} style={{ color: iconColor }} strokeWidth={2.2} />
                </div>
              </div>
            )) : [...Array(5)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 p-3 md:p-5 animate-pulse">
                <div className="h-3 bg-gray-100 w-2/3 mb-3" /><div className="h-7 bg-gray-100 w-1/2" />
              </div>
            ))}
          </div>

          {/* Filter panel */}
          <div className="bg-white border border-gray-200">
            {/* Date presets */}
            <div className="px-4 pt-3 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-gray-100">
              <span className="text-xs text-gray-400 font-medium shrink-0">Date:</span>
              {DATE_PRESETS.map(p => (
                <button key={p.key} onClick={() => applyPreset(p.key)}
                  className="px-3 py-1.5 text-sm font-medium border transition shrink-0 whitespace-nowrap"
                  style={quickFilter === p.key
                    ? { background: G, color: '#fff', borderColor: G }
                    : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}>
                  {p.label}
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

            {/* Filter inputs */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                <Select
                  value={filters.status}
                  onChange={v => handleChange('status', v)}
                  options={[
                    { value: 'all',        label: 'All Status'  },
                    { value: 'won',        label: 'Won'         },
                    { value: 'cashed_out', label: 'Cashed Out'  },
                    { value: 'lost',       label: 'Lost'        },
                    { value: 'active',     label: 'Active'      },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Username (exact)</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={filters.username} onChange={e => handleChange('username', e.target.value)}
                    placeholder="exact username"
                    className={inputCls + ' pl-8'} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Min Bet (₹)</label>
                <input type="number" value={filters.minBet} onChange={e => handleChange('minBet', e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Max Bet (₹)</label>
                <input type="number" value={filters.maxBet} onChange={e => handleChange('maxBet', e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mines Count</label>
                <input type="number" min="1" max="24" value={filters.minesCount}
                  onChange={e => handleChange('minesCount', e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Min Multiplier</label>
                <input type="number" step="0.01" value={filters.minMultiplier}
                  onChange={e => handleChange('minMultiplier', e.target.value)}
                  className={inputCls} />
              </div>
            </div>

            <div className="px-4 pb-4 flex gap-2">
              <button onClick={applyFilters}
                className="px-5 py-2 text-white text-sm font-semibold transition"
                style={{ background: G }}
                onMouseEnter={e => e.currentTarget.style.background = GH}
                onMouseLeave={e => e.currentTarget.style.background = G}>
                Apply Filters
              </button>
              <button onClick={resetFilters}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 transition">
                <X size={13} /> Reset
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr style={{ background: GL }}>
                    {[
                      { h: 'User',        align: 'left'   },
                      { h: 'Status',      align: 'left'   },
                      { h: 'Bet',         align: 'right'  },
                      { h: 'Mines',       align: 'center' },
                      { h: 'Tiles',       align: 'center' },
                      { h: 'Multiplier',  align: 'right'  },
                      { h: 'Payout',      align: 'right'  },
                      { h: 'Date (IST)',  align: 'left'   },
                    ].map(({ h, align }) => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-${align}`} style={{ color: G }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}><td colSpan={8} className="px-5 py-3"><div className="h-4 bg-gray-100 animate-pulse" /></td></tr>
                    ))
                  ) : games.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Bomb size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No games found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters.</p>
                      </td>
                    </tr>
                  ) : games.map(g => {
                    const sc = STATUS_CFG[g.status] || { label: g.status, bg: '#f3f4f6', color: '#6b7280' };
                    return (
                      <tr key={g.id} className="hover:bg-[#f9fbf9]">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900 text-xs">{g.username}</p>
                          {g.phone && <p className="text-[10px] text-gray-400">{g.phone}</p>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-900 text-xs">{inr(g.betAmount)}</td>
                        <td className="px-5 py-3.5 text-center text-xs font-medium text-gray-700">{g.minesCount}</td>
                        <td className="px-5 py-3.5 text-center text-xs font-medium text-gray-700">{g.tilesRevealed}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-700">{g.multiplier?.toFixed(2)}x</td>
                        <td className={`px-5 py-3.5 text-right font-mono font-semibold text-xs ${g.status === 'lost' ? 'text-rose-600' : 'text-[#3a7d44]'}`}>
                          {inr(g.payout)}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(g.createdAt).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
                            year: '2-digit', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">{total.toLocaleString('en-IN')} games · Page {page} of {totalPages || 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
                  className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeft size={15} />
                </button>
                <span className="px-3 py-1.5 text-sm font-semibold text-white" style={{ background: G }}>
                  Page {page} of {totalPages || 1}
                </span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
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
