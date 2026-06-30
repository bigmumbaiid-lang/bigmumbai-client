import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import axiosInstance from '../utils/axios';
import { useNotify } from '../context/NotifyContext';
import AppModal, { ModalBtn, ModalInput, ModalTextarea } from '../components/AppModal';
import {
  Megaphone, Plus, Search, Pencil, Trash2, X, RefreshCw,
  ChevronLeft, ChevronRight, Globe, User, AlertTriangle,
  CheckCircle, Clock,
} from 'lucide-react';

const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';

export default function Announcements() {
  const notify = useNotify();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const limit = 10;

  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    title: '', content: '', date: '', startDate: '',
    endDate: '', imageUrl: '', type: 'personal', username: '',
  });

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchAnnouncements = async (page = 1) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/announcements/admin', {
        params: {
          page, limit,
          search: debouncedSearch || undefined,
          type: filterType === 'all' ? undefined : filterType,
          status: filterStatus === 'all' ? undefined : filterStatus,
        },
      });
      setAnnouncements(res.data.data || []);
      setCurrentPage(res.data.currentPage || page);
      setTotalPages(res.data.totalPages || 1);
      setTotalAnnouncements(res.data.total || 0);
    } catch (error) {
      console.error(error);
      notify.error('Failed to load announcements');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAnnouncements(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, filterType, filterStatus]);

  const changeFilter = (setter, value) => { setter(value); setCurrentPage(1); };

  const isExpired = (ann) => ann.endDate && new Date(ann.endDate) < new Date();

  // Stats derived from the current page of data
  const pageStats = useMemo(() => {
    const active = announcements.filter((a) => !isExpired(a)).length;
    const expired = announcements.filter((a) => isExpired(a)).length;
    const global = announcements.filter((a) => a.type === 'global').length;
    const personal = announcements.filter((a) => a.type === 'personal').length;
    return { active, expired, global, personal };
  }, [announcements]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDefaultDates = () => {
    const today = new Date().toISOString().split('T')[0];
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    return { date: today, startDate: today, endDate: oneMonthLater.toISOString().split('T')[0] };
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    const d = setDefaultDates();
    setFormData({ title: '', content: '', date: d.date, startDate: d.startDate, endDate: d.endDate, imageUrl: '', type: 'personal', username: '' });
    setShowModal(true);
  };

  const openEditModal = (ann) => {
    setEditingAnnouncement(ann);
    setFormData({
      title: ann.title, content: ann.content, date: ann.date,
      startDate: ann.startDate ? ann.startDate.split('T')[0] : '',
      endDate: ann.endDate ? ann.endDate.split('T')[0] : '',
      imageUrl: ann.imageUrl || '', type: ann.type, username: ann.username || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.type === 'personal' && !formData.username.trim()) {
      notify.error('Username is required for a personal announcement');
      return;
    }
    setSaving(true);
    try {
      if (editingAnnouncement) {
        await axiosInstance.put(`/announcements/${editingAnnouncement._id}`, formData);
        notify.success('Announcement updated');
      } else {
        await axiosInstance.post('/announcements', formData);
        notify.success('Announcement created');
      }
      setShowModal(false);
      setCurrentPage(1);
      fetchAnnouncements(1);
    } catch (error) {
      notify.error(error.response?.data?.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (ann) => {
    const ok = await notify.confirm({
      title: 'Delete Announcement?',
      message: `"${ann.title}" will be permanently deleted. This can't be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/announcements/${ann._id}`);
      notify.success('Announcement deleted');
      const nextPage = announcements.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(nextPage);
      fetchAnnouncements(nextPage);
    } catch (error) {
      notify.error('Failed to delete announcement');
    } finally { setDeleting(false); }
  };

  const StatCard = ({ label, value, sub, accent = 'text-gray-900', icon: Icon, iconColor, iconBg }) => (
    <div className="group bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 p-5 hover:shadow-[0_8px_24px_rgba(17,24,39,0.08)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-gray-500 font-medium">{label}</p>
          <p className={`text-[28px] leading-tight font-bold mt-2 tracking-tight ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
          style={{ background: iconBg }}
        >
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
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Announcements</h1>
            <p className="text-xs text-gray-400 mt-0.5">Create and manage global and personal announcements</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnnouncements(currentPage)} disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm active:scale-95 transition"
              style={{ background: BRAND }}
            >
              <Plus size={15} /> New Announcement
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          {/* Stats (computed from current page) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <StatCard
              label="Total (DB)"
              value={totalAnnouncements.toLocaleString('en-US')}
              sub="Across all pages"
              icon={Megaphone} iconColor="#b1835a" iconBg="#fef3ec"
            />
            <StatCard
              label="Active (this page)"
              value={pageStats.active}
              sub="Not yet expired"
              accent="text-emerald-600" icon={CheckCircle} iconColor="#059669" iconBg="#ecfdf5"
            />
            <StatCard
              label="Global (this page)"
              value={pageStats.global}
              icon={Globe} iconColor="#2563eb" iconBg="#eff6ff"
            />
            <StatCard
              label="Personal (this page)"
              value={pageStats.personal}
              icon={User} iconColor="#7c3aed" iconBg="#f5f3ff"
            />
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search title, content or exact username..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                />
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {['all', 'global', 'personal'].map((t) => (
                  <button
                    key={t}
                    onClick={() => changeFilter(setFilterType, t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${filterType === t ? 'bg-white text-[#b1835a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <select
                value={filterStatus} onChange={(e) => changeFilter(setFilterStatus, e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:border-[#b1835a]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-left font-semibold">Title</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Target</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Type</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Display Date</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-5 py-3.5">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : announcements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <Megaphone size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No announcements found</p>
                        <p className="text-gray-400 text-sm">Try adjusting your filters or create a new one.</p>
                      </td>
                    </tr>
                  ) : (
                    announcements.map((ann) => (
                      <tr key={ann._id} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3.5 font-medium text-gray-900 max-w-xs truncate">{ann.title}</td>
                        <td className="px-5 py-3.5">
                          {ann.username
                            ? <span className="font-medium text-gray-700">@{ann.username}</span>
                            : <span className="text-gray-400 text-sm">All Users</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ann.type === 'global' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
                            {ann.type === 'global' ? <Globe size={11} /> : <User size={11} />}
                            {ann.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-sm">{ann.date}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isExpired(ann) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isExpired(ann) ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                            {isExpired(ann) ? 'Expired' : 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(ann)}
                              title="Edit"
                              className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(ann)}
                              title="Delete"
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalAnnouncements)} of {totalAnnouncements}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span className="px-2 text-sm font-medium text-gray-700">Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight size={17} />
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
            icon={<Megaphone size={16} />}
            title={editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            onClose={() => setShowModal(false)}
            accent="brand"
          />
          <AppModal.Body>
            <form id="ann-form" onSubmit={handleSubmit} className="space-y-4">
              <ModalInput label="Title *" type="text" required
                value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              <ModalTextarea label="Content *" required rows={4}
                value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <ModalInput label="Display Date *" type="date" required
                  value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Type *</label>
                  <select required value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-gray-200 px-3.5 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25"
                    style={{ borderRadius: '6px' }}>
                    <option value="global">Global</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>
              {formData.type === 'personal' && (
                <ModalInput label="Username (Exact) *" type="text" required placeholder="e.g. krishna"
                  value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <ModalInput label="Start Date *" type="date" required
                  value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                <ModalInput label="End Date (optional)" type="date"
                  value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
              <ModalInput label="Image URL (optional)" type="text" placeholder="https://…"
                value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
            </form>
          </AppModal.Body>
          <AppModal.Footer>
            <ModalBtn variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</ModalBtn>
            <ModalBtn variant="brand" type="submit" form="ann-form" disabled={saving}
              className="flex items-center gap-1.5" style={{ background: BRAND }}>
              {saving && <RefreshCw size={13} className="animate-spin" />}
              {saving ? 'Saving…' : editingAnnouncement ? 'Update' : 'Create'}
            </ModalBtn>
          </AppModal.Footer>
        </AppModal>
      )}
    </div>
  );
}
