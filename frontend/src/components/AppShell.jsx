import { useEffect, useRef, useState } from 'react';
import { Bell, BookOpen, BriefcaseBusiness, Bus, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDollarSign, Clock3, FileText, GraduationCap, LayoutDashboard, Library, LogOut, Menu, Newspaper, Package, Search, Settings, ShieldCheck, Sparkles, UserCircle, Users, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

const itemMap = [
  ['add-department', 'addDepartment', BriefcaseBusiness], ['our-programs', 'ourPrograms', BookOpen], ['my-courses', 'myCourses', BookOpen], ['ai-engine', 'aiEngine', Sparkles],
  ['overview', 'overview', LayoutDashboard], ['students', 'students', GraduationCap], ['admissions', 'admissions', Users], ['academics', 'academics', BookOpen], ['discipline', 'discipline', ShieldCheck], ['permission', 'permission', ShieldCheck], ['security-guard', 'security', ShieldCheck], ['teacher_attendance', 'teacherAttendance', Clock3], ['attendance', 'attendance', CalendarDays], ['finance', 'finance', CircleDollarSign], ['library', 'library', Library], ['transport', 'transport', Bus], ['inventory', 'inventory', Package], ['news', 'news', Newspaper], ['notices', 'notices', Bell], ['documents', 'documents', FileText], ['timetable', 'timetable', CalendarDays], ['teachers', 'teachers', Users], ['reports', 'reports', FileText], ['homework', 'academics', BookOpen], ['feeding', 'inventory', Package], ['expenses', 'finance', CircleDollarSign], ['loans', 'library', Library], ['settings', 'settings', Settings],
    ['parents', 'parents', Users],
];

const roleItems = {
  admin: ['overview', 'add-department', 'students', 'parents', 'admissions', 'academics', 'academic-years', 'ai-engine', 'discipline', 'permission', 'security-guard', 'teacher_attendance', 'attendance', 'finance', 'expenses', 'inventory', 'news', 'notices', 'documents', 'timetable', 'teachers', 'reports', 'settings'],
  dos: ['overview', 'students', 'parents', 'admissions', 'academics', 'academic-years', 'ai-engine', 'discipline', 'permission', 'security-guard', 'teacher_attendance', 'attendance', 'news', 'notices', 'documents', 'timetable', 'teachers', 'reports', 'settings'],
  doc: ['overview', 'students', 'admissions', 'academics', 'discipline', 'permission', 'security-guard', 'teacher_attendance', 'attendance', 'news', 'notices', 'documents', 'timetable', 'teachers', 'reports', 'settings'],
  teacher: ['overview', 'students', 'academics', 'ai-engine', 'discipline', 'permission', 'teacher_attendance', 'our-programs', 'attendance', 'notices', 'timetable', 'homework', 'reports', 'settings'],
  parent: ['overview', 'attendance', 'finance', 'academics', 'library', 'transport', 'permission', 'notices', 'reports', 'homework', 'feeding', 'settings'],
  accountant: ['overview', 'students', 'parents', 'academics', 'finance', 'transport', 'inventory', 'permission', 'teacher_attendance', 'expenses', 'settings'],
  librarian: ['overview', 'students', 'academics', 'library', 'loans', 'permission', 'teacher_attendance', 'settings'],
  student: ['overview', 'academics', 'my-courses', 'discipline', 'permission', 'attendance', 'finance', 'library', 'transport', 'notices', 'reports', 'homework', 'settings'],
  security_guard: ['overview', 'security-guard', 'notices', 'documents', 'permission', 'settings'],
};

export default function AppShell({ t, language, onLanguageChange, user, activePage, onNavigate, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarNavRef = useRef(null);
  const available = roleItems[user?.role] || roleItems.admin;
  const roleAcademicYears = ['admin', 'dos'].includes(user?.role);
  const academicYearItem = ['academic-years', 'academicYears', CalendarDays];
  const navItems = [...itemMap.filter(([id]) => available.includes(id)), ...(roleAcademicYears && !available.includes('academic-years') ? [academicYearItem] : [])];
  const labelById = Object.fromEntries(
    [...itemMap, ['academic-years', 'academicYears']].map(([id, key]) => [
      id,
      id === 'add-department'
        ? 'Add Department'
        : id === 'our-programs'
          ? 'Our Programs'
          : id === 'my-courses'
            ? 'My Courses'
            : id === 'permission'
              ? 'Permission'
              : id === 'security-guard'
                ? 'Security guard'
                : id === 'teacher_attendance'
                  ? 'Department attendance'
                : (t[key] || (id === 'academic-years' ? 'Academic year' : id)),
    ]),
  );

  const profileItems = [
    ['Profile', user?.role === 'student' ? 'profile' : 'settings', UserCircle],
    ...(user?.role === 'student' ? [['Grades', 'reports', GraduationCap]] : []),
    ...(user?.role === 'student' ? [['Reports', 'reports', FileText]] : []),
    ['Calendar', 'academic-years', CalendarDays],
    ['Private files', 'documents', FileText],
    ['Preferences', 'settings', Settings],
  ];

  const avatarUrl = user?.photoKey || user?.photoUrl;
  const initials = user?.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'FK';
  const currentUrl = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/';
  const sidebarWidthClass = sidebarCollapsed ? 'w-[90px]' : 'w-[264px]';
  const mainPaddingClass = sidebarCollapsed ? 'lg:pl-[90px]' : 'lg:pl-[264px]';
  const activeSidebarPage = activePage === 'expenses' ? 'expenses' : activePage;

  const scrollSidebar = (direction) => {
    const nav = sidebarNavRef.current;
    if (!nav) return;
    nav.scrollBy({ top: direction === 'up' ? -140 : 140, behavior: 'smooth' });
  };

  useEffect(() => {
    const closeProfile = (event) => {
      if (!event.target.closest('[data-profile-menu]')) setProfileOpen(false);
    };
    document.addEventListener('click', closeProfile);
    return () => document.removeEventListener('click', closeProfile);
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f8f9] text-slate-800">
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-l-0 border-t-0 border-b-0 border-r border-slate-200 bg-gradient-to-b from-[#dfeff6] via-[#eaf5ff] to-[#f7fbff] px-3 py-5 shadow-[0_20px_40px_rgba(9,90,120,0.15)] backdrop-blur-lg transition-all duration-200 lg:translate-x-0 ${sidebarWidthClass} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-1">
          <img src="/forever.jpg" alt="Forever King Academy logo" className={`rounded-xl border border-slate-200 object-cover shadow-lg shadow-cyan-900/10 ${sidebarCollapsed ? 'h-9 w-9' : 'h-11 w-11 sm:h-12 sm:w-12'}`} />
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <strong className="block font-display text-sm font-bold text-slate-800">Forever King</strong>
              <span className="block text-[9px] font-bold tracking-[0.18em] text-slate-400">ACADEMY · FKAMS</span>
            </div>
          )}
          <button className="ml-auto hidden text-slate-400 hover:text-slate-700 lg:inline-flex" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button className="ml-auto text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="mt-5 h-px w-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />

        <div className={`mt-5 flex items-center gap-3 rounded-xl border border-white/70 bg-white/60 p-3 shadow-sm backdrop-blur ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
          <img src="/forever.jpg" alt="Forever King Academy logo" className={`rounded-lg border border-slate-200 object-cover ${sidebarCollapsed ? 'h-8 w-8' : 'h-9 w-9 sm:h-10 sm:w-10'}`} />
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[11px]">Forever King Academy</b>
              <span className="block text-[10px] text-slate-400">2025 / 2026 · Term 2</span>
            </div>
          )}
          {!sidebarCollapsed && <ChevronDown size={15} className="text-slate-400" />}
        </div>

        {!sidebarCollapsed && <p className="mb-2 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>}

        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={() => scrollSidebar('up')}
            aria-label="Scroll sidebar up"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white/70 text-slate-500 shadow-sm transition hover:text-slate-700"
          >
            <ChevronUp size={14} />
          </button>
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Navigate</span>
          <button
            type="button"
            onClick={() => scrollSidebar('down')}
            aria-label="Scroll sidebar down"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white/70 text-slate-500 shadow-sm transition hover:text-slate-700"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <nav ref={sidebarNavRef} className="mt-2 space-y-1 overflow-y-auto overscroll-contain pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 scroll-smooth" style={{ maxHeight: 'calc(100vh - 340px)' }}>
          {navItems.map(([id, key, Icon]) => (
            <button
              key={id}
              type="button"
              title={labelById[id]}
              onClick={() => { onNavigate(id === 'finance' || id === 'expenses' ? 'expenses' : id); setMobileOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${sidebarCollapsed ? 'justify-center px-2' : ''} ${activeSidebarPage === id ? 'bg-[#0f6a8a] text-white shadow-sm shadow-cyan-900/10' : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'}`}
            >
              <Icon size={17} className={activeSidebarPage === id ? 'text-white' : 'text-slate-500'} />
              {!sidebarCollapsed && <span>{labelById[id]}</span>}
              {!sidebarCollapsed && id === 'students' && <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white">150</span>}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200/80 pt-4">
          {!sidebarCollapsed && (
            <p className="text-center text-[10px] text-slate-400">Forever King Academy · FKAMS</p>
          )}
        </div>
      </aside>

      <main className={`flex min-h-screen flex-col ${mainPaddingClass}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex h-[72px] items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open navigation"><Menu size={21} /></button>
              <div className="hidden items-center gap-2 text-[11px] text-slate-500 sm:flex">
                <span className="text-slate-400">{t.dashboard}</span>
                <span className="text-slate-300">/</span>
                <b className="capitalize text-slate-700">{labelById[activePage] || activePage}</b>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-400 md:flex">
                <Search size={16} />
                <input className="w-40 bg-transparent text-xs outline-none placeholder:text-slate-400" placeholder={t.search} />
              </div>
              <LanguageSwitcher language={language} onChange={onLanguageChange} label={t.language} />
              <button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label={t.notices}><Bell size={18} /><i className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-400" /></button>

              <div className="relative" data-profile-menu>
                <button onClick={() => setProfileOpen((value) => !value)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left hover:border-cyan-300" aria-expanded={profileOpen} aria-label="Open profile menu">
                  <Avatar src={avatarUrl} initials={initials} />
                  <span className="hidden max-w-32 truncate text-xs font-bold text-slate-700 sm:block">{user?.name || 'FKAMS User'}</span>
                  <ChevronDown size={15} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                    {profileItems.map(([label, target, Icon]) => (
                      <button
                        key={`${label}-${target}`}
                        type="button"
                        onClick={() => { setProfileOpen(false); onNavigate(target); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      >
                        <Icon size={15} className="text-slate-400" />
                        {label}
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-100" />
                    <button onClick={() => { setProfileOpen(false); onLogout(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">
                      <LogOut size={15} />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="border-b border-slate-200/80 bg-slate-50/90 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">{currentUrl}</span>
        </div>

        <div className="flex flex-1 flex-col">{children}</div>

        <footer className="mt-auto border-t border-slate-200 bg-white/80 px-5 py-5 text-center text-[11px] text-slate-500 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
            <span className="font-semibold text-slate-700">Forever King Academy</span>
            <span>© 2025 FKAMS · All rights reserved</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Avatar({ src, initials }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const imageUrl = src && (src.startsWith('http://') || src.startsWith('https://') ? src : `${(import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '')}/${src.replace(/^\//, '')}`);
  return imageUrl && !failed ? <img src={imageUrl} alt="" onError={() => setFailed(true)} className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-[10px] font-extrabold text-amber-800">{initials}</span>;
}
