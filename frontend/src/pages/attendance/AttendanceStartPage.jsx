import { CalendarDays } from 'lucide-react';

export default function AttendanceStartPage({ onNext }) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><CalendarDays className="mx-auto text-cyan-700" size={52} /><h2 className="mt-4 font-display text-xl font-bold text-slate-800">Open Attendance</h2><p className="mt-2 text-sm text-slate-500">Begin a new attendance record.</p><button onClick={onNext} className="mt-6 rounded-xl bg-cyan-700 px-5 py-3 text-xs font-bold text-white">Continue</button></section>;
}
