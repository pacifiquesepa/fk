import RoleWorkspacePage from './RoleWorkspacePage';

export default function TeacherDashboardPage({ t, onNavigate }) {
  return <RoleWorkspacePage role="teacher" t={t} onNavigate={onNavigate} />;
}
