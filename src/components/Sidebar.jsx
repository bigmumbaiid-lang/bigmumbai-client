import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';
import {
    LayoutDashboard, Users, CreditCard, Banknote, Gift,
    ArrowLeftRight, Megaphone, Bomb, Spade, Shield,
    PanelLeftClose, PanelLeftOpen, LifeBuoy, LogOut,
    ChevronDown, Menu, X, Bitcoin, UserCog,
} from 'lucide-react';

const USER_SUBNAV = [
    { key: 'information', label: 'Information'     },
    { key: 'accounts',    label: 'Account Controls'},
    { key: 'bank',        label: 'Bank Card'       },
    { key: 'transfer',    label: 'Transfer'        },
];

const buildNavGroups = (isSuperAdmin) => [
    {
        title: 'Overview',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', href: '/'     },
            { icon: Users,           label: 'Users',     href: '/users', hasSubnav: true },
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
            ...(isSuperAdmin ? [{ icon: UserCog, label: 'Admin Management', href: '/admin-management' }] : []),
        ],
    },
];

function UserAvatar({ username, size = 'md' }) {
    const letter = (username || 'A')[0].toUpperCase();
    const sz = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
    return (
        <div className={`${sz} rounded-xl flex items-center justify-center font-bold text-white shrink-0`}
            style={{ background: 'linear-gradient(135deg,#d9ad82,#b1835a)', boxShadow: '0 2px 8px rgba(217,173,130,0.35)' }}>
            {letter}
        </div>
    );
}

