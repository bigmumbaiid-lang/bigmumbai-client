import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotify } from '../context/NotifyContext';
import {
  Search,
  Users as UsersIcon,
  ShieldCheck,
  Gamepad2,
  Wallet,
  RefreshCw,
  Download,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
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

const BRAND = 'linear-gradient(90deg,#d9ad82,#b1835a)';

const OVERVIEW_FILTERS = [
  { key: 'all',          label: 'All'               },
  { key: 'active',       label: 'Active accounts'   },
  { key: 'disabled',     label: 'Disabled accounts' },
  { key: 'betting_off',  label: 'Betting disabled'  },
  { key: 'withdrawal',   label: 'Withdrawals on'    },
  { key: 'bank',         label: 'Has bank card'     },
  { key: 'nobank',       label: 'No bank card'      },
];

const SORTS = [
  { key: 'newest',       label: 'Newest'     },
  { key: 'balance_high', label: 'Balance ↓'  },
  { key: 'balance_low',  label: 'Balance ↑'  },
  { key: 'username',     label: 'A–Z'        },
];

export default function Users() {
  const notify = useNotify();
  const {
    users,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    totalPages,
    totalUsers,
    pageSize,
    fetchUsers,
    goToPage,
    updateUser,
  } = useUsers();

  const [searchParams]     = useSearchParams();
  const activeTab          = searchParams.get('tab') || 'information';
  const [modal,            setModal           ] = useState(null);
  const [togglingId,       setTogglingId      ] = useState(null);
  const [filter,           setFilter          ] = useState('all');
  const [sort,             setSort            ] = useState('newest');
  const [refreshing,       setRefreshing      ] = useState(false);

  const closeModal = () => setModal(null);

  const inr = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

  // ── derived metrics for stat cards ────────────────────────────────────────
  const pageMetrics = useMemo(() => {
    const list = users || [];
    return {
      balance:        list.reduce((s, u) => s + (u.money || 0), 0),
      activeAccounts: list.filter((u) => u.isActive !== false).length,
      bettingOn:      list.filter((u) => u.allowBetting !== false).length,
      withdrawalOn:   list.filter((u) => u.allowWithdrawal).length,
    };
  }, [users]);

  // ── client-side filter + sort (overview only) ──────────────────────────
  const visibleUsers = useMemo(() => {
    let list = [...(users || [])];

    if (filter === 'active')      list = list.filter((u) => u.isActive !== false);
    else if (filter === 'disabled')    list = list.filter((u) => u.isActive === false);
    else if (filter === 'betting_off') list = list.filter((u) => u.allowBetting === false);
    else if (filter === 'withdrawal')  list = list.filter((u) => u.allowWithdrawal);
    else if (filter === 'bank')        list = list.filter((u) => u.hasBankCard);
    else if (filter === 'nobank')      list = list.filter((u) => !u.hasBankCard);

    switch (sort) {
      case 'balance_high': list.sort((a, b) => (b.money || 0) - (a.money || 0)); break;
      case 'balance_low':  list.sort((a, b) => (a.money || 0) - (b.money || 0)); break;
      case 'username':     list.sort((a, b) => (a.username || '').localeCompare(b.username || '')); break;
      default:             list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [users, filter, sort]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    try { setRefreshing(true); await fetchUsers(currentPage); }
    finally { setRefreshing(false); }
  };

  const exportCsv = () => {
    const rows = visibleUsers;
    if (!rows.length) { notify.error('Nothing to export on this page'); return; }
    const header = ['Username', 'Phone', 'Balance', 'Account', 'Betting', 'Withdrawal', 'Bank Card', 'Invite Code', 'Joined'];
    const body = rows.map((u) => [
      u.username, u.phoneNumber, u.money ?? 0,
      u.isActive !== false ? 'Active' : 'Disabled',
      u.allowBetting !== false ? 'Enabled' : 'Disabled',
      u.allowWithdrawal ? 'Enabled' : 'Disabled',
      u.hasBankCard ? (u.bankAccount || 'Yes') : 'No',
      u.inviteCode || '',
      u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
    ]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users-page-${currentPage}.csv`; a.click();
    URL.revokeObjectURL(url);
    notify.success(`Exported ${rows.length} users`);
  };

  const makeToggle = ({ getField, apiCall, updateField, label }) => async (user) => {
    const currentVal = user[getField];
    const action = currentVal === false ? 'enable' : 'disable';
    const confirmed = await notify.confirm({
      title: `Confirm ${action} ${label}`,
      message: `${action === 'disable' && label === 'account' ? 'User will be immediately logged out. ' : ''}Are you sure you want to ${action} ${label} for ${user.username}?`,
      confirmLabel: 'Yes, Proceed',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      setTogglingId(user._id);
      const data = await apiCall(user._id);
      updateUser(user._id, { [updateField]: data[updateField] });
      notify.success(`${label.charAt(0).toUpperCase() + label.slice(1)} ${data[updateField] ? 'enabled' : 'disabled'} for ${user.username}`);
    } catch (err) {
      notify.error(err.response?.data?.message || `Failed to toggle ${label}`);
    } finally {
      setTogglingId(null);
    }
  };

  const toggleWithdrawal = makeToggle({
    getField: 'allowWithdrawal', apiCall: usersApi.toggleWithdrawal,
    updateField: 'allowWithdrawal', label: 'withdrawal',
  });

  const toggleBetting = makeToggle({
    getField: 'allowBetting', apiCall: usersApi.toggleBetting,
    updateField: 'allowBetting', label: 'betting',
  });

  const toggleAccountStatus = makeToggle({
    getField: 'isActive', apiCall: usersApi.toggleAccountStatus,
    updateField: 'isActive', label: 'account',
  });

  const toggleRoyalSpinLogin = makeToggle({
    getField: 'royalSpinLoginEnabled', apiCall: usersApi.toggleRoyalSpinLogin,
    updateField: 'royalSpinLoginEnabled', label: 'Royal Spin login',
  });

  const toggleRoyalSpin = makeToggle({
    getField: 'royalSpinActive', apiCall: usersApi.toggleRoyalSpin,
    updateField: 'royalSpinActive', label: 'Royal Spin auto-bet',
  });

  const toggleRole = async (user) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
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
    } finally {
      setTogglingId(null);
    }
  };

  // ── sub-components ────────────────────────────────────────────────────────
  const MetricCard = ({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] p-5 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-[13px] text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={21} style={{ color: iconColor }} strokeWidth={2.2} />
      </div>
    </div>
  );

  const tabData = {
    information: visibleUsers,
    accounts:    users || [],
    bank:        users || [],
    transfer:    users || [],
  };

  const currentUsers = tabData[activeTab];

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#f6f7fb]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 pl-14 pr-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
              {activeTab === 'information' && 'Users Management'}
              {activeTab === 'accounts'    && 'Account Controls'}
              {activeTab === 'bank'        && 'Bank Cards'}
              {activeTab === 'transfer'    && 'Balance Transfer'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeTab === 'information' && 'View user balances, statuses and joined dates'}
              {activeTab === 'accounts'    && 'Toggle account status, betting, withdrawals and roles'}
              {activeTab === 'bank'        && 'Review, verify and manage user bank cards'}
              {activeTab === 'transfer'    && 'Add or deduct balance for any user account'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm active:scale-95 transition"
              style={{ background: BRAND }}
            >
              <Download size={15} />
              Export
            </button>
          </div>
        </header>

        <div className="p-8">
          {/* Stat cards — hidden on Transfer and Bank tabs */}
          {activeTab !== 'transfer' && activeTab !== 'bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              <MetricCard
                label="Total Users" value={Number(totalUsers || 0).toLocaleString('en-US')}
                sub="Across all pages" icon={UsersIcon} iconColor="#2563eb" iconBg="#eff6ff"
              />
              <MetricCard
                label="Active Accounts" value={pageMetrics.activeAccounts}
                sub="On this page" icon={ShieldCheck} iconColor="#059669" iconBg="#ecfdf5"
              />
              <MetricCard
                label="Betting Enabled" value={pageMetrics.bettingOn}
                sub="On this page" icon={Gamepad2} iconColor="#7c3aed" iconBg="#f5f3ff"
              />
              <MetricCard
                label="Withdrawals On" value={pageMetrics.withdrawalOn}
                sub="On this page" icon={Wallet} iconColor="#d97706" iconBg="#fffbeb"
              />
            </div>
          )}

          {activeTab === 'transfer' ? (
            <TransferPanel />
          ) : activeTab === 'bank' ? (
            <BankCardPanel />
          ) : (
            <>
              {/* Toolbar */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(17,24,39,0.06)] mb-6">
                <div className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by username or phone number…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#b1835a] focus:ring-2 focus:ring-[#d8ab83]/25 transition"
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Sort (information only) */}
                    {activeTab === 'information' && (
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal size={16} className="text-gray-400" />
                        <select
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:border-[#b1835a] bg-white"
                        >
                          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Filter chips (information only) */}
                  {activeTab === 'information' && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {OVERVIEW_FILTERS.map((f) => {
                        const active = filter === f.key;
                        return (
                          <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              active ? 'bg-[#b1835a] text-white border-[#b1835a]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                      {(filter !== 'all' || sort !== 'newest') && (
                        <span className="text-[11px] text-gray-400 ml-1">
                          Showing {visibleUsers.length} of {users?.length || 0} loaded · filters apply to this page
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tab-specific hints */}
                  {activeTab === 'accounts' && (
                    <p className="mt-3 text-xs text-gray-400">
                      Click any status badge to toggle it. Disabling an account immediately invalidates the user's active session.
                    </p>
                  )}
                  {activeTab === 'bank' && (
                    <p className="mt-3 text-xs text-gray-400">
                      View and manage linked bank cards. Click View / Edit to update or verify a user's bank details.
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-3.5 rounded-2xl mb-6 text-sm">{error}</div>
              )}

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(17,24,39,0.06)] border border-gray-100 overflow-hidden">
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
      {modal?.type === 'reset' && (
        <ResetPasswordModal user={modal.user} onClose={closeModal} />
      )}
      {modal?.type === 'bank' && (
        <BankModal user={modal.user} onClose={closeModal} onDeleted={() => fetchUsers(currentPage)} />
      )}
    </div>
  );
}
