import { useState } from 'react';
import { Search, Loader2, TrendingUp, TrendingDown, ArrowLeftRight, X, User, UserX } from 'lucide-react';
import { usersApi } from '../../api/users';
import TransferModal from './TransferModal';
import { TRANSFER_TYPE } from '../../constants/users';

export default function TransferPanel() {
    const [query,   setQuery  ] = useState('');
    const [loading, setLoading] = useState(false);
    const [result,  setResult ] = useState(undefined); // undefined = not searched, null = not found, obj = found
    const [modal,   setModal  ] = useState(null);

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
    };

    return (
        <>
            <div className="max-w-md space-y-4">

                {/* ── Search card ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="px-6 pt-5 pb-4">
                        <p className="text-sm font-bold text-gray-900">Find User</p>
                        <p className="text-xs text-gray-400 mt-0.5">Enter the exact username to search</p>
                    </div>
                    <div className="px-6 pb-5">
                        <form onSubmit={handleSearch} className="flex gap-2.5">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Exact username…"
                                    autoComplete="off"
                                    className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 focus:bg-white transition"
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
                                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition active:scale-[0.97]"
                                style={{ background: 'linear-gradient(135deg,#d9ad82,#b1835a)', boxShadow: '0 2px 8px rgba(177,131,90,0.28)' }}
                            >
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                                Search
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── Loading ── */}
                {loading && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-3">
                        <Loader2 size={22} className="animate-spin text-amber-400" />
                        <p className="text-sm text-gray-400">Searching…</p>
                    </div>
                )}

                {/* ── Not found ── */}
                {!loading && result === null && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-14 flex flex-col items-center gap-2 px-6">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-1">
                            <UserX size={20} className="text-red-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">No user found</p>
                        <p className="text-xs text-gray-400 text-center">
                            No account with username "<span className="text-gray-600 font-medium">{query}</span>"
                        </p>
                    </div>
                )}

                {/* ── User found ── */}
                {!loading && result && (
                    <UserTransferCard
                        user={result}
                        onAdd={() => setModal({ user: result, transferType: TRANSFER_TYPE.INCREASE })}
                        onDeduct={() => setModal({ user: result, transferType: TRANSFER_TYPE.DECREASE })}
                    />
                )}

                {/* ── Initial empty state ── */}
                {!loading && result === undefined && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-2 px-6">
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-1">
                            <ArrowLeftRight size={20} className="text-amber-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">Search for a user</p>
                        <p className="text-xs text-gray-400 text-center">
                            Type the exact username above and press Search
                        </p>
                    </div>
                )}
            </div>

            {modal && (
                <TransferModal
                    user={modal.user}
                    transferType={modal.transferType}
                    onClose={() => setModal(null)}
                    onSuccess={updateBalance}
                />
            )}
        </>
    );
}

function UserTransferCard({ user, onAdd, onDeduct }) {
    const isActive = user.isActive !== false;
    const initials = (user.username || '??').slice(0, 2).toUpperCase();
    const balance = (user.money || 0).toLocaleString('en-US');

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── User header ── */}
            <div className="px-6 pt-5 pb-4 flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold tracking-wide"
                    style={{ background: 'linear-gradient(135deg,#d9ad82,#b1835a)' }}
                >
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-900 truncate">{user.username}</p>
                    <p className="text-xs text-gray-400">User account</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {isActive ? 'Active' : 'Disabled'}
                </span>
            </div>

            {/* ── Balance ── */}
            <div
                className="mx-5 mb-5 rounded-xl px-5 py-4 text-center"
                style={{ background: 'linear-gradient(135deg,#fffbf5,#fff3e3)', border: '1px solid rgba(217,173,130,0.2)' }}
            >
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400 mb-1.5">
                    Current Balance
                </p>
                <p className="text-3xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                    ₹{balance}
                </p>
            </div>

            {/* ── Action strip ── */}
            <div className="grid grid-cols-2 border-t border-gray-100">
                <button
                    onClick={onAdd}
                    className="group flex items-center justify-center gap-2 py-4 text-emerald-700 font-semibold text-sm bg-emerald-50/70 hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
                    style={{ borderRight: '1px solid #f1f3f5' }}
                >
                    <TrendingUp size={15} className="transition-transform group-hover:-translate-y-0.5" />
                    Add Money
                </button>
                <button
                    onClick={onDeduct}
                    className="group flex items-center justify-center gap-2 py-4 text-rose-600 font-semibold text-sm bg-rose-50/70 hover:bg-rose-100 active:bg-rose-200 transition-colors"
                >
                    <TrendingDown size={15} className="transition-transform group-hover:translate-y-0.5" />
                    Deduct Money
                </button>
            </div>
        </div>
    );
}
