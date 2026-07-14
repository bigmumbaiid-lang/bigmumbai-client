import { useNotify } from '../../context/NotifyContext';
import { copyToClipboard } from '../../utils/clipboard';
import { formatDate } from '../../utils/format';

const G  = '#3a7d44';
const GL = '#e8f5ea';

// Derive a live activity status from the user's lastActive timestamp:
//   🟢 Online (<2 min) · 🟡 Recently active (<10 min) · otherwise "X ago" / Never.
function activityStatus(lastActive) {
  if (!lastActive) return { label: 'Never', bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' };
  const mins = Math.floor((Date.now() - new Date(lastActive).getTime()) / 60000);
  if (mins < 2)  return { label: 'Online',          bg: '#e8f5ea', color: '#15803d', dot: '#22c55e' };
  if (mins < 10) return { label: 'Recently active', bg: '#fef9c3', color: '#a16207', dot: '#eab308' };
  let ago;
  if (mins < 60) ago = `${mins}m ago`;
  else {
    const hrs = Math.floor(mins / 60);
    ago = hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
  }
  return { label: ago, bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' };
}

function formatPhone(raw) {
  if (!raw) return '-';
  const digits = String(raw).replace(/\D/g, '');
  const local =
    digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
    : digits;
  if (local.length === 10) return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  return `${raw} (invalid)`;
}

const Spinner = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-gray-400" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Square badge (status display only)
function Badge({ bg, color, dot, children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
      style={{ background: bg, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {children}
    </span>
  );
}

// Square toggle button
function ToggleBadge({ on, onBg, onColor, offBg, offColor, onLabel, offLabel, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60"
      style={{ background: on ? onBg : offBg, color: on ? onColor : offColor }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? onColor : offColor }} />
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

const COLS = {
  information: ['Username', 'Phone', 'Balance', 'Status', 'Joined', 'Invite Code'],
  accounts:    ['Username', 'Account Status', 'Betting', 'Withdrawal', 'Role', 'RS Login', 'RS Auto Bet', 'Reset Password'],
  bank:        ['Username', 'Bank Name', 'Status', 'Action'],
  transfer:    ['Username', 'Phone', 'Balance', 'Actions', 'Invite Code'],
};

export default function UsersTable({
  users, loading, mode = 'overview', togglingId,
  onToggleWithdrawal, onToggleBetting, onToggleAccountStatus, onToggleRole,
  onToggleRoyalSpinLogin, onToggleRoyalSpin,
  onAddMoney, onDeductMoney, onResetPassword, onOpenBank,
}) {
  const cols = COLS[mode] || COLS.information;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr style={{ background: GL }} className="border-b border-gray-200">
            {cols.map((col) => (
              <th
                key={col}
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: G }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={cols.length} className="px-6 py-16 text-center">
                <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <Spinner /> Loading users…
                </span>
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-6 py-16 text-center text-sm text-gray-400">
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

function UserRow({
  user, mode, isToggling,
  onToggleWithdrawal, onToggleBetting, onToggleAccountStatus, onToggleRole,
  onToggleRoyalSpinLogin, onToggleRoyalSpin,
  onAddMoney, onDeductMoney, onResetPassword, onOpenBank,
}) {
  const notify = useNotify();
  const hasBank = user.hasBankCard || user.bankAccount;

  const handleCopy = async () => {
    try { await copyToClipboard(user.username); notify.success('Username copied'); }
    catch { notify.error('Failed to copy'); }
  };

  const UsernameCell = (
    <td className="px-6 py-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenBank?.(user)}
          className="text-left text-sm font-semibold transition-colors hover:underline"
          style={{ color: hasBank ? G : '#111827' }}
        >
          {user.username}
        </button>
        <button
          onClick={handleCopy}
          className="flex h-6 w-6 items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          title="Copy username"
        >
          {IconCopy}
        </button>
      </div>
    </td>
  );

  if (mode === 'information') {
    return (
      <tr className="hover:bg-[#f6fbf6] transition-colors">
        {UsernameCell}
        <td className="px-6 py-4 text-sm text-gray-600 tabular-nums">{formatPhone(user.phoneNumber)}</td>
        <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{(user.money || 0).toLocaleString('en-US')}</td>
        <td className="px-6 py-4">
          {(() => {
            const s = activityStatus(user.lastActive);
            return <Badge bg={s.bg} color={s.color} dot={s.dot}>{s.label}</Badge>;
          })()}
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
              className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-xs text-gray-600 bg-gray-100 hover:bg-[#e8f5ea] hover:text-[#3a7d44] transition"
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
      <tr className="hover:bg-[#f6fbf6] transition-colors">
        {UsernameCell}
        <td className="px-6 py-4">
          {hasBank ? (
            <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
              {IconBank} {user.bankAccount || 'Linked'}
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </td>
        <td className="px-6 py-4">
          <Badge
            bg={hasBank ? GL : '#f3f4f6'}
            color={hasBank ? G : '#6b7280'}
            dot={hasBank ? G : '#9ca3af'}
          >
            {hasBank ? 'Linked' : 'No card'}
          </Badge>
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => onOpenBank?.(user)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition"
            style={hasBank
              ? { background: '#eff6ff', color: '#1d4ed8' }
              : { background: '#f3f4f6', color: '#6b7280' }}
          >
            {IconBank} {hasBank ? 'View / Edit' : 'No card'}
          </button>
        </td>
      </tr>
    );
  }

  if (mode === 'accounts') {
    return (
      <tr className="hover:bg-[#f6fbf6] transition-colors">
        {UsernameCell}

        <td className="px-6 py-4">
          <ToggleBadge
            on={user.isActive !== false}
            onBg={GL} onColor={G} offBg="#fee2e2" offColor="#b91c1c"
            onLabel="Active" offLabel="Disabled"
            onClick={() => onToggleAccountStatus?.(user)} disabled={isToggling}
          />
        </td>
        <td className="px-6 py-4">
          <ToggleBadge
            on={user.allowBetting !== false}
            onBg="#ede9fe" onColor="#6d28d9" offBg="#fff7ed" offColor="#c2410c"
            onLabel="Enabled" offLabel="Disabled"
            onClick={() => onToggleBetting?.(user)} disabled={isToggling}
          />
        </td>
        <td className="px-6 py-4">
          <ToggleBadge
            on={user.allowWithdrawal}
            onBg={GL} onColor={G} offBg="#fee2e2" offColor="#b91c1c"
            onLabel="Allowed" offLabel="Disabled"
            onClick={() => onToggleWithdrawal?.(user)} disabled={isToggling}
          />
        </td>
        <td className="px-6 py-4">
          <ToggleBadge
            on={user.role === 'admin'}
            onBg="#fef9c3" onColor="#a16207" offBg="#f3f4f6" offColor="#6b7280"
            onLabel="Admin" offLabel="User"
            onClick={() => onToggleRole?.(user)} disabled={isToggling}
          />
        </td>
        <td className="px-6 py-4">
          <ToggleBadge
            on={user.royalSpinLoginEnabled}
            onBg="#eff6ff" onColor="#1d4ed8" offBg="#f3f4f6" offColor="#6b7280"
            onLabel="Enabled" offLabel="Disabled"
            onClick={() => onToggleRoyalSpinLogin?.(user)} disabled={isToggling}
          />
        </td>
        <td className="px-6 py-4">
          <ToggleBadge
            on={user.royalSpinActive}
            onBg="#fff7ed" onColor="#c2410c" offBg="#f3f4f6" offColor="#6b7280"
            onLabel="Working" offLabel="Stopped"
            onClick={() => onToggleRoyalSpin?.(user)}
            disabled={isToggling || !user.royalSpinLoginEnabled}
          />
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => onResetPassword?.(user)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#fef9c3] text-[#a16207] hover:bg-[#fef08a] transition"
          >
            {IconKey} Reset
          </button>
        </td>
      </tr>
    );
  }

  // transfer mode
  return (
    <tr className="hover:bg-[#f6fbf6] transition-colors">
      {UsernameCell}
      <td className="px-6 py-4 text-sm text-gray-600 tabular-nums">{formatPhone(user.phoneNumber)}</td>
      <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{(user.money || 0).toLocaleString('en-US')}</td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onAddMoney?.(user)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition"
            style={{ background: GL, color: G }}
          >
            {IconPlus} Add
          </button>
          <button
            onClick={() => onDeductMoney?.(user)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition"
            style={{ background: '#fee2e2', color: '#b91c1c' }}
          >
            {IconMinus} Deduct
          </button>
        </div>
      </td>
      <td className="px-6 py-4">
        {user.inviteCode ? (
          <span className="px-2 py-0.5 font-mono text-xs text-gray-600 bg-gray-100">{user.inviteCode}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}
