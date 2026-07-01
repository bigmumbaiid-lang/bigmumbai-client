import Sidebar from '../components/Sidebar';
import { useState, useEffect, useCallback } from 'react';
import DateRangePicker from '../components/DateRangePicker';
import axios from '../utils/axios';
import {
  Users,
  Wallet,
  Banknote,
  TrendingUp,
  Dices,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  CreditCard,
  Gamepad2,
} from 'lucide-react';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom' },
];

const todayStr = () => new Date().toISOString().split('T')[0];

const EMPTY = {
  users: { total: 0, new: 0 },
  deposits: { count: 0, amount: 0, pendingCount: 0, pendingAmount: 0, byChannel: {} },
  withdrawals: { count: 0, amount: 0, settledAmount: 0, byStatus: {} },
  transfers: { increase: { count: 0, amount: 0 }, decrease: { count: 0, amount: 0 } },
  gaming: { mines: {}, blackjack: {}, totalWagered: 0, totalGgr: 0 },
  netFlow: 0,
};

function Dashboard() {
  const [stats, setStats] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [preset, setPreset] = useState('today');
  const [custom, setCustom] = useState({ startDate: todayStr(), endDate: todayStr() });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const params =
        preset === 'custom'
          ? { startDate: custom.startDate, endDate: custom.endDate }
          : { range: preset };

      const { data } = await axios.get('/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (data && data.success) {
        setStats({
          ...EMPTY,
          ...data,
          users: { ...EMPTY.users, ...(data.users || {}) },
          deposits: { ...EMPTY.deposits, ...(data.deposits || {}) },
          withdrawals: { ...EMPTY.withdrawals, ...(data.withdrawals || {}) },
          transfers: { ...EMPTY.transfers, ...(data.transfers || {}) },
          gaming: { ...EMPTY.gaming, ...(data.gaming || {}) },
        });
      } else {
        setError(data?.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('[dashboard] fetch error:', err);
      setError(err.response?.data?.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [preset, custom]);

  useEffect(() => {
    if (preset !== 'custom') fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const inr = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);
  const num = (n) => Number(n || 0).toLocaleString('en-US');

  const StatCard = ({ label, value, sub, accent = 'text-gray-900', icon: Icon, iconColor, iconBg }) => (
    <div className="group bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-5 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-gray-500 font-medium">{label}</p>
          <p className={`text-[28px] leading-tight font-bold mt-2 tracking-tight ${accent}`}>{value}</p>
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

  const d = stats.deposits;
  const w = stats.withdrawals;
  const g = stats.gaming;

  return (
    <div className="flex h-screen bg-[#f6f7fb]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">Overview of platform activity</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${preset === p.key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                style={preset === p.key ? { background: 'linear-gradient(90deg,#d9ad82,#b1835a)' } : undefined}
              >
                {p.label}
              </button>
            ))}
            {preset === 'custom' && (
              <DateRangePicker
                from={custom.startDate} to={custom.endDate}
                onChange={(f, t) => {
                  setCustom({ startDate: f, endDate: t });
                  if (f && t) fetchStats();
                }}
                placeholder="Pick date range"
              />
            )}
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-3.5 bg-gray-100 rounded w-2/3 mb-3" />
                  <div className="h-7 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Primary row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  label="Total Users"
                  value={num(stats.users.total)}
                  sub={`+${num(stats.users.new)} new in period`}
                  icon={Users}
                  iconColor="#2563eb"
                  iconBg="#eff6ff"
                />
                <StatCard
                  label="Deposits"
                  value={inr(d.amount)}
                  sub={`${num(d.count)} successful · ${num(d.pendingCount)} pending`}
                  accent="text-emerald-600"
                  icon={Wallet}
                  iconColor="#059669"
                  iconBg="#ecfdf5"
                />
                <StatCard
                  label="Withdrawals (settled)"
                  value={inr(w.settledAmount)}
                  sub={`${num(w.byStatus?.pending?.count || 0)} pending requests`}
                  accent="text-rose-600"
                  icon={Banknote}
                  iconColor="#e11d48"
                  iconBg="#fff1f2"
                />
                <StatCard
                  label="Net Cash Flow"
                  value={inr(stats.netFlow)}
                  sub="Deposits − settled withdrawals"
                  accent={stats.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                  icon={TrendingUp}
                  iconColor="#4f46e5"
                  iconBg="#eef2ff"
                />
              </div>

              {/* Secondary row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-5">
                <StatCard
                  label="Gaming Revenue (GGR)"
                  value={inr(g.totalGgr)}
                  sub={`${inr(g.totalWagered)} wagered`}
                  accent={(g.totalGgr || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                  icon={Dices}
                  iconColor="#d97706"
                  iconBg="#fffbeb"
                />
                <StatCard
                  label="Admin Top-ups"
                  value={inr(stats.transfers.increase.amount)}
                  sub={`${num(stats.transfers.increase.count)} transactions`}
                  accent="text-emerald-600"
                  icon={ArrowUpCircle}
                  iconColor="#059669"
                  iconBg="#ecfdf5"
                />
                <StatCard
                  label="Admin Deductions"
                  value={inr(stats.transfers.decrease.amount)}
                  sub={`${num(stats.transfers.decrease.count)} transactions`}
                  accent="text-rose-600"
                  icon={ArrowDownCircle}
                  iconColor="#e11d48"
                  iconBg="#fff1f2"
                />
                <StatCard
                  label="Pending Deposits"
                  value={inr(d.pendingAmount)}
                  sub={`${num(d.pendingCount)} awaiting confirmation`}
                  accent="text-amber-600"
                  icon={Clock}
                  iconColor="#d97706"
                  iconBg="#fffbeb"
                />
              </div>

              {/* Breakdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
                {/* Deposits by channel */}
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <CreditCard size={17} className="text-emerald-600" strokeWidth={2.2} />
                    </div>
                    <h3 className="font-semibold text-gray-900">Deposits by Channel</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'watchpays', label: 'Watchpays',  color: 'linear-gradient(90deg,#a78bfa,#7c3aed)' },
                      { key: 'jazpays',   label: 'Jazpays',    color: 'linear-gradient(90deg,#7dd3fc,#2563eb)' },
                      { key: 'usdt',      label: 'USDT TRC20', color: 'linear-gradient(90deg,#6ee7b7,#059669)' },
                      { key: 'trx',       label: 'TRX TRC20',  color: 'linear-gradient(90deg,#93c5fd,#1d4ed8)' },
                    ].map(({ key, label, color }) => {
                      const row = d.byChannel?.[key] || { count: 0, amount: 0 };
                      const pct = d.amount > 0 ? Math.round((row.amount / d.amount) * 100) : 0;
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-600 font-medium">{label}</span>
                            <span className="font-semibold text-gray-900">
                              {inr(row.amount)} <span className="text-gray-400 font-normal text-xs">· {num(row.count)}</span>
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {d.amount === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">No deposits in this period</p>
                    )}
                  </div>
                </div>

                {/* Gaming split */}
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Gamepad2 size={17} className="text-amber-600" strokeWidth={2.2} />
                    </div>
                    <h3 className="font-semibold text-gray-900">Gaming Performance</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Mines', data: g.mines || {} },
                      { name: 'Blackjack', data: g.blackjack || {} },
                    ].map(({ name, data }) => (
                      <div
                        key={name}
                        className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {num(data.rounds)} rounds · {inr(data.wagered)} wagered
                          </p>
                        </div>
                        <span className={`text-sm font-bold ${(data.ggr || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {inr(data.ggr)}
                        </span>
                      </div>
                    ))}
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