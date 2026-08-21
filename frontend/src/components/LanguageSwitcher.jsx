import { Languages } from 'lucide-react';

export default function LanguageSwitcher({ language, onChange, light = false, label }) {
  return (
    <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${light ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
      <Languages size={15} />
      {label && <span className="hidden sm:inline">{label}</span>}
      <select value={language} onChange={(event) => onChange(event.target.value)} className="cursor-pointer bg-transparent font-bold outline-none" aria-label="Language">
        <option value="en">EN</option>
        <option value="rw">RW</option>
        <option value="fr">FR</option>
      </select>
    </label>
  );
}
