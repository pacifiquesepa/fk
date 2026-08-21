import DashboardPage from './DashboardPage';

export default function AdminDashboardPage({ t, user, onNavigate }) {
  return <DashboardPage t={t} user={user} onNavigate={onNavigate} />;
}
