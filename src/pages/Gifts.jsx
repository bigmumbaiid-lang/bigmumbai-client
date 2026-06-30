import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/axios';
import { useNotify } from '../context/NotifyContext';
import AppModal, { ModalBtn, ModalInput } from '../components/AppModal';
import {
  Plus, Copy, Trash2, Gift, Pencil, Search, RefreshCw,
  CheckCircle2, AlertTriangle, Users, IndianRupee,
  Power, Eye, Filter, Lock
} from 'lucide-react';

const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL ;
const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';

function AdminGifts() {
  const notify = useNotify();
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ giftName: '', amount: '', limit: 1 });
  const [creating, setCreating] = useState(false);

  // search / filter / sort
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | expired
  const [sortBy, setSortBy] = useState('newest'); // newest | amount | usage

  // modal state
  const [editTarget, setEditTarget] = useState(null);      // gift object being edited
  const [editForm, setEditForm] = useState({ giftName: '', amount: '', limit: 1, isActive: true });
  const [savingEdit, setSavingEdit] = useState(false);


  const [claimsTarget, setClaimsTarget] = useState(null);  // gift whose claims we view
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  const fetchGifts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/gifts/all');
      if (data.success) setGifts(data.data);
    } catch (err) {
      console.error(err);
      notify.error('Could not load gifts. Try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifts();
  }, []);

  // ---------- CREATE ----------
  const handleCreateGift = async (e) => {
    e.preventDefault();
    if (!formData.giftName.trim() || !formData.amount) {
      notify.error('Gift name and amount are required.');
      return;
    }
    if (Number(formData.amount) <= 0) {
      notify.error('Amount must be greater than zero.');
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/gifts/create', formData);
      if (data.success) {
        const link = data.shareableLink;
        try {
          await navigator.clipboard?.writeText(link);
          notify.success('Gift created — link copied to clipboard.');
        } catch {
          notify.success('Gift created successfully.');
        }
        setFormData({ giftName: '', amount: '', limit: 1 });
        fetchGifts();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to create gift.');
    } finally {
      setCreating(false);
    }
  };

  // ---------- COPY ----------
  const copyLink = async (link) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement('textarea');
        ta.value = link;
        ta.style.position = 'fixed';
        ta.style.left = '-999999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      notify.success('Gift link copied.');
    } catch (err) {
      console.error(err);
      notify.error('Failed to copy link.');
    }
  };

  // ---------- EDIT ----------
  const openEdit = (gift) => {
    setEditTarget(gift);
    setEditForm({
      giftName: gift.giftName,
      amount: gift.amount,
      limit: gift.limit,
      isActive: gift.isActive,
    });
  };

  const saveEdit = async () => {
    if (!editForm.giftName.trim() || !editForm.amount) {
      notify.error('Gift name and amount are required.');
      return;
    }
    if (Number(editForm.limit) < editTarget.usedCount) {
      notify.error(`Limit can't be below current usage (${editTarget.usedCount}).`);
      return;
    }
    setSavingEdit(true);
    try {
      const payload = {
        giftName: editForm.giftName.trim(),
        limit: Number(editForm.limit),
        isActive: editForm.isActive,
      };

      if (editTarget.usedCount === 0) {
        payload.amount = Number(editForm.amount);
      }

      const { data } = await api.put(`/gifts/${editTarget._id}`, payload);
      if (data.success) {
        notify.success('Gift updated.');
        setEditTarget(null);
        fetchGifts();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to update gift.');
    } finally {
      setSavingEdit(false);
    }
  };
  // ---------- TOGGLE ACTIVE (quick action) ----------
  const toggleActive = async (gift) => {
    // Block reactivation when usage limit is fully reached
    if (!gift.isActive && gift.usedCount >= gift.limit) {
      notify.error(`Gift limit reached (${gift.usedCount}/${gift.limit}). Increase the usage limit to activate again.`);
      return;
    }

    try {
      const { data } = await api.put(`/gifts/${gift._id}`, { isActive: !gift.isActive });
      if (data.success) {
        notify.success(gift.isActive ? 'Gift deactivated.' : 'Gift activated.');
        fetchGifts();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  // ---------- DELETE ----------
  const handleDelete = async (gift) => {
    const ok = await notify.confirm({
      title: 'Delete Gift?',
      message: gift.usedCount > 0
        ? `"${gift.giftName}" has been claimed by ${gift.usedCount} user(s). The server may block deletion. This can't be undone.`
        : `"${gift.giftName}" will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/gifts/${gift._id}`);
      notify.success('Gift deleted.');
      fetchGifts();
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to delete gift.');
    }
  };

  // ---------- VIEW CLAIMS ----------
  const openClaims = async (gift) => {
    setClaimsTarget(gift);
    setClaims([]);
    const code = gift.giftLink?.split('/').pop();
    if (!code) return;
    setClaimsLoading(true);
    try {
      const { data } = await api.get(`/gifts/admin/claims/${code}`);
      if (data.success) setClaims(data.recentClaims || []);
    } catch (err) {
      console.error(err);
      notify.error('Could not load claims.');
    } finally {
      setClaimsLoading(false);
    }
  };

  // ---------- DERIVED: stats ----------
  const stats = useMemo(() => {
    const total = gifts.length;
    const active = gifts.filter((g) => g.isActive).length;
    const totalClaims = gifts.reduce((s, g) => s + (g.usedCount || 0), 0);
    const distributed = gifts.reduce((s, g) => s + (g.usedCount || 0) * (g.amount || 0), 0);
    return { total, active, totalClaims, distributed };
  }, [gifts]);

  // ---------- DERIVED: filtered + sorted list ----------
  const visibleGifts = useMemo(() => {
    let list = [...gifts];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.giftName?.toLowerCase().includes(q));
    }
    if (statusFilter === 'active') list = list.filter((g) => g.isActive);
    if (statusFilter === 'expired') list = list.filter((g) => !g.isActive);

    if (sortBy === 'amount') list.sort((a, b) => b.amount - a.amount);
    else if (sortBy === 'usage')
      list.sort((a, b) => (b.usedCount / b.limit || 0) - (a.usedCount / a.limit || 0));
    // 'newest' relies on API order (createdAt desc)
    return list;
  }, [gifts, search, statusFilter, sortBy]);

  const StatCard = ({ label, value, sub, accent = 'text-gray-900', icon: Icon, iconColor, iconBg }) => (
    <div className="group bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-5 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-gray-500 font-medium">{label}</p>
          <p className={`text-[26px] leading-tight font-bold mt-2 tracking-tight ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105" style={{ background: iconBg }}>
          <Icon size={21} style={{ color: iconColor }} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f6f7fb]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 pl-14 pr-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Gift Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">Create, edit and track promotional gift links</p>
          </div>
          <button
            onClick={fetchGifts}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </header>

        <div className="p-6 lg:p-8">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <StatCard label="Total Gifts" value={stats.total} icon={Gift} iconColor="#b1835a" iconBg="#fef3ec" />
            <StatCard label="Active" value={stats.active} accent="text-emerald-600" icon={Power} iconColor="#059669" iconBg="#ecfdf5" />
            <StatCard label="Total Claims" value={stats.totalClaims} icon={Users} iconColor="#d97706" iconBg="#fffbeb" />
            <StatCard label="Distributed" value={`₹${stats.distributed.toLocaleString('en-US')}`} accent="text-rose-600" icon={IndianRupee} iconColor="#e11d48" iconBg="#fff1f2" />
          </div>

          {/* Create Form */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#fef3ec] text-[#b1835a] flex items-center justify-center">
                <Plus size={15} />
              </span>
              Create New Gift
            </h2>
            <form onSubmit={handleCreateGift} className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gift Name</label>
                <input
                  type="text"
                  value={formData.giftName}
                  onChange={(e) => setFormData({ ...formData, giftName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                  placeholder="Welcome Bonus"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                  placeholder="1500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Usage Limit</label>
                <input
                  type="number"
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full disabled:opacity-60 text-white py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 transition active:scale-95"
                  style={{ background: BRAND }}
                >
                  <Plus size={18} />
                  {creating ? 'Creating...' : 'Create Gift'}
                </button>
              </div>
            </form>
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by gift name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                />
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {['all', 'active', 'expired'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${statusFilter === s ? 'bg-white text-[#b1835a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:border-[#b1835a] transition"
                >
                  <option value="newest">Newest</option>
                  <option value="amount">Highest amount</option>
                  <option value="usage">Most used</option>
                </select>
              </div>
            </div>
          </div>

          {/* Gifts Table */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-semibold">Gift Name</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Amount</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Usage</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Link</th>
                    <th className="px-5 py-3.5 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-5 py-3.5">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : visibleGifts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <Gift size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No gifts to show</p>
                        <p className="text-gray-400 text-sm">Create your first gift above to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    visibleGifts.map((gift) => {
                      const pct = gift.limit ? Math.min(100, Math.round((gift.usedCount / gift.limit) * 100)) : 0;
                      return (
                        <tr key={gift._id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3.5 font-medium text-gray-900">{gift.giftName}</td>
                          <td className="px-5 py-3.5 font-semibold text-gray-900 tabular-nums">₹{gift.amount}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : 'bg-[#b1835a]'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                                {gift.usedCount}/{gift.limit}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => toggleActive(gift)}
                              title="Toggle status"
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${gift.isActive
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                              {gift.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => copyLink(`${FRONTEND_URL}${gift.giftLink}`)}
                              className="flex items-center gap-1.5 text-[#b1835a] hover:text-[#8a6040] font-medium text-sm transition"
                            >
                              <Copy size={14} /> Copy
                            </button>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openClaims(gift)}
                                title="View claims"
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => openEdit(gift)}
                                title="Edit gift"
                                className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(gift)}
                                title="Delete gift"
                                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ---------- EDIT MODAL ---------- */}
      {editTarget && (
        <AppModal onClose={() => setEditTarget(null)} size="md">
          <AppModal.Header
            icon={<Pencil size={15} />}
            title="Edit Gift"
            onClose={() => setEditTarget(null)}
            accent="indigo"
          />
          <AppModal.Body>
            <form id="edit-gift-form" onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-4">
              <ModalInput
                label="Gift Name"
                type="text"
                value={editForm.giftName}
                onChange={(e) => setEditForm({ ...editForm, giftName: e.target.value })}
                placeholder="Welcome Bonus"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Amount {editTarget.usedCount > 0 && <Lock size={11} className="text-amber-500" />}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₹</span>
                    <input
                      type="number"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      className={`w-full pl-7 pr-3 py-2.5 border text-sm transition focus:outline-none ${
                        editTarget.usedCount > 0
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20'
                      }`}
                      style={{ borderRadius: '6px' }}
                      min="1"
                      disabled={editTarget.usedCount > 0}
                    />
                  </div>
                  {editTarget.usedCount > 0 && (
                    <p className="mt-1 text-xs text-amber-600">Locked after first claim</p>
                  )}
                </div>

                {/* Usage Limit */}
                <div>
                  <ModalInput
                    label="Usage Limit"
                    type="number"
                    value={editForm.limit}
                    onChange={(e) => setEditForm({ ...editForm, limit: parseInt(e.target.value) || 0 })}
                    min={editTarget.usedCount}
                  />
                  <p className="mt-1 text-xs text-gray-400">Min: {editTarget.usedCount}</p>
                </div>
              </div>

              {/* Usage bar */}
              <div className="bg-gray-50 border border-gray-100 px-4 py-3" style={{ borderRadius: '6px' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Claimed</span>
                  <span className="text-xs font-semibold text-gray-800 tabular-nums">
                    {editTarget.usedCount} / {editForm.limit || editTarget.limit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      editTarget.usedCount >= (editForm.limit || editTarget.limit) ? 'bg-rose-500' : 'bg-[#b1835a]'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((editTarget.usedCount / (editForm.limit || editTarget.limit || 1)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between border border-gray-200 px-4 py-3" style={{ borderRadius: '6px' }}>
                <div>
                  <p className="text-sm font-medium text-gray-700">Gift is active</p>
                  <p className="text-xs text-gray-400">Users can claim while active</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${editForm.isActive ? 'bg-[#b1835a]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </form>
          </AppModal.Body>
          <AppModal.Footer>
            <ModalBtn variant="secondary" type="button" onClick={() => setEditTarget(null)}>Cancel</ModalBtn>
            <ModalBtn variant="brand" type="submit" form="edit-gift-form" disabled={savingEdit}
              className="flex items-center gap-1.5" style={{ background: BRAND }}>
              {savingEdit && <RefreshCw size={13} className="animate-spin" />}
              {savingEdit ? 'Saving…' : 'Save changes'}
            </ModalBtn>
          </AppModal.Footer>
        </AppModal>
      )}

      {/* ---------- CLAIMS MODAL ---------- */}
      {claimsTarget && (
        <AppModal onClose={() => setClaimsTarget(null)} size="md">
          <AppModal.Header
            icon={<Users size={15} />}
            title={`Claims · ${claimsTarget.giftName}`}
            onClose={() => setClaimsTarget(null)}
            accent="amber"
          />
          <AppModal.Body>
            {claimsLoading ? (
              <p className="text-center text-gray-400 py-8 text-sm">Loading claims…</p>
            ) : claims.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No one has claimed this gift yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {claims.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="w-7 h-7 rounded-full bg-[#fef3ec] text-[#b1835a] flex items-center justify-center text-xs font-semibold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c.claimedAt ? new Date(c.claimedAt).toLocaleString('en-US') : '—'}
                      </p>
                    </div>
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
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