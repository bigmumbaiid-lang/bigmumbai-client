import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import { useNotify } from '../context/NotifyContext';
import AppModal, { ModalBtn, ModalTextarea } from '../components/AppModal';
import DateRangePicker from '../components/DateRangePicker';
import {
  Search, X, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, Wallet, TrendingUp, Download,
} from 'lucide-react';
import Select from '../components/Select';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const inr = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const IST_OFFSET = 330 * 60000;
const getISTDateStr = (offsetDays = 0) => {
  const d = new Date(Date.now() + IST_OFFSET + offsetDays * 86400000);
  return d.toISOString().split('T')[0];
};

const STATUS_CFG = {
  pending:  { label: 'Pending',  bg: '#fef9c3', color: '#a16207', Icon: Clock        },
  approved: { label: 'Processing', bg: '#f0f9ff',  color: '#0369a1', Icon: Clock  },
  success:  { label: 'Success',  bg: GL,         color: G,         Icon: CheckCircle  },
  failed:   { label: 'Failed',   bg: '#fff1f2',  color: '#be123c', Icon: XCircle      },
};

const inputCls =
  'border border-gray-300 bg-white text-sm text-gray-800 px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400';

const DATE_PRESETS = [
  { key: 'today',  label: 'Today',       fn: () => ({ from: getISTDateStr(0),  to: getISTDateStr(0)  }) },
  { key: 'last7',  label: 'Last 7 Days', fn: () => ({ from: getISTDateStr(-6), to: getISTDateStr(0)  }) },
  { key: 'last30', label: 'Last 30 Days',fn: () => ({ from: getISTDateStr(-29),to: getISTDateStr(0)  }) },
  { key: 'all',    label: 'All time',    fn: () => ({ from: '',                to: ''                }) },
  { key: 'custom', label: 'Custom Range',fn: null },
];

const StatCard = ({ label, value, sub, valueColor = '#111827', icon: Icon, iconBg, iconColor }) => (
  <div className="bg-white border border-gray-200 p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold leading-none tracking-tight" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
    <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
      <Icon size={19} style={{ color: iconColor }} strokeWidth={2.2} />
    </div>
  </div>
);