export default function Sidebar() {
    const [isCollapsed,  setIsCollapsed ] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [usersOpen,    setUsersOpen   ] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useContext(AuthContext);

    const navGroups  = buildNavGroups(user?.role === 'super_admin');
    const active     = location.pathname;
    const activeSubTab = new URLSearchParams(location.search).get('tab') || 'information';

    const handleLogout = () => { logout(); navigate('/login'); };

    const handleNav = (href) => {
        navigate(href);
        setIsMobileOpen(false);
    };

    const handleUsersClick = () => {
        if (active !== '/users') {
            navigate(`/users?tab=${activeSubTab}`);
            setUsersOpen(true);
        } else {
            setUsersOpen(v => !v);
        }
        setIsMobileOpen(false);
    };

    return (
        <>
            {/* Mobile hamburger */}
            {createPortal(
                <button
                    aria-label="Open menu"
                    className={`md:hidden fixed top-3.5 left-3.5 z-[70] w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg transition-opacity ${isMobileOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    style={{ background: 'linear-gradient(135deg,#0d1117,#1a2035)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={() => setIsMobileOpen(true)}
                >
                    <Menu size={18} />
                </button>,
                document.body
            )}

            {/* Mobile backdrop */}
            {isMobileOpen && createPortal(
                <div className="md:hidden fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)} />,
                document.body
            )}

            {/* Sidebar */}
            <aside
                className={`
                    h-screen flex flex-col shrink-0
                    fixed md:relative inset-y-0 left-0 z-[66]
                    transition-all duration-300 ease-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${isCollapsed ? 'w-[68px]' : 'w-[220px]'}
                `}
                style={{ background: '#0f1117', borderRight: '1px solid rgba(255,255,255,0.05)' }}
            >
                {/* Ambient glows */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-24 -left-12 h-56 w-56 rounded-full bg-amber-500/[0.04] blur-3xl" />
                    <div className="absolute bottom-20 -right-16 h-48 w-48 rounded-full bg-amber-600/[0.03] blur-3xl" />
                </div>

                {/* ── Header ── */}
                <div className="relative flex items-center justify-between px-4 h-[60px] shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {!isCollapsed && (
                        <div className="flex flex-col leading-tight overflow-hidden">
                            <span className="text-[15px] font-extrabold tracking-wide truncate"
                                style={{ background: 'linear-gradient(90deg,#e2b97a,#c49055)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Big Mumbai
                            </span>
                            <span className="text-[9px] text-slate-600 font-semibold tracking-[0.18em] uppercase mt-0.5">
                                Admin Panel
                            </span>
                        </div>
                    )}

                    {/* Desktop collapse toggle */}
                    <button
                        onClick={() => setIsCollapsed(v => !v)}
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={`hidden md:grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all focus:outline-none ${isCollapsed ? 'mx-auto' : ''}`}
                    >
                        {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                    </button>

                    {/* Mobile close */}
                    <button onClick={() => setIsMobileOpen(false)}
                        className="md:hidden grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all focus:outline-none">
                        <X size={15} />
                    </button>
                </div>

                {/* ── User card ── */}
                <div className={`relative mx-3 mt-3.5 mb-1 rounded-xl overflow-hidden shrink-0 ${isCollapsed ? 'p-1.5 flex justify-center' : 'p-3'}`}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {isCollapsed ? (
                        <UserAvatar username={user?.username} size="sm" />
                    ) : (
                        <div className="flex items-center gap-2.5">
                            <UserAvatar username={user?.username} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-white truncate">{user?.username || 'Admin'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 5px #34d399' }} />
                                    <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                                    <span className="ml-1 text-[9px] text-slate-600 font-medium uppercase tracking-wide">
                                        {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Navigation ── */}
                <nav className="relative flex-1 overflow-y-auto sidebar-scroll px-2.5 py-3 space-y-4">
                    {navGroups.map((group) => (
                        <div key={group.title}>
                            {/* Group label */}
                            {!isCollapsed && (
                                <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700">
                                    {group.title}
                                </p>
                            )}
                            {isCollapsed && (
                                <div className="mx-auto mb-2 h-px w-8" style={{ background: 'rgba(255,255,255,0.05)' }} />
                            )}

                            <div className="space-y-0.5">
                                {group.items.map(({ icon: Icon, label, href, hasSubnav }) => {
                                    const isActive  = active === href || (href === '/users' && active === '/users');
                                    const isUsers   = hasSubnav;
                                    const showSub   = isUsers && usersOpen && !isCollapsed;

                                    return (
                                        <div key={href}>
                                            <button
                                                onClick={isUsers ? handleUsersClick : () => handleNav(href)}
                                                title={isCollapsed ? label : undefined}
                                                className={`
                                                    relative flex w-full items-center gap-2.5 rounded-lg
                                                    px-2.5 py-[9px] text-[13px] font-medium
                                                    transition-all duration-150 focus:outline-none
                                                    ${isCollapsed ? 'justify-center' : ''}
                                                    ${isActive
                                                        ? 'text-white'
                                                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                                                    }
                                                `}
                                                style={isActive ? {
                                                    background: 'linear-gradient(135deg,rgba(217,173,130,0.14),rgba(177,131,90,0.08))',
                                                    boxShadow: 'inset 0 0 0 1px rgba(217,173,130,0.12)',
                                                } : {}}
                                            >
                                                {/* Active bar */}
                                                {isActive && (
                                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                                        style={{ background: 'linear-gradient(180deg,#e2b97a,#b1835a)' }} />
                                                )}

                                                <Icon size={15} className={`shrink-0 transition-colors ${isActive ? 'text-amber-400' : 'text-slate-600'}`} />

                                                {!isCollapsed && (
                                                    <>
                                                        <span className="flex-1 truncate text-left">{label}</span>
                                                        {/* Chevron for accordion items */}
                                                        {isUsers && (
                                                            <ChevronDown
                                                                size={13}
                                                                className={`shrink-0 text-slate-600 transition-transform duration-250 ${usersOpen ? 'rotate-180' : ''}`}
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </button>

                                            {/* Collapsible sub-nav */}
                                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showSub ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="ml-3.5 mt-0.5 pl-3 pb-1 space-y-0.5"
                                                    style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
                                                    {USER_SUBNAV.map(({ key, label: subLabel }) => {
                                                        const subActive = active === '/users' && activeSubTab === key;
                                                        return (
                                                            <button
                                                                key={key}
                                                                onClick={() => handleNav(`/users?tab=${key}`)}
                                                                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-[12px] font-medium transition-all duration-150 focus:outline-none ${
                                                                    subActive
                                                                        ? 'text-amber-300 bg-white/[0.06]'
                                                                        : 'text-slate-600 hover:text-slate-200 hover:bg-white/[0.03]'
                                                                }`}
                                                            >
                                                                <span className={`h-[5px] w-[5px] rounded-full shrink-0 transition-all ${
                                                                    subActive ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-slate-700'
                                                                }`} />
                                                                {subLabel}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* ── Footer ── */}
                <div className="relative shrink-0 px-2.5 py-3 space-y-0.5"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={() => navigate('/support')}
                        title={isCollapsed ? 'Support' : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[13px] font-medium text-slate-600 hover:bg-white/[0.04] hover:text-slate-300 transition-all focus:outline-none ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <LifeBuoy size={15} className="shrink-0" />
                        {!isCollapsed && <span>Support</span>}
                    </button>

                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? 'Sign out' : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[13px] font-medium text-rose-500/60 hover:bg-rose-500/[0.08] hover:text-rose-400 transition-all focus:outline-none ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={15} className="shrink-0" />
                        {!isCollapsed && <span>Sign out</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
