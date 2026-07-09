import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import axiosInstance from '../utils/axios';
import { useNotify } from '../context/NotifyContext';
import { Settings, RefreshCw, RotateCcw, Save, X, Plus, GripVertical, Eye, EyeOff, Check } from 'lucide-react';

const G = '#3a7d44';

const CHANNEL_META = {
    watchpays: { label: 'Watch Pay',  sub: 'Gateway',      color: '#7c3aed', bg: '#f5f3ff', defaultMin: 100,  defaultMax: 80000   },
    jazpays:   { label: 'Jaz Pay',    sub: 'Gateway',      color: '#2563eb', bg: '#eff6ff', defaultMin: 100,  defaultMax: 80000   },
    bondpay:   { label: 'BondPay',    sub: 'Gateway',      color: '#ea580c', bg: '#fff7ed', defaultMin: 100,  defaultMax: 80000   },
    trx:       { label: 'TRX',        sub: 'TRON Network', color: '#dc2626', bg: '#fef2f2', defaultMin: 100,  defaultMax: 1000000 },
    usdt:      { label: 'USDT TRC20', sub: 'Tether',       color: '#059669', bg: '#ecfdf5', defaultMin: 5000, defaultMax: 1000000 },
};
const ALL_CHANNEL_IDS  = ['watchpays', 'jazpays', 'bondpay', 'trx', 'usdt'];
const DEFAULT_AMOUNTS  = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000];

// ─── Beautiful editable chips with pointer drag (desktop + mobile) ─────────────
function AmountChips({ amounts, setAmounts, setDirty, color, bg }) {
    const [draggingIdx, setDraggingIdx] = useState(null);
    const [editingIdx,  setEditingIdx ] = useState(null);
    const [editVal,     setEditVal    ] = useState('');
    const chipRefs  = useRef([]);
    const dragState = useRef(null);

    const onChipPointerDown = (e, i) => {
        if (editingIdx !== null) return;
        if (e.button === 2) return;
        e.preventDefault();
        dragState.current = { fromIdx: i };
        setDraggingIdx(i);
    };

    const onMove = (e) => {
        if (!dragState.current) return;
        const { fromIdx } = dragState.current;
        for (let j = 0; j < chipRefs.current.length; j++) {
            if (j === fromIdx) continue;
            const rect = chipRefs.current[j]?.getBoundingClientRect();
            if (!rect) continue;
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top  && e.clientY <= rect.bottom) {
                const next = [...amounts];
                const [moved] = next.splice(fromIdx, 1);
                next.splice(j, 0, moved);
                setAmounts(next);
                dragState.current.fromIdx = j;
                setDraggingIdx(j);
                setDirty(true);
                break;
            }
        }
    };

    const endDrag = () => {
        dragState.current = null;
        setDraggingIdx(null);
    };

    const commitEdit = (i) => {
        const n = Number(editVal);
        if (n > 0 && n !== amounts[i]) {
            const next = [...amounts];
            next[i] = n;
            setAmounts(next);
            setDirty(true);
        }
        setEditingIdx(null);
        setEditVal('');
    };

    chipRefs.current.length = amounts.length;

    return (
        <div
            className="flex flex-wrap gap-2 mb-2 min-h-[40px]"
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            style={{ touchAction: draggingIdx !== null ? 'none' : 'auto', userSelect: 'none' }}
        >
            {amounts.map((amt, i) => {
                const active = draggingIdx === i;
                const dimmed = draggingIdx !== null && !active;
                const isEdit = editingIdx  === i;

                return (
                    <div
                        key={i}
                        ref={el => { chipRefs.current[i] = el; }}
                        className="group inline-flex items-center rounded-full"
                        style={{
                            gap: '4px',
                            padding: isEdit ? '5px 10px' : '5px 10px 5px 7px',
                            background: active
                                ? `linear-gradient(135deg, ${color}, ${color}bb)`
                                : bg,
                            color:  active ? '#fff' : color,
                            border: `1.5px solid ${active ? color : color + '35'}`,
                            boxShadow: active
                                ? `0 8px 24px ${color}45`
                                : `0 1px 4px ${color}12`,
                            transform: active ? 'scale(1.1) rotate(-1deg)' : 'scale(1)',
                            opacity:  dimmed ? 0.5 : 1,
                            zIndex:  active ? 20 : 1,
                            position: 'relative',
                            cursor:  isEdit ? 'text' : (active ? 'grabbing' : 'grab'),
                            touchAction: 'none',
                            transition: 'transform 0.13s ease, box-shadow 0.13s ease, opacity 0.13s ease',
                        }}
                        onPointerDown={e => !isEdit && onChipPointerDown(e, i)}
                    >
                        {!isEdit && (
                            <GripVertical size={9} style={{ opacity: 0.28, flexShrink: 0 }} />
                        )}

                        {isEdit ? (
                            <span className="inline-flex items-center gap-0.5">
                                <span className="text-xs font-bold" style={{ color }}>₹</span>
                                <input
                                    autoFocus
                                    type="number"
                                    min="1"
                                    value={editVal}
                                    onChange={e => setEditVal(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter')  commitEdit(i);
                                        if (e.key === 'Escape') { setEditingIdx(null); setEditVal(''); }
                                    }}
                                    onBlur={() => commitEdit(i)}
                                    onPointerDown={e => e.stopPropagation()}
                                    className="w-16 bg-transparent focus:outline-none text-xs font-bold"
                                    style={{ color }}
                                />
                                <button
                                    type="button"
                                    onPointerDown={e => e.stopPropagation()}
                                    onClick={() => commitEdit(i)}
                                    style={{ color, opacity: 0.8 }}
                                >
                                    <Check size={10} />
                                </button>
                            </span>
                        ) : (
                            <span
                                className="text-xs font-bold leading-none"
                                onDoubleClick={() => {
                                    setEditingIdx(i);
                                    setEditVal(String(amt));
                                }}
                                title="Double-click to edit"
                            >
                                ₹{amt.toLocaleString('en-IN')}
                            </span>
                        )}

                        {!isEdit && (
                            <button
                                type="button"
                                onPointerDown={e => e.stopPropagation()}
                                onClick={() => {
                                    setAmounts(amounts.filter((_, idx) => idx !== i));
                                    setDirty(true);
                                }}
                                className="ml-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
                                title="Remove"
                            >
                                <X size={9} />
                            </button>
                        )}
                    </div>
                );
            })}
            {amounts.length === 0 && (
                <span className="text-xs text-gray-300 italic self-center">No amounts — add one below</span>
            )}
        </div>
    );
}

