import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';
import AppModal, { ModalBtn } from './AppModal';
import {
    LayoutDashboard, Users, CreditCard, Banknote, Gift,
    ArrowLeftRight, Megaphone, Bomb, Spade, Shield,
    PanelLeftClose, PanelLeftOpen, LogOut,
    Menu, X, Bitcoin, UserCog, MoreHorizontal, Database, SlidersHorizontal,
} from 'lucide-react';

const G       = '#3a7d44';
const GH      = '#2e6437';
const BG      = '#eef4ef';
const BG_CARD = '#ffffff';
const DIVIDER = '#d3e4d6';

const buildNavGroups = (isSuperAdmin) => [
    {
        title: 'Overview',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', href: '/'      },
            { icon: Users,           label: 'Users',     href: '/users'  },
        ],
    },
    {
        title: 'Payments',
        items: [
            { icon: CreditCard,     label: 'Payments',        href: '/payments'        },
            { icon: Bitcoin,        label: 'Crypto Payments', href: '/crypto-payments' },
            { icon: Banknote,       label: 'Withdrawals',     href: '/withdrawals'     },
            { icon: ArrowLeftRight, label: 'Transactions',    href: '/transactions'    },
        ],
    },
    ...(isSuperAdmin ? [{
        title: 'Crypto',
        items: [
            { icon: Bitcoin, label: 'USDT Deposits', href: '/usdt-deposits' },
            { icon: Bitcoin, label: 'TRX Deposits',  href: '/trx-deposits'  },
        ],
    }] : []),
    {
        title: 'Content',
        items: [
            { icon: Gift,      label: 'Gifts',         href: '/gifts'         },
            { icon: Megaphone, label: 'Announcements', href: '/announcements' },
        ],
    },
    {
        title: 'Games',
        items: [
            { icon: Bomb,  label: 'Mines',     href: '/game/mines'     },
            { icon: Spade, label: 'Blackjack', href: '/game/blackjack' },
        ],
    },
    {
        title: 'Admin',
        items: [
            { icon: Shield, label: 'Security', href: '/security' },
            ...(isSuperAdmin ? [
                { icon: UserCog,          label: 'Admin Mgmt',    href: '/admin-management' },
                { icon: SlidersHorizontal, label: 'Deposit Config', href: '/deposit-config'   },
                { icon: Database,          label: 'DB Backup',      href: '/db-backup'        },
            ] : []),
        ],
    },
];

// Bottom nav — 5 quick-access tabs for mobile
const BOTTOM_NAV = [
    { icon: LayoutDashboard, label: 'Home',     href: '/'          },
    { icon: Users,           label: 'Users',    href: '/users'     },
    { icon: CreditCard,      label: 'Payments', href: '/payments'  },
    { icon: Gift,            label: 'Gifts',    href: '/gifts'     },
    { icon: MoreHorizontal,  label: 'More',     href: null         }, // opens drawer
];

function UserAvatar({ username, size = 'md' }) {
    const letter = (username || 'A')[0].toUpperCase();
    const sz = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
    return (
        <div className={`${sz} flex items-center justify-center font-bold text-white shrink-0`}
             style={{ background: G }}>
            {letter}
        </div>
    );
}

