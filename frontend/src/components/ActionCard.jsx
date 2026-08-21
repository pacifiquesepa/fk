import { ArrowUpRight } from 'lucide-react';

export default function ActionCard({ icon: Icon, title, description, onClick, tone = 'cyan' }) {
  const tones = { cyan: 'bg-cyan-50 text-cyan-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700', rose: 'bg-rose-50 text-rose-700' };
  return <button onClick={onClick} className="group flex min-h-32 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span><span><b className="flex items-center justify-between text-xs text-slate-800">{title}<ArrowUpRight size={15} className="text-slate-300 transition group-hover:text-cyan-600" /></b><span className="mt-1 block text-[10px] leading-4 text-slate-400">{description}</span></span></button>;
}
