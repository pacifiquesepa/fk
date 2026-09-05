import { useEffect, useState } from 'react';
import { Activity, Award, BookOpen, Bus, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardCheck, FileText, Library, MessageSquare, Package, QrCode, School, ShieldCheck, UserCheck, Users, Utensils, WalletCards } from 'lucide-react';
import ActionCard from '../components/ActionCard';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import api from '../lib/api';

const roleCopy = {
  admin: { title: 'Administration centre', description: 'Full visibility across academic year, financial and operational work.', actions: [['Documents', FileText, 'Manage contracts, certificates and policies.', 'documents', 'violet'], ['School dashboard', Activity, 'Review the complete school pulse.', 'overview', 'cyan'], ['User access', ShieldCheck, 'Manage roles, accounts and security.', 'students', 'emerald']] },
  dos: { title: 'Director of studies workspace', description: 'Make decisions, approve applications and keep the academy moving.', actions: [['Academic Years', CalendarDays, 'Manage academic years, terms and promotions.', 'academic-years', 'violet'], ['Class & subject management', School, 'Create classes, subjects and teacher assignments.', 'class-management', 'cyan'], ['Review admissions', UserCheck, 'Approve students and teachers with comments.', 'admissions', 'amber'], ['Register records', Users, 'Register students who did not apply and new teachers.', 'registration', 'cyan'], ['Timetable', CalendarDays, 'Build classes, rooms and teacher schedules.', 'timetable', 'cyan'], ['Teacher management', Users, 'Contracts, attendance, payroll and assignments.', 'teachers', 'violet'], ['Student reports', Award, 'Prepare complete report cards and rankings.', 'reports', 'emerald'], ['School notices', MessageSquare, 'Publish updates for the community.', 'notices', 'rose']] },
  teacher: { title: 'Teacher workspace', description: 'Everything you need for your classes, assessments and daily teaching.', actions: [['My students', Users, 'Only students in your assigned classes.', 'students', 'cyan'], ['Take attendance', ClipboardCheck, 'Mark present, absent or late.', 'attendance', 'emerald'], ['Create assessment', BookOpen, 'Choice, fill and match tests with a timer.', 'academics', 'violet'], ['Homework', FileText, 'Publish work and track due dates.', 'homework', 'amber'], ['My timetable', CalendarDays, 'See your classes and rooms.', 'timetable', 'cyan'], ['Submit report', MessageSquare, 'Send an academic year update to DOS.', 'reports', 'rose']] },
  student: { title: 'Student portal', description: 'Your classes, tests, results and school life in one place.', actions: [['My Courses', BookOpen, 'See the subjects and lessons assigned to your class.', 'my-courses', 'cyan'], ['Our Programs', BookOpen, 'Explore the school’s learning pathways and programmes.', 'our-programs', 'emerald'], ['Take a test', ClipboardCheck, 'Continue a published timed assessment.', 'test-runner', 'violet'], ['My report', Award, 'Grades, behavior and attendance report.', 'reports', 'emerald'], ['Digital ID & profile', QrCode, 'Your QR pass and photo-only profile edit.', 'profile', 'amber'], ['Homework', FileText, 'View work and due dates.', 'homework', 'rose'], ['School notices', MessageSquare, 'Announcements from the academy.', 'notices', 'cyan']] },
  parent: { title: 'Parent portal', description: 'A clear view of your child’s progress, wellbeing and school life.', actions: [['My children', Users, 'Profiles and class information.', 'students', 'cyan'], ['Fees & balances', CircleDollarSign, 'Invoices, payments and outstanding balances.', 'finance', 'amber'], ['Attendance', CalendarDays, 'Know when your child is present or late.', 'attendance', 'emerald'], ['Results & behavior', Award, 'Grades, reports and behavior notes.', 'reports', 'violet'], ['Transport', Bus, 'Route and pickup information.', 'transport', 'cyan'], ['Feeding', Utensils, 'School meal records.', 'feeding', 'rose']] },
  accountant: { title: 'Finance and operations workspace', description: 'Track money, assets, stock and transport with confidence.', actions: [['Fees & balances', CircleDollarSign, 'Invoices, payments and outstanding fees.', 'finance', 'amber'], ['Expenses & budgets', WalletCards, 'Income, expenses and budgets.', 'expenses', 'violet'], ['Inventory store', Package, 'Uniforms, books, stationery and equipment.', 'inventory', 'cyan'], ['Assets', School, 'Computers, desks, buildings and vehicles.', 'assets', 'emerald'], ['Transport', Bus, 'Buses, routes, drivers and students.', 'transport', 'rose']] },
  librarian: { title: 'Library workspace', description: 'Keep the catalogue accurate and every loan accountable.', actions: [['Book catalogue', Library, 'Add books, subjects, shelves and quantities.', 'library', 'cyan'], ['Active loans', ClipboardCheck, 'See who borrowed each book and due dates.', 'loans', 'amber'], ['Student lookup', Users, 'Find a student before issuing a book.', 'students', 'violet']] },
};

