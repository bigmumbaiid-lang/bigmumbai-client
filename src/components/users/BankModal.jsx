import { useEffect, useRef, useState } from 'react';
import { useNotify } from '../../context/NotifyContext';
import AppModal, { ModalInput, ModalBtn } from '../AppModal';
import { usersApi } from '../../api/users';
import { Copy, CheckCircle, ShieldCheck, ShieldAlert, Pencil, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
    actualName: '',
    bankName: '',
    bankAccount: '',
    ifscCode: '',
    isVerified: false,
};

// ── SVG bank icon ──────────────────────────────────────────────
const BankSvg = (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <path d="M3 8l7-4 7 4M4 8v7M16 8v7M8 8v7M12 8v7M3 16h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ── Virtual bank card ──────────────────────────────────────────
function BankCard({ card }) {
    const last4 = card.bankAccount ? card.bankAccount.slice(-4) : '????';
    return (
        <div
            className="relative rounded-2xl overflow-hidden h-44 p-5 flex flex-col justify-between select-none"
            style={{
                background: 'linear-gradient(135deg,#1e293b 0%,#0f172a 55%,#1c1040 100%)',
            }}
        >
            {/* decorative circles */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.04]" />
            <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-white/[0.03]" />
            <div className="absolute top-4 right-5 w-20 h-20 rounded-full bg-amber-400/[0.06]" />

            {/* Top: chip + bank name */}
            <div className="relative flex items-start justify-between">
                {/* SIM chip */}
                <div
                    className="w-9 h-6 rounded-md"
                    style={{
                        background: 'linear-gradient(135deg,#d9ad82,#b1835a)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                />
                <span className="text-white/50 text-[11px] font-semibold tracking-[0.15em] uppercase">
                    {card.bankName || 'Bank'}
                </span>
            </div>

            {/* Account number */}
            <div className="relative">
                <p className="text-white/30 text-[9px] uppercase tracking-[0.2em] mb-1">Account Number</p>
                <p className="text-white font-mono text-base tracking-[0.22em]">
                    {'•••• •••• •••• ' + last4}
                </p>
            </div>

            {/* Bottom: holder + IFSC */}
            <div className="relative flex items-end justify-between">
                <div>
                    <p className="text-white/30 text-[9px] uppercase tracking-[0.15em] mb-0.5">Account Holder</p>
                    <p className="text-white font-semibold text-sm tracking-wide uppercase leading-none">
                        {card.actualName || '—'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-white/30 text-[9px] uppercase tracking-[0.15em] mb-0.5">IFSC</p>
                    <p className="text-white/70 font-mono text-xs">{card.ifscCode || '—'}</p>
                </div>
            </div>
        </div>
    );
}

// ── Copy-able row ──────────────────────────────────────────────
function CopyRow({ label, value, mono }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    return (
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">{label}</p>
                <p className={`text-sm font-semibold text-gray-900 truncate ${mono ? 'font-mono' : ''}`}>
                    {value || '—'}
                </p>
            </div>
            {value && (
                <button
                    onClick={copy}
                    className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
                    title="Copy"
                >
                    {copied
                        ? <CheckCircle size={14} className="text-emerald-500" />
                        : <Copy size={14} />
                    }
                </button>
            )}
        </div>
    );
}

// ── Main BankModal ────────────────────────────────────────────
export default function BankModal({ user, onClose, onDeleted }) {
    const notify = useNotify();
    const editFormRef = useRef(null);
    const [bankDetails, setBankDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const loadBank = async () => {
        try {
            setLoading(true);
            const data = await usersApi.getBankCard(user._id);
            setBankDetails(data);
        } catch {
            notify.error('Failed to fetch bank details');
            setBankDetails({ hasBank: false });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBank();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user._id]);

    const startEditing = () => {
        const c = bankDetails?.bankCard;
        if (!c) return;
        setForm({
            actualName: c.actualName || '',
            bankName: c.bankName || '',
            bankAccount: c.bankAccount || '',
            ifscCode: c.ifscCode || '',
            isVerified: c.isVerified || false,
        });
        setIsEditing(true);
    };

    const setField = (key) => (e) => {
        const value =
            key === 'isVerified' ? e.target.checked
            : key === 'ifscCode' ? e.target.value.toUpperCase()
            : e.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            setUpdating(true);
            await usersApi.updateBankCard(user._id, form);
            notify.success('Bank details updated successfully');
            await loadBank();
            setIsEditing(false);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to update bank details');
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await notify.confirm({
            title: 'Delete bank card',
            message: `Remove the bank card linked to @${user.username}? This cannot be undone.`,
            confirmLabel: 'Yes, Delete',
            variant: 'danger',
        });
        if (!confirmed) return;
        try {
            setDeleting(true);
            await usersApi.deleteBankCard(user._id);
            notify.success('Bank card deleted successfully');
            onDeleted?.();
            onClose();
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to delete bank card');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AppModal onClose={onClose} onConfirm={isEditing ? () => editFormRef.current?.requestSubmit() : undefined} size="md">
            <AppModal.Header
                icon={BankSvg}
                title="Bank Information"
                subtitle={`User: ${user.username}`}
                onClose={onClose}
                accent="blue"
            />

            {loading ? (
                <>
                    <AppModal.Body>
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
                            <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-[#b1835a] animate-spin" />
                            <p className="text-sm">Loading bank details…</p>
                        </div>
                    </AppModal.Body>
                    <AppModal.Footer>
                        <ModalBtn variant="secondary" onClick={onClose}>Close</ModalBtn>
                    </AppModal.Footer>
                </>
            ) : isEditing ? (
                <BankEditForm
                    form={form}
                    setField={setField}
                    updating={updating}
                    onCancel={() => setIsEditing(false)}
                    onSubmit={handleUpdate}
                    formRef={editFormRef}
                />
            ) : bankDetails?.hasBank ? (
                <BankView
                    card={bankDetails.bankCard}
                    deleting={deleting}
                    onEdit={startEditing}
                    onDelete={handleDelete}
                />
            ) : (
                <>
                    <AppModal.Body>
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                                {BankSvg}
                            </div>
                            <p className="text-sm text-gray-500 font-medium">No bank card added yet</p>
                            <p className="text-xs text-gray-400">This user hasn't linked a bank account</p>
                        </div>
                    </AppModal.Body>
                    <AppModal.Footer>
                        <ModalBtn variant="secondary" onClick={onClose}>Close</ModalBtn>
                    </AppModal.Footer>
                </>
            )}
        </AppModal>
    );
}

// ── View mode ──────────────────────────────────────────────────
function BankView({ card, deleting, onEdit, onDelete }) {
    return (
        <>
            <AppModal.Body className="space-y-4">
                {/* Virtual card */}
                <BankCard card={card} />

                {/* Copyable detail rows */}
                <div className="grid grid-cols-2 gap-2.5">
                    <CopyRow label="Account Holder" value={card.actualName} />
                    <CopyRow label="Bank Name" value={card.bankName} />
                    <CopyRow label="Account Number" value={card.bankAccount} mono />
                    <CopyRow label="IFSC Code" value={card.ifscCode} mono />
                </div>

                {/* Verification status */}
                <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 ${card.isVerified ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                    {card.isVerified
                        ? <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                        : <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                    }
                    <div>
                        <p className={`text-sm font-semibold ${card.isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {card.isVerified ? 'Verified account' : 'Not yet verified'}
                        </p>
                        <p className={`text-xs ${card.isVerified ? 'text-emerald-600/70' : 'text-amber-600/70'}`}>
                            {card.isVerified ? 'Bank details have been confirmed' : 'Pending admin verification'}
                        </p>
                    </div>
                </div>
            </AppModal.Body>

            <AppModal.Footer
                left={
                    <ModalBtn
                        variant="rose"
                        onClick={onDelete}
                        disabled={deleting}
                        className="flex items-center gap-1.5"
                    >
                        <Trash2 size={14} />
                        {deleting ? 'Deleting…' : 'Delete card'}
                    </ModalBtn>
                }
            >
                <ModalBtn
                    variant="blue"
                    onClick={onEdit}
                    className="flex items-center gap-1.5"
                >
                    <Pencil size={14} />
                    Edit details
                </ModalBtn>
            </AppModal.Footer>
        </>
    );
}

// ── Edit form ──────────────────────────────────────────────────
function BankEditForm({ form, setField, updating, onCancel, onSubmit, formRef }) {
    return (
        <form ref={formRef} onSubmit={onSubmit}>
            <AppModal.Body className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <ModalInput
                            label="Account holder name"
                            value={form.actualName}
                            onChange={setField('actualName')}
                            placeholder="Full name"
                            required
                        />
                    </div>
                    <div className="col-span-2">
                        <ModalInput
                            label="Bank name"
                            value={form.bankName}
                            onChange={setField('bankName')}
                            placeholder="e.g. Bank of Baroda"
                            required
                        />
                    </div>
                    <ModalInput
                        label="Account number"
                        value={form.bankAccount}
                        onChange={setField('bankAccount')}
                        placeholder="Account number"
                        className="font-mono"
                        required
                    />
                    <ModalInput
                        label="IFSC code"
                        value={form.ifscCode}
                        onChange={setField('ifscCode')}
                        placeholder="e.g. BOB0102192"
                        className="font-mono uppercase"
                        required
                    />
                </div>

                {/* Verified toggle */}
                <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 bg-gray-50">
                    <div>
                        <p className="text-sm font-semibold text-gray-700">Mark as verified</p>
                        <p className="text-xs text-gray-400 mt-0.5">Bank details have been confirmed</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setField('isVerified')({ target: { checked: !form.isVerified } })}
                        className={`relative w-11 h-6 rounded-full transition-colors ${form.isVerified ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isVerified ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                    </button>
                </div>
            </AppModal.Body>

            <AppModal.Footer>
                <ModalBtn variant="secondary" type="button" onClick={onCancel}>Cancel</ModalBtn>
                <ModalBtn
                    variant="brand"
                    type="submit"
                    disabled={updating}
                    style={{ background: 'linear-gradient(90deg,#d9ad82,#b1835a)' }}
                >
                    {updating ? 'Saving…' : 'Save changes'}
                </ModalBtn>
            </AppModal.Footer>
        </form>
    );
}
