import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import axiosInstance from '../utils/axios';
import { useNotify } from '../context/NotifyContext';
import { Settings, RefreshCw, RotateCcw, Save, X, Plus, GripVertical, Eye, EyeOff } from 'lucide-react';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const CHANNEL_META = {
    watchpays: { label: 'Watch Pay',  sub: 'Gateway',      color: '#7c3aed', bg: '#f5f3ff', defaultMin: 100,  defaultMax: 80000   },
    jazpays:   { label: 'Jaz Pay',    sub: 'Gateway',      color: '#2563eb', bg: '#eff6ff', defaultMin: 100,  defaultMax: 80000   },
    bondpay:   { label: 'BondPay',    sub: 'Gateway',      color: '#ea580c', bg: '#fff7ed', defaultMin: 100,  defaultMax: 80000   },
    trx:       { label: 'TRX',        sub: 'TRON Network', color: '#dc2626', bg: '#fef2f2', defaultMin: 100,  defaultMax: 1000000 },
    usdt:      { label: 'USDT TRC20', sub: 'Tether',       color: '#059669', bg: '#ecfdf5', defaultMin: 5000, defaultMax: 1000000 },
};
const ALL_CHANNEL_IDS = ['watchpays', 'jazpays', 'bondpay', 'trx', 'usdt'];
const DEFAULT_AMOUNTS  = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000];

// ── Chip drag-and-drop ────────────────────────────────────────────────────────
function AmountChips({ amounts, setAmounts, setDirty, color, bg }) {
    const dragIdx = useRef(null);

    const onDragStart = (i) => { dragIdx.current = i; };
    const onDragOver  = (e, i) => {
        e.preventDefault();
        if (dragIdx.current === null || dragIdx.current === i) return;
        const next = [...amounts];
        const [moved] = next.splice(dragIdx.current, 1);
        next.splice(i, 0, moved);
        setAmounts(next);
        dragIdx.current = i;
        setDirty(true);
    };
    const onDragEnd = () => { dragIdx.current = null; };

    return (
        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
            {amounts.map((amt, i) => (
                <span
                    key={`${amt}-${i}`}
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={e => onDragOver(e, i)}
                    onDragEnd={onDragEnd}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold border rounded-full cursor-grab active:cursor-grabbing select-none"
                    style={{ borderColor: color + '60', background: bg, color }}
                >
                    <GripVertical size={9} className="opacity-40 shrink-0" />
                    ₹{amt.toLocaleString('en-US')}
                    <button type="button" onClick={() => {
                        setAmounts(amounts.filter((_, idx) => idx !== i));
                        setDirty(true);
                    }} className="hover:opacity-70 transition">
                        <X size={9} />
                    </button>
                </span>
            ))}
            {amounts.length === 0 && (
                <span className="text-xs text-gray-300 italic">No amounts — add one below</span>
            )}
        </div>
    );
}

