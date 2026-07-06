import Sidebar from '../components/Sidebar';
import { useState, useEffect, useCallback } from 'react';
import DateRangePicker from '../components/DateRangePicker';
import axios from '../utils/axios';
import {
  Users, Wallet, Banknote, TrendingUp, Dices,
  ArrowUpCircle, ArrowDownCircle, Clock, CreditCard, Gamepad2,
} from 'lucide-react';

// ── Leaf-green palette ─────────────────────────────────────────────────────
const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const PRESETS = [
  { key: 'today',   label: 'Today'       },
  { key: 'last7',   label: 'Last 7 Days' },
  { key: 'last30',  label: 'Last 30 Days'},
  { key: 'alltime', label: 'All Time'    },
  { key: 'custom',  label: 'Custom'      },
];

const IST_OFFSET = 330 * 60000;
// Returns YYYY-MM-DD in IST, daysAgo=0 → today
const getISTDateStr = (daysAgo = 0) =>
  new Date(Date.now() + IST_OFFSET - daysAgo * 86400000).toISOString().split('T')[0];

// All preset date windows computed in IST
const getPresetParams = (preset, custom) => {
  if (preset === 'alltime') return { range: 'alltime' };
  if (preset === 'custom')  return { startDate: custom.startDate, endDate: custom.endDate };
  const today = getISTDateStr(0);
  if (preset === 'today')   return { startDate: today, endDate: today };
  if (preset === 'last7')   return { startDate: getISTDateStr(6),  endDate: today };
  if (preset === 'last30')  return { startDate: getISTDateStr(29), endDate: today };
  return { range: preset };
};

const EMPTY = {
  users:       { total: 0, new: 0 },
  deposits:    { count: 0, amount: 0, pendingCount: 0, pendingAmount: 0, byChannel: {} },
  withdrawals: { count: 0, amount: 0, settledAmount: 0, byStatus: {} },
  transfers:   { increase: { count: 0, amount: 0 }, decrease: { count: 0, amount: 0 } },
  gaming:      { mines: {}, blackjack: {}, totalWagered: 0, totalGgr: 0 },
  netFlow: 0,
};

const inr = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);
const num = (n) => Number(n || 0).toLocaleString('en-US');

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, valueColor = '#111827', icon: Icon, iconColor, iconBg }) {
  return (
    <div className="bg-white border border-gray-200 p-3 md:p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
      <div className="min-w-0 mr-2">
        <p className="text-[10px] md:text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 md:mb-2 leading-tight">{label}</p>
        <p className="text-lg md:text-[26px] leading-none font-bold tracking-tight" style={{ color: valueColor }}>{value}</p>
        {sub && <p className="text-[10px] md:text-xs text-gray-400 mt-1 md:mt-2">{sub}</p>}
      </div>
      <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={16} style={{ color: iconColor }} strokeWidth={2.2} />
      </div>
    </div>
  );
}

