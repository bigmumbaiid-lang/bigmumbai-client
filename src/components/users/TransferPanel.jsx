import { useState, useEffect, useRef } from 'react';
import {
    Search, Loader2, TrendingUp, TrendingDown, ArrowLeftRight,
    X, UserX, RefreshCw, ArrowUpCircle, ArrowDownCircle, Clock,
    Users, CheckCircle2, XCircle, Send, Eye, EyeOff,
} from 'lucide-react';
import api from '../../utils/axios';
import { usersApi } from '../../api/users';
import TransferModal from './TransferModal';
import AppModal, { ModalBtn } from '../AppModal';
import { TRANSFER_TYPE } from '../../constants/users';
import { formatDate } from '../../utils/format';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const inr = (n) => {
    const num = Number(n) || 0;
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: num % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(num);
};

export default function TransferPanel() {
    const [query,      setQuery     ] = useState('');
    const [loading,    setLoading   ] = useState(false);
    const [result,     setResult    ] = useState(undefined);
    const [modal,      setModal     ] = useState(null);
    const [massModal,  setMassModal ] = useState(false);

    const [history,      setHistory     ] = useState([]);
    const [histLoading,  setHistLoading ] = useState(true);
    const [histPage,     setHistPage    ] = useState(1);
    const [histTotal,    setHistTotal   ] = useState(0);
    const [histPages,    setHistPages   ] = useState(1);
    const [statsAdded,   setStatsAdded  ] = useState(0);
    const [statsDeducted,setStatsDeducted] = useState(0);

    const fetchHistory = async (page = 1) => {
        setHistLoading(true);
        try {
            const { data } = await api.get('/transfers', { params: { page, limit: 10 } });
            if (data.success) {
                setHistory(data.transfers || []);
                setHistTotal(data.pagination?.total || 0);
                setHistPages(data.pagination?.pages || 1);
                setHistPage(page);
            }
        } catch {
            // silently fail
        } finally {
            setHistLoading(false);
        }
    };

    const fetchTodayStats = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await api.get('/transfers', {
                params: { page: 1, limit: 200, startDate: today, endDate: today },
            });
            if (data.success) {
                let added = 0, deducted = 0;
                (data.transfers || []).forEach(t => {
                    if (t.transferType === 'increase') added += t.amount;
                    else deducted += t.amount;
                });
                setStatsAdded(added);
                setStatsDeducted(deducted);
            }
        } catch { /* silent */ }
    };

    useEffect(() => { fetchHistory(1); fetchTodayStats(); }, []);

    const handleSearch = async (e) => {
        e?.preventDefault();
        const q = query.trim();
        if (!q) return;
        setLoading(true);
        setResult(undefined);
        try {
            const data = await usersApi.list({ page: 1, limit: 20, search: q });
            const exact = (data.users || []).find(u => u.username.toLowerCase() === q.toLowerCase());
            setResult(exact || null);
        } catch {
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const updateBalance = (userId, patch) => {
        if (result?._id === userId) setResult(r => ({ ...r, ...patch }));
        fetchHistory(1);
        fetchTodayStats();
    };

    return (
        <>
            {/* ── Stats strip ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5">
                <div className="bg-white border border-gray-200 p-4 flex items-center gap-3 hover:border-[#3a7d44]/40 transition-colors">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: GL }}>
                        <ArrowUpCircle size={17} style={{ color: G }} />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Added Today</p>
                        <p className="text-lg font-bold" style={{ color: G }}>{inr(statsAdded)}</p>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 p-4 flex items-center gap-3 hover:border-[#3a7d44]/40 transition-colors">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-red-50">
                        <ArrowDownCircle size={17} className="text-rose-500" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Deducted Today</p>
                        <p className="text-lg font-bold text-rose-600">{inr(statsDeducted)}</p>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 p-4 flex items-center gap-3 hover:border-[#3a7d44]/40 transition-colors">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-blue-50">
                        <Clock size={17} className="text-blue-500" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Transfers</p>
                        <p className="text-lg font-bold text-gray-900">{histTotal}</p>
                    </div>
                </div>
            </div>

            {/* ── Main layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

                {/* ── Left: Search + Mass Transfer ── */}
                <div className="space-y-3 lg:self-start">
                    {/* Search card */}
                    <div className="bg-white border border-gray-200">
                        <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-900">Find User</p>
                                <p className="text-xs text-gray-400 mt-0.5">Enter exact username to add or deduct balance</p>
                            </div>
                            <button
                                onClick={() => setMassModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white transition shrink-0"
                                style={{ background: G }}
                                onMouseEnter={e => e.currentTarget.style.background = GH}
                                onMouseLeave={e => e.currentTarget.style.background = G}
                            >
                                <Users size={12} /> Mass Transfer
                            </button>
                        </div>
                        <div className="p-4">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Exact username…"
                                        autoComplete="off"
                                        className="w-full pl-9 pr-8 py-2 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition bg-white"
                                    />
                                    {query && (
                                        <button type="button" onClick={() => { setQuery(''); setResult(undefined); }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={!query.trim() || loading}
                                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold disabled:opacity-40 transition"
                                    style={{ background: G }}
                                    onMouseEnter={e => e.currentTarget.style.background = GH}
                                    onMouseLeave={e => e.currentTarget.style.background = G}
                                >
                                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                                    Search
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="bg-white border border-gray-200 py-8 flex items-center justify-center gap-2">
                            <Loader2 size={16} className="animate-spin" style={{ color: G }} />
                            <span className="text-sm text-gray-400">Searching…</span>
                        </div>
                    )}

                    {/* Not found */}
                    {!loading && result === null && (
                        <div className="bg-white border border-gray-200 px-5 py-6 flex items-center gap-3">
                            <div className="w-9 h-9 flex items-center justify-center shrink-0 bg-red-50">
                                <UserX size={16} className="text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700">No user found</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    No account matching "<span className="text-gray-600 font-medium">{query}</span>"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* User found */}
                    {!loading && result && (
                        <UserTransferCard
                            user={result}
                            onAdd={() => setModal({ user: result, transferType: TRANSFER_TYPE.INCREASE })}
                            onDeduct={() => setModal({ user: result, transferType: TRANSFER_TYPE.DECREASE })}
                        />
                    )}

                    {/* Initial empty state */}
                    {!loading && result === undefined && (
                        <div className="bg-white border border-gray-200 px-5 py-6 flex items-center gap-3">
                            <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: GL }}>
                                <ArrowLeftRight size={16} style={{ color: G }} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700">Find a user first</p>
                                <p className="text-xs text-gray-400 mt-0.5">Type the exact username and press Search</p>
                            </div>
                        </div>
                    )}

                </div>

                {/* ── Right: Transfer history ── */}
                <div className="lg:col-span-2 bg-white border border-gray-200">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100" style={{ background: GL }}>
                        <div>
                            <p className="text-sm font-bold text-gray-900">Transfer History</p>
                            <p className="text-xs text-gray-500 mt-0.5">Recent admin balance adjustments</p>
                        </div>
                        <button
                            onClick={() => fetchHistory(1)}
                            disabled={histLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-xs text-gray-500 hover:bg-white transition disabled:opacity-50 bg-white"
                        >
                            <RefreshCw size={13} className={histLoading ? 'animate-spin' : ''} /> Refresh
                        </button>
                    </div>

                    {histLoading ? (
                        <div className="py-16 flex flex-col items-center gap-3">
                            <RefreshCw size={20} className="animate-spin" style={{ color: G }} />
                            <p className="text-sm text-gray-400">Loading history…</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-16 flex flex-col items-center gap-2">
                            <ArrowLeftRight size={28} className="text-gray-200 mb-1" />
                            <p className="text-sm font-medium text-gray-500">No transfers yet</p>
                            <p className="text-xs text-gray-400">Transfers will appear here after the first adjustment</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-50">
                                <thead>
                                    <tr style={{ background: GL }}>
                                        {['User', 'Type', 'Amount', 'Remark', 'Date'].map(col => (
                                            <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: G }}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {history.map(t => {
                                        const isAdd = t.transferType === 'increase';
                                        return (
                                            <tr key={t._id} className="hover:bg-[#f6fbf6] transition-colors">
                                                <td className="px-5 py-3.5 text-sm font-semibold text-gray-800">
                                                    {t.toUser?.username || '—'}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
                                                        style={isAdd
                                                            ? { background: GL, color: G }
                                                            : { background: '#fee2e2', color: '#b91c1c' }}
                                                    >
                                                        {isAdd
                                                            ? <TrendingUp size={11} />
                                                            : <TrendingDown size={11} />}
                                                        {isAdd ? 'Added' : 'Deducted'}
                                                    </span>
                                                    {t.silent && (
                                                        <span className="ml-1.5 inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gray-200 text-gray-600">
                                                            Silent
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-sm font-bold tabular-nums" style={{ color: isAdd ? G : '#b91c1c' }}>
                                                    {isAdd ? '+' : '-'}{inr(t.amount)}
                                                </td>
                                                <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[180px] truncate">
                                                    {t.remark || <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                                                    {formatDate(t.createdAt)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>

                            {/* Pagination */}
                            {histPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100" style={{ background: GL }}>
                                    <p className="text-xs text-gray-500">{histTotal} total transfers</p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => fetchHistory(histPage - 1)}
                                            disabled={histPage <= 1 || histLoading}
                                            className="px-3 py-1.5 border border-gray-300 text-xs text-gray-600 hover:bg-white disabled:opacity-40 transition"
                                        >
                                            ← Prev
                                        </button>
                                        <span className="px-4 py-1.5 text-xs font-semibold text-white" style={{ background: G }}>
                                            {histPage} / {histPages}
                                        </span>
                                        <button
                                            onClick={() => fetchHistory(histPage + 1)}
                                            disabled={histPage >= histPages || histLoading}
                                            className="px-3 py-1.5 border border-gray-300 text-xs text-gray-600 hover:bg-white disabled:opacity-40 transition"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {modal && (
                <TransferModal
                    user={modal.user}
                    transferType={modal.transferType}
                    onClose={() => setModal(null)}
                    onSuccess={updateBalance}
                />
            )}

            {massModal && (
                <MassTransferModal
                    onClose={() => setMassModal(false)}
                    onDone={() => { fetchHistory(1); fetchTodayStats(); }}
                />
            )}
        </>
    );
}

// ── Mass Transfer Modal ───────────────────────────────────────────────────────
const PCT_OPTIONS = [10, 25, 50, 75, 100];

function MassTransferModal({ onClose, onDone }) {
    const [rawText,      setRawText     ] = useState('');
    const [amount,       setAmount      ] = useState('');
    const [type,         setType        ] = useState('increase');
    const [deductPercent,setDeductPercent] = useState(null); // null or 10/25/50/75/100
    const [remark,       setRemark      ] = useState('');
    const [password,     setPassword    ] = useState('');
    const [showPw,       setShowPw      ] = useState(false);
    const [running,      setRunning     ] = useState(false);
    const [results,      setResults     ] = useState(null);

    const usernames   = rawText.split(/[\s,\n]+/).map(s => s.trim()).filter(Boolean);
    const uniqueNames = [...new Set(usernames)];
    const isAdd       = type === 'increase';
    const usingPct    = !isAdd && deductPercent !== null;
    const canSend     = uniqueNames.length > 0
        && (isAdd ? (!!amount && Number(amount) > 0) : (usingPct || (!!amount && Number(amount) > 0)))
        && !!password.trim()
        && !running;

    const handleSend = async () => {
        if (!canSend) return;
        setRunning(true);
        setResults(null);
        const ok = [], fail = [];

        for (const username of uniqueNames) {
            try {
                const data = await usersApi.list({ page: 1, limit: 5, search: username });
                const user = (data.users || []).find(u => u.username.toLowerCase() === username.toLowerCase());
                if (!user) { fail.push({ username, reason: 'User not found' }); continue; }
                await usersApi.transferBalance({
                    userId: user._id,
                    amount: Number(amount),
                    transferType: type,
                    remark: remark.trim() || undefined,
                    password: password.trim(),
                    percentage: usingPct ? deductPercent : undefined,
                });
                ok.push(username);
            } catch (err) {
                const reason = err?.response?.data?.message || 'Failed';
                if (err?.response?.status === 401) {
                    setResults({ ok, fail: [{ username: '(all)', reason }] });
                    setRunning(false);
                    return;
                }
                fail.push({ username, reason });
            }
        }

        setResults({ ok, fail });
        setRunning(false);
        if (ok.length) { setRawText(''); setAmount(''); setRemark(''); setPassword(''); setDeductPercent(null); onDone(); }
    };

    const reset = () => { setRawText(''); setAmount(''); setRemark(''); setPassword(''); setDeductPercent(null); setResults(null); };

    const accent = isAdd ? 'emerald' : 'rose';

    return (
        <AppModal onClose={onClose} size="md">
            <AppModal.Header
                icon={<Users size={17} />}
                title="Mass Transfer"
                subtitle="Send or deduct balance to multiple users at once"
                onClose={onClose}
                accent={accent}
            />

            <AppModal.Body className="space-y-4">

                {/* Type toggle — prominent at top */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    {[['increase', '+ Add'], ['decrease', '− Deduct']].map(([val, label]) => (
                        <button key={val} type="button"
                            onClick={() => { setType(val); setDeductPercent(null); setAmount(''); }}
                            className="flex-1 py-2 text-sm font-semibold transition rounded-md"
                            style={type === val
                                ? { background: val === 'increase' ? '#059669' : '#e11d48', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }
                                : { background: 'transparent', color: '#6b7280' }}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Usernames */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Usernames <span className="normal-case font-normal text-gray-400">(space, comma or newline)</span>
                    </label>
                    <textarea
                        rows={3}
                        value={rawText}
                        onChange={e => { setRawText(e.target.value); setResults(null); }}
                        placeholder="user1 user2 user3"
                        className="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition resize-none font-mono"
                        style={{ borderRadius: '6px' }}
                    />
                    {uniqueNames.length > 0 && (
                        <p className="text-xs mt-1.5 font-medium" style={{ color: isAdd ? '#059669' : '#e11d48' }}>
                            {uniqueNames.length} unique user{uniqueNames.length > 1 ? 's' : ''} detected
                        </p>
                    )}
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₹)</label>
                    <div className={`flex items-center border bg-gray-50 transition focus-within:bg-white focus-within:ring-2 ${
                        isAdd ? 'border-gray-200 focus-within:border-emerald-400 focus-within:ring-emerald-100'
                              : 'border-gray-200 focus-within:border-rose-400 focus-within:ring-rose-100'
                    }`} style={{ borderRadius: '6px' }}>
                        <span className="pl-3.5 text-gray-400 font-semibold text-base shrink-0">₹</span>
                        <input
                            type="number" min="0.01" step="any"
                            value={amount}
                            onChange={e => { setAmount(e.target.value); setDeductPercent(null); }}
                            disabled={usingPct}
                            placeholder={usingPct ? `${deductPercent}% of each user's balance` : '0'}
                            className="flex-1 px-2 py-2.5 text-base font-bold text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-400 placeholder:font-normal disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Percentage quick-select (Deduct only) */}
                {!isAdd && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            Or deduct by % of balance
                        </label>
                        <div className="flex gap-1.5">
                            {PCT_OPTIONS.map(pct => (
                                <button
                                    key={pct}
                                    type="button"
                                    onClick={() => {
                                        setDeductPercent(deductPercent === pct ? null : pct);
                                        setAmount('');
                                    }}
                                    className="flex-1 py-2 text-xs font-bold border transition"
                                    style={{
                                        borderRadius: '6px',
                                        ...(deductPercent === pct
                                            ? { background: '#e11d48', color: '#fff', borderColor: '#e11d48' }
                                            : { background: '#fff5f5', color: '#e11d48', borderColor: '#fecdd3' }),
                                    }}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                        {usingPct && (
                            <p className="mt-1.5 text-[11px] font-medium text-rose-500">
                                Will deduct {deductPercent}% of each user's current balance
                            </p>
                        )}
                    </div>
                )}

                {/* Remark */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Remark <span className="normal-case font-normal text-gray-400">(optional)</span>
                    </label>
                    <input type="text" value={remark} onChange={e => setRemark(e.target.value)}
                        placeholder="e.g. Bonus, Promo..."
                        className="w-full border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                        style={{ borderRadius: '6px' }} />
                </div>

                {/* Password */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Login Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-200/60 transition px-3.5"
                        style={{ borderRadius: '6px' }}>
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter your login password to confirm"
                            autoComplete="current-password"
                            className="flex-1 py-2.5 text-sm text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-400"
                        />
                        <button type="button" tabIndex={-1} onClick={() => setShowPw(s => !s)}
                            className="text-gray-400 hover:text-gray-600 transition shrink-0 ml-2">
                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                </div>

                {/* Results */}
                {results && (
                    <div className="overflow-hidden text-xs" style={{ borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                        {results.ok.length > 0 && (
                            <div className="px-3.5 py-3 bg-emerald-50 border-b border-emerald-100">
                                <p className="font-semibold mb-1 flex items-center gap-1.5 text-emerald-700">
                                    <CheckCircle2 size={13} /> {results.ok.length} succeeded
                                </p>
                                <p className="text-emerald-600 font-mono leading-relaxed">{results.ok.join(', ')}</p>
                            </div>
                        )}
                        {results.fail.length > 0 && (
                            <div className="px-3.5 py-3 bg-rose-50 border-b border-rose-100">
                                <p className="font-semibold mb-1 flex items-center gap-1.5 text-rose-600">
                                    <XCircle size={13} /> {results.fail.length} failed
                                </p>
                                {results.fail.map(f => (
                                    <p key={f.username} className="text-rose-500 font-mono">
                                        {f.username} <span className="text-rose-400 font-sans">— {f.reason}</span>
                                    </p>
                                ))}
                            </div>
                        )}
                        <button onClick={reset} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition bg-white">
                            Clear & reset
                        </button>
                    </div>
                )}
            </AppModal.Body>

            <AppModal.Footer>
                <ModalBtn variant="secondary" onClick={onClose}>Cancel</ModalBtn>
                <ModalBtn
                    variant={isAdd ? 'emerald' : 'rose'}
                    onClick={handleSend}
                    disabled={!canSend}
                    className="min-w-[140px] flex items-center justify-center gap-2"
                >
                    {running
                        ? <><Loader2 size={13} className="animate-spin" />Sending…</>
                        : <><Send size={13} />{uniqueNames.length > 0 ? `Send to ${uniqueNames.length} user${uniqueNames.length !== 1 ? 's' : ''}` : 'Send'}</>}
                </ModalBtn>
            </AppModal.Footer>
        </AppModal>
    );
}

function UserTransferCard({ user, onAdd, onDeduct }) {
    const isActive = user.isActive !== false;
    const initials = (user.username || '??').slice(0, 2).toUpperCase();
    const balance  = (user.money || 0).toLocaleString('en-US');

    return (
        <div className="bg-white border border-gray-200 overflow-hidden">
            {/* User header */}
            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100" style={{ background: GL }}>
                <div
                    className="w-10 h-10 flex items-center justify-center shrink-0 text-white text-sm font-bold"
                    style={{ background: G }}
                >
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{user.username}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: isActive ? G : '#e11d48' }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: isActive ? G : '#e11d48' }} />
                        {isActive ? 'Active' : 'Disabled'}
                    </span>
                </div>
            </div>

            {/* Balance */}
            <div className="px-5 py-5 border-b border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Balance</p>
                <p className="text-[28px] font-extrabold text-gray-900 tabular-nums leading-none">₹{balance}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-3">
                <button
                    onClick={onAdd}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold border transition hover:opacity-90"
                    style={{ background: GL, color: G, borderColor: G }}
                >
                    <TrendingUp size={14} /> Add Money
                </button>
                <button
                    onClick={onDeduct}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold border transition hover:opacity-90"
                    style={{ background: '#fff1f2', color: '#e11d48', borderColor: '#fda4af' }}
                >
                    <TrendingDown size={14} /> Deduct
                </button>
            </div>
        </div>
    );
}