// ─── Per-channel card ──────────────────────────────────────────────────────────
function ChannelCard({ channelId, savedConfig, onSave, onReset, isDragging, isOtherDragging, dragHandleProps }) {
    const ch     = CHANNEL_META[channelId];
    const notify = useNotify();
    const saved  = savedConfig || {};
    const isCustom = (saved.amounts?.length > 0) || saved.min != null || saved.max != null || saved.enabled === false;

    const [amounts, setAmounts] = useState(saved.amounts?.length ? saved.amounts : DEFAULT_AMOUNTS);
    const [minVal,  setMinVal ] = useState(saved.min  != null ? String(saved.min)  : String(ch.defaultMin));
    const [maxVal,  setMaxVal ] = useState(saved.max  != null ? String(saved.max)  : String(ch.defaultMax));
    const [enabled, setEnabled] = useState(saved.enabled !== false);
    const [newAmt,  setNewAmt ] = useState('');
    const [saving,  setSaving ] = useState(false);
    const [dirty,   setDirty  ] = useState(false);

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
        setNewAmt('');
        setDirty(true);
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
        <div
            className="bg-white overflow-hidden"
            style={{
                borderRadius: '14px',
                border: `1.5px solid ${isDragging ? ch.color + '70' : '#e5e7eb'}`,
                opacity: isOtherDragging ? 0.48 : 1,
                transform: isDragging ? 'scale(1.025) rotate(0.5deg)' : 'scale(1)',
                boxShadow: isDragging
                    ? `0 16px 48px ${ch.color}28`
                    : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                position: 'relative',
                zIndex: isDragging ? 10 : 1,
            }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100"
                style={{ background: ch.bg }}
            >
                <div
                    {...dragHandleProps}
                    className="text-gray-300 hover:text-gray-500 shrink-0 transition-colors"
                    style={{ cursor: 'grab', touchAction: 'none' }}
                    title="Drag to reorder"
                >
                    <GripVertical size={17} />
                </div>

                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-extrabold shrink-0 shadow"
                    style={{ background: `linear-gradient(135deg, ${ch.color}, ${ch.color}bb)` }}
                >
                    {ch.label.slice(0, 1)}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{ch.label}</p>
                    <p className="text-[11px] text-gray-400 leading-none mt-0.5">{ch.sub}</p>
                </div>

                <button
                    onClick={handleToggleEnabled}
                    title={enabled ? 'Hide channel' : 'Show channel'}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold border rounded-full transition shrink-0"
                    style={enabled
                        ? { borderColor: ch.color + '50', color: ch.color, background: 'white' }
                        : { borderColor: '#d1d5db', color: '#9ca3af', background: '#f9fafb' }
                    }
                >
                    {enabled ? <Eye size={11} /> : <EyeOff size={11} />}
                    {enabled ? 'Visible' : 'Hidden'}
                </button>

                {isCustom && (
                    <span
                        className="text-[10px] font-extrabold px-2.5 py-1 rounded-full text-white shrink-0"
                        style={{ background: ch.color }}
                    >
                        Custom
                    </span>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Min / Max */}
                <div className="grid grid-cols-2 gap-3">
                    {[['Min', minVal, setMinVal], ['Max', maxVal, setMaxVal]].map(([label, val, setter]) => (
                        <div key={label}>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                {label} (₹)
                            </label>
                            <div className="flex items-center border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition rounded-lg px-3 py-2 gap-1">
                                <span className="text-gray-400 text-sm">₹</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={val}
                                    onChange={e => { setter(e.target.value); setDirty(true); }}
                                    className="flex-1 text-sm font-semibold text-gray-800 bg-transparent focus:outline-none"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick amounts */}
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        Quick Select Amounts{' '}
                        <span className="font-normal normal-case opacity-60">
                            (drag to reorder · double-click to edit)
                        </span>
                    </label>
                    <AmountChips
                        amounts={amounts}
                        setAmounts={setAmounts}
                        setDirty={setDirty}
                        color={ch.color}
                        bg={ch.bg}
                    />
                    <div className="flex gap-2 mt-2">
                        <div className="flex-1 flex items-center border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition rounded-lg px-3 py-1.5 gap-1">
                            <span className="text-gray-400 text-sm">₹</span>
                            <input
                                type="number"
                                min="1"
                                value={newAmt}
                                onChange={e => setNewAmt(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addAmount()}
                                placeholder="Add amount…"
                                className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addAmount}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition hover:opacity-90 active:scale-95"
                            style={{ background: ch.color }}
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition disabled:opacity-40 hover:opacity-90 active:scale-95"
                        style={{ background: G }}
                    >
                        {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    {isCustom && (
                        <button
                            onClick={() => onReset(channelId)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition rounded-lg"
                        >
                            <RotateCcw size={12} /> Reset
                        </button>
                    )}
                    {dirty && !saving && (
                        <span className="ml-auto text-[10px] text-amber-500 font-bold">Unsaved changes</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DepositConfig() {
    const notify = useNotify();
    const [config,       setConfig      ] = useState(null);
    const [loading,      setLoading     ] = useState(true);
    const [channelOrder, setChannelOrder] = useState(ALL_CHANNEL_IDS);
    const [draggingCard, setDraggingCard] = useState(null);

    const cardRefs        = useRef([]);
    const cardDragState   = useRef(null);
    const channelOrderRef = useRef(channelOrder);
    useEffect(() => { channelOrderRef.current = channelOrder; }, [channelOrder]);

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
            title:   `Reset ${CHANNEL_META[channelId].label}?`,
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

    // Card pointer drag (works on desktop + mobile)
    const onCardHandlePointerDown = (e, i) => {
        e.preventDefault();
        cardDragState.current = { fromIdx: i };
        setDraggingCard(i);
    };

    const onGridPointerMove = (e) => {
        if (!cardDragState.current) return;
        const { fromIdx } = cardDragState.current;
        for (let j = 0; j < cardRefs.current.length; j++) {
            if (j === fromIdx) continue;
            const rect = cardRefs.current[j]?.getBoundingClientRect();
            if (!rect) continue;
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top  && e.clientY <= rect.bottom) {
                setChannelOrder(prev => {
                    const next = [...prev];
                    const [moved] = next.splice(fromIdx, 1);
                    next.splice(j, 0, moved);
                    return next;
                });
                cardDragState.current.fromIdx = j;
                setDraggingCard(j);
                break;
            }
        }
    };

    const onGridPointerUp = async () => {
        if (!cardDragState.current) return;
        const finalOrder = [...channelOrderRef.current];
        cardDragState.current = null;
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
                    <button
                        onClick={fetchConfig}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition rounded-lg"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </header>

                <div className="p-4 md:p-6 lg:p-8">
                    <div className="mb-5 flex items-start gap-3 px-4 py-3 border border-blue-200 bg-blue-50 rounded-xl text-xs text-blue-700">
                        <Settings size={14} className="shrink-0 mt-0.5" />
                        <span>
                            Drag <GripVertical size={10} className="inline" /> to reorder channels or chips.
                            Toggle Visible/Hidden to show or hide a channel.{' '}
                            <strong>Double-click a chip to edit its value.</strong>
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-gray-200 h-64 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div
                            className="grid grid-cols-1 md:grid-cols-2 gap-5"
                            onPointerMove={onGridPointerMove}
                            onPointerUp={onGridPointerUp}
                            onPointerLeave={onGridPointerUp}
                            style={{ touchAction: draggingCard !== null ? 'none' : 'auto' }}
                        >
                            {channelOrder.map((chId, i) => (
                                <div
                                    key={chId}
                                    ref={el => { cardRefs.current[i] = el; }}
                                >
                                    <ChannelCard
                                        channelId={chId}
                                        savedConfig={config?.[chId]}
                                        onSave={handleSave}
                                        onReset={handleReset}
                                        isDragging={draggingCard === i}
                                        isOtherDragging={draggingCard !== null && draggingCard !== i}
                                        dragHandleProps={{
                                            onPointerDown: (e) => onCardHandlePointerDown(e, i),
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