const roleStats = {
  dos: [['students', '0', 'School students', 'active records', 'blue'], ['teachers', '0', 'Teachers', 'managed staff', 'mint'], ['admissions', '0', 'Pending admissions', 'need review', 'violet']],
  teacher: [['students', '0', 'My students', 'assigned classes', 'blue'], ['attendance', '0%', 'Today attendance', 'your classes', 'mint'], ['academics', '0', 'Active assessments', 'this term', 'violet']],
  student: [['students', '-', 'My class', 'current class', 'blue'], ['attendance', '0%', 'My attendance', 'this term', 'mint'], ['academics', '0', 'My subjects', 'published tests', 'violet']],
  parent: [['students', '0', 'My children', 'linked profiles', 'blue'], ['attendance', '0%', 'Attendance', 'linked children', 'mint'], ['fees', '0 RWF', 'Outstanding fees', 'RWF balance', 'amber']],
  accountant: [['fees', '0 RWF', 'Fees collected', 'this month', 'amber'], ['students', '0', 'Active students', 'active records', 'violet'], ['inventory', '0', 'Low stock items', 'reorder soon', 'blue']],
  librarian: [['students', '0', 'Student borrowers', 'active students', 'blue'], ['library', '0', 'Books in catalogue', 'library collection', 'mint'], ['loans', '0', 'Active loans', 'not returned', 'amber']],
};

