import { useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import DosDashboardPage from './pages/DosDashboardPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import ParentDashboardPage from './pages/ParentDashboardPage';
import AccountantDashboardPage from './pages/AccountantDashboardPage';
import LibrarianDashboardPage from './pages/LibrarianDashboardPage';
import LoginPage from './pages/LoginPage';
import ModulePage from './pages/ModulePage';
import RoleWorkspacePage from './pages/RoleWorkspacePage';
import RegistrationPage from './pages/RegistrationPage';
import StudentProfilePage from './pages/StudentProfilePage';
import TestRunnerPage from './pages/TestRunnerPage';
import ClientHomePage from './pages/clientView/ClientHomePage';
import AboutPage from './pages/clientView/AboutPage';
import AcademicsPage from './pages/clientView/AcademicsPage';
import NewsPage from './pages/clientView/NewsPage';
import InnovationsPage from './pages/clientView/InnovationsPage';
import PublicationsPage from './pages/clientView/PublicationsPage';
import CampusLifePage from './pages/clientView/CampusLifePage';
import AdmissionsPage from './pages/clientView/AdmissionsPage';
import ContactPage from './pages/clientView/ContactPage';
import { getLanguage, translations } from './lib/i18n';

export default function App() {
	const [language, setLanguage] = useState(getLanguage);
	const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('fkams_user')) || null; } catch { return null; } });
	const [page, setPage] = useState('overview');
	const [publicPage, setPublicPage] = useState('home');
	const [showLogin, setShowLogin] = useState(false);
	const t = translations[language];
	useEffect(() => localStorage.setItem('fkams_language', language), [language]);
	useEffect(() => {
		const handlePublicNavigation = (event) => setPublicPage(event.detail);
		window.addEventListener('fkams-public-navigate', handlePublicNavigation);
		return () => window.removeEventListener('fkams-public-navigate', handlePublicNavigation);
	}, []);
	function changeLanguage(next) { setLanguage(next); }
	function authenticated(data) { localStorage.setItem('fkams_token', data.token); localStorage.setItem('fkams_user', JSON.stringify(data.user)); setUser(data.user); setPage('overview'); }
	function logout() { localStorage.removeItem('fkams_token'); localStorage.removeItem('fkams_user'); setUser(null); }
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
		: page === 'registration'
			? <RegistrationPage onBack={() => setPage('overview')} />
			: page === 'profile'
				? <StudentProfilePage user={user} onBack={() => setPage('overview')} />
				: page === 'test-runner'
					? <TestRunnerPage t={t} onBack={() => setPage('overview')} />
		: workspacePages.includes(page)
			? <RoleWorkspacePage role={user.role} t={t} onNavigate={setPage} initialPage={page} />
			: <ModulePage t={t} page={page} onBack={() => setPage('overview')} />;
	return <AppShell t={t} language={language} onLanguageChange={changeLanguage} user={user} activePage={page} onNavigate={setPage} onLogout={logout}>{content}</AppShell>;
}
