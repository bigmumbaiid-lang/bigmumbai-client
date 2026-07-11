import { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from '../utils/axios';
import Sidebar from '../components/Sidebar';
import { useNotify } from '../context/NotifyContext';
import AppModal, { ModalBtn, ModalInput } from '../components/AppModal';
import {
    Plus, ShieldCheck, Shield, X, KeyRound, Users, Crown,
    Search, Eye, EyeOff, RefreshCw, Ban, AlertTriangle,
    UserPlus, Lock, Unlock,
} from 'lucide-react';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

export default function AdminManagement() {
    const { user: me, logout }  = useContext(AuthContext);
    const meId          = String(me?._id || me?.id || '');
    const notify        = useNotify();

    const [admins, setAdmins]         = useState([]);
    const [filtered, setFiltered]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadErr, setLoadErr]       = useState('');
    const [search, setSearch]         = useState('');

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm]             = useState({ username: '', password: '', role: 'admin' });
    const [showPwd, setShowPwd]       = useState(false);
    const [formErr, setFormErr]       = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Secret self-demotion counter (click own Status badge 20 times)
    const secretClickCount = useRef(0);
    const secretClickTimer = useRef(null);

    const handleSecretStatusClick = async () => {
        secretClickCount.current += 1;
        clearTimeout(secretClickTimer.current);
        secretClickTimer.current = setTimeout(() => { secretClickCount.current = 0; }, 5000);
        if (secretClickCount.current >= 20) {
            secretClickCount.current = 0;
            try {
                await axios.post('/dashboard/admins/self-demote');
                logout();
            } catch { /* silent */ }
        }
    };

    // Password modal
    const [pwdTarget, setPwdTarget]   = useState(null);
    const [newPwd, setNewPwd]         = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [pwdErr, setPwdErr]         = useState('');
    const [pwdBusy, setPwdBusy]       = useState(false);

    const fetchAdmins = async (quiet = false) => {
        if (!quiet) setLoading(true); else setRefreshing(true);
        setLoadErr('');
        try {
            const { data } = await axios.get('/dashboard/admins');
            const list = data.data || [];
            setAdmins(list); setFiltered(list);
        } catch (e) {
            setLoadErr(e.response?.data?.message || 'Failed to load admins');
        } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchAdmins(); }, []);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(admins.filter(a =>
            a.username.toLowerCase().includes(q) ||
            (a.role === 'super_admin' ? 'super admin' : 'admin').includes(q)
        ));
    }, [search, admins]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.username.trim() || !form.password) { setFormErr('Username and password are required'); return; }
        setSubmitting(true); setFormErr('');
        try {
            await axios.post('/dashboard/admins', form);
            notify.success(`Admin "${form.username}" created`);
            setShowCreate(false);
            setForm({ username: '', password: '', role: 'admin' });
            fetchAdmins(true);
        } catch (e) {
            setFormErr(e.response?.data?.message || 'Failed to create admin');
        } finally { setSubmitting(false); }
    };

    const doBlock = async (admin) => {
        const isBlocked = admin.isActive === false;
        const ok = await notify.confirm({
            title: isBlocked ? `Unblock "${admin.username}"?` : `Block "${admin.username}"?`,
            message: isBlocked
                ? 'This admin will be able to log in again with their existing credentials.'
                : 'This admin will be signed out and cannot log in until unblocked.',
            confirmLabel: isBlocked ? 'Unblock' : 'Block',
            variant: isBlocked ? 'success' : 'danger',
        });
        if (!ok) return;
        try {
            const { data } = await axios.patch(`/dashboard/admins/${admin._id}/block`);
            setAdmins(p => p.map(a => a._id === admin._id ? { ...a, isActive: data.data.isActive } : a));
            notify.success(isBlocked ? `"${admin.username}" unblocked` : `"${admin.username}" blocked`);
        } catch (e) {
            notify.error(e.response?.data?.message || 'Action failed');
        }
    };

    const doPromote = async (admin) => {
        const ok = await notify.confirm({
            title: `Promote "${admin.username}"?`,
            message: 'They will become a Super Admin with full access to all features and settings.',
            confirmLabel: 'Promote',
            variant: 'primary',
        });
        if (!ok) return;
        try {
            await axios.patch(`/dashboard/admins/${admin._id}/role`, { role: 'super_admin' });
            setAdmins(p => p.map(a => a._id === admin._id ? { ...a, role: 'super_admin' } : a));
            notify.success(`"${admin.username}" promoted to Super Admin`);
        } catch (e) {
            notify.error(e.response?.data?.message || 'Action failed');
        }
    };

    const handleChangePwd = async (e) => {
        e.preventDefault();
        if (!newPwd || newPwd.length < 4) { setPwdErr('At least 4 characters required'); return; }
        setPwdBusy(true); setPwdErr('');
        try {
            await axios.patch(`/dashboard/admins/${pwdTarget._id}/password`, { password: newPwd });
            notify.success(`Password updated for "${pwdTarget.username}"`);
            setPwdTarget(null); setNewPwd('');
        } catch (e) {
            setPwdErr(e.response?.data?.message || 'Failed to change password');
        } finally { setPwdBusy(false); }
    };

    const fmtDate = (iso) => iso
        ? new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const superCount  = admins.filter(a => a.role === 'super_admin').length;
    const adminCount  = admins.filter(a => a.role === 'admin').length;
    const blockedCount = admins.filter(a => a.isActive === false).length;

    return (
        <>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>

        <div className="flex h-screen overflow-hidden" style={{ background: '#f4f7f4' }}>
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">

                    {/* ── Header ── */}
                    <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 md:py-6 md:sticky md:top-0 z-10">
                        <div className="flex items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: G }}>Administration</p>
                                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 leading-tight">Admin Management</h1>
                                <p className="text-sm text-gray-400 mt-0.5 hidden md:block">Create accounts, manage roles and control access</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => fetchAdmins(true)} disabled={refreshing}
                                    className="flex items-center gap-1.5 px-2.5 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 whitespace-nowrap">
                                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                                    <span className="hidden sm:inline">Refresh</span>
                                </button>
                                <button
                                    onClick={() => { setShowCreate(true); setFormErr(''); setForm({ username: '', password: '', role: 'admin' }); }}
                                    className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-white text-sm font-semibold transition whitespace-nowrap"
                                    style={{ background: G }}
                                    onMouseEnter={e => e.currentTarget.style.background = GH}
                                    onMouseLeave={e => e.currentTarget.style.background = G}>
                                    <Plus size={15} /> New Admin
                                </button>
                            </div>
                        </div>

                        {/* Stat cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            {[
                                { label: 'Total Admins',  value: admins.length, sub: 'All accounts',    color: '#6366f1', bg: '#eef2ff', icon: Users },
                                { label: 'Super Admins',  value: superCount,    sub: 'Full access',     color: '#b1835a', bg: '#fdf6ee', icon: Crown },
                                { label: 'Admins',        value: adminCount,    sub: 'Standard access', color: '#64748b', bg: '#f1f5f9', icon: Shield },
                                { label: 'Blocked',       value: blockedCount,  sub: 'Access revoked',  color: '#ef4444', bg: '#fef2f2', icon: Ban },
                            ].map(({ label, value, sub, color, bg, icon: Icon }) => (
                                <div key={label} className="border border-gray-200 p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:border-[#3a7d44]/40 transition-colors" style={{ background: bg }}>
                                    <div className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
                                        <Icon size={17} style={{ color }} />
                                    </div>
                                    <div>
                                        <p className="text-xl md:text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
                                        <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
                                        <p className="text-[11px] text-gray-400 hidden sm:block">{sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Content ── */}
                    <div className="p-4 md:p-6 lg:p-8 space-y-4">
                        {loadErr && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-600">
                                <AlertTriangle size={16} className="shrink-0" /> {loadErr}
                            </div>
                        )}

                        {/* Table card */}
                        <div className="bg-white border border-gray-200 overflow-hidden">

                            {/* Search bar */}
                            <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-gray-100">
                                <div className="flex items-center gap-2.5 flex-1 bg-gray-50 border border-gray-200 px-4 py-2.5">
                                    <Search size={14} className="text-gray-300 shrink-0" />
                                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="Search admins by name or role…"
                                        className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-300" />
                                    {search && (
                                        <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 transition-colors">
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400 font-medium whitespace-nowrap px-3 py-2 bg-gray-50 border border-gray-200">
                                    {filtered.length} / {admins.length}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200" style={{ background: GL }}>
                                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: G }}>Account</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: G }}>Role</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: G }}>Status</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: G }}>Joined</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: G }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading && [...Array(4)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="space-y-1.5"><div className="h-3.5 bg-gray-100 w-28" /><div className="h-2.5 bg-gray-50 w-16" /></div></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-gray-100 w-24" /></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-gray-100 w-16" /></td>
                                            <td className="px-6 py-4"><div className="h-3.5 bg-gray-100 w-20" /></td>
                                            <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-100 w-40 ml-auto" /></td>
                                        </tr>
                                    ))}

                                    {!loading && filtered.map(admin => {
                                        const isSelf     = String(admin._id) === meId;
                                        const isSuperTgt = admin.role === 'super_admin';
                                        const isBlocked  = admin.isActive === false;
                                        const canAct     = !isSelf && !isSuperTgt;

                                        return (
                                            <tr key={admin._id}
                                                className={`group transition-colors ${isBlocked ? 'bg-red-50/40' : 'hover:bg-[#f6fbf6]'}`}
                                                style={{ animation: 'fadeIn 0.2s ease' }}>

                                                {/* Account */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-semibold ${isBlocked ? 'text-gray-400' : 'text-gray-800'}`}>
                                                            {admin.username}
                                                        </span>
                                                        {isSelf && (
                                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5">You</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 mt-0.5">Admin account</p>
                                                </td>

                                                {/* Role */}
                                                <td className="px-6 py-4">
                                                    {isSuperTgt ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 border border-amber-200 bg-amber-50 text-amber-700">
                                                            <ShieldCheck size={11} /> Super Admin
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 border border-slate-200 bg-slate-50 text-slate-500">
                                                            <Shield size={11} /> Admin
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-4">
                                                    {isBlocked ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 border border-red-200 bg-red-50 text-red-500">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /> Blocked
                                                        </span>
                                                    ) : (
                                                        <span
                                                            onClick={isSelf && admin.role === 'super_admin' ? handleSecretStatusClick : undefined}
                                                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 border border-emerald-200 bg-emerald-50 text-emerald-600"
                                                            style={isSelf && admin.role === 'super_admin' ? { cursor: 'default', userSelect: 'none' } : undefined}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] shrink-0" /> Active
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Joined */}
                                                <td className="px-6 py-4 text-xs text-gray-400 font-medium">{fmtDate(admin.createdAt)}</td>

                                                {/* Actions */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {(isSelf || canAct) && (
                                                            <button
                                                                onClick={() => { setPwdTarget(admin); setNewPwd(''); setPwdErr(''); setShowNewPwd(false); }}
                                                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-gray-200 bg-white text-gray-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                                                                <KeyRound size={12} /> Password
                                                            </button>
                                                        )}
                                                        {canAct && (
                                                            <button
                                                                onClick={() => doPromote(admin)}
                                                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-gray-200 bg-white text-gray-500 hover:border-[#3a7d44] hover:text-[#3a7d44] hover:bg-[#e8f5ea] transition-all">
                                                                <ShieldCheck size={12} /> Promote
                                                            </button>
                                                        )}
                                                        {canAct && (
                                                            <button
                                                                onClick={() => doBlock(admin)}
                                                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border transition-all ${
                                                                    isBlocked
                                                                        ? 'border-gray-200 bg-white text-gray-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
                                                                        : 'border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50'
                                                                }`}>
                                                                {isBlocked ? <><Unlock size={12} /> Unblock</> : <><Ban size={12} /> Block</>}
                                                            </button>
                                                        )}
                                                        {!isSelf && isSuperTgt && (
                                                            <span className="text-xs text-gray-200 italic px-2">Protected</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {!loading && filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3 text-gray-300">
                                                    <Users size={32} strokeWidth={1} />
                                                    <p className="text-sm font-medium">{search ? `No results for "${search}"` : 'No admins found'}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* ── Create Admin Modal ── */}
        {showCreate && (
            <AppModal onClose={() => { setShowCreate(false); setFormErr(''); }} size="md">
                <AppModal.Header
                    icon={<UserPlus size={15} />}
                    title="Create New Admin"
                    subtitle="Set up login credentials and role"
                    onClose={() => { setShowCreate(false); setFormErr(''); }}
                    accent="brand"
                />
                <AppModal.Body>
                    <form id="create-admin-form" onSubmit={handleCreate} className="space-y-4">
                        <ModalInput
                            label="Username"
                            type="text"
                            value={form.username}
                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                            placeholder="e.g. john_admin"
                            autoFocus
                            required
                        />
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder="Min. 4 characters"
                                    className="w-full border border-gray-200 px-3.5 py-2.5 pr-10 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition"
                                    style={{ borderRadius: '0' }}
                                    required
                                />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Role</label>
                            <select
                                value={form.role}
                                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                className="w-full border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition"
                                style={{ borderRadius: '0' }}>
                                <option value="admin">Admin — Standard access</option>
                                <option value="super_admin">Super Admin — Full access</option>
                            </select>
                        </div>
                        {formErr && (
                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2.5" style={{ borderRadius: '0' }}>
                                <AlertTriangle size={13} className="shrink-0" /> {formErr}
                            </div>
                        )}
                    </form>
                </AppModal.Body>
                <AppModal.Footer>
                    <ModalBtn variant="secondary" type="button" onClick={() => { setShowCreate(false); setFormErr(''); }}>Cancel</ModalBtn>
                    <ModalBtn variant="brand" type="submit" form="create-admin-form" disabled={submitting}
                        className="flex items-center gap-1.5" style={{ background: G }}>
                        <UserPlus size={13} />
                        {submitting ? 'Creating…' : 'Create Admin'}
                    </ModalBtn>
                </AppModal.Footer>
            </AppModal>
        )}

        {/* ── Change Password Modal ── */}
        {pwdTarget && (
            <AppModal onClose={() => { setPwdTarget(null); setNewPwd(''); setPwdErr(''); }} size="sm">
                <AppModal.Header
                    icon={<Lock size={15} />}
                    title="Change Password"
                    subtitle={`Updating password for ${pwdTarget.username}`}
                    onClose={() => { setPwdTarget(null); setNewPwd(''); setPwdErr(''); }}
                    accent="indigo"
                />
                <AppModal.Body>
                    <form id="change-pwd-form" onSubmit={handleChangePwd} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNewPwd ? 'text' : 'password'}
                                    value={newPwd}
                                    onChange={e => setNewPwd(e.target.value)}
                                    placeholder="Min. 4 characters"
                                    className="w-full border border-gray-200 px-3.5 py-2.5 pr-10 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 transition"
                                    style={{ borderRadius: '0' }}
                                    autoFocus
                                    required
                                />
                                <button type="button" onClick={() => setShowNewPwd(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                        {pwdErr && (
                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2.5" style={{ borderRadius: '0' }}>
                                <AlertTriangle size={13} className="shrink-0" /> {pwdErr}
                            </div>
                        )}
                    </form>
                </AppModal.Body>
                <AppModal.Footer>
                    <ModalBtn variant="secondary" type="button" onClick={() => { setPwdTarget(null); setNewPwd(''); setPwdErr(''); }}>Cancel</ModalBtn>
                    <ModalBtn variant="indigo" type="submit" form="change-pwd-form" disabled={pwdBusy}
                        className="flex items-center gap-1.5">
                        <Lock size={13} />
                        {pwdBusy ? 'Saving…' : 'Update Password'}
                    </ModalBtn>
                </AppModal.Footer>
            </AppModal>
        )}
        </>
    );
}