export default function Withdrawals() {
  const notify = useNotify();
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  const [filterStatus, setFilterStatus] = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');
  const [startDate, setStartDate]       = useState(() => getISTDateStr(0));
  const [endDate, setEndDate]           = useState(() => getISTDateStr(0));
  const [quickFilter, setQuickFilter]   = useState('today');
  const [minAmount, setMinAmount]       = useState('');
  const [maxAmount, setMaxAmount]       = useState('');

  const [actionLoading, setActionLoading] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget,  setRejectTarget]  = useState(null);
  const [rejectRemark,  setRejectRemark]  = useState('');

  const limit = 20;

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const params = {
        page, limit,
        ...(filterStatus && { status: filterStatus }),
        ...(search       && { search: search.trim() }),
        ...(startDate    && { startDate }),
        ...(endDate      && { endDate }),
        ...(minAmount    && { minAmount }),
        ...(maxAmount    && { maxAmount }),
      };
      const { data } = await api.get('/withdrawal', { params });
      if (data.success) {
        setWithdrawals(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
      } else {
        notify.error(data.message || 'Failed to load withdrawals');
      }
    } catch (err) {
      console.error(err);
      notify.error('Failed to connect to server');
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/withdrawal/stats');
      if (data.success) setStats(data.stats);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchWithdrawals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStatus, search, startDate, endDate, minAmount, maxAmount]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (page > totalPages) setPage(totalPages || 1); }, [totalPages]); // eslint-disable-line

  const applyPreset = (key) => {
    const preset = DATE_PRESETS.find(p => p.key === key);
    setQuickFilter(key);
    if (preset?.fn) {
      const { from, to } = preset.fn();
      setStartDate(from);
      setEndDate(to);
    }
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput(''); setSearch(''); setFilterStatus('');
    setMinAmount(''); setMaxAmount('');
    applyPreset('today');
  };

  const exportCsv = () => {
    if (!withdrawals.length) return;
    const header = ['Username', 'Amount', 'Status', 'Account Holder', 'Account No', 'IFSC', 'Bank', 'Remark', 'Watchpays ID', 'Date'];
    const rows = withdrawals.map((w) => [
      w.user?.username || 'unknown', w.amount, w.status,
      w.bankCard?.accountHolderName || '-', w.bankCard?.accountNumber || '-',
      w.bankCard?.ifscCode || '-', w.bankCard?.bankName || '-',
      w.remark || '-', w.watchpaysTransactionId || '-',
      new Date(w.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'withdrawals.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const doApprove = async () => {
    const id = approveTarget._id;
    setActionLoading(id);
    try {
      const { data } = await api.put(`/withdrawal/approve/${id}`);
      if (data.success) {
        notify.success('Withdrawal approved and sent to Watchpays');
        setApproveTarget(null);
        fetchWithdrawals(); fetchStats();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to approve withdrawal');
    } finally { setActionLoading(null); }
  };

  const doReject = async () => {
    const id = rejectTarget._id;
    setActionLoading(id);
    try {
      const { data } = await api.put(`/withdrawal/reject/${id}`, { remark: rejectRemark });
      if (data.success) {
        notify.success('Withdrawal rejected and refunded');
        setRejectTarget(null); setRejectRemark('');
        fetchWithdrawals(); fetchStats();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to reject withdrawal');
    } finally { setActionLoading(null); }
  };

  return (
    <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Withdrawals</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage and process withdrawal requests</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchWithdrawals(); fetchStats(); }} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold transition active:opacity-90"
              style={{ background: G }}
              onMouseEnter={e => e.currentTarget.style.background = GH}
              onMouseLeave={e => e.currentTarget.style.background = G}
            >
              <Download size={14} /> Export
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-8 space-y-5">

          {/* Stat cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatCard label="Pending Payout"   value={inr(stats.pending.total)}  sub={`${stats.pending.count} request(s)`}  valueColor="#a16207" icon={Clock}        iconColor="#d97706" iconBg="#fef9c3" />
              <StatCard label="Processing"         value={inr(stats.approved.total)} sub={`${stats.approved.count} in flight`}  valueColor="#0369a1" icon={Clock}        iconColor="#0369a1" iconBg="#f0f9ff" />
              <StatCard label="Paid Out"          value={inr(stats.success.total)}  sub={`${stats.success.count} successful`}  valueColor="#15803d" icon={TrendingUp}   iconColor={G}       iconBg={GL}      />
              <StatCard label="Failed / Refunded" value={inr(stats.failed.total)}   sub={`${stats.failed.count} request(s)`}  valueColor="#be123c" icon={XCircle}      iconColor="#e11d48" iconBg="#fff1f2" />
            </div>
          )}

          {/* Filter panel */}
          <div className="bg-white border border-gray-200">

            {/* Row 1 — date + status + amount + reset */}
            <div className="p-4 flex flex-wrap items-center gap-2 border-b border-gray-100">
              <span className="hidden md:inline text-xs text-gray-400 font-medium mr-1">Date:</span>

              {/* Date presets — 2-up grid on mobile, inline row on desktop */}
              <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:flex-wrap md:items-center md:gap-2">
                {DATE_PRESETS.filter(({ key }) => key !== 'custom').map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className="px-3 py-1.5 text-sm font-medium border transition"
                    style={quickFilter === key
                      ? { background: G, color: '#fff', borderColor: G }
                      : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => applyPreset('custom')}
                  className="col-span-2 md:col-auto px-3 py-1.5 text-sm font-medium border transition"
                  style={quickFilter === 'custom'
                    ? { background: G, color: '#fff', borderColor: G }
                    : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
                >
                  Custom Range
                </button>
                {quickFilter === 'custom' && (
                  <DateRangePicker
                    className="col-span-2 md:col-auto"
                    from={startDate} to={endDate}
                    onChange={(f, t) => { setStartDate(f); setEndDate(t); setPage(1); }}
                    placeholder="Pick date range"
                  />
                )}
              </div>

              {/* Status */}
              <Select
                value={filterStatus}
                onChange={(v) => { setFilterStatus(v); setPage(1); }}
                options={[
                  { value: '',         label: 'All Status' },
                  { value: 'pending',  label: 'Pending'    },
                  { value: 'approved', label: 'Processing' },
                  { value: 'success',  label: 'Success'    },
                  { value: 'failed',   label: 'Failed'     },
                ]}
              />

              {/* Amount range */}
              <div className="flex items-center gap-1">
                <input
                  type="number" placeholder="Min ₹" value={minAmount}
                  onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                  className={inputCls + ' w-24'}
                />
                <span className="text-gray-400 text-sm">—</span>
                <input
                  type="number" placeholder="Max ₹" value={maxAmount}
                  onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                  className={inputCls + ' w-24'}
                />
              </div>

              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm text-gray-500 hover:bg-gray-50 transition"
              >
                <X size={13} /> Reset
              </button>
            </div>

            {/* Row 2 — search */}
            <div className="p-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Search username or remark..." value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={inputCls + ' w-full pl-9'}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-sm">
                <thead>
                  <tr style={{ background: GL }}>
                    {['Username', 'Amount', 'Status', 'Bank Details', 'Remark', 'Watchpays ID', 'Created At', 'Success At', 'Actions'].map(h => (
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
                        <td colSpan={9} className="px-5 py-3">
                          <div className="h-4 bg-gray-100 animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <Wallet size={36} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No withdrawals found</p>
                      </td>
                    </tr>
                  ) : withdrawals.map((w) => {
                    const sc  = STATUS_CFG[w.status] || { label: w.status, bg: '#f3f4f6', color: '#6b7280', Icon: Clock };
                    const StatusIcon = sc.Icon;
                    const isPending  = w.status === 'pending';
                    const busy       = actionLoading === w._id;
                    const bc         = w.bankCard;
                    return (
                      <tr key={w._id} className="hover:bg-[#f9fbf9]">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">@{w.user?.username || 'unknown'}</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-gray-900 whitespace-nowrap">{inr(w.amount)}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold tracking-wide"
                            style={{ background: sc.bg, color: sc.color }}
                          >
                            <StatusIcon size={11} />{sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-700">
                          {bc ? bc.bankName || '—' : <span className="text-gray-400 text-xs">No bank card</span>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 max-w-[160px] truncate text-sm">{w.remark || '—'}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">{w.watchpaysTransactionId || '—'}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(w.createdAt).toLocaleString('en-US', {
                            timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short',
                            day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                          {w.processedAt
                            ? <span className="text-emerald-600">{new Date(w.processedAt).toLocaleString('en-US', {
                                timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short',
                                day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
                              })}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {isPending ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setApproveTarget(w)} disabled={busy}
                                className="px-3 py-1.5 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition"
                                style={{ background: G }}
                                onMouseEnter={e => !busy && (e.currentTarget.style.background = GH)}
                                onMouseLeave={e => !busy && (e.currentTarget.style.background = G)}
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                onClick={() => { setRejectTarget(w); setRejectRemark(''); }} disabled={busy}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {total > 0 ? `${total} total · page ${page} of ${totalPages}` : '—'}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="px-3 py-1.5 text-sm font-semibold text-white" style={{ background: G }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Approve Modal */}
      {approveTarget && (
        <AppModal onClose={() => !actionLoading && setApproveTarget(null)} onConfirm={doApprove} size="md">
          <AppModal.Header icon={<CheckCircle size={16} />} title="Approve Withdrawal" subtitle="Real payout via Watchpays — verify details below" onClose={() => !actionLoading && setApproveTarget(null)} accent="emerald" />
          <AppModal.Body>
            <div className="border border-gray-100 divide-y divide-gray-50 bg-gray-50/50">
              {[
                ['User',           `@${approveTarget.user?.username || 'unknown'}`],
                ['Amount',         inr(approveTarget.amount)],
                ['Account Holder', approveTarget.bankCard?.accountHolderName || '-'],
                ['Account No.',    approveTarget.bankCard?.accountNumber || '-'],
                ['IFSC',           approveTarget.bankCard?.ifscCode || '-'],
                ['Bank',           approveTarget.bankCard?.bankName || '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-400 font-medium">{label}</span>
                  <span className="text-xs font-semibold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </AppModal.Body>
          <AppModal.Footer>
            <ModalBtn variant="secondary" onClick={() => setApproveTarget(null)} disabled={!!actionLoading}>Cancel</ModalBtn>
            <ModalBtn variant="emerald" onClick={doApprove} disabled={!!actionLoading} className="flex items-center gap-1.5">
              {actionLoading ? <><RefreshCw size={13} className="animate-spin" /> Sending…</> : 'Confirm Payout'}
            </ModalBtn>
          </AppModal.Footer>
        </AppModal>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <AppModal onClose={() => !actionLoading && setRejectTarget(null)} size="sm">
          <AppModal.Header icon={<AlertTriangle size={16} />} title="Reject Withdrawal" subtitle={`@${rejectTarget.user?.username} · ${inr(rejectTarget.amount)}`} onClose={() => !actionLoading && setRejectTarget(null)} accent="rose" />
          <AppModal.Body>
            <p className="text-sm text-gray-500 mb-4">The amount will be refunded to the user's balance.</p>
            <ModalTextarea
              label="Reason (optional)" rows={3} value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              placeholder="e.g. Bank details mismatch"
            />
          </AppModal.Body>
          <AppModal.Footer>
            <ModalBtn variant="secondary" onClick={() => setRejectTarget(null)} disabled={!!actionLoading}>Cancel</ModalBtn>
            <ModalBtn variant="rose" onClick={doReject} disabled={!!actionLoading} className="flex items-center gap-1.5">
              {actionLoading ? <><RefreshCw size={13} className="animate-spin" /> Rejecting…</> : 'Reject & Refund'}
            </ModalBtn>
          </AppModal.Footer>
        </AppModal>
      )}
    </div>
  );
}
