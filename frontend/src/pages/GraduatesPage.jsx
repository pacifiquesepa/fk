import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';
import {
    GraduationCap, Search, Filter, Loader2, Printer, Award,
    BookOpen, Users, Calendar, X, Phone, Mail, MapPin, RefreshCcw,
    ChevronDown, ChevronRight, Lock, FileText, Send
} from 'lucide-react';
import SendRosterModal from '../components/SendRosterModal';

const TRADE_BADGE = {
    'Software Development': 'bg-blue-100 text-blue-800   border-blue-200',
    'Building and Construction': 'bg-amber-100 text-amber-800 border-amber-200',
    'Automobile Technology': 'bg-emerald-100 text-emerald-800 border-emerald-200',
};
const tradeColor = (t) => TRADE_BADGE[t] || 'bg-gray-100 text-gray-700 border-gray-200';

const fmtDate = (s) => {
    if (!s) return '—';
    try {
        const d = new Date(s);
        return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch { return s; }
};

const initials = (first, last) =>
    `${(first || '').trim()[0] || ''}${(last || '').trim()[0] || ''}`.toUpperCase();

const Graduates = () => {
    const { user } = useAuthStore();
    const allowed = ['admin', 'director', 'registrar', 'dod', 'director_of_discipline', 'accountant'].includes(user?.role);
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ total: 0, groups: [], filters: { years: [], trades: [] } });
    const [yearId, setYearId] = useState('');
    const [trade, setTrade] = useState('');
    const [search, setSearch] = useState('');
    const [collapsed, setCollapsed] = useState({});  // { groupKey: true }
    const [selected, setSelected] = useState(null); // student detail modal
    const [sendOpen, setSendOpen] = useState(false);

    const printRef = useRef(null);

    const load = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (yearId) params.set('year_id', yearId);
            if (trade) params.set('trade', trade);
            if (search) params.set('search', search);
            params.set('limit', '5000');
            const r = await api.get(`/academic-years/graduates?${params.toString()}`);
            setData(r.data || { total: 0, groups: [], filters: { years: [], trades: [] } });
        } catch (err) {
            toast.error(err.response?.data?.message || t('common_extra.generic_error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line
    }, [yearId, trade, search]);

    const totals = useMemo(() => {
        const trades = new Set();
        let students = 0;
        for (const g of data.groups || []) {
            students += g.total;
            for (const t of g.trades) trades.add(t.trade);
        }
        return {
            students,
            trades: trades.size,
            years: (data.groups || []).length,
        };
    }, [data]);

    const toggleGroup = (k) =>
        setCollapsed(prev => ({ ...prev, [k]: !prev[k] }));

    /* ─── Print roster (PDF via browser print) ──────────────────── */
    const printRoster = () => {
        if (!data.groups?.length) {
            toast.info(t('grad_full.no_graduates_to_print'));
            return;
        }
        const html = buildPrintHtml(data, { yearId, trade, search }, t);
        const w = window.open('', '_blank', 'width=1024,height=768');
        if (!w) {
            toast.error(t('grad_full.enable_popups'));
            return;
        }
        w.document.write(html);
        w.document.close();
        w.focus();
        // Give the browser a moment to render before triggering print.
        setTimeout(() => {
            try { w.print(); } catch (_) { }
        }, 400);
    };

    if (!allowed) {
        return (
            <div className="text-center py-20 text-gray-400">
                <Lock size={48} className="mx-auto mb-3 opacity-30" />
                <p>{t('grad_full.access_restricted')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2">
                            <GraduationCap size={26} /> {t('grad_full.title')}
                        </h1>
                        <p className="text-amber-100 text-sm">
                            {t('grad_full.subtitle_yearbook')}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={load}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-2 text-sm">
                            <RefreshCcw size={16} /> {t('common_extra.refresh')}
                        </button>
                        <button onClick={() => setSendOpen(true)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg">
                            <Send size={18} /> {t('grad_full.send_to_employers')}
                        </button>
                        <button onClick={printRoster}
                            className="px-4 py-2 bg-white text-amber-700 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-50">
                            <Printer size={18} /> {t('grad_full.print_pdf')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
                <StatCard icon={GraduationCap} label={t('grad_full.stats.total_graduates')} value={totals.students} color="bg-amber-50 text-amber-700" />
                <StatCard icon={Calendar} label={t('grad_full.stats.years')} value={totals.years} color="bg-blue-50  text-blue-700" />
                <StatCard icon={BookOpen} label={t('grad_full.stats.trades')} value={totals.trades} color="bg-emerald-50 text-emerald-700" />
                <StatCard icon={Award} label={t('grad_full.stats.diplomas')} value={totals.students} color="bg-rose-50  text-rose-700" />
            </div>

            {/* Filters */}
            <div className="px-6 mb-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[220px] relative">
                            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('grad_full.search_placeholder')}
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:border-amber-300 focus:ring-amber-200"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-gray-500" />
                            <select
                                value={yearId}
                                onChange={e => setYearId(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                            >
                                <option value="">{t('grad_full.all_years')}</option>
                                {(data.filters?.years || []).map(y => (
                                    <option key={y.id} value={y.id}>{y.name}</option>
                                ))}
                            </select>
                            <select
                                value={trade}
                                onChange={e => setTrade(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                            >
                                <option value="">{t('grad_full.all_trades')}</option>
                                {(data.filters?.trades || []).map(tr => (
                                    <option key={tr} value={tr}>{tr}</option>
                                ))}
                            </select>
                            {(yearId || trade || search) && (
                                <button
                                    onClick={() => { setYearId(''); setTrade(''); setSearch(''); }}
                                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1"
                                >
                                    <X size={14} /> {t('common_extra.clear')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Yearbook content */}
            <div className="px-6 pb-12" ref={printRef}>
                {loading ? (
                    <div className="bg-white rounded-3xl p-16 text-center">
                        <Loader2 className="mx-auto animate-spin text-amber-500" size={36} />
                    </div>
                ) : !data.groups?.length ? (
                    <div className="bg-white rounded-3xl p-16 text-center text-gray-400">
                        <GraduationCap size={56} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-gray-600">{t('grad_full.empty_title')}</p>
                        <p className="text-xs">{t('grad_full.empty_hint')}</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {data.groups.map(group => {
                            const gKey = `y_${group.year_id || group.year_name}`;
                            const isCollapsed = !!collapsed[gKey];
                            return (
                                <section key={gKey} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(gKey)}
                                        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-amber-50 via-white to-orange-50 hover:from-amber-100 transition"
                                    >
                                        <div className="flex items-center gap-3 text-left">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black">
                                                <Calendar size={22} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black text-gray-900">{group.year_name}</h2>
                                                <p className="text-xs text-gray-500">
                                                    {fmtDate(group.start_date)} → {fmtDate(group.end_date)}
                                                    <span className="ml-2 text-gray-400">·</span>
                                                    <span className="ml-2 font-bold text-amber-700">{t('grad_full.n_graduates', { count: group.total })}</span>
                                                </p>
                                            </div>
                                        </div>
                                        {isCollapsed ? <ChevronRight size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                    </button>

                                    {!isCollapsed && (
                                        <div className="p-6 space-y-6">
                                            {group.trades.map(t => (
                                                <div key={t.trade}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tradeColor(t.trade)}`}>
                                                                {t.trade}
                                                            </span>
                                                            <span className="text-xs text-gray-500">{t('grad_full.n_graduates', { count: t.count })}</span>
                                                        </div>
                                                    </div>

                                                    {/* Yearbook grid */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                        {t.students.map(s => (
                                                            <button
                                                                key={s.promotion_id}
                                                                type="button"
                                                                onClick={() => setSelected(s)}
                                                                className="group text-left rounded-2xl border border-gray-100 hover:border-amber-300 hover:shadow-md transition p-3 bg-white"
                                                            >
                                                                <div className="aspect-square rounded-xl bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 flex items-center justify-center text-2xl font-black text-amber-700 overflow-hidden">
                                                                    {s.photo_url
                                                                        ? <img src={s.photo_url} alt={s.first_name} className="w-full h-full object-cover" />
                                                                        : initials(s.first_name, s.last_name)}
                                                                </div>
                                                                <div className="mt-2">
                                                                    <p className="font-bold text-gray-800 text-sm leading-tight truncate">
                                                                        {s.first_name} {s.last_name}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-500 truncate">{s.reg_number}</p>
                                                                    <p className="text-[10px] text-gray-500 truncate">{s.from_level || s.final_level}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail modal */}
            {selected && (
                <GraduateModal grad={selected} onClose={() => setSelected(null)} />
            )}

            {/* Send roster modal */}
            <SendRosterModal
                open={sendOpen}
                onClose={() => setSendOpen(false)}
                filters={{ yearId, trade, search }}
                graduateCount={totals.students}
            />
        </div>
    );
};

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

const GraduateModal = ({ grad, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
                <h3 className="font-black text-gray-800 flex items-center gap-2">
                    <GraduationCap size={20} className="text-amber-600" /> {grad.first_name} {grad.last_name}
                </h3>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-3xl font-black text-amber-700 overflow-hidden">
                        {grad.photo_url
                            ? <img src={grad.photo_url} alt="" className="w-full h-full object-cover" />
                            : initials(grad.first_name, grad.last_name)}
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Reg Number</p>
                        <p className="font-black text-lg text-gray-900">{grad.reg_number || '—'}</p>
                        <p className="text-sm text-gray-600">{grad.trade}</p>
                        <p className="text-xs text-gray-500">{grad.from_level || grad.final_level}</p>
                    </div>
                </div>
                <Detail icon={Calendar} label="Academic Year">{grad.academic_year_name || '—'}</Detail>
                <Detail icon={Award} label="Graduation Date">{fmtDate(grad.graduated_at)}</Detail>
                {grad.gender && <Detail icon={Users} label="Gender">{grad.gender}</Detail>}
                {grad.contact_phone && <Detail icon={Phone} label="Phone">{grad.contact_phone}</Detail>}
                {grad.contact_email && <Detail icon={Mail} label="Email">{grad.contact_email}</Detail>}
                {(grad.address_district || grad.address_sector) && (
                    <Detail icon={MapPin} label="Address">
                        {[grad.address_district, grad.address_sector].filter(Boolean).join(' / ')}
                    </Detail>
                )}
                {grad.guardian_name && <Detail icon={Users} label="Guardian">{grad.guardian_name} {grad.guardian_phone ? `(${grad.guardian_phone})` : ''}</Detail>}
                {grad.promotion_notes && <Detail icon={FileText} label="Cohort">{grad.promotion_notes}</Detail>}
            </div>
        </div>
    </div>
);

const Detail = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3 text-sm">
        <Icon size={16} className="text-amber-600 mt-0.5" />
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-gray-800 font-medium">{children}</p>
        </div>
    </div>
);

/* ─── Print roster HTML builder ─────────────────────────────────── */
function buildPrintHtml(data, filters, t) {
    const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

    const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: '2-digit' });

    const filterLine = [
        filters.yearId ? 'Year filter applied' : null,
        filters.trade ? `Trade: ${filters.trade}` : null,
        filters.search ? `Search: "${filters.search}"` : null,
    ].filter(Boolean).join(' · ') || 'All years · All trades';

    const yearsHtml = data.groups.map(g => `
        <section class="year">
            <h2>${escapeHtml(g.year_name)}
                <small>${g.start_date ? new Date(g.start_date).toLocaleDateString() : ''} → ${g.end_date ? new Date(g.end_date).toLocaleDateString() : ''} · ${g.total} graduates</small>
            </h2>
            ${g.trades.map(t => `
                <h3>${escapeHtml(t.trade)} <small>(${t.count})</small></h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Reg Number</th>
                            <th>Name</th>
                            <th>Gender</th>
                            <th>Final Level</th>
                            <th>Phone</th>
                            <th>Address</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${t.students.map((s, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHtml(s.reg_number)}</td>
                                <td>${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</td>
                                <td>${escapeHtml(s.gender || '—')}</td>
                                <td>${escapeHtml(s.from_level || s.final_level || '—')}</td>
                                <td>${escapeHtml(s.contact_phone || '—')}</td>
                                <td>${escapeHtml([s.address_district, s.address_sector].filter(Boolean).join(' / ') || '—')}</td>
                                <td>${s.graduated_at ? new Date(s.graduated_at).toLocaleDateString() : '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `).join('')}
        </section>
    `).join('');

    return `<!doctype html>
<html lang="rw">
<head>
<meta charset="utf-8" />
<title>Garden TVET — Graduates</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; margin: 24px; }
    header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #d97706; padding-bottom: 12px; margin-bottom: 16px; }
    header h1 { margin: 0; font-size: 20px; color: #92400e; }
    header small { color: #6b7280; }
    .filters { background: #fef3c7; padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 16px; color: #78350f; }
    .year { page-break-inside: avoid; margin-bottom: 22px; }
    .year h2 { color: #92400e; border-bottom: 1px solid #fcd34d; padding-bottom: 4px; margin-bottom: 8px; font-size: 16px; }
    .year h2 small { color: #6b7280; font-weight: normal; font-size: 12px; margin-left: 8px; }
    .year h3 { color: #1f2937; margin: 12px 0 6px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #e5e7eb; padding: 4px 6px; text-align: left; vertical-align: top; }
    th { background: #fffbeb; color: #78350f; font-size: 10px; text-transform: uppercase; }
    tbody tr:nth-child(even) { background: #fafafa; }
    footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    @media print {
        body { margin: 12mm; }
        header { border-color: #d97706; }
    }
</style>
</head>
<body>
    <header>
        <div>
            <h1>Garden TVET School — Graduates</h1>
            <small>${escapeHtml(filterLine)}</small>
        </div>
        <div style="text-align:right">
            <small>Generated on ${escapeHtml(today)}</small><br/>
            <small><strong>${data.total}</strong> graduates · ${data.groups.length} years</small>
        </div>
    </header>
    <div class="filters">${escapeHtml(filterLine)}</div>
    ${yearsHtml}
    <footer>© Garden TVET School · East / Ngoma · Generated via system (${escapeHtml(today)})</footer>
</body>
</html>`;
}

export default Graduates;
