import { ArrowUpRight, CircleDollarSign, GraduationCap, UserCheck, Users } from 'lucide-react';

const icons = { students: Users, teachers: GraduationCap, fees: CircleDollarSign, admissions: UserCheck };
const tones = { blue: 'bg-cyan-50 text-cyan-700', mint: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700' };

export default function StatCard({ kind, title, value, note, tone = 'blue', detail }) {
  const Icon = icons[kind] || Users;
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(23,50,62,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={20} /></div><ArrowUpRight size={17} className="text-slate-300 transition group-hover:text-cyan-600" /></div>
      <p className="mt-5 text-xs font-semibold text-slate-500">{title}</p>
      <strong className="mt-1 block font-display text-2xl font-bold tracking-tight text-slate-800">{value}</strong>
      <p className="mt-2 text-[11px] text-slate-400"><span className={`mr-1 font-bold ${tone === 'violet' ? 'text-violet-600' : 'text-emerald-600'}`}>{note}</span>{detail}</p>
    </article>
  );
}
