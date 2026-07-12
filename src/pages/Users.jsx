import { useState, useEffect } from 'react';
import { useNotify } from '../context/NotifyContext';
import {
  Search, Users as UsersIcon, ShieldCheck,
  Gamepad2, Wallet, RefreshCw, Download, X,
  Info, SlidersHorizontal, CreditCard, ArrowLeftRight,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Select from '../components/Select';
import UsersTable from '../components/users/UsersTable';
import Pagination from '../components/users/Pagination';
import TransferModal from '../components/users/TransferModal';
import TransferPanel from '../components/users/TransferPanel';
import BankCardPanel from '../components/users/BankCardPanel';
import ResetPasswordModal from '../components/users/ResetPasswordModal';
import BankModal from '../components/users/BankModal';
import { useUsers } from '../hooks/useUsers';
import { usersApi } from '../api/users';
import { TRANSFER_TYPE } from '../constants/users';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const TABS = [
  { key: 'information', label: 'Information',      icon: Info              },
  { key: 'accounts',    label: 'Account Controls', icon: SlidersHorizontal },
  { key: 'bank',        label: 'Bank Card',        icon: CreditCard        },
  { key: 'transfer',    label: 'Transfer',         icon: ArrowLeftRight    },
];

const OVERVIEW_FILTERS = [
  { key: 'all',         label: 'All'               },
  { key: 'active',      label: 'Active accounts'   },
  { key: 'disabled',    label: 'Disabled accounts' },
  { key: 'betting_off', label: 'Betting disabled'  },
  { key: 'withdrawal',  label: 'Withdrawals on'    },
  { key: 'bank',        label: 'Has bank card'     },
  { key: 'nobank',      label: 'No bank card'      },
];

const SORT_OPTIONS = [
  { value: 'newest',       label: 'Newest'   },
  { value: 'balance_high', label: 'Balance ↓' },
  { value: 'balance_low',  label: 'Balance ↑' },
  { value: 'username',     label: 'A – Z'     },
];

export default function Users() {
  const notify = useNotify();
  const {
    users, loading, error, searchTerm, setSearchTerm,
    filter, changeFilter,
    sort, changeSort,
    currentPage, totalPages, totalUsers, totalActive, totalBettingOn, totalWithdrawalOn,
    pageSize, fetchUsers, goToPage, updateUser,
  } = useUsers();

  const [activeTab,  setActiveTab ] = useState('information');
  const [modal,      setModal     ] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const closeModal = () => setModal(null);

  // Sorting now happens server-side (before pagination), so this is just the
  // page's rows as returned — no client-side re-sort needed.
  const visibleUsers = users || [];

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    try { setRefreshing(true); await fetchUsers(currentPage); }
    finally { setRefreshing(false); }
  };

  const exportCsv = () => {
    const rows = visibleUsers;
    if (!rows.length) { notify.error('Nothing to export on this page'); return; }
    const header = ['Username', 'Phone', 'Balance', 'Account', 'Betting', 'Withdrawal', 'Bank Card', 'Invite Code', 'Joined'];
    const body   = rows.map((u) => [
      u.username, u.phoneNumber, u.money ?? 0,
      u.isActive !== false ? 'Active' : 'Disabled',
      u.allowBetting !== false ? 'Enabled' : 'Disabled',
      u.allowWithdrawal ? 'Enabled' : 'Disabled',
      u.hasBankCard ? (u.bankAccount || 'Yes') : 'No',
      u.inviteCode || '',
      u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
    ]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a   = document.createElement('a');
    a.href = url; a.download = `users-page-${currentPage}.csv`; a.click();
    URL.revokeObjectURL(url);
    notify.success(`Exported ${rows.length} users`);
  };

  const makeToggle = ({ getField, apiCall, updateField, label }) => async (user) => {
    const currentVal = user[getField];
    const action     = currentVal === false ? 'enable' : 'disable';
    const confirmed  = await notify.confirm({
      title: `Confirm ${action} ${label}`,
      message: `${action === 'disable' && label === 'account' ? 'User will be immediately logged out. ' : ''}Are you sure you want to ${action} ${label} for ${user.username}?`,
      confirmLabel: 'Yes, Proceed', variant: 'danger',
    });
    if (!confirmed) return;
    try {
      setTogglingId(user._id);
      const data = await apiCall(user._id);
      updateUser(user._id, { [updateField]: data[updateField] });
      notify.success(`${label.charAt(0).toUpperCase() + label.slice(1)} ${data[updateField] ? 'enabled' : 'disabled'} for ${user.username}`);
    } catch (err) {
      notify.error(err.response?.data?.message || `Failed to toggle ${label}`);
    } finally { setTogglingId(null); }
  };

  const toggleWithdrawal     = makeToggle({ getField: 'allowWithdrawal',      apiCall: usersApi.toggleWithdrawal,     updateField: 'allowWithdrawal',      label: 'withdrawal'          });
  const toggleBetting        = makeToggle({ getField: 'allowBetting',          apiCall: usersApi.toggleBetting,        updateField: 'allowBetting',          label: 'betting'             });
  const toggleAccountStatus  = makeToggle({ getField: 'isActive',              apiCall: usersApi.toggleAccountStatus,  updateField: 'isActive',              label: 'account'             });
  const toggleRoyalSpinLogin = makeToggle({ getField: 'royalSpinLoginEnabled', apiCall: usersApi.toggleRoyalSpinLogin, updateField: 'royalSpinLoginEnabled', label: 'Royal Spin login'    });
  const toggleRoyalSpin      = makeToggle({ getField: 'royalSpinActive',       apiCall: usersApi.toggleRoyalSpin,      updateField: 'royalSpinActive',       label: 'Royal Spin auto-bet' });

  const toggleRole = async (user) => {
    const nextRole  = user.role === 'admin' ? 'user' : 'admin';
    const confirmed = await notify.confirm({
      title: `Change role to "${nextRole}"`,
      message: `This will ${nextRole === 'admin' ? 'grant transfer access to' : 'revoke transfer access from'} @${user.username}. Continue?`,
      confirmLabel: 'Yes, Update Role',
      variant: nextRole === 'admin' ? 'primary' : 'danger',
    });
    if (!confirmed) return;
    try {
      setTogglingId(user._id);
      const data = await usersApi.toggleRole(user._id);
      updateUser(user._id, { role: data.role });
      notify.success(`@${user.username} role updated to "${data.role}"`);
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to update role');
    } finally { setTogglingId(null); }
  };

  const tabData    = { information: visibleUsers, accounts: users || [], bank: users || [], transfer: users || [] };
  const currentUsers = tabData[activeTab];

  // 1-4 switch tabs, but only when not typing into a field or a modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (modal) return;
      const el = document.activeElement;
      const isTyping = el && (
        el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' || el.isContentEditable
      );
      if (isTyping) return;

      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx === -1) return;
      e.preventDefault();
      setActiveTab(TABS[idx].key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal]);

  // ── Stat card ─────────────────────────────────────────────────────────────
  const MetricCard = ({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
    <div className="bg-white border border-gray-200 p-5 flex items-start justify-between hover:border-[#3a7d44]/40 transition-colors">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
        <p className="text-[26px] leading-none font-bold tracking-tight text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
      </div>
      <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={19} style={{ color: iconColor }} strokeWidth={2.2} />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
      <Sidebar />

      <main className="flex-1 overflow-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center justify-between md:sticky md:top-0 z-40">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Users Management</h1>
            <p className="text-xs text-gray-400 mt-0.5 hidden md:block">View and manage user accounts, balances and settings</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-3 md:px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3 md:px-4 py-2 text-white text-sm font-semibold transition whitespace-nowrap"
              style={{ background: G }}
              onMouseEnter={e => e.currentTarget.style.background = GH}
              onMouseLeave={e => e.currentTarget.style.background = G}
            >
              <Download size={14} /> Export
            </button>
          </div>
        </header>

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 flex items-end gap-0 overflow-x-auto scrollbar-none">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors focus:outline-none whitespace-nowrap shrink-0"
                style={{ color: active ? G : '#6b7280' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#374151'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#6b7280'; }}
              >
                <Icon size={14} />
                {label}
                {/* Active underline */}
                {active && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: G }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6 lg:p-8 space-y-5">

          {/* ── Stat cards ─────────────────────────────────────────────── */}
          {activeTab !== 'transfer' && activeTab !== 'bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <MetricCard
                label="Total Users"
                value={Number(totalUsers || 0).toLocaleString('en-US')}
                sub="Across all pages"
                icon={UsersIcon} iconColor="#2563eb" iconBg="#eff6ff"
              />
              <MetricCard
                label="Active Accounts"
                value={Number(totalActive).toLocaleString('en-US')}
                sub={searchTerm ? 'Matching search' : 'Across all users'}
                icon={ShieldCheck} iconColor={G} iconBg={GL}
              />
              <MetricCard
                label="Betting Enabled"
                value={Number(totalBettingOn).toLocaleString('en-US')}
                sub={searchTerm ? 'Matching search' : 'Across all users'}
                icon={Gamepad2} iconColor="#7c3aed" iconBg="#ede9fe"
              />
              <MetricCard
                label="Withdrawals On"
                value={Number(totalWithdrawalOn).toLocaleString('en-US')}
                sub={searchTerm ? 'Matching search' : 'Across all users'}
                icon={Wallet} iconColor="#d97706" iconBg="#fef9c3"
              />
            </div>
          )}

          {/* ── Tab content ────────────────────────────────────────────── */}
          {activeTab === 'transfer' ? (
            <TransferPanel />
          ) : activeTab === 'bank' ? (
            <BankCardPanel />
          ) : (
            <>
              {/* Toolbar */}
              <div className="bg-white border border-gray-200">
                <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="relative flex-1 min-w-0">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by username or phone number…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 border border-gray-300 bg-white text-sm text-gray-800 focus:outline-none focus:border-[#3a7d44] focus:ring-2 focus:ring-[#3a7d44]/15 transition placeholder:text-gray-400"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {activeTab === 'information' && (
                    <Select
                      value={sort}
                      onChange={changeSort}
                      options={SORT_OPTIONS}
                      width="150px"
                    />
                  )}
                </div>

                {activeTab === 'information' && (
                  <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                    {OVERVIEW_FILTERS.map((f) => {
                      const isActive = filter === f.key;
                      return (
                        <button
                          key={f.key}
                          onClick={() => changeFilter(f.key)}
                          className="px-3 py-1.5 text-xs font-semibold border transition"
                          style={
                            isActive
                              ? { background: G, borderColor: G, color: '#fff' }
                              : { background: '#fff', borderColor: '#d1d5db', color: '#6b7280' }
                          }
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = G; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = '#d1d5db'; }}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                    {filter !== 'all' && (
                      <span className="text-[11px] text-gray-400 ml-1">
                        {totalUsers} matching users
                      </span>
                    )}
                  </div>
                )}

                {activeTab === 'accounts' && (
                  <p className="px-4 pb-3 text-xs text-gray-400">
                    Click any status badge to toggle it. Disabling an account immediately invalidates the user's active session.
                  </p>
                )}
              </div>

              {error && (
                <div className="border border-red-300 bg-red-50 text-red-600 px-4 py-3 text-sm">{error}</div>
              )}

              <div className="bg-white border border-gray-200 overflow-hidden">
                <UsersTable
                  users={currentUsers}
                  loading={loading}
                  mode={activeTab}
                  togglingId={togglingId}
                  onToggleWithdrawal={toggleWithdrawal}
                  onToggleBetting={toggleBetting}
                  onToggleAccountStatus={toggleAccountStatus}
                  onToggleRole={toggleRole}
                  onToggleRoyalSpinLogin={toggleRoyalSpinLogin}
                  onToggleRoyalSpin={toggleRoyalSpin}
                  onAddMoney={(user) => setModal({ type: 'transfer', user, transferType: TRANSFER_TYPE.INCREASE })}
                  onDeductMoney={(user) => setModal({ type: 'transfer', user, transferType: TRANSFER_TYPE.DECREASE })}
                  onResetPassword={(user) => setModal({ type: 'reset', user })}
                  onOpenBank={(user) => setModal({ type: 'bank', user })}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalUsers={totalUsers}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {modal?.type === 'transfer' && (
        <TransferModal user={modal.user} transferType={modal.transferType} onClose={closeModal} onSuccess={updateUser} />
      )}
      {modal?.type === 'reset' && <ResetPasswordModal user={modal.user} onClose={closeModal} />}
      {modal?.type === 'bank'  && <BankModal user={modal.user} onClose={closeModal} onDeleted={() => fetchUsers(currentPage)} />}
    </div>
  );
}