const tableConfig = {
  timetable: { endpoint: '/timetable', key: 'timetable', title: 'Timetable', columns: [{ key: 'dayOfWeek', label: 'Day' }, { key: 'startsAt', label: 'Start' }, { key: 'endsAt', label: 'End' }, { key: 'subjectName', label: 'Subject' }, { key: 'className', label: 'Class' }, { key: 'room', label: 'Room' }] },
  teachers: { endpoint: '/teachers', key: 'teachers', title: 'Teacher management', columns: [{ key: 'fullName', label: 'Teacher' }, { key: 'employeeNumber', label: 'Employee no.' }, { key: 'contractType', label: 'Contract' }, { key: 'phone', label: 'Phone' }, { key: 'isActive', label: 'Status' }] },
  reports: { key: 'grades', title: 'Student report', columns: [{ key: 'subject', label: 'Subject' }, { key: 'score', label: 'Score' }, { key: 'maxScore', label: 'Maximum' }] },
  homework: { endpoint: '/homework', key: 'homework', title: 'Homework', columns: [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }, { key: 'dueDate', label: 'Due date' }] },
  feeding: { endpoint: '/feeding/stock', key: 'stock', title: 'Feeding stock', columns: [{ key: 'itemName', label: 'Item' }, { key: 'quantity', label: 'Quantity' }, { key: 'unit', label: 'Unit' }, { key: 'reorderLevel', label: 'Reorder level' }] },
  expenses: { endpoint: '/finance/expenses', key: 'expenses', title: 'Expenses', columns: [{ key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount' }, { key: 'spentAt', label: 'Date' }] },
  assets: { endpoint: '/assets', key: 'assets', title: 'Assets', columns: [{ key: 'name', label: 'Asset' }, { key: 'assetTag', label: 'Asset tag' }, { key: 'category', label: 'Category' }, { key: 'conditionStatus', label: 'Condition' }, { key: 'location', label: 'Location' }] },
  loans: { endpoint: '/library/loans', key: 'loans', title: 'Library loans', columns: [{ key: 'title', label: 'Book' }, { key: 'studentName', label: 'Student' }, { key: 'issuedAt', label: 'Issued' }, { key: 'dueAt', label: 'Due' }, { key: 'returnedAt', label: 'Returned' }] },
};

export default function RoleWorkspacePage({ role, user, t, onNavigate, initialPage }) {
  const copy = roleCopy[role] || roleCopy.student; const [selected, setSelected] = useState(tableConfig[initialPage] ? initialPage : null); const [rows, setRows] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(roleStats[role] || roleStats.student);
  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
        const nextStats = await fetchRoleStats(role);
        if (active && nextStats) setStats(nextStats);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.error || requestError.message || 'Unable to load dashboard statistics.');
      }
    };
    loadStats();
    return () => { active = false; };
  }, [role, user]);
  useEffect(() => { if (!selected || !tableConfig[selected]) return; let active = true; setLoading(true); setError(''); const item = tableConfig[selected]; const load = async () => { let endpoint = item.endpoint; if (selected === 'reports') { const studentId = await resolveStudentId(user); if (!studentId) throw new Error('No student record is available for reports.'); endpoint = `/students/${studentId}/report`; } const { data } = await api.get(endpoint); const nextRows = data[item.key] || []; if (active) setRows(selected === 'teachers' ? Array.from(new Map(nextRows.map((row) => [row.id, row])).values()) : nextRows); }; load().catch((requestError) => active && setError(requestError.response?.data?.error || requestError.message || 'Connect the backend or add records to view this workspace.')).finally(() => active && setLoading(false)); return () => { active = false; }; }, [selected, user]);
  if (selected === 'timetable') {
    return <TimetableDocument user={user} onBack={() => setSelected(null)} />;
  }

  if (selected && tableConfig[selected]) { const item = tableConfig[selected]; return <div className="space-y-6"><button onClick={() => setSelected(null)} className="text-xs font-bold text-cyan-700">← Back to workspace</button><div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div><h1 className="font-display text-2xl font-bold text-slate-800">{item.title}</h1><p className="mt-1 text-xs text-slate-500">Role-scoped operational view</p></div><button onClick={() => onNavigate('overview')} className="rounded-xl bg-cyan-700 px-4 py-3 text-xs font-bold text-white">Dashboard</button></div>{error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">{error}</div>}{loading ? <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-xs text-slate-400">{t.loading}</div> : <DataTable columns={item.columns} rows={rows} emptyLabel={t.noData} />}</div>; }
  return <div className="space-y-7"><section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl shadow-cyan-950/10 sm:p-8"><div className="flex items-start justify-between gap-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">{t.app}</p><h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{copy.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{copy.description}</p></div><ShieldCheck className="hidden text-teal-300 sm:block" size={28} /></div></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map(([kind, value, title, detail, tone]) => <StatCard key={title} kind={kind} title={title} value={value} note="Live" detail={detail} tone={tone} />)}</section><section><div className="mb-4"><h2 className="font-display text-sm font-bold text-slate-800">Quick access</h2><p className="mt-1 text-xs text-slate-400">Open the tools available for your role.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{copy.actions.map(([title, Icon, description, target, tone]) => <ActionCard key={title} icon={Icon} title={title} description={description} tone={tone} onClick={() => tableConfig[target] ? setSelected(target) : onNavigate(target)} />)}</div></section></div>;
}

