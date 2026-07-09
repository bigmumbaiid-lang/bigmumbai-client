import React, { useEffect, useState, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import axios from '../utils/axios';
import DateRangePicker from '../components/DateRangePicker';
import Select from '../components/Select';
import {
  Spade, RefreshCw, Download, TrendingUp, Wallet,
  Users, BarChart3, ChevronLeft, ChevronRight, Search, Target,
} from 'lucide-react';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const RANGES = [
  { value: 'today',  label: 'Today'        },
  { value: 'last7',  label: 'Last 7 Days'  },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'all',    label: 'All time'     },
  { value: 'custom', label: 'Custom Range' },
];

const RESULTS = [
  { value: 'all',       label: 'All Results' },
  { value: 'win',       label: 'Win'         },
  { value: 'blackjack', label: 'Blackjack'   },
  { value: 'lose',      label: 'Lose'        },
  { value: 'push',      label: 'Push'        },
];

const SORTS = [
  { value: 'newest',     label: 'Newest'         },
  { value: 'oldest',     label: 'Oldest'         },
  { value: 'highbet',    label: 'Highest Bet'    },
  { value: 'highpayout', label: 'Highest Payout' },
];

const RESULT_CFG = {
  blackjack: { bg: '#fef9c3', color: '#a16207' },
  win:       { bg: GL,        color: G          },
  lose:      { bg: '#fff1f2', color: '#be123c'  },
  push:      { bg: '#f3f4f6', color: '#6b7280'  },
};

const inr = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

const inputCls =
  'border border-gray-300 bg-white text-sm text-gray-800 px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400 w-full';

