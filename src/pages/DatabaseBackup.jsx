import { useState, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AppModal, { ModalBtn } from '../components/AppModal';
import api from '../utils/axios';
import {
    Database, Download, Upload, Eye, EyeOff,
    CheckCircle2, XCircle, AlertTriangle, FileJson, Loader2,
} from 'lucide-react';

const G  = '#3a7d44';
const GL = '#e8f5ea';
const GH = '#2e6437';

const COLLECTION_LABELS = {
    users:          'Users',
    admins:         'Admins',
    payments:       'Payments',
    withdrawals:    'Withdrawals',
    transfers:      'Admin Transfers',
    userTransfers:  'User Transfers',
    gifts:          'Gifts',
    announcements:  'Announcements',
    bankCards:      'Bank Cards',
    blackjackGames: 'Blackjack Games',
    gameSessions:   'Game Sessions',
    loginSessions:  'Login Sessions',
    blockedIPs:     'Blocked IPs',
    usdtDeposits:   'USDT Deposits',
    trxDeposits:    'TRX Deposits',
    royalSpinBets:  'Royal Spin Bets',
    depositConfig:  'Deposit Config',
};

function StatRow({ label, count }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-600">{label}</span>
            <span className="text-sm font-bold tabular-nums text-gray-900">{count.toLocaleString()}</span>
        </div>
    );
}

