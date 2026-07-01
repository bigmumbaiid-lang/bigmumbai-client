import { useState } from 'react';
import { useNotify } from '../../context/NotifyContext';
import AppModal, { ModalBtn } from '../AppModal';
import { usersApi } from '../../api/users';
import { RESET_TYPE, MIN_PASSWORD_LENGTH } from '../../constants/users';
import { KeyRound, Eye, EyeOff, Shuffle, LogIn, Wallet } from 'lucide-react';

function generatePassword(len = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$!';
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const TYPE_OPTIONS = [
    {
        value: RESET_TYPE.LOGIN,
        label: 'Login Password',
        hint: 'For account sign-in',
        Icon: LogIn,
    },
    {
        value: RESET_TYPE.PAYMENT,
        label: 'Payment Password',
        hint: 'For withdrawals',
        Icon: Wallet,
    },
];

export default function ResetPasswordModal({ user, onClose }) {
    const notify = useNotify();
    const [resetType, setResetType] = useState(RESET_TYPE.LOGIN);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const handleGenerate = () => {
        setNewPassword(generatePassword());
        setShowPassword(true);
    };

    const handleSubmit = async () => {
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            notify.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
            return;
        }
        try {
            setSubmitting(true);
            const data = await usersApi.resetPassword({
                userId: user._id,
                type: resetType,
                newPassword,
            });
            notify.success(
                `${resetType === RESET_TYPE.LOGIN ? 'Login' : 'Payment'} password updated successfully!`,
                'Password Reset'
            );
            onClose();
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setSubmitting(false);
        }
    };

    const isValid = newPassword.length >= MIN_PASSWORD_LENGTH;

    return (
        <AppModal onClose={onClose} onConfirm={isValid && !submitting ? handleSubmit : undefined} size="sm">
            <AppModal.Header
                icon={<KeyRound size={18} />}
                title="Reset Password"
                subtitle={`User: @${user.username}`}
                onClose={onClose}
                accent="amber"
            />

            <AppModal.Body className="space-y-5">
                {/* Password type selector */}
                <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2.5">Password type</p>
                    <div className="grid grid-cols-2 gap-2.5">
                        {TYPE_OPTIONS.map(({ value, label, hint, Icon }) => {
                            const active = resetType === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setResetType(value)}
                                    className={`text-left rounded-xl border p-3.5 transition ${
                                        active
                                            ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300/50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon size={14} className={active ? 'text-amber-600' : 'text-gray-400'} />
                                        <span className={`text-sm font-semibold ${active ? 'text-amber-700' : 'text-gray-700'}`}>
                                            {label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 ml-[22px]">{hint}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Password input */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-700">
                            New password <span className="text-rose-500">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={handleGenerate}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#b1835a] hover:text-[#8a6040] transition"
                        >
                            <Shuffle size={12} />
                            Auto-generate
                        </button>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 bg-gray-50 focus-within:bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200/50 transition">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
                            minLength={MIN_PASSWORD_LENGTH}
                            className="flex-1 text-sm font-mono text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-400 placeholder:font-sans"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="text-gray-400 hover:text-gray-600 transition shrink-0"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {newPassword && newPassword.length < MIN_PASSWORD_LENGTH && (
                        <p className="mt-1.5 text-xs text-rose-500">
                            At least {MIN_PASSWORD_LENGTH} characters required ({newPassword.length}/{MIN_PASSWORD_LENGTH})
                        </p>
                    )}
                </div>

                {/* Strength indicator */}
                {newPassword.length > 0 && (
                    <div>
                        <div className="flex gap-1">
                            {[...Array(4)].map((_, i) => {
                                const score =
                                    (newPassword.length >= 8 ? 1 : 0) +
                                    (/[A-Z]/.test(newPassword) ? 1 : 0) +
                                    (/[0-9]/.test(newPassword) ? 1 : 0) +
                                    (/[^a-zA-Z0-9]/.test(newPassword) ? 1 : 0);
                                const colors = ['bg-rose-400', 'bg-amber-400', 'bg-amber-400', 'bg-emerald-500'];
                                return (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-gray-200'}`}
                                    />
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Tip: mix uppercase, numbers & symbols for a strong password
                        </p>
                    </div>
                )}
            </AppModal.Body>

            <AppModal.Footer>
                <ModalBtn variant="secondary" onClick={onClose}>Cancel</ModalBtn>
                <ModalBtn
                    variant="amber"
                    onClick={handleSubmit}
                    disabled={submitting || !isValid}
                    className="min-w-[130px]"
                >
                    {submitting ? 'Updating…' : 'Update Password'}
                </ModalBtn>
            </AppModal.Footer>
        </AppModal>
    );
}