// ── Channel progress row ───────────────────────────────────────────────────
function ChannelRow({ label, amount, count, pct, barColor }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-semibold text-gray-900">
          {inr(amount)}{' '}
          <span className="text-gray-400 font-normal text-xs">· {num(count)}</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats]   = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [preset, setPreset] = useState('today');
  const [custom, setCustom] = useState({ startDate: getISTDateStr(0), endDate: getISTDateStr(0) });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const token  = localStorage.getItem('token');
      const params = getPresetParams(preset, custom);

      const { data } = await axios.get('/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (data?.success) {
        setStats({
          ...EMPTY, ...data,
          users:       { ...EMPTY.users,       ...(data.users       || {}) },
          deposits:    { ...EMPTY.deposits,    ...(data.deposits    || {}) },
          withdrawals: { ...EMPTY.withdrawals, ...(data.withdrawals || {}) },
          transfers:   { ...EMPTY.transfers,   ...(data.transfers   || {}) },
          gaming:      { ...EMPTY.gaming,      ...(data.gaming      || {}) },
        });
      } else {
        setError(data?.message || 'Failed to load data');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to server');
    } finally { setLoading(false); }
  }, [preset, custom]);

  useEffect(() => {
    if (preset !== 'custom') fetchStats();
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = stats.deposits;
  const w = stats.withdrawals;
  const g = stats.gaming;

  const channels = [
    { key: 'watchpays', label: 'WatchPays',  bar: '#7c3aed' },
    { key: 'jazpays',   label: 'JazPays',    bar: '#2563eb' },
    { key: 'usdt',      label: 'USDT TRC20', bar: '#059669' },
    { key: 'trx',       label: 'TRX TRC20',  bar: '#1d4ed8' },
  ];

  return (
    <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
      <Sidebar />

      <main className="flex-1 overflow-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 md:sticky md:top-0 z-10">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-xs text-gray-400 mt-0.5 hidden md:block">Overview of platform activity</p>
            </div>
            {/* Desktop preset buttons */}
            <div className="hidden md:flex items-center gap-2">
              {PRESETS.map((p) => {
                const active = preset === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    className="px-4 py-1.5 text-sm font-semibold border transition whitespace-nowrap"
                    style={active ? { background: G, borderColor: G, color: '#fff' } : { background: '#fff', borderColor: '#d1d5db', color: '#374151' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = G; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = '#d1d5db'; }}
                  >{p.label}</button>
                );
              })}
              {preset === 'custom' && (
                <DateRangePicker from={custom.startDate} to={custom.endDate}
                  onChange={(f, t) => { setCustom({ startDate: f, endDate: t }); if (f && t) fetchStats(); }}
                  placeholder="Pick date range" />
              )}
            </div>
          </div>
          {/* Mobile preset buttons — scrollable row */}
          <div className="flex md:hidden items-center gap-2 mt-2 overflow-x-auto scrollbar-none">
            {PRESETS.map((p) => {
              const active = preset === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className="px-3 py-1.5 text-sm font-semibold border transition shrink-0"
                  style={active ? { background: G, borderColor: G, color: '#fff' } : { background: '#fff', borderColor: '#d1d5db', color: '#374151' }}
                >{p.label}</button>
              );
            })}
            {preset === 'custom' && (
              <DateRangePicker from={custom.startDate} to={custom.endDate}
                onChange={(f, t) => { setCustom({ startDate: f, endDate: t }); if (f && t) fetchStats(); }}
                placeholder="Pick date range" />
            )}
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-5">

          {/* ── Error ──────────────────────────────────────────────────── */}
          {error && (
            <div className="border border-red-300 bg-red-50 text-red-600 px-4 py-3 text-sm">{error}</div>
          )}

          {/* ── Skeleton ───────────────────────────────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 p-5 animate-pulse">
                  <div className="h-3 bg-gray-100 w-2/3 mb-4" />
                  <div className="h-7 bg-gray-100 w-1/2 mb-2" />
                  <div className="h-2.5 bg-gray-100 w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* ── Row 1 stat cards ─────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                  label="Total Users"
                  value={num(stats.users.total)}
                  sub={`+${num(stats.users.new)} new in period`}
                  icon={Users} iconColor="#2563eb" iconBg="#eff6ff"
                />
                <StatCard
                  label="Deposits"
                  value={inr(d.amount)}
                  sub={`${num(d.count)} successful · ${num(d.pendingCount)} pending`}
                  valueColor={G}
                  icon={Wallet} iconColor={G} iconBg={GL}
                />
                <StatCard
                  label="Withdrawals (settled)"
                  value={inr(w.settledAmount)}
                  sub={`${num(w.byStatus?.pending?.count || 0)} pending requests`}
                  valueColor="#e11d48"
                  icon={Banknote} iconColor="#e11d48" iconBg="#fff1f2"
                />
                <StatCard
                  label="Net Cash Flow"
                  value={inr(stats.netFlow)}
                  sub="Deposits − settled withdrawals"
                  valueColor={stats.netFlow >= 0 ? G : '#e11d48'}
                  icon={TrendingUp} iconColor="#4f46e5" iconBg="#eef2ff"
                />
              </div>

              {/* ── Row 2 stat cards ─────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                  label="Gaming Revenue (GGR)"
                  value={inr(g.totalGgr)}
                  sub={`${inr(g.totalWagered)} wagered`}
                  valueColor={(g.totalGgr || 0) >= 0 ? G : '#e11d48'}
                  icon={Dices} iconColor="#d97706" iconBg="#fef9c3"
                />
                <StatCard
                  label="Admin Top-ups"
                  value={inr(stats.transfers.increase.amount)}
                  sub={`${num(stats.transfers.increase.count)} transactions`}
                  valueColor={G}
                  icon={ArrowUpCircle} iconColor={G} iconBg={GL}
                />
                <StatCard
                  label="Admin Deductions"
                  value={inr(stats.transfers.decrease.amount)}
                  sub={`${num(stats.transfers.decrease.count)} transactions`}
                  valueColor="#e11d48"
                  icon={ArrowDownCircle} iconColor="#e11d48" iconBg="#fff1f2"
                />
                <StatCard
                  label="Pending Deposits"
                  value={inr(d.pendingAmount)}
                  sub={`${num(d.pendingCount)} awaiting confirmation`}
                  valueColor="#a16207"
                  icon={Clock} iconColor="#d97706" iconBg="#fef9c3"
                />
              </div>

              {/* ── Breakdowns row ───────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Deposits by channel */}
                <div className="bg-white border border-gray-200 p-6">
                  {/* Section header */}
                  <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
                    <div className="w-7 h-7 flex items-center justify-center" style={{ background: GL }}>
                      <CreditCard size={15} style={{ color: G }} strokeWidth={2.2} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Deposits by Channel</h3>
                  </div>
                  <div className="space-y-4">
                    {channels.map(({ key, label, bar }) => {
                      const row = d.byChannel?.[key] || { count: 0, amount: 0 };
                      const pct = d.amount > 0 ? Math.round((row.amount / d.amount) * 100) : 0;
                      return (
                        <ChannelRow
                          key={key}
                          label={label}
                          amount={row.amount}
                          count={row.count}
                          pct={pct}
                          barColor={bar}
                        />
                      );
                    })}
                    {d.amount === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">No deposits in this period</p>
                    )}
                  </div>
                </div>

                {/* Gaming performance */}
                <div className="bg-white border border-gray-200 p-6">
                  <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
                    <div className="w-7 h-7 flex items-center justify-center bg-amber-50">
                      <Gamepad2 size={15} className="text-amber-600" strokeWidth={2.2} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Gaming Performance</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {[
                      { name: 'Mines',     data: g.mines     || {} },
                      { name: 'Blackjack', data: g.blackjack || {} },
                    ].map(({ name, data }) => {
                      const positive = (data.ggr || 0) >= 0;
                      return (
                        <div key={name} className="flex items-center justify-between py-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {num(data.rounds)} rounds · {inr(data.wagered)} wagered
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-base font-bold"
                              style={{ color: positive ? G : '#e11d48' }}
                            >
                              {positive ? '+' : ''}{inr(data.ggr)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">house profit</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
