import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import { useNotify } from '../context/NotifyContext';
import AppModal, { ModalBtn, ModalInput } from '../components/AppModal';
import {
  Plus, Copy, Trash2, Gift, Pencil, Search, RefreshCw,
  CheckCircle2, Users, IndianRupee, Power, Eye, Lock,
} from 'lucide-react';
import Select from '../components/Select';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL;

const inputCls =
  'border border-gray-300 bg-white text-sm text-gray-800 px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400 w-full';

function AdminGifts() {
  const notify = useNotify();
  const [gifts, setGifts]   = useState([]);
  const [loading, setLoading] = useState(false);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData]     = useState({ giftName: '', amount: '', limit: 1 });
  const [creating, setCreating]     = useState(false);

  // search / filter / sort
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy]           = useState('newest');

  // edit modal
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState({ giftName: '', amount: '', limit: 1, isActive: true });
  const [savingEdit, setSavingEdit] = useState(false);

  // claims modal
  const [claimsTarget, setClaimsTarget]   = useState(null);
  const [claims, setClaims]               = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  const fetchGifts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/gifts/all');
      if (data.success) setGifts(data.data);
    } catch { notify.error('Could not load gifts. Try refreshing.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGifts(); }, []);

  // ── CREATE ──────────────────────────────────────────────
  const openCreate = () => {
    setFormData({ giftName: '', amount: '', limit: 1 });
    setShowCreate(true);
  };

  const handleCreateGift = async (e) => {
    e.preventDefault();
    if (!formData.giftName.trim() || !formData.amount) {
      notify.error('Gift name and amount are required.'); return;
    }
    if (Number(formData.amount) <= 0) {
      notify.error('Amount must be greater than zero.'); return;
    }
    const limitVal = parseInt(formData.limit);
    if (!limitVal || limitVal < 1) {
      notify.error('Usage limit must be at least 1.'); return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/gifts/create', { ...formData, limit: limitVal });
      if (data.success) {
        const link = data.shareableLink;
        try { await navigator.clipboard?.writeText(link); notify.success('Gift created — link copied.'); }
        catch { notify.success('Gift created successfully.'); }
        setShowCreate(false);
        fetchGifts();
      }
    } catch (err) { notify.error(err.response?.data?.message || 'Failed to create gift.'); }
    finally { setCreating(false); }
  };

  // ── COPY ────────────────────────────────────────────────
  const copyLink = async (link) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement('textarea');
        ta.value = link; ta.style.cssText = 'position:fixed;left:-999999px';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      notify.success('Gift link copied.');
    } catch { notify.error('Failed to copy link.'); }
  };

  // ── EDIT ────────────────────────────────────────────────
  const openEdit = (gift) => {
    setEditTarget(gift);
    setEditForm({ giftName: gift.giftName, amount: gift.amount, limit: gift.limit, isActive: gift.isActive });
  };

  const saveEdit = async () => {
    if (!editForm.giftName.trim() || !editForm.amount) {
      notify.error('Gift name and amount are required.'); return;
    }
    if (Number(editForm.limit) < editTarget.usedCount) {
      notify.error(`Limit can't be below current usage (${editTarget.usedCount}).`); return;
    }
    setSavingEdit(true);
    try {
      const payload = { giftName: editForm.giftName.trim(), limit: Number(editForm.limit), isActive: editForm.isActive };
      if (editTarget.usedCount === 0) payload.amount = Number(editForm.amount);
      const { data } = await api.put(`/gifts/${editTarget._id}`, payload);
      if (data.success) { notify.success('Gift updated.'); setEditTarget(null); fetchGifts(); }
    } catch (err) { notify.error(err.response?.data?.message || 'Failed to update gift.'); }
    finally { setSavingEdit(false); }
  };

  // ── TOGGLE ACTIVE ────────────────────────────────────────
  const toggleActive = async (gift) => {
    if (!gift.isActive && gift.usedCount >= gift.limit) {
      notify.error(`Gift limit reached (${gift.usedCount}/${gift.limit}). Increase the usage limit to activate again.`);
      return;
    }
    const action = gift.isActive ? 'Deactivate' : 'Activate';
    const ok = await notify.confirm({
      title: `${action} Gift?`,
      message: gift.isActive
        ? `"${gift.giftName}" will be deactivated and users won't be able to claim it.`
        : `"${gift.giftName}" will be activated and available for users to claim.`,
      confirmLabel: action,
      variant: gift.isActive ? 'danger' : 'success',
    });
    if (!ok) return;
    try {
      const { data } = await api.put(`/gifts/${gift._id}`, { isActive: !gift.isActive });
      if (data.success) { notify.success(gift.isActive ? 'Gift deactivated.' : 'Gift activated.'); fetchGifts(); }
    } catch (err) { notify.error(err.response?.data?.message || 'Failed to update status.'); }
  };

  // ── DELETE ───────────────────────────────────────────────
  const handleDelete = async (gift) => {
    const ok = await notify.confirm({
      title: 'Delete Gift?',
      message: gift.usedCount > 0
        ? `"${gift.giftName}" has been claimed by ${gift.usedCount} user(s). This can't be undone.`
        : `"${gift.giftName}" will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete', variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/gifts/${gift._id}`);
      notify.success('Gift deleted.'); fetchGifts();
    } catch (err) { notify.error(err.response?.data?.message || 'Failed to delete gift.'); }
  };

  // ── CLAIMS ───────────────────────────────────────────────
  const openClaims = async (gift) => {
    setClaimsTarget(gift); setClaims([]);
    const code = gift.giftLink?.split('/').pop();
    if (!code) return;
    setClaimsLoading(true);
    try {
      const { data } = await api.get(`/gifts/admin/claims/${code}`);
      if (data.success) setClaims(data.recentClaims || []);
    } catch { notify.error('Could not load claims.'); }
    finally { setClaimsLoading(false); }
  };

  // ── STATS ────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:       gifts.length,
    active:      gifts.filter(g => g.isActive).length,
    totalClaims: gifts.reduce((s, g) => s + (g.usedCount || 0), 0),
    distributed: gifts.reduce((s, g) => s + (g.usedCount || 0) * (g.amount || 0), 0),
  }), [gifts]);

  // ── FILTERED LIST ────────────────────────────────────────
  const visibleGifts = useMemo(() => {
    let list = [...gifts];
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(g => g.giftName?.toLowerCase().includes(q)); }
    if (statusFilter === 'active')  list = list.filter(g => g.isActive);
    if (statusFilter === 'expired') list = list.filter(g => !g.isActive);
    if (sortBy === 'amount') list.sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'usage') list.sort((a, b) => (b.usedCount / b.limit || 0) - (a.usedCount / a.limit || 0));
    return list;
  }, [gifts, search, statusFilter, sortBy]);

  return (
    <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between md:sticky md:top-0 z-10">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Gift Management</h1>
            <p className="hidden md:block text-xs text-gray-400 mt-0.5">Create, edit and track promotional gift links</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchGifts} disabled={loading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition whitespace-nowrap">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-semibold text-white transition whitespace-nowrap"
              style={{ background: G }}
              onMouseEnter={e => e.currentTarget.style.background = GH}
              onMouseLeave={e => e.currentTarget.style.background = G}>
              <Plus size={15} /> Create Gift
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-5">

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Total Gifts',   value: stats.total,                                            icon: Gift,        iconColor: '#2563eb', iconBg: '#eff6ff', valueColor: '#111827' },
              { label: 'Active',        value: stats.active,                                           icon: Power,       iconColor: G,         iconBg: GL,        valueColor: G         },
              { label: 'Total Claims',  value: stats.totalClaims,                                      icon: Users,       iconColor: '#d97706', iconBg: '#fef9c3', valueColor: '#111827' },
              { label: 'Distributed',   value: `₹${stats.distributed.toLocaleString('en-US')}`,        icon: IndianRupee, iconColor: '#be123c', iconBg: '#fff1f2', valueColor: '#be123c' },
            ].map(({ label, value, icon: Icon, iconColor, iconBg, valueColor }) => (
              <div key={label} className="bg-white border border-gray-200 p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
                  <p className="text-2xl font-bold leading-none tracking-tight" style={{ color: valueColor }}>{value}</p>
                </div>
                <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                  <Icon size={19} style={{ color: iconColor }} strokeWidth={2.2} />
                </div>
              </div>
            ))}
          </div>

          {/* Filter toolbar */}
          <div className="bg-white border border-gray-200">
            {/* Search row */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by gift name…"
                  className={inputCls + ' pl-9'} />
              </div>
            </div>
            {/* Status buttons — scrollable on mobile */}
            <div className="px-4 pt-3 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-gray-100">
              {['all', 'active', 'expired'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-3 py-1.5 text-sm font-medium border transition capitalize shrink-0 whitespace-nowrap"
                  style={statusFilter === s
                    ? { background: G, color: '#fff', borderColor: G }
                    : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}>
                  {s}
                </button>
              ))}
            </div>
            {/* Sort select — NOT inside overflow-x-auto */}
            <div className="px-4 py-3">
              <Select
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'newest', label: 'Newest'         },
                  { value: 'amount', label: 'Highest Amount' },
                  { value: 'usage',  label: 'Most Used'      },
                ]}
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: GL }}>
                    {['Gift Name', 'Amount', 'Usage', 'Status', 'Link', 'Actions'].map(h => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${h === 'Actions' ? 'text-center' : 'text-left'}`} style={{ color: G }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="h-4 bg-gray-100 animate-pulse" /></td></tr>
                    ))
                  ) : visibleGifts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <Gift size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No gifts to show</p>
                        <p className="text-xs text-gray-400 mt-1">Click "Create Gift" to get started.</p>
                      </td>
                    </tr>
                  ) : visibleGifts.map(gift => {
                    const pct = gift.limit ? Math.min(100, Math.round((gift.usedCount / gift.limit) * 100)) : 0;
                    return (
                      <tr key={gift._id} className="hover:bg-[#f9fbf9]">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{gift.giftName}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900 tabular-nums">₹{gift.amount.toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 min-w-[130px]">
                            <div className="flex-1 h-2 bg-gray-100 overflow-hidden">
                              <div className="h-full transition-all"
                                style={{ width: `${pct}%`, background: pct >= 100 ? '#e11d48' : G }} />
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">{gift.usedCount}/{gift.limit}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => toggleActive(gift)}
                            className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold transition"
                            style={gift.isActive
                              ? { background: GL, color: G }
                              : { background: '#f3f4f6', color: '#6b7280' }}>
                            {gift.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => copyLink(`${FRONTEND_URL}${gift.giftLink}`)}
                            className="flex items-center gap-1.5 text-sm font-medium transition"
                            style={{ color: G }}
                            onMouseEnter={e => e.currentTarget.style.color = GH}
                            onMouseLeave={e => e.currentTarget.style.color = G}>
                            <Copy size={13} /> Copy
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openClaims(gift)} title="View claims"
                              className="p-1.5 text-gray-500 hover:bg-gray-100 transition"><Eye size={15} /></button>
                            <button onClick={() => openEdit(gift)} title="Edit"
                              className="p-1.5 text-blue-500 hover:bg-blue-50 transition"><Pencil size={15} /></button>
                            <button onClick={() => handleDelete(gift)} title="Delete"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 transition"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ── CREATE MODAL ─────────────────────────────────── */}
      {showCreate && (
        <AppModal onClose={() => setShowCreate(false)} size="md">
          <AppModal.Header
            icon={<Gift size={15} />}
            title="Create New Gift"
            subtitle="New promotional gift link"
            onClose={() => setShowCreate(false)}
            accent="emerald"
          />
          <AppModal.Body>
            <form id="create-gift-form" onSubmit={handleCreateGift} className="space-y-4">
              <ModalInput label="Gift Name *" type="text" required
                placeholder="e.g. Welcome Bonus"
                value={formData.giftName}
                onChange={e => setFormData({ ...formData, giftName: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                    <input type="number" required min="1" placeholder="1500"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className={inputCls + ' pl-7'} />
                  </div>
                </div>
                <ModalInput label="Usage Limit *" type="number" required min="1"
                  value={formData.limit}
                  onChange={e => setFormData({ ...formData, limit: e.target.value === '' ? '' : parseInt(e.target.value) })} />
              </div>
            </form>
          </AppModal.Body>
          <AppModal.Footer>
            <ModalBtn variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</ModalBtn>
            <ModalBtn variant="emerald" type="submit" form="create-gift-form" disabled={creating}
              className="flex items-center gap-1.5">
              {creating && <RefreshCw size={13} className="animate-spin" />}
              {creating ? 'Creating…' : 'Create Gift'}
            </ModalBtn>
          </AppModal.Footer>
        </AppModal>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────── */}
      {editTarget && (
        <AppModal onClose={() => setEditTarget(null)} size="md">
          <AppModal.Header
            icon={<Pencil size={15} />}
            title="Edit Gift"
            subtitle={editTarget.giftName}
            onClose={() => setEditTarget(null)}
            accent="emerald"
          />
          <AppModal.Body>
            <form id="edit-gift-form" onSubmit={e => { e.preventDefault(); saveEdit(); }} className="space-y-4">
              <ModalInput label="Gift Name *" type="text" required
                value={editForm.giftName}
                onChange={e => setEditForm({ ...editForm, giftName: e.target.value })} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Amount {editTarget.usedCount > 0 && <Lock size={11} className="text-amber-500" />}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input type="number" min="1"
                      value={editForm.amount}
                      onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                      disabled={editTarget.usedCount > 0}
                      className={inputCls + ' pl-7 ' + (editTarget.usedCount > 0 ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : '')} />
                  </div>
                  {editTarget.usedCount > 0 && <p className="mt-1 text-xs text-amber-600">Locked after first claim</p>}
                </div>
                <div>
                  <ModalInput label="Usage Limit" type="number" min={editTarget.usedCount}
                    value={editForm.limit}
                    onChange={e => setEditForm({ ...editForm, limit: e.target.value === '' ? '' : parseInt(e.target.value) })} />
                  <p className="mt-1 text-xs text-gray-400">Min: {editTarget.usedCount}</p>
                </div>
              </div>

              {/* Usage bar */}
              <div className="border border-gray-100 px-4 py-3" style={{ background: '#f9fafb' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Claimed</span>
                  <span className="text-xs font-semibold text-gray-800 tabular-nums">
                    {editTarget.usedCount} / {editForm.limit || editTarget.limit}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 overflow-hidden">
                  <div className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((editTarget.usedCount / (editForm.limit || editTarget.limit || 1)) * 100))}%`,
                      background: editTarget.usedCount >= (editForm.limit || editTarget.limit) ? '#e11d48' : G,
                    }} />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Gift is active</p>
                  <p className="text-xs text-gray-400">Users can claim while active</p>
                </div>
                <button type="button" onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                  className="relative w-10 h-5 transition-colors"
                  style={{ background: editForm.isActive ? G : '#d1d5db', borderRadius: '9999px' }}>
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white shadow transition-transform"
                    style={{ borderRadius: '9999px', transform: editForm.isActive ? 'translateX(20px)' : 'translateX(0)' }} />
                </button>
              </div>
            </form>
          </AppModal.Body>
          <AppModal.Footer>
            <ModalBtn variant="secondary" type="button" onClick={() => setEditTarget(null)}>Cancel</ModalBtn>
            <ModalBtn variant="emerald" type="submit" form="edit-gift-form" disabled={savingEdit}
              className="flex items-center gap-1.5">
              {savingEdit && <RefreshCw size={13} className="animate-spin" />}
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </ModalBtn>
          </AppModal.Footer>
        </AppModal>
      )}

      {/* ── CLAIMS MODAL ─────────────────────────────────── */}
      {claimsTarget && (
        <AppModal onClose={() => setClaimsTarget(null)} size="md">
          <AppModal.Header
            icon={<Users size={15} />}
            title={`Claims · ${claimsTarget.giftName}`}
            subtitle={`${claimsTarget.usedCount} of ${claimsTarget.limit} claimed`}
            onClose={() => setClaimsTarget(null)}
            accent="emerald"
          />
          <AppModal.Body>
            {claimsLoading ? (
              <p className="text-center text-gray-400 py-8 text-sm">Loading claims…</p>
            ) : claims.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No one has claimed this gift yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {claims.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: G }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c.claimedAt ? new Date(c.claimedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                      </p>
                    </div>
                    <CheckCircle2 size={16} style={{ color: G }} className="shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </AppModal.Body>
          <AppModal.Footer>
            <ModalBtn variant="secondary" onClick={() => setClaimsTarget(null)}>Close</ModalBtn>
          </AppModal.Footer>
        </AppModal>
      )}
    </div>
  );
}

export default AdminGifts;
