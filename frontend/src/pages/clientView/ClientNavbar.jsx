import { useState } from 'react';
import { Menu, X, ShieldCheck } from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const links = [
  ['home', 'Home'], ['about', 'About us'], ['academics', 'Academics'], ['news', 'News'], ['innovations', 'Innovations'], ['publications', 'Publications'], ['campus', 'Campus life'], ['admissions', 'Admissions'], ['contact', 'Contact'],
];

export default function ClientNavbar({ language, onLanguageChange, onLogin, onNavigate, t }) {
  const [open, setOpen] = useState(false);
  const go = (id) => { onNavigate?.(id); if (!onNavigate) window.dispatchEvent(new CustomEvent('fkams-public-navigate', { detail: id })); setOpen(false); };
  return <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-[#102f3b]/90 text-white shadow-lg backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8"><button onClick={() => go('home')} className="flex items-center gap-3 text-left"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-300 text-[#123441]"><ShieldCheck size={22} /></span><span><b className="block font-display text-sm font-bold">Forever King</b><small className="block text-[8px] font-bold tracking-[0.18em] text-teal-100/70">ACADEMY · FKAMS</small></span></button><div className="hidden items-center gap-6 lg:flex">{links.map(([id, label]) => <button key={id} onClick={() => go(id)} className="text-[11px] font-bold uppercase tracking-wide text-slate-200 transition hover:text-teal-200">{label}</button>)}<button onClick={onLogin} className="rounded-xl bg-teal-300 px-4 py-2.5 text-[11px] font-extrabold text-[#123441] transition hover:bg-white">Login</button><LanguageSwitcher language={language} onChange={onLanguageChange} light /></div><button onClick={() => setOpen((value) => !value)} className="rounded-xl p-2 text-teal-100 lg:hidden" aria-label="Open menu">{open ? <X size={22} /> : <Menu size={22} />}</button></div>{open && <div className="border-t border-white/10 bg-[#102f3b] px-5 py-4 lg:hidden"><div className="flex flex-col gap-1">{links.map(([id, label]) => <button key={id} onClick={() => go(id)} className="rounded-lg px-3 py-3 text-left text-xs font-bold text-slate-200 hover:bg-white/10">{label}</button>)}<button onClick={onLogin} className="mt-2 rounded-xl bg-teal-300 px-4 py-3 text-xs font-extrabold text-[#123441]">Login to FKAMS</button><div className="mt-2"><LanguageSwitcher language={language} onChange={onLanguageChange} light label={t.language} /></div></div></div>}</nav>;
}
