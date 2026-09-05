import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, FileText, MessageSquare, ShieldCheck, Upload, Users } from 'lucide-react';
import ActionCard from '../components/ActionCard';
import StatCard from '../components/StatCard';
import api from '../lib/api';

export default function TeacherDashboardPage({ t, onNavigate }) {
    const [data, setData] = useState({ students: [], attendance: { total: 0, present: 0, percent: 0 }, activeAssessments: 0, notices: [], timetable: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        api.get('/teacher/dashboard').then(({ data: next }) => active && setData(next)).catch((requestError) => active && setError(requestError.response?.data?.error || 'Unable to load teacher dashboard data.')).finally(() => active && setLoading(false));
        return () => { active = false; };
    }, []);

    const actions = [
        ['My students', Users, 'View students assigned to your classes.', 'students', 'cyan'],
        ['Take attendance', ClipboardCheck, 'Mark attendance for your assigned students.', 'attendance', 'emerald'],
        ['Our Programs', BookOpen, 'Explore the school’s learning programs and pathways.', 'our-programs', 'emerald'],
        ['Active assessments', BookOpen, 'Review your published assessments.', 'academics', 'violet'],
        ['My timetable', CalendarDays, 'See your assigned classes and rooms.', 'timetable', 'amber'],
        ['School notices', MessageSquare, 'Read the latest notices for teachers.', 'notices', 'rose'],
        ['Submit report', FileText, 'Send an academic update to DOS.', 'reports', 'cyan'],
    ];

    return (
        <>
            <div className="space-y-7">
                <section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl shadow-cyan-950/10 sm:p-8">
                    <div className="flex items-start justify-between gap-5">
                        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">{t.app}</p><h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Teacher workspace</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Live classes, attendance, assessments, notices and timetable data from your school database.</p></div>
                        <ShieldCheck className="hidden text-teal-300 sm:block" size={28} />
                    </div>
                </section>
                {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard kind="students" title="My students" value={loading ? '...' : data.students.length} note="Database" detail="assigned students" tone="blue" /><StatCard kind="attendance" title="Attendance today" value={loading ? '...' : `${data.attendance.percent}%`} note="Database" detail={`${data.attendance.present} of ${data.attendance.total} marked present`} tone="mint" /><StatCard kind="academics" title="Active assessments" value={loading ? '...' : data.activeAssessments} note="Database" detail="published and in progress" tone="violet" /></section>
                <section><div className="mb-4"><h2 className="font-display text-base font-bold text-slate-800">Teacher tools</h2><p className="mt-1 text-sm text-slate-500">Open a live workspace for each part of your role.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{actions.map(([title, Icon, description, target, tone]) => <ActionCard key={title} icon={Icon} title={title} description={description} tone={tone} onClick={() => onNavigate(target)} />)}</div></section>
                <section className="grid gap-5 xl:grid-cols-2"><LiveList title="School notices" icon={MessageSquare} empty="No teacher notices yet." rows={data.notices} render={(item) => <><p className="text-sm font-medium text-slate-700">{item.title}</p><p className="mt-1 text-xs text-slate-600">{item.message}</p></>} /><LiveList title="Timetable" icon={CalendarDays} empty="No timetable entries yet." rows={data.timetable} render={(item) => <div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-700">{item.class}</p><p className="mt-1 text-xs text-slate-600">{item.time} · Room {item.room}</p></div><p className="text-xs font-medium text-cyan-600">{item.subject}</p></div>} /></section>
            </div>
        </>
    );
}

function LiveList({ title, icon: Icon, empty, rows, render }) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Icon size={18} className="text-cyan-700" /><h2 className="font-display text-base font-bold text-slate-800">{title}</h2></div><div className="mt-5 divide-y divide-slate-100">{rows.length ? rows.map((item) => <div key={item.id} className="py-3 first:pt-0">{render(item)}</div>) : <div className="flex items-center gap-2 py-6 text-sm text-slate-400"><CheckCircle2 size={17} />{empty}</div>}</div></section>;
}