export default function BlackJack() {
  const [range, setRange]                   = useState('today');
  const [from, setFrom]                     = useState('');
  const [to, setTo]                         = useState('');
  const [result, setResult]                 = useState('all');
  const [doubled, setDoubled]               = useState('all');
  const [sort, setSort]                     = useState('newest');
  const [search, setSearch]                 = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                     = useState(1);
  const [limit]                             = useState(20);
  const [data, setData]                     = useState({ rows: [], stats: null, pagination: null });
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
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

  const stats = data.stats;
  const pg    = data.pagination;

  return (
    <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between md:sticky md:top-0 z-10">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Blackjack</h1>
            <p className="hidden md:block text-xs text-gray-400 mt-0.5">Game activity &amp; performance analytics</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition whitespace-nowrap">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition whitespace-nowrap">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-5">

          {/* Stat cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: 'Total Games',   value: stats.games?.toLocaleString('en-IN'),        sub: `${stats.uniquePlayers} players`,  icon: Spade,     iconColor: '#2563eb', iconBg: '#eff6ff', vc: '#111827' },
                { label: 'Total Wagered', value: inr(stats.wagered),                          sub: `Avg bet ${inr(stats.avgBet)}`,    icon: Wallet,    iconColor: '#7c3aed', iconBg: '#f5f3ff', vc: '#7c3aed' },
                { label: 'Total Paid Out',value: inr(stats.paidOut),                          sub: `Win rate ${stats.winRate}%`,      icon: TrendingUp,iconColor: G,         iconBg: GL,        vc: G         },
                {
                  label: 'House Profit',
                  value: inr(Math.abs(stats.houseProfit)),
                  sub: stats.houseProfit >= 0 ? 'House ahead' : 'Players ahead',
                  icon: BarChart3,
                  iconColor: stats.houseProfit >= 0 ? G : '#e11d48',
                  iconBg:    stats.houseProfit >= 0 ? GL : '#fff1f2',
                  vc:        stats.houseProfit >= 0 ? G  : '#be123c',
                },
                { label: 'Blackjacks',    value: stats.blackjacks?.toLocaleString('en-IN'),  sub: null, icon: Target,    iconColor: '#d97706', iconBg: '#fef9c3', vc: '#111827' },
                { label: 'Doubles',       value: stats.doubles?.toLocaleString('en-IN'),      sub: null, icon: Users,     iconColor: '#6366f1', iconBg: '#eef2ff', vc: '#111827' },
                { label: 'W / L / P',     value: `${stats.wins} / ${stats.losses} / ${stats.pushes}`, sub: 'Win · Loss · Push', icon: BarChart3, iconColor: '#6b7280', iconBg: '#f9fafb', vc: '#111827' },
                { label: 'Biggest Payout',value: inr(stats.biggestPayout),                   sub: `Top bet ${inr(stats.biggestBet)}`, icon: TrendingUp, iconColor: G, iconBg: GL, vc: G },
              ].map(({ label, value, sub, icon: Icon, iconColor, iconBg, vc }) => (
                <div key={label} className="bg-white border border-gray-200 p-3 md:p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
                    <p className="text-base md:text-xl font-bold leading-none tracking-tight" style={{ color: vc }}>{value}</p>
                    {sub && <p className="text-[10px] md:text-xs text-gray-400 mt-1.5">{sub}</p>}
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                    <Icon size={16} style={{ color: iconColor }} strokeWidth={2.2} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filter panel */}
          <div className="bg-white border border-gray-200">
            {/* Date presets — 2-up grid on mobile, scrollable row on desktop */}
            <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-2 md:overflow-x-auto md:scrollbar-none border-b border-gray-100">
              <span className="hidden md:inline text-xs text-gray-400 font-medium shrink-0">Date:</span>
              {RANGES.filter(r => r.value !== 'custom').map(r => (
                <button key={r.value} onClick={() => setRange(r.value)}
                  className="px-3 py-1.5 text-sm font-medium border transition md:shrink-0 md:whitespace-nowrap"
                  style={range === r.value
                    ? { background: G, color: '#fff', borderColor: G }
                    : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}>
                  {r.label}
                </button>
              ))}
              <button onClick={() => setRange('custom')}
                className="col-span-2 md:col-auto px-3 py-1.5 text-sm font-medium border transition md:shrink-0 md:whitespace-nowrap"
                style={range === 'custom'
                  ? { background: G, color: '#fff', borderColor: G }
                  : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}>
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

            {/* Search row */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search exact username…"
                  className={inputCls + ' pl-8'} />
              </div>
            </div>

            {/* Filter selects — NOT in overflow container */}
            <div className="p-4 flex flex-wrap items-center gap-3">
              <Select value={result} onChange={v => setResult(v)} options={RESULTS} width="150px" />
              <Select
                value={doubled}
                onChange={v => setDoubled(v)}
                width="150px"
                options={[
                  { value: 'all',   label: 'Doubled: All' },
                  { value: 'true',  label: 'Doubled only' },
                  { value: 'false', label: 'Not doubled'  },
                ]}
              />
              <Select
                value={sort}
                onChange={v => setSort(v)}
                width="170px"
                options={SORTS.map(o => ({ value: o.value, label: `Sort: ${o.label}` }))}
              />
            </div>
          </div>

          {error && (
            <div className="border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-sm">{error}</div>
          )}

          {/* Table */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr style={{ background: GL }}>
                    {[
                      { h: 'Date (IST)', align: 'left'   },
                      { h: 'Player',     align: 'left'   },
                      { h: 'Bet',        align: 'right'  },
                      { h: 'Result',     align: 'left'   },
                      { h: 'Payout',     align: 'right'  },
                      { h: 'Net',        align: 'right'  },
                      { h: '2X',         align: 'center' },
                    ].map(({ h, align }) => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-${align}`} style={{ color: G }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-4 bg-gray-100 animate-pulse" /></td></tr>
                    ))
                  ) : data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <Spade size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No games found for this filter.</p>
                      </td>
                    </tr>
                  ) : data.rows.map(g => {
                    const positive = g.net > 0;
                    const zero     = g.net === 0;
                    const rc       = RESULT_CFG[g.result] || { bg: '#f3f4f6', color: '#6b7280' };
                    return (
                      <tr key={g._id} className="hover:bg-[#f9fbf9]">
                        <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{fmtDate(g.createdAt)}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900 text-xs truncate max-w-[160px]">{g.player}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-gray-900 text-xs whitespace-nowrap">{inr(g.bet)}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold capitalize"
                            style={{ background: rc.bg, color: rc.color }}>
                            {g.result}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-700 whitespace-nowrap">{inr(g.payout)}</td>
                        <td className={`px-5 py-3.5 text-right font-mono font-semibold text-xs whitespace-nowrap ${zero ? 'text-gray-400' : positive ? 'text-[#3a7d44]' : 'text-rose-600'}`}>
                          {zero ? '—' : (positive ? '+' : '') + inr(g.net)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {g.doubled && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold" style={{ background: '#fef9c3', color: '#a16207' }}>2X</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pg && pg.total > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Page {pg.page} of {pg.totalPages} · {pg.total.toLocaleString('en-IN')} games
                </span>
                <div className="flex items-center gap-1">
                  <button disabled={pg.page <= 1 || loading}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                    <ChevronLeft size={15} />
                  </button>
                  <span className="px-3 py-1.5 text-sm font-semibold text-white" style={{ background: G }}>
                    Page {pg.page} of {pg.totalPages}
                  </span>
                  <button disabled={!pg.hasMore || loading}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
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