function TimetableDocument({ user, onBack }) {
  const inferLevel = () => {
    const classLabel = `${user?.className || user?.gradeLevel || user?.level || ''}`.toLowerCase();
    return classLabel.includes('nursery') || classLabel.includes('baby') || classLabel.includes('kg') ? 'nursery' : 'primary';
  };
  const [activeLevel, setActiveLevel] = useState(inferLevel());
  const [isEditing, setIsEditing] = useState(false);
  const [nurseryRows, setNurseryRows] = useState([
    { period: '8:30-8:45', activity: 'School Assembly' },
    { period: '8:45-9:10', activity: 'Welcome time' },
    { period: '9:10-9:30', activity: 'Language and Literacy: Kinyarwanda' },
    { period: '9:30-10:00', activity: 'Discovery of the world' },
    { period: '10:00-10:30', activity: 'Free corner play (Numeracy activities, literacy activities, books reading, Role play, Creative activities, construction activities)' },
    { period: '10:30-10:50', activity: 'Snack time' },
    { period: '10:50-11:10', activity: 'Physical Development and Health: Outdoor play, Health and self-care' },
    { period: '11:10-11:30', activity: 'Story time: Kinyarwanda (Tuesday, Thursday and Friday)' },
    { period: '11:30-11:50', activity: 'Numeracy' },
    { period: '11:50-12:10', activity: 'Language and Literacy: English oral communication' },
    { period: '12:10-12:20', activity: 'Closing time' },
    { period: '12:20-13:25', activity: 'Lunch time' },
    { period: '13:25-17:00', activity: 'Lesson preparation CPD for teachers' }
  ]);
  const [primaryRows, setPrimaryRows] = useState([
    { period: '8:30-8:45', monday: 'School assembly', tuesday: 'School assembly', wednesday: 'School assembly', thursday: 'School assembly', friday: 'School assembly' },
    { period: '8:45-9:25', monday: 'Kinyarwanda', tuesday: 'Kinyarwanda', wednesday: 'Kinyarwanda', thursday: 'Math', friday: 'Math (Remedial session)' },
    { period: '9:25-10:05', monday: 'Kinyarwanda', tuesday: 'Kinyarwanda', wednesday: 'Kinyarwanda', thursday: 'Math', friday: 'English (Remedial session)' },
    { period: '10:05-10:45', monday: 'Math', tuesday: 'English', wednesday: 'SET', thursday: 'SST and RE*', friday: 'Kinyarwanda (Remedial session)' },
    { period: '10:45-11:00', monday: 'Break', tuesday: 'Break', wednesday: 'Break', thursday: 'Break', friday: 'Break' },
    { period: '11:00-11:40', monday: 'English', tuesday: 'Math', wednesday: 'English', thursday: 'English', friday: 'SST and RE* (Remedial session)' },
    { period: '11:40-12:20', monday: 'English', tuesday: 'Math', wednesday: 'English', thursday: 'English', friday: 'Sciences and Elementary Technology' },
    { period: '12:20-13:25', monday: 'Lunch', tuesday: 'Lunch', wednesday: 'Lunch', thursday: 'Lunch', friday: 'Lunch' },
    { period: '13:25-14:05', monday: 'Math', tuesday: 'Kinyarwanda', wednesday: 'Math', thursday: 'Math', friday: 'SET (Remedial Session)' },
    { period: '14:05-14:45', monday: 'Kinyarwanda', tuesday: 'SET*', wednesday: 'Creative Arts (Fine Arts )', thursday: 'SST and RE*', friday: 'Creative Arts (Music)' },
    { period: '14:45-15:25', monday: 'English', tuesday: 'SET', wednesday: 'Lesson preparation and CPD for teachers', thursday: 'PES*', friday: 'PES' },
    { period: '15:25-15:40', monday: 'Break', tuesday: 'Break', wednesday: 'Break', thursday: 'Break', friday: 'Break' },
    { period: '15:40-16:20', monday: 'SST and RE*', tuesday: 'SST and RE*', wednesday: 'Co-curricular activities (Clubs, numeracy and literacy activities) for learners supervised by a selected teacher every week', thursday: 'French', friday: 'Reading and numeracy activities' },
    { period: '16:20-17:00', monday: 'Reading and numeracy activities', tuesday: 'French', wednesday: 'French', thursday: 'French', friday: 'Reading and numeracy activities' }
  ]);

  const canEdit = ['admin', 'dos', 'teacher', 'student'].includes(user?.role);

  const updateNurseryRow = (index, value) => setNurseryRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, period: value } : row));
  const updatePrimaryRow = (index, day, value) => setPrimaryRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [day]: value } : row));

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-xs font-bold text-cyan-700">← Back to workspace</button>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800">School timetable</h1>
            <p className="mt-1 text-xs text-slate-500">Student document view with editable timings as required.</p>
          </div>
          {canEdit && (
            <button onClick={() => setIsEditing((value) => !value)} className="rounded-xl bg-cyan-700 px-4 py-2 text-xs font-bold text-white">
              {isEditing ? 'Save view' : 'Edit timetable'}
            </button>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {['nursery', 'primary'].map((level) => (
            <button key={level} onClick={() => setActiveLevel(level)} className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] ${activeLevel === level ? 'bg-[#1d7b91] text-white' : 'bg-slate-100 text-slate-700'}`}>
              {level === 'nursery' ? 'Nursery' : 'Primary'}
            </button>
          ))}
        </div>
      </div>

      {activeLevel === 'nursery' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="bg-[#d6eaf1] px-4 py-3 font-black text-slate-800">1. Weekly timetable for nursery</div>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#d6eaf1] text-slate-800">
                <th className="border border-slate-300 px-3 py-3 font-bold">Periods</th>
                <th className="border border-slate-300 px-3 py-3 font-bold">Activities</th>
              </tr>
            </thead>
            <tbody>
              {nurseryRows.map((row, index) => (
                <tr key={`${row.period}-${index}`} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 px-3 py-3 font-medium text-slate-700">
                    {isEditing ? <input value={row.period} onChange={(event) => updateNurseryRow(index, event.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /> : row.period}
                  </td>
                  <td className="border border-slate-300 px-3 py-3 text-slate-700">
                    {isEditing ? <input value={row.activity} onChange={(event) => setNurseryRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, activity: event.target.value } : item))} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /> : row.activity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-300 bg-white px-4 py-3 text-xs text-slate-700">Note: A period in nursery lasts between 10 and 30 minutes depending on subjects and activities.</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          <div className="bg-[#d6eaf1] px-4 py-3 font-black text-slate-800">2.1 Tentative timetable for lower primary</div>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#d6eaf1] text-slate-800">
                  <th className="border border-slate-300 px-3 py-3 font-bold">Hours</th>
                  <th className="border border-slate-300 px-3 py-3 font-bold">Monday</th>
                  <th className="border border-slate-300 px-3 py-3 font-bold">Tuesday</th>
                  <th className="border border-slate-300 px-3 py-3 font-bold">Wednesday</th>
                  <th className="border border-slate-300 px-3 py-3 font-bold">Thursday</th>
                  <th className="border border-slate-300 px-3 py-3 font-bold">Friday</th>
                </tr>
              </thead>
              <tbody>
                {primaryRows.map((row, index) => (
                  <tr key={`${row.period}-${index}`} className="odd:bg-white even:bg-slate-50 align-top">
                    <td className="border border-slate-300 px-3 py-3 font-medium text-slate-700">{isEditing ? <input value={row.period} onChange={(event) => setPrimaryRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, period: event.target.value } : item))} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /> : row.period}</td>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
                      <td key={day} className="border border-slate-300 px-3 py-3 text-slate-700">
                        {isEditing ? <input value={row[day]} onChange={(event) => updatePrimaryRow(index, day, event.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" /> : row[day]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-300 bg-white px-4 py-3 text-xs text-slate-700">A period in primary lasts 40 minutes. <br />SET*: Science and Elementary technology <br />SST and RE*: Social and Religious Studies <br />PES*: Physical Education and Sports</div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="bg-[#d6eaf1] px-4 py-3 font-black text-slate-800">2.3. Number of periods per week and per subject for upper primary</div>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#d6eaf1] text-slate-800">
              <th className="border border-slate-300 px-3 py-3 font-bold">No</th>
              <th className="border border-slate-300 px-3 py-3 font-bold">Subject</th>
              <th className="border border-slate-300 px-3 py-3 font-bold">Instructional periods</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['1', 'Kinyarwanda', '8'],
              ['2', 'English', '8'],
              ['3', 'Mathematics', '8'],
              ['4', 'French', '4'],
              ['5', 'Social Studies and Religious Studies', '6'],
              ['6', 'Science and Elementary Technology', '6'],
              ['7', 'Creative Arts (Fine Arts & Crafts and Music)', '1'],
              ['8', 'Physical Education and Sports (PES)', '2'],
              ['9', 'Remedial activities', '4'],
              ['10', 'Continuous Professional development', '3']
            ].map(([number, subject, periods], index) => (
              <tr key={`${subject}-${number}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-3 py-3 font-medium text-slate-700">{number}</td>
                <td className="border border-slate-300 px-3 py-3 text-slate-700">{subject}</td>
                <td className="border border-slate-300 px-3 py-3 text-slate-700">{periods}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#f1d7c1] font-bold text-slate-800">
              <td colSpan={2} className="border border-slate-300 px-3 py-3">Total number of periods per week</td>
              <td className="border border-slate-300 px-3 py-3">43</td>
            </tr>
            <tr className="bg-white font-bold text-slate-800">
              <td colSpan={2} className="border border-slate-300 px-3 py-3">General Total</td>
              <td className="border border-slate-300 px-3 py-3">50</td>
            </tr>
          </tfoot>
        </table>
        <div className="border-t border-slate-300 bg-white px-4 py-3 text-xs text-slate-700">Note: Four periods are reserved for remedial sessions. Allocation of these periods to subjects will depend on the needs of teachers and school administration. Focus will be more on examinable subjects.</div>
      </div>
    </div>
  );
}

async function fetchRoleStats(role) {
  if (role === 'dos' || role === 'accountant') {
    const { data } = await api.get('/dashboard');
    if (role === 'dos') return [
      ['students', String(data.students || 0), 'School students', 'active records', 'blue'],
      ['teachers', String(data.teachers || 0), 'Teachers', 'managed staff', 'mint'],
      ['admissions', String(data.pendingAdmissions || 0), 'Pending admissions', 'need review', 'violet'],
    ];
    const { data: inventoryData } = await api.get('/inventory');
    const lowStock = (inventoryData.items || []).filter((item) => Number(item.quantity) <= Number(item.reorderLevel)).length;
    return [
      ['fees', `${Number(data.feesCollected || 0).toLocaleString()} RWF`, 'Fees collected', 'this month', 'amber'],
      ['students', String(data.students || 0), 'Active students', 'active records', 'violet'],
      ['inventory', String(lowStock), 'Low stock items', 'reorder soon', 'blue'],
    ];
  }

  if (role === 'teacher') {
    const { data } = await api.get('/teacher/dashboard');
    return [
      ['students', String((data.students || []).length), 'My students', 'assigned classes', 'blue'],
      ['attendance', `${data.attendance?.percent || 0}%`, 'Today attendance', 'your classes', 'mint'],
      ['academics', String(data.activeAssessments || 0), 'Active assessments', 'this term', 'violet'],
    ];
  }

  if (role === 'student') {
    const [{ data: profileData }, { data: testsData }] = await Promise.all([
      api.get('/student/profile'),
      api.get('/tests'),
    ]);
    const studentId = profileData.profile?.id;
    const attendanceData = studentId ? (await api.get(`/attendance?studentId=${studentId}`)).data : {};
    const attendance = attendanceData.attendance || [];
    const present = attendance.filter((item) => item.status === 'present').length;
    return [
      ['students', profileData.profile?.className || '-', 'My class', 'current class', 'blue'],
      ['attendance', `${attendance.length ? Math.round((present / attendance.length) * 100) : 0}%`, 'My attendance', 'recorded attendance', 'mint'],
      ['academics', String((testsData.tests || []).length), 'My subjects', 'published tests', 'violet'],
    ];
  }

  if (role === 'parent') {
    const [{ data: summaryData }, { data: invoiceData }] = await Promise.all([
      api.get('/parent/summary'),
      api.get('/finance/invoices'),
    ]);
    const children = summaryData.children || [];
    const unpaid = (invoiceData.invoices || []).filter((invoice) => invoice.status !== 'paid');
    const outstanding = unpaid.reduce((total, invoice) => total + Number(invoice.amount || 0), 0);
    const absences = children.reduce((total, child) => total + Number(child.absences || 0), 0);
    return [
      ['students', String(children.length), 'My children', 'linked profiles', 'blue'],
      ['attendance', String(absences), 'Absences', 'linked children', 'mint'],
      ['fees', `${outstanding.toLocaleString()} RWF`, 'Outstanding fees', 'RWF balance', 'amber'],
    ];
  }

  if (role === 'librarian') {
    const [{ data: booksData }, { data: loansData }] = await Promise.all([
      api.get('/library/books'),
      api.get('/library/loans'),
    ]);
    const loans = loansData.loans || [];
    const activeLoans = (loansData.loans || []).filter((loan) => !loan.returnedAt).length;
    return [
      ['students', String(new Set(loans.map((loan) => loan.studentId)).size), 'Student borrowers', 'students with loans', 'blue'],
      ['library', String((booksData.books || []).length), 'Books in catalogue', 'library collection', 'mint'],
      ['loans', String(activeLoans), 'Active loans', 'not returned', 'amber'],
    ];
  }

  return null;
}

async function resolveStudentId(user) {
  if (user?.role === 'student') { const { data } = await api.get('/student/profile'); return data.profile?.id; }
  if (user?.role === 'parent') { const { data } = await api.get('/parent/summary'); return data.children?.[0]?.id; }
  const { data } = await api.get('/students'); return data.students?.[0]?.id;
}
