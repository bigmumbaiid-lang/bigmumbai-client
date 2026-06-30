import { useNotify } from '../../context/NotifyContext';
import { copyToClipboard } from '../../utils/clipboard';
import { formatDate } from '../../utils/format';

function formatPhone(raw) {
  if (!raw) return '-';
  const digits = String(raw).replace(/\D/g, '');
  const local =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits;
  if (local.length === 10) return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  return `${raw} (invalid)`;
}

// ── small reusable pieces ──────────────────────────────────────────────────

const Spinner = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-gray-400" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

function StatusBadge({ value, onLabel, offLabel, onColor, offColor }) {
  const on = value !== false;
  const { bg, text, dot } = on ? onColor : offColor;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${bg} ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {on ? onLabel : offLabel}
    </span>
  );
}

function ToggleBtn({ value, onLabel, offLabel, onClick, disabled, onBg, offBg }) {
  const on = value !== false;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${on ? onBg : offBg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-current' : 'bg-current'}`} />
      {on ? onLabel : offLabel}
    </button>
  );
}

const IconPlus = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <path d="M10 5v10M5 10h10" strokeLinecap="round" />
  </svg>
);
const IconMinus = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <path d="M5 10h10" strokeLinecap="round" />
  </svg>
);
const IconKey = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <circle cx="7" cy="13" r="3.2" />
    <path d="M9.3 10.7L16 4M13 7l2 2M11 9l1.5 1.5" strokeLinecap="round" />
  </svg>
);
const IconCopy = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
    <rect x="7" y="7" width="9" height="9" rx="2" />
    <path d="M4 13V5a1 1 0 011-1h8" strokeLinecap="round" />
  </svg>
);
const IconBank = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <rect x="2" y="8" width="16" height="9" rx="1.5" />
    <path d="M10 3l8 5H2l8-5z" />
  </svg>
);

// ── column config per mode ─────────────────────────────────────────────────

const COLS = {
  information: ['Username', 'Phone', 'Balance', 'Account', 'Betting', 'Withdrawal', 'Joined', 'Invite Code'],
  accounts:    ['Username', 'Account Status', 'Betting', 'Withdrawal', 'Role', 'RS Login', 'RS Auto Bet', 'Reset Password'],
  bank:        ['Username', 'Bank Name', 'Status', 'Action'],
  transfer:    ['Username', 'Phone', 'Balance', 'Actions', 'Invite Code'],
};

// ── main component ─────────────────────────────────────────────────────────

