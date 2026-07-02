import { useState, useEffect } from 'react';
import {
    Search, X, CheckCircle, Trash2, Eye, RefreshCw,
    Building2, CreditCard, Calendar, ShieldCheck, Clock,
    ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import DateRangePicker from '../DateRangePicker';
import { usersApi } from '../../api/users';
import { useNotify } from '../../context/NotifyContext';
import AppModal, { ModalBtn, ModalInfoRow } from '../AppModal';
import { formatDate } from '../../utils/format';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const PAGE_SIZE = 20;

const DATE_RANGES = [
    { key: 'today',  label: 'Today'       },
    { key: 'last7',  label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days'},
    { key: '',       label: 'All time'    },
    { key: 'custom', label: 'Custom'      },
];

const inputCls = 'w-full border border-gray-200 text-sm px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition bg-white text-gray-800 placeholder-gray-400';

function isNew(createdAt) {
    return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

export default function BankCardPanel() {
    const notify = useNotify();

    const [draftUsername,   setDraftUsername  ] = useState('');
    const [draftAccountNum, setDraftAccountNum] = useState('');
    const [draftFrom,       setDraftFrom      ] = useState('');
    const [draftTo,         setDraftTo        ] = useState('');

    const [filters, setFilters] = useState({ username: '', accountNum: '', dateRange: 'today', from: '', to: '' });
    const [page, setPage] = useState(1);

    const [cards,           setCards          ] = useState([]);
    const [totalCards,      setTotalCards     ] = useState(0);
    const [totalVerified,   setTotalVerified  ] = useState(0);
    const [totalUnverified, setTotalUnverified] = useState(0);
    const [totalPages,      setTotalPages     ] = useState(1);
    const [loading,         setLoading        ] = useState(false);

    const [viewCard,  setViewCard ] = useState(null);
    const [verifying, setVerifying] = useState(null);
    const [deleting,  setDeleting ] = useState(null);

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

    useEffect(() => {
        fetchCards(filters, 1);
    }, [filters]);

    const handleApply = (e) => {
        e?.preventDefault();
        setFilters(f => ({ ...f, username: draftUsername, accountNum: draftAccountNum }));
    };

    const handleDateRange = (key) => {
        if (key !== 'custom') {
            setDraftFrom(''); setDraftTo('');
            setFilters(f => ({ ...f, dateRange: key, from: '', to: '' }));
        } else {
            setFilters(f => ({ ...f, dateRange: key }));
        }
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5">
                <StatCard
                    label="Total Bank Cards"
                    value={totalCards}
                    icon={<CreditCard size={18} />}
                    iconBg={GL}
                    iconColor={G}
                />
                <StatCard
                    label="Unverified"
                    value={totalUnverified}
                    icon={<Clock size={18} />}
                    iconBg="#fff7ed"
                    iconColor="#d97706"
                    note="matching current filter"
                />
                <StatCard
                    label="Verified"
                    value={totalVerified}
                    icon={<ShieldCheck size={18} />}
                    iconBg={GL}
                    iconColor={G}
                    note="matching current filter"
                />
            </div>

            {/* Filters card */}
            <div className="bg-white border border-gray-200 p-4 mb-5">
                <form onSubmit={handleApply}>
                    {/* Search inputs row */}
                    <div className="flex flex-wrap gap-3 mb-3">
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={draftUsername}
                                    onChange={e => setDraftUsername(e.target.value)}
                                    placeholder="Filter by username…"
                                    className={`${inputCls} pl-9`}
                                />
                            </div>
                        </div>
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Account Number</label>
                            <div className="relative">
                                <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={draftAccountNum}
                                    onChange={e => setDraftAccountNum(e.target.value)}
                                    placeholder="Filter by account number…"
                                    className={`${inputCls} pl-9`}
                                />
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                type="submit"
                                className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold transition active:scale-95"
                                style={{ background: G }}
                                onMouseEnter={e => e.currentTarget.style.background = GH}
                                onMouseLeave={e => e.currentTarget.style.background = G}
                            >
                                <Filter size={14} /> Apply
                            </button>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
                            >
                                <X size={14} /> Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => fetchCards(filters, page)}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Date range chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider shrink-0">
                            <Calendar size={12} /> Date added:
                        </span>
                        {DATE_RANGES.map(r => (
                            <button
                                key={r.key}
                                type="button"
                                onClick={() => handleDateRange(r.key)}
                                className="px-3 py-1 text-xs font-semibold border transition"
                                style={
                                    filters.dateRange === r.key
                                        ? { background: G, color: '#fff', borderColor: G }
                                        : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }
                                }
                            >
                                {r.label}
                            </button>
                        ))}

                        {filters.dateRange === 'custom' && (
                            <div className="ml-1">
                                <DateRangePicker
                                    from={draftFrom}
                                    to={draftTo}
                                    onChange={(f, t) => {
                                        setDraftFrom(f);
                                        setDraftTo(t);
                                        if (f && t) setFilters(prev => ({ ...prev, from: f, to: t }));
                                    }}
                                    placeholder="Pick date range"
                                />
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200">
                <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-20 text-center">
                        <RefreshCw size={22} className="animate-spin mx-auto mb-2" style={{ color: G }} />
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
                            <tr style={{ background: GL }}>
                                {['Username', 'Account Holder', 'Bank', 'Account Number', 'IFSC', 'Status', 'Added', 'Actions'].map(col => (
                                    <th
                                        key={col}
                                        className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider"
                                        style={{ color: G }}
                                    >
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

                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100" style={{ background: GL }}>
                        <p className="text-xs text-gray-500">
                            Page {page} of {totalPages} · {totalCards} total
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => fetchCards(filters, page - 1)}
                                disabled={page <= 1 || loading}
                                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
                                <ChevronLeft size={13} /> Prev
                            </button>
                            <span
                                className="px-4 py-1.5 text-xs font-semibold text-white"
                                style={{ background: G }}
                            >
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => fetchCards(filters, page + 1)}
                                disabled={page >= totalPages || loading}
                                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
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
                            <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
                                style={viewCard.isVerified
                                    ? { background: GL, color: G }
                                    : { background: '#fff7ed', color: '#d97706' }}
                            >
                                <span
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ background: viewCard.isVerified ? G : '#d97706' }}
                                />
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
        <tr className="hover:bg-[#f6fbf6] transition-colors">
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800">{card.username}</span>
                    {fresh && (
                        <span
                            className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5"
                            style={{ background: GL, color: G }}
                        >
                            New
                        </span>
                    )}
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
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
                    style={card.isVerified
                        ? { background: GL, color: G }
                        : { background: '#fff7ed', color: '#d97706' }}
                >
                    <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: card.isVerified ? G : '#d97706' }}
                    />
                    {card.isVerified ? 'Verified' : 'Unverified'}
                </span>
            </td>
            <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(card.createdAt)}</td>
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onView}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition"
                        style={{ background: '#eff6ff', color: '#1d4ed8' }}
                    >
                        <Eye size={12} /> Review
                    </button>
                    {!card.isVerified && (
                        <button
                            onClick={onVerify}
                            disabled={verifying}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                            style={{ background: GL, color: G }}
                        >
                            <CheckCircle size={12} />{verifying ? '…' : 'Verify'}
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        disabled={deleting}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                        style={{ background: '#fee2e2', color: '#b91c1c' }}
                    >
                        <Trash2 size={12} />{deleting ? '…' : 'Delete'}
                    </button>
                </div>
            </td>
        </tr>
    );
}

function StatCard({ label, value, icon, iconBg, iconColor, note }) {
    return (
        <div className="bg-white border border-gray-200 p-4 flex items-center gap-4 hover:border-[#3a7d44]/40 transition-colors">
            <div
                className="h-10 w-10 flex items-center justify-center shrink-0"
                style={{ background: iconBg, color: iconColor }}
            >
                {icon}
            </div>
            <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                {note && <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>}
            </div>
        </div>
    );
}
