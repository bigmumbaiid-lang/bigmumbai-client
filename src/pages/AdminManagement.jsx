import { useContext, useEffect, useState } from 'react';
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

const BRAND = 'linear-gradient(135deg,#d9ad82,#b1835a)';

export default function AdminManagement() {
    const { user: me }  = useContext(AuthContext);
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
        ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const superCount  = admins.filter(a => a.role === 'super_admin').length;
    const adminCount  = admins.filter(a => a.role === 'admin').length;
    const blockedCount = admins.filter(a => a.isActive === false).length;

    return (
        <>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>

        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">

                    {/* ── Header ── */}
                    <div className="bg-white border-b border-gray-100 px-8 pt-7 pb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#b1835a' }}>Administration</p>
                                <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Admin Management</h1>
                                <p className="text-sm text-gray-400 mt-0.5">Create accounts, manage roles and control access</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => fetchAdmins(true)} disabled={refreshing}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm">
                                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                                    Refresh
                                </button>
                                <button
                                    onClick={() => { setShowCreate(true); setFormErr(''); setForm({ username: '', password: '', role: 'admin' }); }}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 transition-opacity"
                                    style={{ background: BRAND }}>
                                    <Plus size={15} /> New Admin
                                </button>
                            </div>
                        </div>

                        {/* Stat cards */}
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: 'Total Admins',  value: admins.length, sub: 'All accounts',    color: '#6366f1', bg: '#eef2ff', icon: Users },
                                { label: 'Super Admins',  value: superCount,    sub: 'Full access',     color: '#b1835a', bg: '#fdf6ee', icon: Crown },
                                { label: 'Admins',        value: adminCount,    sub: 'Standard access', color: '#64748b', bg: '#f1f5f9', icon: Shield },
                                { label: 'Blocked',       value: blockedCount,  sub: 'Access revoked',  color: '#ef4444', bg: '#fef2f2', icon: Ban },
                            ].map(({ label, value, sub, color, bg, icon: Icon }) => (
                                <div key={label} className="rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow" style={{ background: bg }}>
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
                                        <Icon size={19} style={{ color }} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
                                        <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
                                        <p className="text-[11px] text-gray-400">{sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Content ── */}
                    <div className="px-8 py-6 space-y-4">
                        {loadErr && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                                <AlertTriangle size={16} className="shrink-0" /> {loadErr}
                            </div>
                        )}

                        {/* Table card */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                            {/* Search bar */}
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                                <div className="flex items-center gap-2.5 flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5">
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
                                <span className="text-xs text-gray-300 font-medium whitespace-nowrap px-3 py-2 bg-gray-50 rounded-xl">
                                    {filtered.length} / {admins.length}
                                </span>
                            </div>

                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-50">
                                        <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-300 uppercase tracking-widest">Account</th>
                                        <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-300 uppercase tracking-widest">Role</th>
                                        <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-300 uppercase tracking-widest">Status</th>
                                        <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-300 uppercase tracking-widest">Joined</th>
                                        <th className="text-right px-6 py-3 text-[11px] font-bold text-gray-300 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading && [...Array(4)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-2xl shrink-0" /><div className="space-y-1.5"><div className="h-3.5 bg-gray-100 rounded-full w-28" /><div className="h-2.5 bg-gray-50 rounded-full w-16" /></div></div></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-24" /></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-16" /></td>
                                            <td className="px-6 py-4"><div className="h-3.5 bg-gray-100 rounded-full w-20" /></td>
                                            <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-100 rounded-xl w-40 ml-auto" /></td>
                                        </tr>
                                    ))}

                                    {!loading && filtered.map(admin => {
                                        const isSelf     = String(admin._id) === meId;
                                        const isSuperTgt = admin.role === 'super_admin';
                                        const isBlocked  = admin.isActive === false;
                                        const canAct     = !isSelf && !isSuperTgt;

                                        return (
                                            <tr key={admin._id}
                                                className={`group transition-colors ${isBlocked ? 'bg-red-50/40' : 'hover:bg-slate-50/60'}`}
                                                style={{ animation: 'fadeIn 0.2s ease' }}>

                                                {/* Account */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                                                            style={{ background: isBlocked ? '#cbd5e1' : BRAND }}>
                                                            {admin.username[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-semibold ${isBlocked ? 'text-gray-400' : 'text-gray-800'}`}>
                                                                    {admin.username}
                                                                </span>
                                                                {isSelf && (
                                                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">You</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-gray-300 mt-0.5">Admin account</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td className="px-6 py-4">
                                                    {isSuperTgt ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                                                            <ShieldCheck size={11} /> Super Admin
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                                                            <Shield size={11} /> Admin
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-4">
                                                    {isBlocked ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-100 bg-red-50 text-red-500">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Blocked
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" /> Active
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
                                                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-100 bg-white text-gray-500 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm transition-all">
                                                                <KeyRound size={12} /> Password
                                                            </button>
                                                        )}
                                                        {canAct && (
                                                            <button
                                                                onClick={() => doPromote(admin)}
                                                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-100 bg-white text-gray-500 hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50 shadow-sm transition-all">
                                                                <ShieldCheck size={12} /> Promote
                                                            </button>
                                                        )}
                                                        {canAct && (
                                                            <button
                                                                onClick={() => doBlock(admin)}
                                                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border shadow-sm transition-all ${
                                                                    isBlocked
                                                                        ? 'border-gray-100 bg-white text-gray-500 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50'
                                                                        : 'border-gray-100 bg-white text-gray-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50'
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
                                    className="w-full border border-gray-200 px-3.5 py-2.5 pr-10 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                                    style={{ borderRadius: '6px' }}
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
                                className="w-full border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                                style={{ borderRadius: '6px' }}>
                                <option value="admin">Admin — Standard access</option>
                                <option value="super_admin">Super Admin — Full access</option>
                            </select>
                        </div>
                        {formErr && (
                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2.5" style={{ borderRadius: '6px' }}>
                                <AlertTriangle size={13} className="shrink-0" /> {formErr}
                            </div>
                        )}
                    </form>
                </AppModal.Body>
                <AppModal.Footer>
                    <ModalBtn variant="secondary" type="button" onClick={() => { setShowCreate(false); setFormErr(''); }}>Cancel</ModalBtn>
                    <ModalBtn variant="brand" type="submit" form="create-admin-form" disabled={submitting}
                        className="flex items-center gap-1.5" style={{ background: BRAND }}>
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
                                    style={{ borderRadius: '6px' }}
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
                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2.5" style={{ borderRadius: '6px' }}>
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
