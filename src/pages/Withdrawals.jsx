import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import { useNotify } from '../context/NotifyContext';
import AppModal, { ModalBtn, ModalTextarea } from '../components/AppModal';
import {
  Search, X, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, Wallet, TrendingUp, Download,
} from 'lucide-react';

const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';
const inr = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

const STATUS_CFG = {
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700',    Icon: Clock },
  approved: { label: 'Approved', cls: 'bg-blue-100 text-blue-700',       Icon: CheckCircle },
  success:  { label: 'Success',  cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
  failed:   { label: 'Failed',   cls: 'bg-rose-100 text-rose-700',       Icon: XCircle },
};

export default function Withdrawals() {
  const notify = useNotify();
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterStatus, setFilterStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickFilter, setQuickFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectRemark, setRejectRemark] = useState('');

  const limit = 20;
  const fmt = (d) => d.toISOString().split('T')[0];

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const params = {
        page, limit,
        ...(filterStatus && { status: filterStatus }),
        ...(search && { search: search.trim() }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(minAmount && { minAmount }),
        ...(maxAmount && { maxAmount }),
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

  useEffect(() => {
    if (page > totalPages) setPage(totalPages || 1);
  }, [totalPages]); // eslint-disable-line

  const setToday = () => { const t = fmt(new Date()); setStartDate(t); setEndDate(t); setQuickFilter('today'); setPage(1); };
  const setThisWeek = () => {
    const now = new Date();
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() + diff);
    setStartDate(fmt(mon)); setEndDate(fmt(new Date())); setQuickFilter('week'); setPage(1);
  };
  const setThisMonth = () => {
    const now = new Date();
    setStartDate(fmt(new Date(now.getFullYear(), now.getMonth(), 1)));
    setEndDate(fmt(new Date())); setQuickFilter('month'); setPage(1);
  };
  const clearDateFilter = () => { setStartDate(''); setEndDate(''); setQuickFilter(''); setPage(1); };
  const resetFilters = () => {
    setSearchInput(''); setSearch(''); setFilterStatus('');
    setStartDate(''); setEndDate(''); setQuickFilter('');
    setMinAmount(''); setMaxAmount(''); setPage(1);
  };

  const exportCsv = () => {
    if (!withdrawals.length) return;
    const header = ['Username', 'Amount', 'Status', 'Account Holder', 'Account No', 'IFSC', 'Bank', 'Remark', 'Date'];
    const rows = withdrawals.map((w) => [
      w.user?.username || 'unknown', w.amount, w.status,
      w.bankCard?.accountHolderName || '-', w.bankCard?.accountNumber || '-',
      w.bankCard?.ifscCode || '-', w.bankCard?.bankName || '-',
      w.remark || '-', new Date(w.createdAt).toISOString(),
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

  return (
    <div className="flex h-screen bg-[#f6f7fb]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 pl-14 pr-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Withdrawals</h1>
            <p className="text-xs text-gray-400 mt-0.5">Manage and process withdrawal requests</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchWithdrawals(); fetchStats(); }} disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm active:scale-95 transition"
              style={{ background: BRAND }}
            >
              <Download size={15} /> Export
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              <StatCard label="Pending Payout" value={inr(stats.pending.total)} sub={`${stats.pending.count} request(s)`} accent="text-amber-600" icon={Clock} iconColor="#d97706" iconBg="#fffbeb" />
              <StatCard label="Approved" value={inr(stats.approved.total)} sub={`${stats.approved.count} in flight`} accent="text-blue-600" icon={CheckCircle} iconColor="#2563eb" iconBg="#eff6ff" />
              <StatCard label="Paid Out" value={inr(stats.success.total)} sub={`${stats.success.count} successful`} accent="text-emerald-600" icon={TrendingUp} iconColor="#059669" iconBg="#ecfdf5" />
              <StatCard label="Failed / Refunded" value={inr(stats.failed.total)} sub={`${stats.failed.count} request(s)`} accent="text-rose-600" icon={XCircle} iconColor="#e11d48" iconBg="#fff1f2" />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px] relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Search username or remark..." value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                />
              </div>
              <select
                value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-[#b1835a]"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
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
              {[['today', 'Today', setToday], ['week', 'This Week', setThisWeek], ['month', 'This Month', setThisMonth]].map(([key, label, fn]) => (
                <button
                  key={key} onClick={fn}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${quickFilter === key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  style={quickFilter === key ? { background: BRAND } : undefined}
                >
                  {label}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-1">
                <input type="date" value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setQuickFilter('custom'); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a]" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="date" value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setQuickFilter('custom'); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a]" />
              </div>
              {(startDate || endDate) && (
                <button onClick={clearDateFilter} className="text-sm text-gray-400 hover:text-gray-600 px-2">
                  Clear dates
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-semibold">Username</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Bank Details</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Remark</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Watchpays ID</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Date (IST)</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Actions</th>
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
                  ) : withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No withdrawals found</p>
                      </td>
                    </tr>
                  ) : (
                    withdrawals.map((w) => {
                      const sc = STATUS_CFG[w.status] || { label: w.status, cls: 'bg-gray-100 text-gray-700', Icon: Clock };
                      const StatusIcon = sc.Icon;
                      const isPending = w.status === 'pending';
                      const busy = actionLoading === w._id;
                      const bc = w.bankCard;
                      return (
                        <tr key={w._id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3.5 font-semibold text-gray-900">@{w.user?.username || 'unknown'}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900 whitespace-nowrap">{inr(w.amount)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.cls}`}>
                              <StatusIcon size={12} />{sc.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {bc ? (
                              <div>
                                <p className="text-sm font-medium text-gray-800 leading-tight">{bc.accountHolderName}</p>
                                <p className="text-xs text-gray-400 font-mono mt-0.5">{bc.accountNumber} · {bc.ifscCode}</p>
                                <p className="text-xs text-gray-400">{bc.bankName}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No bank card</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 max-w-[160px] truncate text-sm">{w.remark || '—'}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">{w.watchpaysTransactionId || '—'}</td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(w.createdAt).toLocaleString('en-US', {
                              timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short',
                              day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
                            })}
                          </td>
                          <td className="px-5 py-3.5">
                            {isPending ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setApproveTarget(w)} disabled={busy}
                                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-xs font-semibold flex items-center gap-1"
                                >
                                  <CheckCircle size={12} /> Approve
                                </button>
                                <button
                                  onClick={() => { setRejectTarget(w); setRejectRemark(''); }} disabled={busy}
                                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 text-xs font-semibold flex items-center gap-1"
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
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {total > 0 ? `Showing page ${page} of ${totalPages} · ${total} total` : '—'}
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

      {/* Approve Modal */}
      {approveTarget && (
        <AppModal onClose={() => !actionLoading && setApproveTarget(null)} onConfirm={doApprove} size="md">
          <AppModal.Header icon={<CheckCircle size={16} />} title="Approve Withdrawal" subtitle="Real payout via Watchpays — verify details below" onClose={() => !actionLoading && setApproveTarget(null)} accent="emerald" />
          <AppModal.Body>
            <div className="border border-gray-100 divide-y divide-gray-50 bg-gray-50/50" style={{ borderRadius: '6px' }}>
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
            <p className="text-sm text-gray-500 mb-4">
              The amount will be refunded to the user's balance.
            </p>
            <ModalTextarea
              label="Reason (optional)"
              rows={3}
              value={rejectRemark}
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
