import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import axiosInstance from '../utils/axios';
import { useNotify } from '../context/NotifyContext';
import AppModal, { ModalBtn, ModalInput, ModalTextarea } from '../components/AppModal';
import {
  Megaphone, Search, Pencil, Trash2, RefreshCw, Loader2,
  ChevronLeft, ChevronRight, Globe, User, AlertTriangle,
  CheckCircle, RotateCcw, Send,
} from 'lucide-react';
import Select from '../components/Select';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const inputCls =
  'border border-gray-300 bg-white text-sm text-gray-800 px-3 py-2 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400 w-full';

export default function Announcements() {
  const notify = useNotify();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm]           = useState('');
  const [filterType, setFilterType]           = useState('all');
  const [filterStatus, setFilterStatus]       = useState('all');

  // username validation
  const [userLookup, setUserLookup]   = useState(null); // null=idle, true=found, false=not found
  const [lookingUp, setLookingUp]     = useState(false);
  const [resolvedUser, setResolvedUser] = useState('');  // exact username from DB
  const lookupTimer = useRef(null);

  const [currentPage, setCurrentPage]           = useState(1);
  const [totalPages, setTotalPages]             = useState(1);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const limit = 10;

  const [showModal, setShowModal]               = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [saving, setSaving]                     = useState(false);
  const [deleting, setDeleting]                 = useState(false);

  const [formData, setFormData] = useState({
    title: '', content: '', date: '', startDate: '',
    endDate: '', imageUrl: '', type: 'global', username: '',
  });

  // Validate username against DB (debounced 500ms)
  useEffect(() => {
    clearTimeout(lookupTimer.current);
    const term = searchTerm.trim();
    if (!term) { setUserLookup(null); setResolvedUser(''); return; }
    setLookingUp(true);
    lookupTimer.current = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get('/user', { params: { search: term, limit: 1 } });
        const users = data.users || data.data || [];
        const match = users.find(u => u.username?.toLowerCase() === term.toLowerCase());
        if (match) { setUserLookup(true); setResolvedUser(match.username); setCurrentPage(1); }
        else        { setUserLookup(false); setResolvedUser(''); setCurrentPage(1); }
      } catch { setUserLookup(false); setResolvedUser(''); }
      finally { setLookingUp(false); }
    }, 500);
    return () => clearTimeout(lookupTimer.current);
  }, [searchTerm]); // eslint-disable-line

  const fetchAnnouncements = async (page = 1) => {
    // If something is typed but no exact username confirmed yet → show empty table
    if (searchTerm.trim() && userLookup !== true) {
      setAnnouncements([]);
      setTotalPages(1);
      setTotalAnnouncements(0);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axiosInstance.get('/announcements/admin', {
        params: {
          page, limit,
          search:  (userLookup === true && resolvedUser) ? resolvedUser : undefined,
          type:    filterType   === 'all' ? undefined : filterType,
          status:  filterStatus === 'all' ? undefined : filterStatus,
        },
      });
      setAnnouncements(res.data.data || []);
      setCurrentPage(res.data.currentPage || page);
      setTotalPages(res.data.totalPages || 1);
      setTotalAnnouncements(res.data.total || 0);
    } catch {
      notify.error('Failed to load announcements');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAnnouncements(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, userLookup, resolvedUser, filterType, filterStatus]);

  const changeFilter = (setter, value) => { setter(value); setCurrentPage(1); };
  const isExpired    = (ann) => ann.endDate && new Date(ann.endDate) < new Date();

  const pageStats = useMemo(() => ({
    active:   announcements.filter((a) => !isExpired(a)).length,
    global:   announcements.filter((a) => a.type === 'global').length,
    personal: announcements.filter((a) => a.type === 'personal').length,
  }), [announcements]); // eslint-disable-line

  const defaultDates = () => {
    const today = new Date().toISOString().split('T')[0];
    const later = new Date(); later.setMonth(later.getMonth() + 1);
    return { date: today, startDate: today, endDate: later.toISOString().split('T')[0] };
  };

  // targetUsername non-empty → personal; empty → global
  const openCreateModal = (targetUsername = '') => {
    setEditingAnnouncement(null);
    const d = defaultDates();
    setFormData({
      title: '', content: '', date: d.date, startDate: d.startDate,
      endDate: d.endDate, imageUrl: '',
      type:     targetUsername ? 'personal' : 'global',
      username: targetUsername,
    });
    setShowModal(true);
  };

  const openEditModal = (ann) => {
    setEditingAnnouncement(ann);
    setFormData({
      title:     ann.title,
      content:   ann.content,
      date:      ann.date,
      startDate: ann.startDate ? ann.startDate.split('T')[0] : '',
      endDate:   ann.endDate   ? ann.endDate.split('T')[0]   : '',
      imageUrl:  ann.imageUrl || '',
      type:      ann.type,
      username:  ann.username || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.type === 'personal' && !formData.username.trim()) {
      notify.error('Username is required for a personal announcement'); return;
    }
    setSaving(true);
    try {
      if (editingAnnouncement) {
        await axiosInstance.put(`/announcements/${editingAnnouncement._id}`, formData);
        notify.success('Announcement updated');
      } else {
        await axiosInstance.post('/announcements', formData);
        notify.success('Announcement sent');
      }
      setShowModal(false); setCurrentPage(1); fetchAnnouncements(1);
    } catch (err) {
      notify.error(err.response?.data?.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (ann) => {
    const ok = await notify.confirm({
      title: 'Delete Announcement?',
      message: `"${ann.title}" will be permanently deleted.`,
      confirmLabel: 'Delete', variant: 'danger',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/announcements/${ann._id}`);
      notify.success('Announcement deleted');
      const next = announcements.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(next); fetchAnnouncements(next);
    } catch { notify.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const handleRevoke = async (ann) => {
    const ok = await notify.confirm({
      title: 'Revoke Message?',
      message: `"${ann.title}" will be reset to unread.`,
      confirmLabel: 'Revoke', variant: 'warning',
    });
    if (!ok) return;
    try {
      await axiosInstance.patch(`/announcements/${ann._id}/revoke`);
      notify.success('Message revoked — reset to unread');
      fetchAnnouncements(currentPage);
    } catch { notify.error('Failed to revoke'); }
  };

  const modalTitle = editingAnnouncement
    ? 'Edit Announcement'
    : formData.type === 'personal'
      ? `Send to @${formData.username}`
      : 'New Global Announcement';

  return (
    <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between md:sticky md:top-0 z-10">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Announcements</h1>
            <p className="hidden md:block text-xs text-gray-400 mt-0.5">Create and manage global and personal announcements</p>
          </div>
          <button
            onClick={() => fetchAnnouncements(currentPage)} disabled={loading}
            className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition whitespace-nowrap shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </header>

        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-5">

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Total (DB)',           value: totalAnnouncements, sub: 'Across all pages', icon: Megaphone,   iconColor: '#2563eb', iconBg: '#eff6ff' },
              { label: 'Active (this page)',   value: pageStats.active,   sub: 'Not yet expired',  icon: CheckCircle, iconColor: G,         iconBg: GL        },
              { label: 'Global (this page)',   value: pageStats.global,   sub: null,               icon: Globe,       iconColor: '#7c3aed', iconBg: '#f5f3ff' },
              { label: 'Personal (this page)', value: pageStats.personal, sub: null,               icon: User,        iconColor: '#d97706', iconBg: '#fef9c3' },
            ].map(({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
              <div key={label} className="bg-white border border-gray-200 p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
                  <p className="text-2xl font-bold leading-none tracking-tight text-gray-900">{value}</p>
                  {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
                </div>
                <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                  <Icon size={19} style={{ color: iconColor }} strokeWidth={2.2} />
                </div>
              </div>
            ))}
          </div>

          {/* Filter + action panel */}
          <div className="bg-white border border-gray-200">

            {/* Row 1 — username search + action buttons */}
            <div className="p-4 border-b border-gray-100 flex flex-col gap-2">
              <div className="relative">
                {lookingUp
                  ? <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                  : userLookup === true
                    ? <CheckCircle size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: G }} />
                    : userLookup === false
                      ? <AlertTriangle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" />
                      : <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
                <input
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setUserLookup(null); }}
                  placeholder="Type exact username…"
                  className={inputCls + ' pl-9 ' + (
                    userLookup === true  ? 'border-[#3a7d44] ring-2 ring-[#3a7d44]/15' :
                    userLookup === false ? 'border-rose-400 ring-2 ring-rose-400/15' : ''
                  )}
                />
                {searchTerm.trim() && !lookingUp && userLookup === false && (
                  <p className="mt-1 text-[10px] text-rose-500">
                    User "{searchTerm.trim()}" not found
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {userLookup === true && resolvedUser && (
                  <button
                    onClick={() => openCreateModal(resolvedUser)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white transition"
                    style={{ background: G }}
                    onMouseEnter={e => e.currentTarget.style.background = GH}
                    onMouseLeave={e => e.currentTarget.style.background = G}
                  >
                    <Send size={13} /> Send to {resolvedUser}
                  </button>
                )}
                <button
                  onClick={() => openCreateModal('')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 border text-sm font-semibold transition"
                  style={{ borderColor: G, color: G, background: GL }}
                  onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = GL; e.currentTarget.style.color = G; }}
                >
                  <Globe size={13} /> New Global
                </button>
              </div>
            </div>

            {/* Row 2 — type + status filters */}
            {/* Type buttons — scrollable on mobile */}
            <div className="px-4 pt-3 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-gray-100">
              <span className="text-xs text-gray-400 font-medium shrink-0">Type:</span>
              {['all', 'global', 'personal'].map(t => (
                <button key={t}
                  onClick={() => changeFilter(setFilterType, t)}
                  className="px-3 py-1.5 text-sm font-medium border transition capitalize shrink-0 whitespace-nowrap"
                  style={filterType === t
                    ? { background: G, color: '#fff', borderColor: G }
                    : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}>
                  {t}
                </button>
              ))}
            </div>
            {/* Status select + count — NOT inside overflow-x-auto */}
            <div className="px-4 py-3 flex items-center gap-3">
              <Select
                value={filterStatus}
                onChange={(v) => changeFilter(setFilterStatus, v)}
                options={[
                  { value: 'all',     label: 'All Status' },
                  { value: 'active',  label: 'Active'     },
                  { value: 'expired', label: 'Expired'    },
                ]}
              />
              <span className="ml-auto text-xs text-gray-400">{totalAnnouncements} total</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: GL }}>
                    {['Target', 'Title', 'Type', 'Display Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: G }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="h-4 bg-gray-100 animate-pulse" /></td></tr>
                    ))
                  ) : announcements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No announcements found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Search a username above and click "Send to @user" to create a personal announcement.
                        </p>
                      </td>
                    </tr>
                  ) : announcements.map(ann => {
                    const expired = isExpired(ann);
                    return (
                      <tr key={ann._id} className="hover:bg-[#f9fbf9]">
                        <td className="px-5 py-3">
                          {ann.username
                            ? <span className="font-semibold text-gray-700 text-xs">{ann.username}</span>
                            : <span className="text-gray-400 text-xs">All Users</span>}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-900 max-w-xs truncate">{ann.title}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold"
                            style={ann.type === 'global'
                              ? { background: '#eff6ff', color: '#2563eb' }
                              : { background: '#f5f3ff', color: '#7c3aed' }}>
                            {ann.type === 'global' ? <Globe size={9} /> : <User size={9} />}
                            {ann.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{ann.date}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold"
                            style={expired
                              ? { background: '#fff1f2', color: '#be123c' }
                              : { background: GL, color: G }}>
                            {expired ? <AlertTriangle size={9} /> : <CheckCircle size={9} />}
                            {expired ? 'Expired' : 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditModal(ann)} title="Edit"
                              className="p-1.5 text-blue-500 hover:bg-blue-50 transition">
                              <Pencil size={14} />
                            </button>
                            {ann.type === 'personal' && (
                              <button
                                onClick={() => handleRevoke(ann)}
                                title={ann.isRead ? 'Revoke (reset to unread)' : 'Not read yet'}
                                className={`p-1.5 transition ${ann.isRead ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-300 cursor-not-allowed'}`}
                                disabled={!ann.isRead}
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                            <button onClick={() => handleDelete(ann)} disabled={deleting} title="Delete"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 transition">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalAnnouncements)} of {totalAnnouncements}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                    <ChevronLeft size={15} />
                  </button>
                  <span className="px-3 py-1.5 text-sm font-semibold text-white" style={{ background: G }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create / Edit Modal */}
      {showModal && (
        <AppModal onClose={() => setShowModal(false)} size="2xl">
          <AppModal.Header
            icon={formData.type === 'personal' ? <User size={15} /> : <Globe size={15} />}
            title={modalTitle}
            subtitle={formData.type === 'personal' ? `Personal announcement · @${formData.username}` : 'Broadcast to all users'}
            onClose={() => setShowModal(false)}
            accent="emerald"
          />
          <AppModal.Body>
            <form id="ann-form" onSubmit={handleSubmit} className="space-y-4">

              {/* Target banner — readonly, no input */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 border"
                style={formData.type === 'personal'
                  ? { borderColor: '#ddd6fe', background: '#f5f3ff' }
                  : { borderColor: '#bbf7d0', background: GL }}>
                {formData.type === 'personal'
                  ? <><User size={13} style={{ color: '#7c3aed' }} />
                    <span className="text-xs font-semibold" style={{ color: '#7c3aed' }}>
                      Personal → @{formData.username}
                    </span></>
                  : <><Globe size={13} style={{ color: G }} />
                    <span className="text-xs font-semibold" style={{ color: G }}>
                      Global → All Users
                    </span></>}
              </div>

              <ModalInput label="Title *" type="text" required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              <ModalTextarea label="Content *" required rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <ModalInput label="Display Date *" type="date" required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                <ModalInput label="Start Date *" type="date" required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <ModalInput label="End Date (optional)" type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
              <ModalInput label="Image URL (optional)" type="text" placeholder="https://…"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
            </form>
          </AppModal.Body>
          <AppModal.Footer>
            <ModalBtn variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</ModalBtn>
            <ModalBtn variant="emerald" type="submit" form="ann-form" disabled={saving}
              className="flex items-center gap-1.5">
              {saving && <RefreshCw size={13} className="animate-spin" />}
              {saving ? 'Saving…' : editingAnnouncement ? 'Update' : 'Send'}
            </ModalBtn>
          </AppModal.Footer>
        </AppModal>
      )}
    </div>
  );
}
