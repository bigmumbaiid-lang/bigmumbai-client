import { useState, useRef } from 'react';
import { useNotify } from '../../context/NotifyContext';
import AppModal, { ModalTextarea, ModalBtn } from '../AppModal';
import { usersApi } from '../../api/users';
import { TRANSFER_TYPE } from '../../constants/users';
import { TrendingUp, TrendingDown } from 'lucide-react';

const QUICK_AMOUNTS = [1000, 2000, 5000, 7000, 14000, 28000, 42000];

export default function TransferModal({ user, transferType, onClose, onSuccess }) {
    const notify = useNotify();
    const [amount, setAmount] = useState('');
    const [remark, setRemark] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const formRef = useRef(null);
    const isIncrease = transferType === TRANSFER_TYPE.INCREASE;
    const accent = isIncrease ? 'emerald' : 'rose';
    const Icon = isIncrease ? TrendingUp : TrendingDown;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const num = Number(amount);
        if (!num || num <= 0) {
            notify.error('Please enter a valid amount greater than 0');
            return;
        }

        try {
            setSubmitting(true);
            const data = await usersApi.transferBalance({
                userId: user._id,
                amount: num,
                transferType,
                remark: remark.trim() || undefined,
            });
            onSuccess(user._id, { money: data.data.newBalance });
            notify.success(`₹${num.toLocaleString('en-US')} ${isIncrease ? 'added to' : 'deducted from'} @${user.username}'s balance. New balance: ₹${data.data.newBalance}`);
            onClose();
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to update balance');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AppModal onClose={onClose} onConfirm={() => formRef.current?.requestSubmit()} size="sm">
            <AppModal.Header
                icon={<Icon size={18} />}
                title={isIncrease ? 'Add Balance' : 'Deduct Balance'}
                subtitle={`User: @${user.username}  ·  Current: ₹${(user.money || 0).toLocaleString('en-US')}`}
                onClose={onClose}
                accent={accent}
            />

            <form ref={formRef} onSubmit={handleSubmit}>
                <AppModal.Body className="space-y-4">
                    {/* Big amount input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                        <div className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 transition bg-gray-50 focus-within:bg-white ${
                            isIncrease
                                ? 'border-gray-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100'
                                : 'border-gray-200 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100'
                        }`}>
                            <span className="text-gray-400 font-semibold text-lg shrink-0">₹</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                min="1"
                                required
                                className="flex-1 text-2xl font-bold text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    {/* Quick amounts */}
                    <div>
                        <p className="text-xs text-gray-400 font-medium mb-2">Quick select</p>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_AMOUNTS.map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => setAmount(String(q))}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                                        Number(amount) === q
                                            ? isIncrease
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'bg-rose-600 text-white border-rose-600'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {q >= 1000 ? `${q / 1000}K` : q.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Remark */}
                    <ModalTextarea
                        label="Remark (optional)"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        rows={2}
                        placeholder="Reason for this transfer…"
                    />

                    {/* Preview */}
                    {Number(amount) > 0 && (
                        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${isIncrease ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {isIncrease ? '+ ' : '– '}₹{Number(amount).toLocaleString('en-US')} will be {isIncrease ? 'credited to' : 'debited from'} @{user.username}
                        </div>
                    )}
                </AppModal.Body>

                <AppModal.Footer>
                    <ModalBtn variant="secondary" type="button" onClick={onClose}>Cancel</ModalBtn>
                    <ModalBtn
                        variant={isIncrease ? 'emerald' : 'rose'}
                        type="submit"
                        disabled={submitting || !Number(amount)}
                        className="min-w-[120px]"
                    >
                        {submitting ? 'Processing…' : isIncrease ? 'Add Money' : 'Deduct Money'}
                    </ModalBtn>
                </AppModal.Footer>
            </form>
        </AppModal>
    );
}
