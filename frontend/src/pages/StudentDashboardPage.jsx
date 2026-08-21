import RoleWorkspacePage from './RoleWorkspacePage';

export default function StudentDashboardPage({ t, onNavigate }) {
  return <RoleWorkspacePage role="student" t={t} onNavigate={onNavigate} />;
}
