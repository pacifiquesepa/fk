import React, { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import {
    Calendar, Plus, Loader2, CheckCircle, Clock, Lock, ChevronRight,
    Award, GraduationCap, Users, RefreshCcw, AlertTriangle, X,
    PlayCircle, FileText, History, Sparkles, Trash2, Edit3, RotateCcw,
    Eye, BarChart3, TrendingUp, DollarSign, ShieldAlert, ClipboardList
} from 'lucide-react';

const STATUS_BADGE = {
    active: 'bg-green-100 text-green-700  border-green-200',
    planning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    closed: 'bg-gray-200  text-gray-700   border-gray-300',
    upcoming: 'bg-gray-100  text-gray-600   border-gray-200',
    ended: 'bg-blue-100  text-blue-700   border-blue-200',
};

const todayISO = () => new Date().toISOString().split('T')[0];
const yearList = (response) => Array.isArray(response?.data) ? response.data : (response?.data?.years || []);
const normalizeYear = (year) => year ? {
    ...year,
    start_date: year.start_date || year.startDate,
    end_date: year.end_date || year.endDate,
    is_current: year.is_current ?? year.isCurrent,
    terms: (year.terms || []).map((term) => ({
        ...term,
        term_number: term.term_number || term.termNumber,
        start_date: term.start_date || term.startDate,
        end_date: term.end_date || term.endDate,
    })),
} : null;

function emptyYearForm() {
    const year = new Date().getFullYear();
    return {
        name: `${year}-${year + 1}`,
        start_date: `${year}-09-01`,
        end_date: `${year + 1}-07-15`,
        set_current: true,
        terms: [
            { name: 'Term 1', start_date: `${year}-09-01`, end_date: `${year}-12-15` },
            { name: 'Term 2', start_date: `${year + 1}-01-10`, end_date: `${year + 1}-03-30` },
            { name: 'Term 3', start_date: `${year + 1}-04-15`, end_date: `${year + 1}-07-15` },
        ],
    };
}

const toApiYearForm = (form) => ({
    name: form.name?.trim(),
    startDate: form.start_date,
    endDate: form.end_date,
    setCurrent: Boolean(form.set_current),
    terms: (form.terms || []).map((term) => ({
        name: term.name?.trim(),
        startDate: term.start_date,
        endDate: term.end_date,
    })),
});

const AcademicYear = ({ user, t = {} }) => {
    const isAdminOrDirector = ['admin', 'dos'].includes(user?.role);
    const [loading, setLoading] = useState(true);
    const [years, setYears] = useState([]);
    const [currentYear, setCurrent] = useState(null);
    const [activeYearId, setActiveId] = useState(null);
    const [yearDetail, setYearDetail] = useState(null);
    const [busy, setBusy] = useState(false);

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState(emptyYearForm());

    const [closeOpen, setCloseOpen] = useState(false);
    const [closePreview, setClosePreview] = useState(null);
    const [overrides, setOverrides] = useState({});
    const [createNextYear, setCreateNextYear] = useState(true);
    const [nextYearForm, setNextYearForm] = useState(emptyYearForm());
    const [confirmClose, setConfirmClose] = useState(false);

    const [promotionsCount, setPromCount] = useState({ promoted: 0, graduated: 0, retained: 0 });
    const [history, setHistory] = useState([]);
    const [ladder, setLadder] = useState({
        default: ['Level 3', 'Level 4', 'Level 5'],
        ladders: {
            'Software Development': ['Level 3', 'Level 4', 'Level 5'],
            'Building and Construction': ['Level 3', 'Level 4', 'Level 5'],
            'Automobile Technology': ['Level 3', 'Level 4a', 'Level 4b', 'Level 5a', 'Level 5b'],
        },
    });

    /* ─── Edit / Delete / Reopen / Term Detail state ──────────── */
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [termDetailId, setTermDetailId] = useState(null);
    const [termDetail, setTermDetail] = useState(null);
    const [termTab, setTermTab] = useState('overview');

    /* ─── data loaders ────────────────────────────────────────── */
    const loadAll = async () => {
        setLoading(true);
        try {
            const [yearsRes, currentRes] = await Promise.all([
                api.get('/academic-years'),
                api.get('/academic-years/current'),
            ]);
            const availableYears = yearList(yearsRes);
            setYears(availableYears.map(normalizeYear));
            setCurrent(normalizeYear(currentRes.data));

            const targetId = activeYearId
                || currentRes.data?.id
                || (availableYears[0]?.id ?? null);
            if (targetId) {
                setActiveId(targetId);
                const detail = await api.get(`/academic-years/${targetId}`);
                setYearDetail(normalizeYear(detail.data));
            } else {
                setYearDetail(null);
            }
        } catch (err) {
            console.error('Failed to load academic years:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadLadder = async () => {
        try {
            const r = await api.get('/academic-years/ladder');
            if (r.data?.ladders) setLadder(r.data);
        } catch (_) { /* keep fallback */ }
    };

    useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

    const ladderFor = (trade) => ladder.ladders?.[trade] || ladder.default;
    const nextLevelFor = (trade, current) => {
        const l = ladderFor(trade);
        const i = l.indexOf(current);
        if (i === -1 || i === l.length - 1) return null;
        return l[i + 1];
    };

    const updateOverride = (studentId, patch) =>
        setOverrides(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));

    const resetOverrides = () => setOverrides({});

    const computedRow = (row) => {
        const ovr = overrides[row.student_id];
        const action = ovr?.action || row.action;
        let toLevel = row.to_level;
        if (ovr) {
            if (action === 'graduated') toLevel = null;
            else if (action === 'retained') toLevel = row.from_level;
            else if (action === 'promoted') toLevel = ovr.to_level || nextLevelFor(row.trade, row.from_level) || row.from_level;
        }
        return { action, toLevel };
    };

    const liveSummary = useMemo(() => {
        if (!closePreview?.plan) return promotionsCount;
        const s = { promoted: 0, graduated: 0, retained: 0 };
        for (const row of closePreview.plan) {
            const { action } = computedRow(row);
            s[action] = (s[action] || 0) + 1;
        }
        return s;
        // eslint-disable-next-line
    }, [closePreview, overrides]);

    const switchYear = async (id) => {
        setActiveId(id);
        try {
            setLoading(true);
            const detail = await api.get(`/academic-years/${id}`);
            setYearDetail(normalizeYear(detail.data));
        } finally {
            setLoading(false);
        }
    };

    /* ─── actions ─────────────────────────────────────────────── */
    const submitCreate = async () => {
        const payload = toApiYearForm(createForm);
        if (!payload.name || !payload.startDate || !payload.endDate || payload.terms.length !== 3 || payload.terms.some((term) => !term.name || !term.startDate || !term.endDate)) {
            return alert('Enter the academic year dates and all three term dates.');
        }

        // Check if year name already exists
        if (years.some(y => y.name && y.name.toLowerCase() === payload.name.toLowerCase())) {
            return alert(`Academic year "${payload.name}" already exists. Please use a different name.`);
        }

        setBusy(true);
        try {
            const r = await api.post('/academic-years', payload);
            alert(r.data?.message || 'Academic year created.');
            setShowCreate(false);
            setCreateForm(emptyYearForm());
            await loadAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Error occurred.');
        } finally {
            setBusy(false);
        }
    };

    const setCurrentApi = async (id) => {
        setBusy(true);
        try {
            await api.post(`/academic-years/${id}/set-current`);
            alert('Academic year set as current.');
            await loadAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Error occurred.');
        } finally {
            setBusy(false);
        }
    };

    const endTerm = async (yearId, termId) => {
        if (!window.confirm('Confirm closing this term?')) return;
        setBusy(true);
        try {
            const r = await api.post(`/academic-years/${yearId}/terms/${termId}/end`);
            alert(`Term ended (${r.data.ended}/${r.data.total}).`);
            await switchYear(yearId);
            await loadAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Error occurred.');
        } finally {
            setBusy(false);
        }
    };

    const openCloseDialog = async () => {
        if (!yearDetail) return;
        setBusy(true);
        try {
            const r = await api.get(`/academic-years/${yearDetail.id}/preview-close`);
            setClosePreview(r.data);
            setPromCount(r.data.summary);
            setOverrides({});
            setConfirmClose(false);
            const m = (yearDetail.name || '').match(/(\d{4})/);
            const start = m ? parseInt(m[1], 10) + 1 : new Date().getFullYear() + 1;
            setNextYearForm({
                name: `${start}-${start + 1}`,
                start_date: `${start}-09-01`,
                end_date: `${start + 1}-07-15`,
                set_current: true,
                terms: [
                    { name: 'Term 1', start_date: `${start}-09-01`, end_date: `${start}-12-15` },
                    { name: 'Term 2', start_date: `${start + 1}-01-10`, end_date: `${start + 1}-03-30` },
                    { name: 'Term 3', start_date: `${start + 1}-04-15`, end_date: `${start + 1}-07-15` },
                ],
            });
            setCloseOpen(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Error occurred.');
        } finally {
            setBusy(false);
        }
    };

    const submitClose = async () => {
        if (!confirmClose) {
            return alert('Please confirm closing the academic year.');
        }
        if (!closePreview?.ready_to_close) {
            const ok = window.confirm('Some terms are not ended. Continue with closing the year?');
            if (!ok) return;
        }

        // Check if next year name already exists (if creating next year)
        if (createNextYear && years.some(y => y.name && y.name.toLowerCase() === nextYearForm.name.toLowerCase())) {
            return alert(`Academic year "${nextYearForm.name}" already exists. Please modify the next year name or disable creation.`);
        }

        setBusy(true);
        try {
            const overridesArr = Object.entries(overrides)
                .filter(([_, v]) => v && v.action)
                .map(([sid, v]) => ({
                    student_id: Number(sid),
                    action: v.action,
                    to_level: v.action === 'promoted' ? (v.to_level || null) : null,
                }));

            const payload = { confirm: true, overrides: overridesArr };
            if (createNextYear) payload.next_year = nextYearForm;

            const r = await api.post(`/academic-years/${yearDetail.id}/close`, payload);
            alert(
                `Year closed. Promoted=${r.data.promoted}, Graduated=${r.data.graduated}, Retained=${r.data.retained}`
            );
            setCloseOpen(false);
            setClosePreview(null);
            setOverrides({});
            setConfirmClose(false);
            await loadAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Error occurred.');
        } finally {
            setBusy(false);
        }
    };

    /* ─── NEW: Delete, Edit, Reopen ───────────────────────────── */
    const deleteYear = async (id) => {
        if (!window.confirm('Confirm deleting this year? This will also delete all its terms and promotions. This action cannot be undone.')) return;
        setBusy(true);
        try {
            await api.delete(`/academic-years/${id}`);
            alert('Academic year deleted.');
            if (activeYearId === id) { setActiveId(null); setYearDetail(null); }
            await loadAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete academic year.');
        } finally { setBusy(false); }
    };

    const startEdit = () => {
        if (!yearDetail) return;
        setEditForm({
            name: yearDetail.name,
            start_date: yearDetail.start_date?.slice(0, 10),
            end_date: yearDetail.end_date?.slice(0, 10),
            terms: yearDetail.terms.map(t => ({
                id: t.id,
                name: t.name,
                start_date: t.start_date?.slice(0, 10),
                end_date: t.end_date?.slice(0, 10),
            })),
        });
        setShowEdit(true);
    };

    const submitEdit = async () => {
        const payload = toApiYearForm(editForm);
        if (!payload.name || !payload.startDate || !payload.endDate) return alert('Enter the academic year name and dates.');
        setBusy(true);
        try {
            await api.patch(`/academic-years/${yearDetail.id}`, payload);
            alert('Academic year updated.');
            setShowEdit(false);
            await loadAll();
            await switchYear(yearDetail.id);
        } catch (err) {
            alert(err.response?.data?.message || 'Error occurred.');
        } finally { setBusy(false); }
    };

    const reopenYear = async (id) => {
        if (!window.confirm('Confirm reopening this year?')) return;
        setBusy(true);
        try {
            await api.post(`/academic-years/${id}/reopen`);
            alert('Academic year reopened.');
            await loadAll();
            await switchYear(id);
        } catch (err) {
            alert(err.response?.data?.message || 'Error occurred.');
        } finally { setBusy(false); }
    };

    /* ─── NEW: Term Details ───────────────────────────────────── */
    const openTermDetail = async (termId) => {
        setTermDetailId(termId);
        setTermTab('overview');
        setTermDetail(null);
        try {
            // First try to fetch detailed term data from backend
            try {
                const r = await api.get(`/academic-years/${yearDetail.id}/terms/${termId}/details`);
                setTermDetail(r.data);
            } catch (detailErr) {
                // If endpoint doesn't exist (404), use basic term data from yearDetail
                if (detailErr.response?.status === 404) {
                    const term = yearDetail?.terms?.find(t => t.id === termId);
                    if (term) {
                        setTermDetail({
                            term,
                            student_count: 0,
                            attendance: { present: 0, absent: 0, late: 0, excused: 0, records: [] },
                            grades: { count: 0, average_score: 0, by_subject: [], records: [] },
                            discipline: { count: 0, records: [] },
                            payments: { total_paid: 0, count: 0, records: [] },
                            events: []
                        });
                    } else {
                        throw detailErr;
                    }
                } else {
                    throw detailErr;
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to load term details.');
        }
    };

    /* ─── derived ─────────────────────────────────────────────── */
    const allTermsEnded = useMemo(
        () => yearDetail?.terms?.length === 3 && yearDetail.terms.every(t => t.status === 'ended'),
        [yearDetail]
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2">
                            <Calendar size={26} /> Academic Years
                        </h1>
                        <p className="text-blue-200 text-sm">
                            Manage academic years, terms, and student promotions
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={loadAll}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-2"
                        >
                            <RefreshCcw size={16} /> Refresh
                        </button>
                        {isAdminOrDirector && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="px-4 py-2 bg-white text-blue-700 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50"
                            >
                                <Plus size={18} /> New Year
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
                <StatCard icon={Calendar} label="Total Years" value={years.length} color="bg-blue-50 text-blue-700" />
                <StatCard icon={PlayCircle} label="Current Year" value={currentYear?.name || '—'} color="bg-green-50 text-green-700" />
                <StatCard icon={GraduationCap} label="Graduated"
                    value={history.filter(h => h.action === 'graduated').length}
                    color="bg-amber-50 text-amber-700" />
                <StatCard icon={Sparkles} label="Promoted"
                    value={history.filter(h => h.action === 'promoted').length}
                    color="bg-blue-50 text-blue-700" />
            </div>

            {/* Year tabs */}
            <div className="px-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {years.map(y => (
                        <button
                            key={y.id}
                            onClick={() => switchYear(y.id)}
                            className={`px-4 py-2 rounded-xl whitespace-nowrap border transition ${activeYearId === y.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                                }`}
                        >
                            <span className="font-bold">{y.name}</span>
                            <span className="ml-2 text-xs">
                                {y.is_current ? '★' : ''} ({y.status})
                            </span>
                        </button>
                    ))}
                    {years.length === 0 && (
                        <p className="text-gray-500 text-sm">No years created yet.</p>
                    )}
                </div>
            </div>

            {/* Year Detail */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {loading ? (
                        <div className="bg-white rounded-3xl p-12 text-center">
                            <Loader2 className="mx-auto animate-spin text-blue-500" size={36} />
                        </div>
                    ) : !yearDetail ? (
                        <div className="bg-white rounded-3xl p-12 text-center text-gray-400">
                            <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                            <p>Select an academic year to view details.</p>
                        </div>
                    ) : (
                        <>
                            {/* Year card */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900">
                                            {yearDetail.name}
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            {yearDetail.start_date?.slice(0, 10)} → {yearDetail.end_date?.slice(0, 10)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_BADGE[yearDetail.status]}`}>
                                            {yearDetail.status}
                                        </span>
                                        {yearDetail.is_current ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                                                Current
                                            </span>
                                        ) : yearDetail.status !== 'closed' && isAdminOrDirector && (
                                            <button
                                                onClick={() => setCurrentApi(yearDetail.id)}
                                                disabled={busy}
                                                className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                                Set Current
                                            </button>
                                        )}
                                        {/* Edit / Delete / Reopen actions - only for authorized roles */}
                                        {isAdminOrDirector && (
                                            <>
                                                <button onClick={startEdit} disabled={busy}
                                                    className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1">
                                                    <Edit3 size={12} /> Edit
                                                </button>
                                                {yearDetail.status === 'closed' && (
                                                    <button onClick={() => reopenYear(yearDetail.id)} disabled={busy}
                                                        className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center gap-1">
                                                        <RotateCcw size={12} /> Reopen
                                                    </button>
                                                )}
                                                {!yearDetail.is_current && (
                                                    <button onClick={() => deleteYear(yearDetail.id)} disabled={busy}
                                                        className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1">
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Terms timeline */}
                                <div className="mt-6 space-y-3">
                                    {yearDetail.terms?.map(t => (
                                        <div
                                            key={t.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-gray-200 hover:border-blue-200 transition cursor-pointer"
                                            onClick={() => openTermDetail(t.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${t.status === 'ended' ? 'bg-blue-100 text-blue-600'
                                                    : t.status === 'active' ? 'bg-green-100 text-green-600'
                                                        : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {t.term_number}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{t.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {t.start_date?.slice(0, 10)} → {t.end_date?.slice(0, 10)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_BADGE[t.status]}`}>
                                                    {t.status}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openTermDetail(t.id); }}
                                                    className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1"
                                                >
                                                    <Eye size={12} /> Details
                                                </button>
                                                {t.status !== 'ended' && yearDetail.status !== 'closed' && isAdminOrDirector && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); endTerm(yearDetail.id, t.id); }}
                                                        disabled={busy}
                                                        className="px-3 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1"
                                                    >
                                                        <CheckCircle size={14} /> End
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Year close action */}
                            {yearDetail.status !== 'closed' && isAdminOrDirector && (
                                <div className="mt-6 p-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="text-amber-600 mt-1" size={22} />
                                        <div>
                                            <p className="font-bold text-amber-900">Close Year & Promote Students</p>
                                            <p className="text-xs text-amber-800/80">
                                                {allTermsEnded
                                                    ? 'All terms are ended — ready to close.'
                                                    : 'Ensure all terms are ended before closing.'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={openCloseDialog}
                                        disabled={busy}
                                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2"
                                    >
                                        <Lock size={16} /> Close Year
                                    </button>
                                </div>
                            )}

                            {/* Promotions for this year */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-black text-gray-800 flex items-center gap-2 mb-4">
                                    <History size={20} /> Promotions Log
                                </h3>
                                <PromotionTable rows={yearDetail.promotions || []} />
                            </div>
                        </>
                    )}
                </div>

                {/* Side: history + tips */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h3 className="font-black text-gray-800 flex items-center gap-2 mb-3">
                            <FileText size={18} /> Recent History (all years)
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                            {history.slice(0, 30).map(h => (
                                <div key={h.id} className="text-xs border border-gray-100 rounded-xl p-2 flex justify-between">
                                    <div>
                                        <span className="font-bold">{h.first_name} {h.last_name}</span>{' '}
                                        <span className="text-gray-500">{h.reg_number}</span>
                                        <div className="text-gray-500">
                                            {h.from_level || '—'} → {h.to_level || 'graduated'} · {h.from_trade}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full self-start font-bold ${h.action === 'graduated' ? 'bg-amber-100 text-amber-700'
                                        : h.action === 'promoted' ? 'bg-green-100 text-green-700'
                                            : h.action === 'enrolled' ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>{h.action}</span>
                                </div>
                            ))}
                            {history.length === 0 && (
                                <p className="text-xs text-gray-400">No promotions recorded.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Term Detail Modal */}
            {termDetailId && termDetail && (
                <Modal title={`Term Details: ${termDetail.term?.name || 'Term'}`} onClose={() => { setTermDetailId(null); setTermDetail(null); }} size="xl">
                    <div className="space-y-6">
                        {/* Overview */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <p className="text-xs text-gray-600 mb-1">Students</p>
                                <p className="text-xl font-bold text-blue-700">{termDetail.student_count || 0}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl">
                                <p className="text-xs text-gray-600 mb-1">Present</p>
                                <p className="text-xl font-bold text-green-700">{termDetail.attendance?.present || 0}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <p className="text-xs text-gray-600 mb-1">Grades</p>
                                <p className="text-xl font-bold text-blue-700">{termDetail.grades?.count || 0}</p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-xl">
                                <p className="text-xs text-gray-600 mb-1">Discipline</p>
                                <p className="text-xl font-bold text-amber-700">{termDetail.discipline?.count || 0}</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 border-b">
                            {['overview', 'attendance', 'grades', 'discipline', 'payments', 'events'].map(tab => (
                                <button key={tab}
                                    onClick={() => setTermTab(tab)}
                                    className={`px-4 py-2 rounded-t-lg font-bold text-sm capitalize ${termTab === tab
                                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}>
                                    {tab === 'overview' ? 'Overview' : tab === 'attendance' ? 'Attendance' : tab === 'grades' ? 'Grades' : tab === 'discipline' ? 'Discipline' : tab === 'payments' ? 'Payments' : 'Events'}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {termTab === 'overview' && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 border rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Calendar size={16} /> Dates</h4>
                                    <p className="text-sm">From: {termDetail.term?.start_date?.slice(0, 10)}</p>
                                    <p className="text-sm">To: {termDetail.term?.end_date?.slice(0, 10)}</p>
                                    <p className="text-sm mt-2">Status: <span className={`px-2 py-1 rounded-full text-xs font-bold ${termDetail.term?.status === 'ended' ? 'bg-blue-100 text-blue-700' : termDetail.term?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{termDetail.term?.status}</span></p>
                                </div>
                                <div className="p-4 border rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Users size={16} /> Students</h4>
                                    <p className="text-sm">Total: {termDetail.student_count || 0}</p>
                                </div>
                                <div className="p-4 border rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><CheckCircle size={16} /> Attendance</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>Present: {termDetail.attendance?.present || 0}</div>
                                        <div>Absent: {termDetail.attendance?.absent || 0}</div>
                                        <div>Late: {termDetail.attendance?.late || 0}</div>
                                        <div>Excused: {termDetail.attendance?.excused || 0}</div>
                                    </div>
                                </div>
                                <div className="p-4 border rounded-xl">
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><DollarSign size={16} /> Payments</h4>
                                    <p className="text-sm">Total Paid: {termDetail.payments?.total_paid ? `RWF ${termDetail.payments.total_paid.toLocaleString()}` : 'RWF 0'}</p>
                                    <p className="text-sm">Transactions: {termDetail.payments?.count || 0}</p>
                                </div>
                            </div>
                        )}

                        {termTab === 'attendance' && (
                            <div>
                                <div className="mb-3 p-3 bg-gray-50 rounded-xl text-sm flex gap-4">
                                    <span>Present: <b>{termDetail.attendance?.present || 0}</b></span>
                                    <span>Absent: <b>{termDetail.attendance?.absent || 0}</b></span>
                                    <span>Late: <b>{termDetail.attendance?.late || 0}</b></span>
                                    <span>Excused: <b>{termDetail.attendance?.excused || 0}</b></span>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Name</th>
                                            <th className="px-3 py-2 text-left">Date</th>
                                            <th className="px-3 py-2 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(termDetail.attendance?.records || []).slice(0, 50).map((rec, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="px-3 py-2">{rec.first_name} {rec.last_name}</td>
                                                <td className="px-3 py-2 text-xs">{rec.date}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs ${rec.status === 'present' ? 'bg-green-100 text-green-700' :
                                                        rec.status === 'absent' ? 'bg-red-100 text-red-700' :
                                                            rec.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-gray-100 text-gray-700'
                                                        }`}>{rec.status}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {termTab === 'grades' && (
                            <div>
                                <div className="mb-3 p-3 bg-gray-50 rounded-xl text-sm flex gap-4">
                                    <span>Total Grades: <b>{termDetail.grades?.count || 0}</b></span>
                                    <span>Average: <b>{termDetail.grades?.average_score || 0}</b></span>
                                </div>
                                {termDetail.grades?.by_subject?.length > 0 && (
                                    <div className="mb-4">
                                        <h4 className="font-bold text-sm mb-2">By Subject:</h4>
                                        <div className="space-y-1">
                                            {termDetail.grades.by_subject.map((sub, i) => (
                                                <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                                                    <span>{sub.subject}</span>
                                                    <span className="font-bold">{Number(sub.avg_score).toFixed(1)}% ({sub.n} students)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Name</th>
                                            <th className="px-3 py-2 text-left">Subject</th>
                                            <th className="px-3 py-2 text-left">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(termDetail.grades?.records || []).slice(0, 50).map((g, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="px-3 py-2">{g.first_name} {g.last_name}</td>
                                                <td className="px-3 py-2">{g.subject}</td>
                                                <td className="px-3 py-2 font-bold">{Number(g.score).toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {termTab === 'discipline' && (
                            <div>
                                <div className="mb-3 p-3 bg-gray-50 rounded-xl text-sm">
                                    <span>Incidents: <b>{termDetail.discipline?.count || 0}</b></span>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Name</th>
                                            <th className="px-3 py-2 text-left">Incident</th>
                                            <th className="px-3 py-2 text-left">Date</th>
                                            <th className="px-3 py-2 text-left">Recorded By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(termDetail.discipline?.records || []).slice(0, 50).map((d, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="px-3 py-2">{d.first_name} {d.last_name}</td>
                                                <td className="px-3 py-2 text-xs">{d.incident_description || d.incident_type || '—'}</td>
                                                <td className="px-3 py-2 text-xs">{d.incident_date?.slice(0, 10)}</td>
                                                <td className="px-3 py-2 text-xs">{d.recorded_by_name || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {termTab === 'payments' && (
                            <div>
                                <div className="mb-3 p-3 bg-gray-50 rounded-xl text-sm flex gap-4">
                                    <span>Total: <b>RWF {(termDetail.payments?.total_paid || 0).toLocaleString()}</b></span>
                                    <span>Transactions: <b>{termDetail.payments?.count || 0}</b></span>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Name</th>
                                            <th className="px-3 py-2 text-left">Amount</th>
                                            <th className="px-3 py-2 text-left">Date</th>
                                            <th className="px-3 py-2 text-left">Method</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(termDetail.payments?.records || []).slice(0, 50).map((p, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="px-3 py-2">{p.first_name} {p.last_name}</td>
                                                <td className="px-3 py-2 font-bold">RWF {Number(p.amount_paid).toLocaleString()}</td>
                                                <td className="px-3 py-2 text-xs">{p.payment_date?.slice(0, 10)}</td>
                                                <td className="px-3 py-2 text-xs">{p.payment_method || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {termTab === 'events' && (
                            <div className="space-y-2">
                                {(termDetail.events || []).length === 0 ? (
                                    <p className="text-center py-8 text-gray-400">No events recorded in this term.</p>
                                ) : (
                                    (termDetail.events || []).map((ev, i) => (
                                        <div key={i} className="p-3 border rounded-xl">
                                            <h5 className="font-bold text-gray-800">{ev.title_rw || ev.title_en}</h5>
                                            <p className="text-xs text-gray-500 mb-1">{ev.category} · {new Date(ev.created_at).toLocaleDateString()}</p>
                                            <p className="text-sm">{ev.content_rw?.slice(0, 120)}...</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Edit Year Modal */}
            {showEdit && editForm && (
                <Modal title="Edit Academic Year" onClose={() => setShowEdit(false)}>
                    <YearForm form={editForm} setForm={setEditForm} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setShowEdit(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold">Cancel</button>
                        <button onClick={submitEdit} disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2">
                            {busy && <Loader2 className="animate-spin" size={16} />} <Edit3 size={16} /> Update Year
                        </button>
                    </div>
                </Modal>
            )}

            {/* Create Year Modal */}
            {showCreate && (
                <Modal title="Create New Academic Year" onClose={() => setShowCreate(false)}>
                    <YearForm form={createForm} setForm={setCreateForm} showSetCurrent />
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold">Cancel</button>
                        <button onClick={submitCreate} disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2">
                            {busy && <Loader2 className="animate-spin" size={16} />} <Plus size={16} /> Create Year
                        </button>
                    </div>
                </Modal>
            )}

            {/* Close Year Modal */}
            {closeOpen && closePreview && yearDetail && (
                <Modal title={`Close Academic Year: ${yearDetail.name}`} onClose={() => setCloseOpen(false)} size="xl">
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-3">
                            <SummaryPill label="Promoted" value={liveSummary.promoted} color="bg-green-100 text-green-700" />
                            <SummaryPill label="Graduated" value={liveSummary.graduated} color="bg-amber-100 text-amber-700" />
                            <SummaryPill label="Retained" value={liveSummary.retained} color="bg-gray-100 text-gray-700" />
                        </div>

                        {/* Warnings */}
                        {!closePreview.ready_to_close && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                                <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-bold">Not all terms are ended</p>
                                    <p>Some terms are still active. You can still close the year, but it's recommended to end all terms first.</p>
                                </div>
                            </div>
                        )}

                        {closePreview.pending_intake > 0 && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
                                <AlertTriangle size={18} className="text-blue-600 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-bold">{closePreview.pending_intake} approved applications pending enrollment</p>
                                    <p>Consider enrolling them before closing the year.</p>
                                </div>
                            </div>
                        )}

                        {/* Cohort breakdown */}
                        {closePreview.cohort_breakdown && Object.keys(closePreview.cohort_breakdown).length > 0 && (
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <h4 className="font-bold text-gray-800 mb-2">Cohort Breakdown</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {Object.entries(closePreview.cohort_breakdown).map(([key, count]) => (
                                        <div key={key} className="flex justify-between p-2 bg-white rounded border">
                                            <span className="text-gray-600">{key}</span>
                                            <span className="font-bold">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Promotion plan table with overrides */}
                        <div className="border rounded-xl overflow-hidden max-h-96">
                            <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between sticky top-0">
                                <h4 className="font-bold text-gray-800">Promotion Plan ({closePreview.plan?.length || 0} students)</h4>
                                <button
                                    onClick={resetOverrides}
                                    className="text-xs px-3 py-1 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-1"
                                >
                                    <RefreshCcw size={12} /> Reset Overrides
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-80">
                                <BulkPromoteTable
                                    rows={closePreview.plan || []}
                                    overrides={overrides}
                                    updateOverride={updateOverride}
                                    ladderFor={ladderFor}
                                    nextLevelFor={nextLevelFor}
                                />
                            </div>
                        </div>

                        {/* Create next year option */}
                        <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer hover:border-blue-200">
                            <input
                                type="checkbox"
                                checked={createNextYear}
                                onChange={e => setCreateNextYear(e.target.checked)}
                                className="mt-1"
                            />
                            <div>
                                <div className="font-bold text-gray-800 text-sm">Create next academic year automatically</div>
                                <div className="text-xs text-gray-600">A new year will be created and set as current when this year closes.</div>
                            </div>
                        </label>

                        {createNextYear && (
                            <div className="p-4 bg-blue-50 rounded-2xl mb-3">
                                <YearForm form={nextYearForm} setForm={setNextYearForm} />
                            </div>
                        )}

                        {/* Required confirmation */}
                        <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer ${confirmClose ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-200'
                            }`}>
                            <input type="checkbox" checked={confirmClose}
                                onChange={e => setConfirmClose(e.target.checked)}
                                className="mt-1" />
                            <div>
                                <div className="font-bold text-gray-800 text-sm">I confirm closing academic year {yearDetail.name}</div>
                                <div className="text-xs text-gray-600">
                                    This is a critical operation: all students will be promoted/graduated/retained according to the plan above,
                                    and the year will be marked as closed in history.
                                </div>
                            </div>
                        </label>

                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setCloseOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 font-bold">Cancel</button>
                            <button onClick={submitClose} disabled={busy || !confirmClose}
                                className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2">
                                {busy && <Loader2 className="animate-spin" size={16} />} <Lock size={16} /> Close Year
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

/* ─── small components ───────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={22} />
        </div>
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="font-black text-lg text-gray-900">{value}</p>
        </div>
    </div>
);

const SummaryPill = ({ label, value, color }) => (
    <div className={`rounded-xl p-3 font-bold text-center ${color}`}>
        <div className="text-2xl">{value}</div>
        <div className="text-xs">{label}</div>
    </div>
);

const Modal = ({ title, onClose, children, size = 'md' }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className={`bg-white rounded-3xl shadow-2xl w-full ${size === 'xl' ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h3 className="font-black text-gray-800">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-6">{children}</div>
        </div>
    </div>
);

const Field = ({ label, children }) => (
    <label className="block">
        <span className="block text-xs font-bold uppercase text-gray-600 mb-1">{label}</span>
        {children}
    </label>
);

const YearForm = ({ form, setForm, showSetCurrent }) => {
    const update = (k, v) => setForm({ ...form, [k]: v });
    const updateTerm = (i, k, v) => {
        const terms = [...form.terms];
        terms[i] = { ...terms[i], [k]: v };
        setForm({ ...form, terms });
    };
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Name">
                    <input className="w-full px-3 py-2 rounded-xl border" value={form.name}
                        onChange={e => update('name', e.target.value)} />
                </Field>
                <Field label="Start Date">
                    <input type="date" className="w-full px-3 py-2 rounded-xl border" value={form.start_date || ''}
                        onChange={e => update('start_date', e.target.value)} />
                </Field>
                <Field label="End Date">
                    <input type="date" className="w-full px-3 py-2 rounded-xl border" value={form.end_date || ''}
                        onChange={e => update('end_date', e.target.value)} />
                </Field>
            </div>

            <div className="border-t pt-3">
                <p className="text-xs font-bold uppercase text-gray-600 mb-2">3 Terms</p>
                <div className="space-y-2">
                    {form.terms.map((t, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                            <Field label={`Term ${i + 1} Name`}>
                                <input className="w-full px-3 py-2 rounded-xl border" value={t.name}
                                    onChange={e => updateTerm(i, 'name', e.target.value)} />
                            </Field>
                            <Field label="Start">
                                <input type="date" className="w-full px-3 py-2 rounded-xl border" value={t.start_date}
                                    onChange={e => updateTerm(i, 'start_date', e.target.value)} />
                            </Field>
                            <Field label="End">
                                <input type="date" className="w-full px-3 py-2 rounded-xl border" value={t.end_date}
                                    onChange={e => updateTerm(i, 'end_date', e.target.value)} />
                            </Field>
                        </div>
                    ))}
                </div>
            </div>

            {showSetCurrent && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={!!form.set_current}
                        onChange={e => update('set_current', e.target.checked)} />
                    Set as current academic year
                </label>
            )}
        </div>
    );
};

const BulkPromoteTable = ({ rows, overrides, updateOverride, ladderFor, nextLevelFor }) => {
    const [search, setSearch] = useState('');
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(r =>
            (r.name || '').toLowerCase().includes(q) ||
            (r.reg_number || '').toLowerCase().includes(q) ||
            (r.trade || '').toLowerCase().includes(q) ||
            (r.from_level || '').toLowerCase().includes(q)
        );
    }, [rows, search]);

    if (!rows?.length) {
        return (
            <div className="text-center py-10 text-gray-400 text-sm">
                No students found in this year.
            </div>
        );
    }

    return (
        <div>
            <div className="px-3 py-2 border-b bg-gray-50 sticky top-0 z-10">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search (name, reg, trade, level)..."
                    className="w-full px-3 py-1.5 rounded-lg border text-sm"
                />
            </div>
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase sticky top-[42px] z-10">
                    <tr>
                        <th className="px-3 py-2 text-left">Student</th>
                        <th className="px-3 py-2 text-left">Trade · From</th>
                        <th className="px-3 py-2 text-left">Action</th>
                        <th className="px-3 py-2 text-left">Destination</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(r => {
                        const ovr = overrides[r.student_id] || {};
                        const action = ovr.action || r.action;
                        const isTerminal = !nextLevelFor(r.trade, r.from_level);
                        const dropLevels = ladderFor(r.trade);
                        const toLevel = action === 'graduated'
                            ? null
                            : action === 'retained'
                                ? r.from_level
                                : (ovr.to_level || r.to_level || nextLevelFor(r.trade, r.from_level) || r.from_level);
                        const overridden = !!ovr.action;
                        return (
                            <tr key={r.student_id} className={`border-t ${overridden ? 'bg-amber-50/40' : ''}`}>
                                <td className="px-3 py-2">
                                    <div className="font-bold text-gray-800">{r.name}</div>
                                    <div className="text-xs text-gray-500">{r.reg_number}</div>
                                </td>
                                <td className="px-3 py-2 text-xs">
                                    <div className="text-gray-700">{r.trade}</div>
                                    <div className="text-gray-500">{r.from_level || '—'}</div>
                                    {r.cohort && (
                                        <div className="text-[10px] text-amber-700 mt-0.5">{r.cohort}</div>
                                    )}
                                </td>
                                <td className="px-3 py-2">
                                    <select
                                        value={action}
                                        onChange={e => {
                                            const a = e.target.value;
                                            if (a === 'promoted') {
                                                updateOverride(r.student_id, {
                                                    action: 'promoted',
                                                    to_level: nextLevelFor(r.trade, r.from_level) || r.from_level,
                                                });
                                            } else {
                                                updateOverride(r.student_id, { action: a, to_level: null });
                                            }
                                        }}
                                        className={`px-2 py-1 rounded-lg border text-xs font-bold ${action === 'graduated' ? 'bg-amber-100 text-amber-800 border-amber-200'
                                            : action === 'promoted' ? 'bg-green-100 text-green-800 border-green-200'
                                                : 'bg-gray-100 text-gray-800 border-gray-200'
                                            }`}
                                    >
                                        <option value="promoted">Promote</option>
                                        <option value="retained">Retain</option>
                                        <option value="graduated">Graduate</option>
                                    </select>
                                </td>
                                <td className="px-3 py-2">
                                    {action === 'promoted' ? (
                                        <select
                                            value={toLevel || ''}
                                            onChange={e => updateOverride(r.student_id, { action: 'promoted', to_level: e.target.value })}
                                            className="px-2 py-1 rounded-lg border text-xs"
                                        >
                                            {dropLevels
                                                .filter(l => l !== r.from_level) // can't promote to same
                                                .map(l => <option key={l} value={l}>{l}</option>)
                                            }
                                            {/* if from_level is terminal, allow same just in case */}
                                            {isTerminal && <option value={r.from_level}>{r.from_level} (same)</option>}
                                        </select>
                                    ) : action === 'graduated' ? (
                                        <span className="text-xs font-bold text-amber-700">→ History (graduated)</span>
                                    ) : (
                                        <span className="text-xs text-gray-600">Stays at {r.from_level || '—'}</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {filtered.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-xs">No results found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const PromotionTable = ({ rows, compact }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                    <th className="px-3 py-2 text-left">Student</th>
                    {!compact && <th className="px-3 py-2 text-left">Reg</th>}
                    <th className="px-3 py-2 text-left">Trade</th>
                    <th className="px-3 py-2 text-left">From</th>
                    <th className="px-3 py-2 text-left">To</th>
                    <th className="px-3 py-2 text-left">Action</th>
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 && (
                    <tr><td colSpan={compact ? 5 : 6} className="text-center py-6 text-gray-400">No promotions recorded.</td></tr>
                )}
                {rows.map(r => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{r.first_name} {r.last_name}</td>
                        {!compact && <td className="px-3 py-2 text-xs text-gray-500">{r.reg_number}</td>}
                        <td className="px-3 py-2">{r.from_trade || r.trade}</td>
                        <td className="px-3 py-2">{r.from_level || '—'}</td>
                        <td className="px-3 py-2">{r.to_level || 'graduated'}</td>
                        <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.action === 'graduated' ? 'bg-amber-100 text-amber-700'
                                : r.action === 'promoted' ? 'bg-green-100 text-green-700'
                                    : r.action === 'enrolled' ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                }`}>{r.action}</span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default AcademicYear;
