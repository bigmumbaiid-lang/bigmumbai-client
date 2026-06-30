import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const TEAL = '#2dcdb2';

export default function Login() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ username: '', password: '' });
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setApiError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.username.trim() || !formData.password) return;
        setLoading(true);
        setApiError('');
        try {
            await login({ username: formData.username, password: formData.password });
            navigate('/');
        } catch (error) {
            setApiError(error.response?.data?.message || 'Incorrect username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: TEAL }}
        >
            <div
                className="w-full max-w-[480px] bg-white rounded-2xl px-10 py-12"
                style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}
            >
                {/* Title */}
                <h1
                    className="text-3xl font-bold text-center mb-10 tracking-tight"
                    style={{ color: TEAL }}
                >
                    Back-end management system
                </h1>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    {/* Error */}
                    {apiError && (
                        <div className="text-center text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5">
                            {apiError}
                        </div>
                    )}

                    {/* Username */}
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:border-[#2dcdb2] transition">
                        <span className="pl-4 pr-3 py-4 text-gray-300">
                            {/* User icon */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            name="username"
                            autoComplete="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Please enter account"
                            required
                            className="flex-1 py-4 pr-4 text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
                        />
                    </div>

                    {/* Password */}
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:border-[#2dcdb2] transition">
                        <span className="pl-4 pr-3 py-4 text-gray-300">
                            {/* Lock icon */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </span>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Please enter password"
                            required
                            className="flex-1 py-4 text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                            className="pr-4 text-gray-300 hover:text-gray-400 transition"
                        >
                            {showPassword
                                ? <EyeOff size={18} />
                                : <Eye size={18} />
                            }
                        </button>
                    </div>

                    {/* Login button */}
                    <button
                        type="submit"
                        disabled={loading || !formData.username.trim() || !formData.password}
                        className="w-full py-4 rounded-xl text-white font-semibold text-base tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
                        style={{ background: TEAL }}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Logging in...
                            </>
                        ) : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
