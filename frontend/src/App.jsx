import { useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AttendancePage from './pages/AttendancePage';
import AIEnginePage from './pages/AIEnginePage';
import AcademicYearPage from './pages/AcademicYearPage';
import AccountantDashboardPage from './pages/AccountantDashboardPage';
import ClientHomePage from './pages/clientView/ClientHomePage';
import AboutPage from './pages/clientView/AboutPage';
import AcademicsPage from './pages/clientView/AcademicsPage';
import NewsPage from './pages/clientView/NewsPage';
import InnovationsPage from './pages/clientView/InnovationsPage';
import InventoryPage from './pages/InventoryPage';
import PublicationsPage from './pages/clientView/PublicationsPage';
import CampusLifePage from './pages/clientView/CampusLifePage';
import AdmissionsPage from './pages/clientView/AdmissionsPage';
import ContactPage from './pages/clientView/ContactPage';
import DepartmentDirectoryPage from './pages/DepartmentDirectoryPage';
import DisciplinePage from './pages/DisciplinePage';
import DosClassManagementPage from './pages/DosClassManagementPage';
import DosDashboardPage from './pages/DosDashboardPage';
import FinancePage from './pages/FinancePage';
import LibrarianDashboardPage from './pages/LibrarianDashboardPage';
import LoginPage from './pages/LoginPage';
import ModulePage from './pages/ModulePage';
import OurProgramsPage from './pages/OurProgramsPage';
import ParentDashboardPage from './pages/ParentDashboardPage';
import RegistrationPage from './pages/RegistrationPage';
import RoleWorkspacePage from './pages/RoleWorkspacePage';
import SettingsPage from './pages/SettingsPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentProfilePage from './pages/StudentProfilePage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import TestRunnerPage from './pages/TestRunnerPage';
import TransportPage from './pages/TransportPage';
import UploadTestPage from './pages/UploadTestPage';
import ReportPage from './pages/ReportPage';
import AuditPage from './pages/AuditPage';
import { getLanguage, translations } from './lib/i18n';
import api from './lib/api';

export default function App() {
	const readRoute = () => {
		const params = new URLSearchParams(window.location.search);
		return {
			page: params.get('page') || 'overview',
			subject: params.get('subject') || '',
			unit: params.get('unit') || '',
		};
	};

	const [route, setRoute] = useState(() => readRoute());
	const [language, setLanguage] = useState(getLanguage);
	const [colorMode, setColorMode] = useState(() => localStorage.getItem('fkams_color_mode') || 'system');
	const [user, setUser] = useState(() => {
		try { return JSON.parse(localStorage.getItem('fkams_user')) || null; } catch { return null; }
	});
	const [publicPage, setPublicPage] = useState('home');
	const [showLogin, setShowLogin] = useState(false);
	const t = translations[language];
	const page = route.page;

	const syncRoute = (nextPage, extra = {}) => {
		const url = new URL(window.location.href);
		const params = url.searchParams;
		if (nextPage && nextPage !== 'overview') params.set('page', nextPage); else params.delete('page');
		if (extra.subject) params.set('subject', String(extra.subject)); else params.delete('subject');
		if (extra.unit) params.set('unit', String(extra.unit)); else params.delete('unit');
		window.history.pushState({}, '', `${url.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
		setRoute({ page: nextPage || 'overview', subject: extra.subject || '', unit: extra.unit || '' });
	};

	useEffect(() => localStorage.setItem('fkams_language', language), [language]);
	useEffect(() => {
		localStorage.setItem('fkams_color_mode', colorMode);
		const applyMode = () => {
			const dark = colorMode === 'dark' || (colorMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
			document.documentElement.classList.toggle('theme-dark', dark);
		};
		applyMode();
		if (colorMode !== 'system') return undefined;
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		media.addEventListener?.('change', applyMode);
		return () => media.removeEventListener?.('change', applyMode);
	}, [colorMode]);
	useEffect(() => {
		if (!user) return undefined;
		const heartbeat = () => api.post('/audit/heartbeat').catch(() => { });
		heartbeat();
		const timer = window.setInterval(heartbeat, 60000);
		return () => window.clearInterval(timer);
	}, [user]);
	useEffect(() => {
		const handlePublicNavigation = (event) => setPublicPage(event.detail);
		window.addEventListener('fkams-public-navigate', handlePublicNavigation);
		return () => window.removeEventListener('fkams-public-navigate', handlePublicNavigation);
	}, []);
	useEffect(() => {
		const handlePopState = () => setRoute(readRoute());
		const handleAppNavigation = (event) => navigate(event.detail?.page || 'overview', event.detail || {});
		window.addEventListener('popstate', handlePopState);
		window.addEventListener('fkams-navigate', handleAppNavigation);
		return () => { window.removeEventListener('popstate', handlePopState); window.removeEventListener('fkams-navigate', handleAppNavigation); };
	}, []);

	function changeLanguage(next) { setLanguage(next); }
	function navigate(nextPage, extra = {}) {
		syncRoute(nextPage, extra);
	}
	function setPage(nextPage, extra = {}) {
		syncRoute(nextPage, extra);
	}
	function authenticated(data) {
		localStorage.setItem('fkams_token', data.token);
		localStorage.setItem('fkams_user', JSON.stringify(data.user));
		setUser(data.user);
		navigate('overview');
	}
	function logout() {
		api.post('/audit/logout').catch(() => { });
		localStorage.removeItem('fkams_token');
		localStorage.removeItem('fkams_user');
		setUser(null);
		navigate('overview');
		setPublicPage('home');
		setShowLogin(false);
	}
	function updateUser(nextUser) {
		localStorage.setItem('fkams_user', JSON.stringify(nextUser));
		setUser(nextUser);
	}

	const publicProps = { t, language, onLanguageChange: changeLanguage, onLogin: () => setShowLogin(true), onNavigate: setPublicPage };
	const publicPages = {
		home: <ClientHomePage {...publicProps} />,
		about: <AboutPage {...publicProps} />,
		academics: <AcademicsPage {...publicProps} />,
		news: <NewsPage {...publicProps} />,
		innovations: <InnovationsPage {...publicProps} />,
		publications: <PublicationsPage {...publicProps} />,
		campus: <CampusLifePage {...publicProps} />,
		admissions: <AdmissionsPage {...publicProps} />,
		contact: <ContactPage {...publicProps} />,
	};

	if (!user && !showLogin) return publicPages[publicPage] || publicPages.home;
	if (!user) return <LoginPage t={t} language={language} onLanguageChange={changeLanguage} onAuthenticated={authenticated} onBackToPublic={() => setShowLogin(false)} />;

	const workspacePages = ['timetable', 'teachers', 'reports', 'homework', 'feeding', 'expenses', 'assets', 'loans'];
	const dashboards = {
		admin: <AdminDashboardPage t={t} user={user} onNavigate={setPage} />,
		dos: <DosDashboardPage t={t} onNavigate={setPage} />,
		teacher: <TeacherDashboardPage t={t} onNavigate={setPage} />,
		student: <StudentDashboardPage t={t} onNavigate={setPage} />,
		parent: <ParentDashboardPage t={t} onNavigate={setPage} />,
		accountant: <AccountantDashboardPage t={t} onNavigate={setPage} />,
		librarian: <LibrarianDashboardPage t={t} onNavigate={setPage} />,
	};

	const content = page === 'overview'
		? dashboards[user.role] || dashboards.student
		: page === 'add-department' && user.role === 'admin'
			? <DepartmentDirectoryPage user={user} onBack={() => navigate('overview')} />
			: page === 'registration'
				? <RegistrationPage onBack={() => navigate('overview')} />
				: page === 'ai-engine' && ['admin', 'dos', 'teacher'].includes(user.role)
					? <AIEnginePage user={user} onBack={() => navigate('overview')} onNavigate={navigate} />
					: page === 'profile' && user.role === 'student'
						? <StudentProfilePage user={user} onBack={() => navigate('overview')} onUserUpdated={updateUser} />
						: page === 'discipline'
							? <DisciplinePage user={user} t={t} onBack={() => navigate('overview')} />
							: page === 'attendance'
								? <AttendancePage user={user} t={t} onBack={() => navigate('overview')} />
								: page === 'upload-test' && ['admin', 'dos', 'teacher'].includes(user.role)
									? <UploadTestPage t={t} onBack={() => navigate('overview')} />
									: page === 'test-runner'
										? <TestRunnerPage t={t} onBack={() => navigate('overview')} />
										: page === 'reports' && ['admin', 'dos', 'teacher', 'student', 'parent'].includes(user.role)
											? <ReportPage user={user} t={t} onBack={() => navigate('overview')} onNavigate={navigate} />
											: page === 'our-programs'
												? <OurProgramsPage user={user} onBack={() => navigate('overview')} />
												: page === 'my-courses'
													? <OurProgramsPage user={user} autoOpenSubjects onBack={() => navigate('overview')} />
													: page === 'transport'
														? <TransportPage user={user} t={t} onBack={() => navigate('overview')} />
														: page === 'inventory'
															? <InventoryPage user={user} t={t} onBack={() => navigate('overview')} />
															: page === 'finance' || page === 'expenses'
																? <FinancePage user={user} t={t} initialTab={page === 'expenses' ? 'expenses' : 'payments'} onBack={() => navigate('overview')} />
																: page === 'settings'
																	? <SettingsPage user={user} t={t} colorMode={colorMode} onColorModeChange={setColorMode} onNavigate={navigate} onBack={() => navigate('overview')} onUserUpdated={updateUser} />
																	: page === 'audit' && ['teacher', 'dos', 'admin'].includes(user.role)
																		? <AuditPage onBack={() => navigate('settings')} />
																		: page === 'academics'
																			? <AcademicYearPage user={user} t={t} onBack={() => navigate('overview')} />
																			: page === 'academic-years'
																				? <AcademicYearPage user={user} t={t} onBack={() => navigate('overview')} />
																				: page === 'class-management' && ['admin', 'dos'].includes(user.role)
																					? <DosClassManagementPage t={t} onBack={() => navigate('overview')} />
																					: workspacePages.includes(page)
																						? <RoleWorkspacePage role={user.role} user={user} t={t} onNavigate={navigate} initialPage={page} />
																						: <ModulePage t={t} page={page} user={user} onNavigate={navigate} onBack={() => navigate('overview')} />;

	return <AppShell t={t} language={language} onLanguageChange={changeLanguage} user={user} activePage={page} onNavigate={navigate} onLogout={logout}>{content}</AppShell>;
}