export default function Sidebar() {
    const [isCollapsed,  setIsCollapsed ] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const navigate  = useNavigate();
    const location  = useLocation();
    const { logout, user } = useContext(AuthContext);

    const navGroups = buildNavGroups(user?.role === 'super_admin');
    const active    = location.pathname;

    const [showSignOutModal, setShowSignOutModal] = useState(false);

    const handleLogout = () => { logout(); navigate('/login'); };
    const handleNav    = (href) => { navigate(href); setIsMobileOpen(false); };

    return (
        <>
            {/* ════════════════════════════════
                MOBILE ONLY
            ════════════════════════════════ */}

            {/* Mobile top bar */}
            {createPortal(
                <div
                    className="md:hidden fixed inset-x-0 top-0 z-[60] flex items-center gap-3 px-4"
                    style={{
                        background: BG,
                        borderBottom: `1px solid ${DIVIDER}`,
                        height: 'calc(52px + env(safe-area-inset-top, 0px))',
                        paddingTop: 'env(safe-area-inset-top, 0px)',
                    }}
                >
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="w-9 h-9 flex items-center justify-center shrink-0"
                        style={{ color: G }}
                    >
                        <Menu size={22} />
                    </button>
                    <div className="flex flex-col leading-tight min-w-0">
                        <span className="text-[14px] font-extrabold text-gray-900 truncate">Big Mumbai</span>
                        <span className="text-[8px] font-semibold tracking-[0.16em] uppercase" style={{ color: G }}>
                            Admin Panel
                        </span>
                    </div>
                </div>,
                document.body
            )}

            {/* Mobile backdrop */}
            {isMobileOpen && createPortal(
                <div
                    className="md:hidden fixed inset-0 z-[65] bg-black/40"
                    onClick={() => setIsMobileOpen(false)}
                />,
                document.body
            )}

            {/* Mobile bottom nav */}
            {createPortal(
                <nav
                    className="md:hidden fixed inset-x-0 bottom-0 z-[60] flex"
                    style={{
                        background: BG_CARD,
                        borderTop: `1px solid ${DIVIDER}`,
                        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    }}
                >
                    {BOTTOM_NAV.map(({ icon: Icon, label, href }) => {
                        const isActive = href && (active === href || (href !== '/' && active.startsWith(href)));
                        return (
                            <button
                                key={label}
                                onClick={() => href ? handleNav(href) : setIsMobileOpen(true)}
                                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
                                style={{ color: isActive ? G : '#9ca3af' }}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                                <span className="text-[10px] font-medium">{label}</span>
                            </button>
                        );
                    })}
                </nav>,
                document.body
            )}

            {/* ════════════════════════════════
                SIDEBAR DRAWER / PANEL
            ════════════════════════════════ */}
            <aside
                className={`
                    h-[100dvh] flex flex-col shrink-0
                    fixed md:relative inset-y-0 left-0 z-[66]
                    transition-all duration-300 ease-out
                    w-[min(280px,85vw)] md:w-auto
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${isCollapsed ? 'md:w-[68px]' : 'md:w-[230px]'}
                `}
                style={{
                    background: BG,
                    borderRight: `1px solid ${DIVIDER}`,
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
            >
                {/* ── Header ── */}
                <div
                    className="flex items-center justify-between px-4 h-[60px] shrink-0"
                    style={{ borderBottom: `1px solid ${DIVIDER}` }}
                >
                    {!isCollapsed && (
                        <div className="flex flex-col leading-tight overflow-hidden">
                            <span className="text-[15px] font-extrabold tracking-wide truncate text-gray-900">
                                Big Mumbai
                            </span>
                            <span className="text-[9px] font-semibold tracking-[0.18em] uppercase mt-0.5" style={{ color: G }}>
                                Admin Panel
                            </span>
                        </div>
                    )}
                    {/* Desktop collapse toggle */}
                    <button
                        onClick={() => setIsCollapsed(v => { localStorage.setItem('sidebar_collapsed', String(!v)); return !v; })}
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={`hidden md:grid h-7 w-7 shrink-0 place-items-center text-gray-400 hover:text-gray-700 transition-colors focus:outline-none ${isCollapsed ? 'mx-auto' : ''}`}
                    >
                        {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                    </button>
                    {/* Mobile close button */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden grid h-8 w-8 shrink-0 place-items-center text-gray-500 hover:text-gray-800 focus:outline-none"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── User card ── */}
                <div
                    className={`mx-3 mt-3.5 mb-1 shrink-0 ${isCollapsed ? 'p-1.5 flex justify-center' : 'p-3'}`}
                    style={{ background: BG_CARD, border: `1px solid ${DIVIDER}` }}
                >
                    {isCollapsed ? (
                        <UserAvatar username={user?.username} size="sm" />
                    ) : (
                        <div className="flex items-center gap-2.5">
                            <UserAvatar username={user?.username} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-gray-900 truncate">
                                    {user?.username || 'Admin'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="h-1.5 w-1.5 shrink-0" style={{ background: G }} />
                                    <span className="text-[10px] font-medium" style={{ color: G }}>Online</span>
                                    <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400 truncate">
                                        {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Navigation ── */}
                <nav className="flex-1 overflow-y-auto sidebar-scroll px-2.5 py-3 space-y-4">
                    {navGroups.map((group) => (
                        <div key={group.title}>
                            {!isCollapsed && (
                                <p className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                    {group.title}
                                </p>
                            )}
                            {isCollapsed && (
                                <div className="mx-auto mb-2 h-px w-8" style={{ background: DIVIDER }} />
                            )}
                            <div className="space-y-0.5">
                                {group.items.map(({ icon: Icon, label, href }) => {
                                    const isActive = active === href || (href !== '/' && active.startsWith(href));
                                    return (
                                        <button
                                            key={href}
                                            onClick={() => handleNav(href)}
                                            title={isCollapsed ? label : undefined}
                                            className={`relative flex w-full items-center gap-2.5 px-2.5 py-[9px] text-[13px] font-medium transition-all duration-150 focus:outline-none ${isCollapsed ? 'justify-center' : ''}`}
                                            style={isActive
                                                ? { background: G, color: '#ffffff' }
                                                : { color: '#374151' }}
                                            onMouseEnter={e => {
                                                if (!isActive) {
                                                    e.currentTarget.style.background = '#dceede';
                                                    e.currentTarget.style.color = GH;
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!isActive) {
                                                    e.currentTarget.style.background = '';
                                                    e.currentTarget.style.color = '#374151';
                                                }
                                            }}
                                        >
                                            {isActive && (
                                                <span
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5"
                                                    style={{ background: GH }}
                                                />
                                            )}
                                            <Icon size={15} className="shrink-0" />
                                            {!isCollapsed && (
                                                <span className="flex-1 truncate text-left">{label}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* ── Footer ── */}
                <div
                    className="shrink-0 px-2.5 py-3"
                    style={{ borderTop: `1px solid ${DIVIDER}` }}
                >
                    <button
                        onClick={() => setShowSignOutModal(true)}
                        title={isCollapsed ? 'Sign out' : undefined}
                        className={`flex w-full items-center gap-2.5 px-2.5 py-[9px] text-[13px] font-medium transition-all focus:outline-none ${isCollapsed ? 'justify-center' : ''}`}
                        style={{ color: '#ef4444' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                    >
                        <LogOut size={15} className="shrink-0" />
                        {!isCollapsed && <span>Sign out</span>}
                    </button>
                </div>
            </aside>

            {/* Sign-out confirmation modal */}
            {showSignOutModal && (
                <AppModal onClose={() => setShowSignOutModal(false)} onConfirm={handleLogout} size="sm">
                    <AppModal.Header
                        icon={<LogOut size={16} />}
                        title="Sign out"
                        subtitle="You will be returned to the login screen."
                        onClose={() => setShowSignOutModal(false)}
                        accent="rose"
                    />
                    <AppModal.Footer>
                        <ModalBtn variant="secondary" onClick={() => setShowSignOutModal(false)}>Cancel</ModalBtn>
                        <ModalBtn variant="rose" onClick={handleLogout}>Sign out</ModalBtn>
                    </AppModal.Footer>
                </AppModal>
            )}
        </>
    );
}