export default function UsersTable({
  users,
  loading,
  mode = 'overview',
  togglingId,
  onToggleWithdrawal,
  onToggleBetting,
  onToggleAccountStatus,
  onToggleRole,
  onToggleRoyalSpinLogin,
  onToggleRoyalSpin,
  onAddMoney,
  onDeductMoney,
  onResetPassword,
  onOpenBank,
}) {
  const cols = COLS[mode] || COLS.overview;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr className="bg-gray-50">
            {cols.map((col) => (
              <th key={col} className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={cols.length} className="px-6 py-16 text-center">
                <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <Spinner /> Loading users...
                </span>
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-6 py-16 text-center text-sm text-gray-500">
                No users found
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <UserRow
                key={user._id}
                user={user}
                mode={mode}
                isToggling={togglingId === user._id}
                onToggleWithdrawal={onToggleWithdrawal}
                onToggleBetting={onToggleBetting}
                onToggleAccountStatus={onToggleAccountStatus}
                onToggleRole={onToggleRole}
                onToggleRoyalSpinLogin={onToggleRoyalSpinLogin}
                onToggleRoyalSpin={onToggleRoyalSpin}
                onAddMoney={onAddMoney}
                onDeductMoney={onDeductMoney}
                onResetPassword={onResetPassword}
                onOpenBank={onOpenBank}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── row ────────────────────────────────────────────────────────────────────

function UserRow({ user, mode, isToggling, onToggleWithdrawal, onToggleBetting, onToggleAccountStatus, onToggleRole, onToggleRoyalSpinLogin, onToggleRoyalSpin, onAddMoney, onDeductMoney, onResetPassword, onOpenBank }) {
  const notify = useNotify();
  const hasBank = user.hasBankCard || user.bankAccount;

  const handleCopy = async () => {
    try {
      await copyToClipboard(user.username);
      notify.success('Username copied');
    } catch {
      notify.error('Failed to copy');
    }
  };

  const UsernameCell = (
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenBank?.(user)}
          className={`text-left text-sm font-medium transition-colors hover:underline ${hasBank ? 'text-blue-600' : 'text-gray-900'}`}
        >
          {user.username}
        </button>
        <button onClick={handleCopy} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" title="Copy username">
          {IconCopy}
        </button>
      </div>
    </td>
  );

  if (mode === 'information') {
    return (
      <tr className="transition-colors hover:bg-gray-50">
        {UsernameCell}
        <td className="px-6 py-4 text-sm text-gray-600 tabular-nums">{formatPhone(user.phoneNumber)}</td>
        <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{(user.money || 0).toLocaleString('en-US')}</td>
        <td className="px-6 py-4">
          <StatusBadge
            value={user.isActive}
            onLabel="Active" offLabel="Disabled"
            onColor={{ bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' }}
            offColor={{ bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' }}
          />
        </td>
        <td className="px-6 py-4">
          <StatusBadge
            value={user.allowBetting}
            onLabel="Enabled" offLabel="Disabled"
            onColor={{ bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' }}
            offColor={{ bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' }}
          />
        </td>
        <td className="px-6 py-4">
          <StatusBadge
            value={user.allowWithdrawal}
            onLabel="Allowed" offLabel="Disabled"
            onColor={{ bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' }}
            offColor={{ bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' }}
          />
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
        <td className="px-6 py-4">
          {user.inviteCode ? (
            <button
              onClick={async () => {
                try { await copyToClipboard(user.inviteCode); notify.success('Invite code copied'); }
                catch { notify.error('Failed to copy'); }
              }}
              title="Click to copy"
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              {user.inviteCode}
              <span className="opacity-50">{IconCopy}</span>
            </button>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
      </tr>
    );
  }

  if (mode === 'bank') {
    return (
      <tr className="transition-colors hover:bg-gray-50">
        {UsernameCell}
        <td className="px-6 py-4">
          {hasBank ? (
            <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
              {IconBank}
              {user.bankAccount || 'Linked'}
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </td>
        <td className="px-6 py-4">
          {hasBank ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Linked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              No card
            </span>
          )}
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => onOpenBank?.(user)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
              hasBank ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {IconBank} {hasBank ? 'View / Edit' : 'No card'}
          </button>
        </td>
      </tr>
    );
  }

  if (mode === 'accounts') {
    return (
      <tr className="transition-colors hover:bg-gray-50">
        {UsernameCell}

        {/* Account Status */}
        <td className="px-6 py-4">
          <button
            onClick={() => onToggleAccountStatus?.(user)}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${
              user.isActive !== false
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${user.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {user.isActive !== false ? 'Active' : 'Disabled'}
          </button>
        </td>

        {/* Betting */}
        <td className="px-6 py-4">
          <button
            onClick={() => onToggleBetting?.(user)}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${
              user.allowBetting !== false
                ? 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${user.allowBetting !== false ? 'bg-violet-500' : 'bg-orange-500'}`} />
            {user.allowBetting !== false ? 'Enabled' : 'Disabled'}
          </button>
        </td>

        {/* Withdrawal */}
        <td className="px-6 py-4">
          <button
            onClick={() => onToggleWithdrawal?.(user)}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${
              user.allowWithdrawal
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${user.allowWithdrawal ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {user.allowWithdrawal ? 'Allowed' : 'Disabled'}
          </button>
        </td>

        {/* Role */}
        <td className="px-6 py-4">
          <button
            onClick={() => onToggleRole?.(user)}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
              user.role === 'admin'
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${user.role === 'admin' ? 'bg-amber-500' : 'bg-gray-400'}`} />
            {user.role === 'admin' ? 'Admin' : 'User'}
          </button>
        </td>

        {/* RS Login */}
        <td className="px-6 py-4">
          <button
            onClick={() => onToggleRoyalSpinLogin?.(user)}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
              user.royalSpinLoginEnabled
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${user.royalSpinLoginEnabled ? 'bg-blue-500' : 'bg-gray-400'}`} />
            {user.royalSpinLoginEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </td>

        {/* RS Auto Bet */}
        <td className="px-6 py-4">
          <button
            onClick={() => onToggleRoyalSpin?.(user)}
            disabled={isToggling || !user.royalSpinLoginEnabled}
            title={!user.royalSpinLoginEnabled ? 'Enable RS Login first' : ''}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
              user.royalSpinActive
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${user.royalSpinActive ? 'bg-orange-500' : 'bg-gray-400'}`} />
            {user.royalSpinActive ? 'Working' : 'Stopped'}
          </button>
        </td>

        {/* Reset Password */}
        <td className="px-6 py-4">
          <button
            onClick={() => onResetPassword?.(user)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 active:scale-95"
          >
            {IconKey} Reset
          </button>
        </td>
      </tr>
    );
  }

  // transfer
  return (
    <tr className="transition-colors hover:bg-gray-50">
      {UsernameCell}
      <td className="px-6 py-4 text-sm text-gray-600 tabular-nums">{formatPhone(user.phoneNumber)}</td>
      <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{(user.money || 0).toLocaleString('en-US')}</td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onAddMoney?.(user)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 active:scale-95">
            {IconPlus} Add
          </button>
          <button onClick={() => onDeductMoney?.(user)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 active:scale-95">
            {IconMinus} Deduct
          </button>
        </div>
      </td>
      <td className="px-6 py-4">
        {user.inviteCode ? (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">{user.inviteCode}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}
