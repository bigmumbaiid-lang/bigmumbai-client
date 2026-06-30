import { useState, useEffect, useRef } from 'react';
import {
    Search, X, CheckCircle, Trash2, Eye, RefreshCw,
    Building2, CreditCard, Calendar, ShieldCheck, Clock,
    ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { usersApi } from '../../api/users';
import { useNotify } from '../../context/NotifyContext';
import AppModal, { ModalBtn, ModalInfoRow } from '../AppModal';
import { formatDate } from '../../utils/format';

const PAGE_SIZE = 20;

const DATE_RANGES = [
    { key: '',       label: 'All time'   },
    { key: 'today',  label: 'Today'      },
    { key: 'week',   label: 'This week'  },
    { key: 'month',  label: 'This month' },
    { key: 'custom', label: 'Custom'     },
];

function isNew(createdAt) {
    return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

export default function BankCardPanel() {
    const notify = useNotify();

    // draft inputs (not yet applied)
    const [draftUsername,   setDraftUsername  ] = useState('');
    const [draftAccountNum, setDraftAccountNum] = useState('');
    const [draftFrom,       setDraftFrom      ] = useState('');
    const [draftTo,         setDraftTo        ] = useState('');

    // committed filters — useEffect watches these to trigger fetch
    const [filters, setFilters] = useState({ username: '', accountNum: '', dateRange: '', from: '', to: '' });
    const [page, setPage] = useState(1);

    // data
    const [cards,          setCards         ] = useState([]);
    const [totalCards,     setTotalCards    ] = useState(0);
    const [totalVerified,  setTotalVerified ] = useState(0);
    const [totalUnverified,setTotalUnverified] = useState(0);
    const [totalPages,     setTotalPages    ] = useState(1);
    const [loading,        setLoading       ] = useState(false);

    // modals
    const [viewCard,  setViewCard ] = useState(null);
    const [verifying, setVerifying] = useState(null);
    const [deleting,  setDeleting ] = useState(null);

    // fetch using explicit filters + page (avoids stale closure issues)
    const fetchCards = async (f, p = 1) => {
        setLoading(true);
        try {
            const params = { page: p, limit: PAGE_SIZE };
            if (f.username.trim())   params.username      = f.username.trim();
            if (f.accountNum.trim()) params.accountNumber = f.accountNum.trim();
            if (f.dateRange)         params.dateRange     = f.dateRange;
            if (f.dateRange === 'custom' && f.from) params.from = f.from;
            if (f.dateRange === 'custom' && f.to)   params.to   = f.to;

            const data = await usersApi.listBankCards(params);
            setCards(data.cards || []);
            setTotalCards(data.totalCards || 0);
            setTotalVerified(data.totalVerified || 0);
            setTotalUnverified(data.totalUnverified || 0);
            setTotalPages(data.totalPages || 1);
            setPage(p);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to load bank cards');
        } finally {
            setLoading(false);
        }
    };

    // re-fetch whenever committed filters change (page resets to 1)
    useEffect(() => {
        fetchCards(filters, 1);
    }, [filters]);

    // Apply text filters
    const handleApply = (e) => {
        e?.preventDefault();
        setFilters(f => ({ ...f, username: draftUsername, accountNum: draftAccountNum }));
    };

    // Date chip click — immediately commits and fetches
    const handleDateRange = (key) => {
        if (key !== 'custom') {
            setDraftFrom(''); setDraftTo('');
            setFilters(f => ({ ...f, dateRange: key, from: '', to: '' }));
        } else {
            setFilters(f => ({ ...f, dateRange: key }));
        }
    };

    // Apply custom date range
    const handleCustomApply = () => {
        setFilters(f => ({ ...f, from: draftFrom, to: draftTo }));
    };

    const clearFilters = () => {
        setDraftUsername(''); setDraftAccountNum(''); setDraftFrom(''); setDraftTo('');
        setFilters({ username: '', accountNum: '', dateRange: '', from: '', to: '' });
    };

    const handleVerify = async (card) => {
        const ok = await notify.confirm({
            title: 'Verify bank card?',
            message: `Mark ${card.actualName}'s bank card (${card.bankAccount}) as verified?`,
            confirmLabel: 'Verify',
            variant: 'primary',
        });
        if (!ok) return;
        setVerifying(card.userId);
        try {
            await usersApi.verifyBankCard(card.userId);
            notify.success(`Bank card verified for @${card.username}`);
            setCards(prev => prev.map(c => c.userId === card.userId ? { ...c, isVerified: true } : c));
            setTotalVerified(v => v + 1);
            setTotalUnverified(u => u - 1);
            if (viewCard?.userId === card.userId) setViewCard(v => ({ ...v, isVerified: true }));
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to verify');
        } finally {
            setVerifying(null);
        }
    };

    const handleDelete = async (card) => {
        const ok = await notify.confirm({
            title: 'Delete bank card?',
            message: `This will permanently remove @${card.username}'s bank card. They'll need to re-add it.`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;
        setDeleting(card.userId);
        try {
            await usersApi.deleteBankCard(card.userId);
            notify.success(`Bank card removed for @${card.username}`);
            setCards(prev => prev.filter(c => c.userId !== card.userId));
            setTotalCards(t => t - 1);
            if (!cards.find(c => c.userId === card.userId)?.isVerified) setTotalUnverified(u => u - 1);
            else setTotalVerified(v => v - 1);
            if (viewCard?.userId === card.userId) setViewCard(null);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to delete');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <StatCard label="Total Bank Cards" value={totalCards}
                    icon={<CreditCard size={18} />} iconBg="bg-blue-50" iconColor="text-blue-500" />
                <StatCard label="Unverified" value={totalUnverified}
                    icon={<Clock size={18} />} iconBg="bg-amber-50" iconColor="text-amber-500"
                    note="matching current filter" />
                <StatCard label="Verified" value={totalVerified}
                    icon={<ShieldCheck size={18} />} iconBg="bg-emerald-50" iconColor="text-emerald-500"
                    note="matching current filter" />
            </div>

            {/* Filters card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-4 mb-5">
                <form onSubmit={handleApply}>
                    {/* Search inputs row */}
                    <div className="flex flex-wrap gap-3 mb-3">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                value={draftUsername}
                                onChange={e => setDraftUsername(e.target.value)}
                                placeholder="Filter by username…"
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/20 transition"
                            />
                        </div>
                        <div className="relative flex-1 min-w-[180px]">
                            <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                value={draftAccountNum}
                                onChange={e => setDraftAccountNum(e.target.value)}
                                placeholder="Filter by account number…"
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/20 transition"
                            />
                        </div>
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm transition active:scale-95"
                            style={{ background: 'linear-gradient(90deg,#d9ad82,#b1835a)' }}
                        >
                            <Filter size={14} /> Apply
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
                        >
                            <X size={14} /> Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => fetchCards(filters, page)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Date range chips — clicking auto-applies */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-400 font-medium shrink-0">
                            <Calendar size={12} /> Date added:
                        </span>
                        {DATE_RANGES.map(r => (
                            <button
                                key={r.key}
                                type="button"
                                onClick={() => handleDateRange(r.key)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${
                                    filters.dateRange === r.key
                                        ? 'bg-[#b1835a] text-white border-[#b1835a]'
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}

                        {/* Custom date inputs */}
                        {filters.dateRange === 'custom' && (
                            <div className="flex items-center gap-2 ml-1">
                                <input type="date" value={draftFrom} onChange={e => setDraftFrom(e.target.value)}
                                    className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-[#b1835a] transition" />
                                <span className="text-xs text-gray-400">to</span>
                                <input type="date" value={draftTo} onChange={e => setDraftTo(e.target.value)}
                                    className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-[#b1835a] transition" />
                                <button type="button" onClick={handleCustomApply}
                                    className="px-3 py-1 rounded-md bg-gray-800 text-white text-xs font-semibold transition hover:bg-gray-700">
                                    Apply range
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] overflow-hidden">
                {loading ? (
                    <div className="py-20 text-center">
                        <RefreshCw size={22} className="animate-spin text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Loading bank cards…</p>
                    </div>
                ) : cards.length === 0 ? (
                    <div className="py-20 text-center">
                        <CreditCard size={28} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-500">No bank cards found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead>
                            <tr className="bg-gray-50">
                                {['Username', 'Account Holder', 'Bank', 'Account Number', 'IFSC', 'Status', 'Added', 'Actions'].map(col => (
                                    <th key={col} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {cards.map(card => (
                                <BankCardRow
                                    key={card._id}
                                    card={card}
                                    onView={() => setViewCard(card)}
                                    onVerify={() => handleVerify(card)}
                                    onDelete={() => handleDelete(card)}
                                    verifying={verifying === card.userId}
                                    deleting={deleting === card.userId}
                                />
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
                        <p className="text-xs text-gray-400">
                            Page {page} of {totalPages} · {totalCards} total
                        </p>
                        <div className="flex gap-1">
                            <button onClick={() => fetchCards(filters, page - 1)} disabled={page <= 1 || loading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition">
                                <ChevronLeft size={13} /> Prev
                            </button>
                            <button onClick={() => fetchCards(filters, page + 1)} disabled={page >= totalPages || loading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition">
                                Next <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* View / Review modal */}
            {viewCard && (
                <AppModal onClose={() => setViewCard(null)} size="sm">
                    <AppModal.Header
                        icon={<Building2 size={15} />}
                        title="Bank Card Details"
                        subtitle={`@${viewCard.username}`}
                        onClose={() => setViewCard(null)}
                        accent="blue"
                    />
                    <AppModal.Body className="space-y-2">
                        <ModalInfoRow label="Account Holder" value={viewCard.actualName} />
                        <ModalInfoRow label="Bank Name"      value={viewCard.bankName} />
                        <ModalInfoRow label="Account Number" value={viewCard.bankAccount} />
                        <ModalInfoRow label="IFSC Code"      value={viewCard.ifscCode} />
                        <ModalInfoRow label="Phone"          value={viewCard.phoneNumber || '—'} />
                        <ModalInfoRow label="Added On"       value={formatDate(viewCard.createdAt)} />
                        <ModalInfoRow label="Status" value={
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                viewCard.isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${viewCard.isVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                {viewCard.isVerified ? 'Verified' : 'Unverified'}
                            </span>
                        } />
                    </AppModal.Body>
                    <AppModal.Footer>
                        {!viewCard.isVerified && (
                            <ModalBtn variant="emerald" onClick={() => handleVerify(viewCard)}
                                disabled={verifying === viewCard.userId} className="flex items-center gap-1.5">
                                <CheckCircle size={13} />
                                {verifying === viewCard.userId ? 'Verifying…' : 'Verify'}
                            </ModalBtn>
                        )}
                        <ModalBtn variant="danger" onClick={() => handleDelete(viewCard)}
                            disabled={deleting === viewCard.userId} className="flex items-center gap-1.5">
                            <Trash2 size={13} />
                            {deleting === viewCard.userId ? 'Deleting…' : 'Delete'}
                        </ModalBtn>
                        <ModalBtn variant="secondary" onClick={() => setViewCard(null)}>Close</ModalBtn>
                    </AppModal.Footer>
                </AppModal>
            )}
        </>
    );
}

function BankCardRow({ card, onView, onVerify, onDelete, verifying, deleting }) {
    const fresh = isNew(card.createdAt);
    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800">{card.username}</span>
                    {fresh && <span className="text-[9px] font-bold uppercase tracking-wide bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">New</span>}
                </div>
            </td>
            <td className="px-5 py-3.5 text-sm text-gray-700">{card.actualName}</td>
            <td className="px-5 py-3.5">
                <span className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Building2 size={13} className="text-gray-400 shrink-0" />{card.bankName}
                </span>
            </td>
            <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{card.bankAccount}</td>
            <td className="px-5 py-3.5 font-mono text-xs text-gray-500 uppercase">{card.ifscCode}</td>
            <td className="px-5 py-3.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    card.isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${card.isVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {card.isVerified ? 'Verified' : 'Unverified'}
                </span>
            </td>
            <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(card.createdAt)}</td>
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                    <button onClick={onView}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition">
                        <Eye size={12} /> Review
                    </button>
                    {!card.isVerified && (
                        <button onClick={onVerify} disabled={verifying}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition disabled:opacity-50">
                            <CheckCircle size={12} />{verifying ? '…' : 'Verify'}
                        </button>
                    )}
                    <button onClick={onDelete} disabled={deleting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 transition disabled:opacity-50">
                        <Trash2 size={12} />{deleting ? '…' : 'Delete'}
                    </button>
                </div>
            </td>
        </tr>
    );
}

function StatCard({ label, value, icon, iconBg, iconColor, note }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-4 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                {note && <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>}
            </div>
        </div>
    );
}