// ── Per-channel card ──────────────────────────────────────────────────────────
function ChannelCard({ channelId, savedConfig, onSave, onReset, dragHandleProps }) {
    const ch     = CHANNEL_META[channelId];
    const notify = useNotify();
    const saved = savedConfig || {};
    const isCustom = (saved.amounts?.length > 0) || saved.min != null || saved.max != null || saved.enabled === false;

    const [amounts,  setAmounts ] = useState(saved.amounts?.length ? saved.amounts : DEFAULT_AMOUNTS);
    const [minVal,   setMinVal  ] = useState(saved.min     != null ? String(saved.min)  : String(ch.defaultMin));
    const [maxVal,   setMaxVal  ] = useState(saved.max     != null ? String(saved.max)  : String(ch.defaultMax));
    const [enabled,  setEnabled ] = useState(saved.enabled !== false);
    const [newAmt,   setNewAmt  ] = useState('');
    const [saving,   setSaving  ] = useState(false);
    const [dirty,    setDirty   ] = useState(false);

    useEffect(() => {
        const s = savedConfig || {};
        setAmounts(s.amounts?.length ? s.amounts : DEFAULT_AMOUNTS);
        setMinVal(s.min  != null ? String(s.min)  : String(ch.defaultMin));
        setMaxVal(s.max  != null ? String(s.max)  : String(ch.defaultMax));
        setEnabled(s.enabled !== false);
        setDirty(false);
    }, [savedConfig]); // eslint-disable-line

    const addAmount = () => {
        const n = Number(newAmt);
        if (!n || n <= 0) return;
        setAmounts(prev => [...prev, n]);
        setNewAmt(''); setDirty(true);
    };

    const handleToggleEnabled = async () => {
        const next = !enabled;
        const ok = await notify.confirm({
            title:        next ? `Show ${ch.label}?` : `Hide ${ch.label}?`,
            message:      next
                ? `${ch.label} will become visible on the deposit page for all users.`
                : `${ch.label} will be hidden from the deposit page. Users won't be able to select it.`,
            confirmLabel: next ? 'Show' : 'Hide',
            variant:      next ? 'primary' : 'danger',
        });
        if (!ok) return;
        setEnabled(next);
        await onSave(channelId, { enabled: next });
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave(channelId, {
            amounts,
            min:     Number(minVal) || null,
            max:     Number(maxVal) || null,
            enabled,
        });
        setSaving(false);
        setDirty(false);
    };

    return (
        <div className={`bg-white border overflow-hidden transition-opacity ${enabled ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{ background: ch.bg }}>
                {/* Drag handle for card */}
                <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0">
                    <GripVertical size={16} />
                </div>

                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: ch.color }}>
                    {ch.label.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{ch.label}</p>
                    <p className="text-[11px] text-gray-400">{ch.sub}</p>
                </div>

                {/* Enable/disable toggle */}
                <button
                    onClick={handleToggleEnabled}
                    title={enabled ? 'Hide channel' : 'Show channel'}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold border transition shrink-0"
                    style={enabled
                        ? { borderColor: ch.color + '50', color: ch.color, background: 'white' }
                        : { borderColor: '#d1d5db', color: '#9ca3af', background: '#f9fafb' }
                    }
                >
                    {enabled ? <Eye size={11} /> : <EyeOff size={11} />}
                    {enabled ? 'Visible' : 'Hidden'}
                </button>

                {isCustom && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                        style={{ background: ch.color }}>
                        Custom
                    </span>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Min / Max */}
                <div className="grid grid-cols-2 gap-3">
                    {[['Min', minVal, setMinVal], ['Max', maxVal, setMaxVal]].map(([label, val, setter]) => (
                        <div key={label}>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label} (₹)</label>
                            <div className="flex items-center border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition px-3 py-2 gap-1">
                                <span className="text-gray-400 text-sm">₹</span>
                                <input type="number" min="1" value={val}
                                    onChange={e => { setter(e.target.value); setDirty(true); }}
                                    className="flex-1 text-sm font-semibold text-gray-800 bg-transparent focus:outline-none" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick amounts with drag-and-drop */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Quick Select Amounts <span className="font-normal text-gray-400 normal-case">(drag to reorder)</span>
                    </label>
                    <AmountChips
                        amounts={amounts}
                        setAmounts={setAmounts}
                        setDirty={setDirty}
                        color={ch.color}
                        bg={ch.bg}
                    />
                    <div className="flex gap-2 mt-1">
                        <div className="flex-1 flex items-center border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition px-3 py-1.5 gap-1">
                            <span className="text-gray-400 text-sm">₹</span>
                            <input type="number" min="1" value={newAmt}
                                onChange={e => setNewAmt(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addAmount()}
                                placeholder="Add amount…"
                                className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none" />
                        </div>
                        <button type="button" onClick={addAmount}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white transition"
                            style={{ background: ch.color }}>
                            <Plus size={12} /> Add
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    <button onClick={handleSave} disabled={saving || !dirty}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-40"
                        style={{ background: G }}>
                        {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    {isCustom && (
                        <button onClick={() => onReset(channelId)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition">
                            <RotateCcw size={12} /> Reset
                        </button>
                    )}
                    {dirty && !saving && (
                        <span className="ml-auto text-[10px] text-amber-500 font-semibold">Unsaved changes</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DepositConfig() {
    const notify = useNotify();
    const [config,       setConfig      ] = useState(null);
    const [loading,      setLoading     ] = useState(true);
    const [channelOrder, setChannelOrder] = useState(ALL_CHANNEL_IDS);

    // Card drag-and-drop
    const cardDragIdx  = useRef(null);
    const [draggingCard, setDraggingCard] = useState(null);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get('/deposit-config');
            const cfg = data.data || {};
            setConfig(cfg);
            if (cfg.channelOrder?.length === ALL_CHANNEL_IDS.length) setChannelOrder(cfg.channelOrder);
            else setChannelOrder(ALL_CHANNEL_IDS);
        } catch { notify.error('Failed to load deposit config'); }
        finally  { setLoading(false); }
    };

    useEffect(() => { fetchConfig(); }, []); // eslint-disable-line

    const handleSave = async (channelId, payload) => {
        try {
            const { data } = await axiosInstance.patch('/deposit-config', { channelId, ...payload });
            setConfig(data.data);
            notify.success(`${CHANNEL_META[channelId].label} saved`);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Save failed');
        }
    };

    const handleReset = async (channelId) => {
        const ok = await notify.confirm({
            title: `Reset ${CHANNEL_META[channelId].label}?`,
            message: 'Remove custom settings and restore defaults.',
            confirmLabel: 'Reset', variant: 'warning',
        });
        if (!ok) return;
        try {
            const { data } = await axiosInstance.delete(`/deposit-config/${channelId}/reset`);
            setConfig(data.data);
            notify.success(`${CHANNEL_META[channelId].label} reset to defaults`);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Reset failed');
        }
    };

    // Card drag handlers
    const onCardDragStart = (i) => { cardDragIdx.current = i; setDraggingCard(i); };
    const onCardDragOver  = (e, i) => {
        e.preventDefault();
        if (cardDragIdx.current === null || cardDragIdx.current === i) return;
        const next = [...channelOrder];
        const [moved] = next.splice(cardDragIdx.current, 1);
        next.splice(i, 0, moved);
        setChannelOrder(next);
        cardDragIdx.current = i;
        setDraggingCard(i);
    };
    const onCardDragEnd = async () => {
        const finalOrder = channelOrder;
        cardDragIdx.current = null;
        setDraggingCard(null);
        try {
            await axiosInstance.patch('/deposit-config/order', { order: finalOrder });
        } catch { notify.error('Failed to save channel order'); }
    };

    return (
        <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
            <Sidebar />
            <main className="flex-1 overflow-auto">
                <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:sticky md:top-0 z-10 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: G }}>Super Admin</p>
                        <h1 className="text-xl font-extrabold text-gray-900">Deposit Config</h1>
                        <p className="text-xs text-gray-400 mt-0.5 hidden md:block">
                            Configure amounts, limits, visibility and order per channel
                        </p>
                    </div>
                    <button onClick={fetchConfig} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </header>

                <div className="p-4 md:p-6 lg:p-8">
                    <div className="mb-5 flex items-start gap-3 px-4 py-3 border border-blue-200 bg-blue-50 text-xs text-blue-700">
                        <Settings size={14} className="shrink-0 mt-0.5" />
                        <span>
                            Drag the <GripVertical size={10} className="inline" /> handle to reorder channels or amount chips.
                            Toggle Visible/Hidden to show or hide a channel in the deposit page.
                            Changes apply immediately on next user page load.
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-white border border-gray-200 h-64 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {channelOrder.map((chId, i) => (
                                <div
                                    key={chId}
                                    onDragOver={e => onCardDragOver(e, i)}
                                    onDragEnd={onCardDragEnd}
                                    style={{
                                        opacity: draggingCard !== null && draggingCard !== i ? 0.45 : 1,
                                        transition: 'opacity 0.15s ease',
                                    }}
                                >
                                    <ChannelCard
                                        channelId={chId}
                                        savedConfig={config?.[chId]}
                                        onSave={handleSave}
                                        onReset={handleReset}
                                        dragHandleProps={{
                                            draggable: true,
                                            onDragStart: () => onCardDragStart(i),
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