export default function DatabaseBackup() {
    const { user } = useContext(AuthContext);

    const [exporting,    setExporting   ] = useState(false);
    const [exportDone,   setExportDone  ] = useState(false);

    const fileRef                                      = useRef(null);
    const [fileData,     setFileData    ] = useState(null);
    const [fileName,     setFileName    ] = useState('');
    const [importing,    setImporting   ] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [showConfirm,  setShowConfirm ] = useState(false);
    const [password,     setPassword    ] = useState('');
    const [showPw,       setShowPw      ] = useState(false);
    const [pwError,      setPwError     ] = useState('');

    const handleExport = async () => {
        setExporting(true);
        setExportDone(false);
        try {
            const res = await api.get('/dashboard/db/export', { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
            const a   = document.createElement('a');
            a.href    = url;
            a.download = `bigmumbai-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setExportDone(true);
            setTimeout(() => setExportDone(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setExporting(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setImportResult(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!parsed.collections) throw new Error('Invalid format');
                setFileData(parsed);
            } catch {
                setFileData(null);
                alert('Invalid backup file. Please select a valid BigMumbai backup JSON.');
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!password.trim()) { setPwError('Password is required'); return; }
        setPwError('');
        setImporting(true);
        try {
            const { data } = await api.post('/dashboard/db/import', { password: password.trim(), data: fileData });
            setImportResult({ success: true, summary: data.summary });
            setShowConfirm(false);
            setPassword('');
            setFileData(null);
            setFileName('');
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            const msg = err.response?.data?.message || 'Import failed';
            if (err.response?.status === 401) {
                setPwError(msg);
            } else {
                setImportResult({ success: false, message: msg });
                setShowConfirm(false);
            }
        } finally {
            setImporting(false);
        }
    };

    const totalDocs = fileData
        ? Object.values(fileData.collections).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0)
        : 0;

    return (
        <div className="flex h-screen" style={{ background: '#f4f7f4' }}>
            <Sidebar />
            <main className="flex-1 overflow-auto">

                {/* ── Header ── */}
                <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 sticky top-0 z-10 flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ background: GL }}>
                        <Database size={16} style={{ color: G }} />
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-gray-900">Database Backup</h1>
                        <p className="hidden md:block text-xs text-gray-400 mt-0.5">Export or restore all platform data · Super Admin only</p>
                    </div>
                </header>

                <div className="p-4 md:p-6 space-y-6">

                    {/* ── Export ── */}
                    <div className="bg-white border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3" style={{ background: GL }}>
                            <Download size={16} style={{ color: G }} />
                            <div>
                                <p className="text-sm font-bold text-gray-900">Export Database</p>
                                <p className="text-xs text-gray-500">Download a full JSON snapshot of all {Object.keys(COLLECTION_LABELS).length} collections</p>
                            </div>
                        </div>
                        <div className="px-5 py-5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-5">
                                {Object.values(COLLECTION_LABELS).map(label => (
                                    <div key={label} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100">
                                        <FileJson size={12} className="text-gray-400 shrink-0" />
                                        <span className="text-xs text-gray-600 font-medium truncate">{label}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                                style={{ background: G }}
                                onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = GH; }}
                                onMouseLeave={e => { e.currentTarget.style.background = G; }}
                            >
                                {exporting
                                    ? <><Loader2 size={15} className="animate-spin" />Exporting…</>
                                    : exportDone
                                        ? <><CheckCircle2 size={15} />Downloaded!</>
                                        : <><Download size={15} />Export Now</>}
                            </button>
                        </div>
                    </div>

                    {/* ── Import ── */}
                    <div className="bg-white border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-amber-50">
                            <Upload size={16} className="text-amber-600" />
                            <div>
                                <p className="text-sm font-bold text-gray-900">Import Database</p>
                                <p className="text-xs text-gray-500">Restore from a previously exported backup file</p>
                            </div>
                        </div>
                        <div className="px-5 py-5 space-y-4">

                            {/* Warning */}
                            <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200">
                                <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    Import will <strong>completely replace</strong> all existing data — every collection including admins will be wiped and restored from the backup file. This cannot be undone.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                                {/* File picker */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                            Backup File (.json)
                                        </label>
                                        <div
                                            className="flex items-center gap-3 border-2 border-dashed border-gray-200 px-4 py-4 cursor-pointer hover:border-gray-300 transition"
                                            onClick={() => fileRef.current?.click()}
                                        >
                                            <FileJson size={20} className="text-gray-300 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                {fileName
                                                    ? <p className="text-sm font-semibold text-gray-800 truncate">{fileName}</p>
                                                    : <p className="text-sm text-gray-400">Click to select a backup JSON file</p>}
                                                {fileData && (
                                                    <p className="text-xs mt-0.5" style={{ color: G }}>
                                                        {totalDocs.toLocaleString()} total documents · {Object.keys(fileData.collections).length} collections
                                                        {fileData.exportedAt && ` · exported ${new Date(fileData.exportedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-xs font-semibold text-gray-400 border border-gray-200 px-2.5 py-1 shrink-0">Browse</span>
                                        </div>
                                        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
                                    </div>

                                    {/* Import result */}
                                    {importResult && (
                                        <div className={`flex items-start gap-3 p-3.5 border ${importResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                            {importResult.success
                                                ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                                : <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />}
                                            <div>
                                                {importResult.success ? (
                                                    <>
                                                        <p className="text-sm font-semibold text-emerald-700">Import successful</p>
                                                        <p className="text-xs text-emerald-600 mt-0.5">
                                                            {Object.entries(importResult.summary)
                                                                .filter(([, n]) => n > 0)
                                                                .map(([k, n]) => `${COLLECTION_LABELS[k] || k}: ${n}`)
                                                                .join(' · ')}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-red-600">{importResult.message}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => { setShowConfirm(true); setPwError(''); setPassword(''); }}
                                        disabled={!fileData}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40 bg-amber-500 hover:bg-amber-600"
                                    >
                                        <Upload size={15} /> Import Backup
                                    </button>
                                </div>

                                {/* Preview */}
                                {fileData ? (
                                    <div className="border border-gray-100 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</p>
                                        </div>
                                        <div className="px-4 py-1 max-h-72 overflow-y-auto">
                                            {Object.entries(fileData.collections).map(([key, arr]) => (
                                                <StatRow
                                                    key={key}
                                                    label={COLLECTION_LABELS[key] || key}
                                                    count={Array.isArray(arr) ? arr.length : 0}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-gray-100 flex flex-col items-center justify-center p-8 text-center">
                                        <FileJson size={28} className="text-gray-200 mb-2" />
                                        <p className="text-xs text-gray-400">Select a backup file to preview its contents</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                </div>
            </main>

            {/* Confirm import modal */}
            {showConfirm && (
                <AppModal onClose={() => setShowConfirm(false)} size="sm">
                    <AppModal.Header
                        icon={<AlertTriangle size={17} />}
                        title="Confirm Import"
                        subtitle={`${totalDocs.toLocaleString()} documents will replace all existing data`}
                        onClose={() => setShowConfirm(false)}
                        accent="amber"
                    />
                    <AppModal.Body className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Enter your login password to authorize this import.
                        </p>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Login Password
                            </label>
                            <div
                                className="flex items-center border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition px-3.5"
                                style={{ borderRadius: '6px' }}
                            >
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setPwError(''); }}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    autoFocus
                                    className="flex-1 py-2.5 text-sm text-gray-900 bg-transparent focus:outline-none placeholder:text-gray-400"
                                />
                                <button type="button" tabIndex={-1} onClick={() => setShowPw(s => !s)}
                                    className="text-gray-400 hover:text-gray-600 ml-2 shrink-0 transition">
                                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            {pwError && (
                                <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                                    <XCircle size={11} />{pwError}
                                </p>
                            )}
                        </div>
                    </AppModal.Body>
                    <AppModal.Footer>
                        <ModalBtn variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</ModalBtn>
                        <ModalBtn
                            variant="brand"
                            onClick={handleImport}
                            disabled={importing || !password.trim()}
                            className="min-w-[130px] flex items-center justify-center gap-2 !bg-amber-500 hover:!bg-amber-600"
                            style={{ background: '#f59e0b' }}
                        >
                            {importing
                                ? <><Loader2 size={13} className="animate-spin" />Importing…</>
                                : <><Upload size={13} />Confirm Import</>}
                        </ModalBtn>
                    </AppModal.Footer>
                </AppModal>
            )}
        </div>
    );
}
