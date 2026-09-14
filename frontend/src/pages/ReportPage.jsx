import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, FileText, Loader, Plus, Save, Trash2, Upload } from 'lucide-react';
import api from '../lib/api';
import { TestResultsPage } from '../components/TestMonitoring';

export default function ReportPage({ user, onBack, onNavigate, t }) {
    if (user?.role === 'teacher') return <TeacherReports onBack={onBack} onNavigate={onNavigate} t={t} />;
    if (['dos', 'admin'].includes(user?.role)) return <DosReports onBack={onBack} t={t} />;
    if (user?.role === 'parent') return <ParentLearningReport onBack={onBack} />;
    return <StudentReportView user={user} onBack={onBack} t={t} />;
}

function ParentLearningReport({ onBack }) {
    const [data, setData] = useState(null); const [error, setError] = useState('');
    useEffect(() => { api.get('/parent/learning-summary').then(({ data: next }) => setData(next)).catch((requestError) => setError(requestError.response?.data?.error || 'Unable to load your child reports.')); }, []);
    if (error) return <div className="space-y-4"><BackButton onBack={onBack} /><div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div></div>;
    if (!data) return <Loading />;
    return <div className="space-y-6"><BackButton onBack={onBack} /><section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">Parent portal</p><h1 className="mt-2 font-display text-2xl font-bold">Child learning report</h1><p className="mt-2 text-sm text-slate-300">Test marks, attendance, discipline records, and public school information for your linked child.</p></section>{data.children.map((child) => <ParentChildReport key={child.id} child={child} tests={data.tests.filter((item) => item.studentId === child.id)} attendance={data.attendance.filter((item) => item.studentId === child.id)} discipline={data.discipline.filter((item) => item.studentId === child.id)} />)}<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-display text-lg font-bold text-slate-800">Public school information</h2><div className="mt-4 divide-y divide-slate-100">{data.publicInfo.length ? data.publicInfo.map((item) => <article key={`${item.id}-${item.publishedAt}`} className="py-3"><p className="text-sm font-bold text-slate-800">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.message || item.category || item.documentType}</p><p className="mt-1 text-sm text-slate-400">{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : ''}</p></article>) : <Empty text="No public school information yet." />}</div></section></div>;
}

function ParentChildReport({ child, tests, attendance, discipline }) {
    const present = attendance.find((item) => item.status === 'present')?.total || 0; const absent = attendance.find((item) => item.status === 'absent')?.total || 0; const late = attendance.find((item) => item.status === 'late')?.total || 0;
    return <section className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-display text-lg font-bold text-slate-800">{child.fullName}</h2><p className="mt-1 text-sm text-slate-500">{child.admissionNumber || '-'} · {child.className || '-'}</p></div><div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-display text-lg font-bold text-slate-800">Test marks</h3><div className="mt-3 divide-y divide-slate-100">{tests.length ? tests.map((test) => <div key={test.attemptId} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold text-slate-700">{test.title}</p><p className="text-sm text-slate-500">{test.subject} · {test.submittedAt ? new Date(test.submittedAt).toLocaleString() : test.status}</p></div><b className="text-sm text-cyan-700">{test.score ?? 0} / {test.maxScore || 0}</b></div>) : <Empty text="No submitted tests yet." />}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-display text-lg font-bold text-slate-800">Attendance</h3><div className="mt-3 grid grid-cols-3 gap-2 text-center"><Summary label="Present" value={present} /><Summary label="Absent" value={absent} /><Summary label="Late" value={late} /></div></section></div><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-display text-lg font-bold text-slate-800">Discipline</h3><div className="mt-3 divide-y divide-slate-100">{discipline.length ? discipline.map((item) => <article key={`${item.category}-${item.createdAt}`} className="py-3"><p className="text-sm font-bold capitalize text-slate-700">{item.category.replaceAll('_', ' ')}</p><p className="mt-1 text-sm text-slate-600">{item.note}</p><p className="mt-1 text-sm text-slate-400">{new Date(item.createdAt).toLocaleString()}</p></article>) : <p className="text-sm text-slate-500">No discipline records.</p>}</div></section></section>;
}

function BackButton({ onBack }) { return <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-cyan-700"><ArrowLeft size={16} /> Back</button>; }

function TeacherReports({ onBack, onNavigate, t }) {
    const [tests, setTests] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedTest, setSelectedTest] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([api.get('/tests'), api.get('/teacher/report-students')])
            .then(([testsResponse, studentsResponse]) => {
                setTests((testsResponse.data.tests || []).sort((a, b) => new Date(b.startsAt || b.createdAt || 0) - new Date(a.startsAt || a.createdAt || 0)));
                setStudents(studentsResponse.data.students || []);
            })
            .catch((requestError) => setError(requestError.response?.data?.error || 'Unable to load report data.'))
            .finally(() => setLoading(false));
    }, []);

    if (selectedTest) return <TestResultsPage test={selectedTest} onBack={() => setSelectedTest(null)} t={t} />;
    if (selectedStudent) return <StudentReportCard student={selectedStudent} onBack={() => setSelectedStudent(null)} />;

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={16} />{t.overview}</button>
            <section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl sm:p-8">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">Teacher report</p><h1 className="mt-2 font-display text-2xl font-bold">Tests and student reports</h1><p className="mt-2 text-sm text-slate-300">Review marks, add or remove test scores from reports, and open each learner's report card.</p></div>
                    <button onClick={() => onNavigate('upload-test')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-cyan-800"><Upload size={15} /> View upload test</button>
                </div>
            </section>
            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            {loading ? <Loading /> : <>
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-5 py-4"><h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-800"><FileText size={18} className="text-cyan-700" /> Tests</h2></div>
                    {tests.length ? <div className="divide-y divide-slate-100">{tests.map((test) => <div key={test.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-bold text-slate-800">{test.title}</h3><p className="mt-1 text-sm text-slate-500">{test.subjectName || 'Subject'} · {test.className || 'Class'} · {test.startsAt || test.createdAt ? new Date(test.startsAt || test.createdAt).toLocaleString() : 'Date not set'}</p></div><div className="flex gap-2"><button onClick={() => setSelectedTest(test)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-bold text-white"><Eye size={15} /> View marks</button><button onClick={() => onNavigate('upload-test')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">View upload test</button></div></div>)}</div> : <Empty text="No tests have been created yet." />}
                </section>
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-display text-lg font-bold text-slate-800">Student report cards</h2><p className="mt-1 text-sm text-slate-500">Open a learner report to see all scores currently added to the report.</p></div>
                    {students.length ? <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">{students.map((student) => <button key={student.id} onClick={() => setSelectedStudent(student)} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-cyan-500 hover:bg-cyan-50"><p className="text-sm font-bold text-slate-800">{student.fullName}</p><p className="mt-1 text-sm text-slate-500">{student.admissionNumber || 'No admission number'} · {student.className || 'Class not set'}</p><span className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-cyan-700"><Eye size={15} /> View report</span></button>)}</div> : <Empty text="No assigned students found." />}
                </section>
            </>}
        </div>
    );
}

function DosReports({ onBack, t }) {
    const [students, setStudents] = useState([]); const [selected, setSelected] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
    useEffect(() => { api.get('/teacher/report-students').then(({ data }) => setStudents(data.students || [])).catch((requestError) => setError(requestError.response?.data?.error || 'Unable to load students.')).finally(() => setLoading(false)); }, []);
    if (selected) return <DosReportEditor student={selected} onBack={() => setSelected(null)} />;
    return <div className="space-y-6"><button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={16} />{t.overview}</button><section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">DOS report cards</p><h1 className="mt-2 font-display text-2xl font-bold">Student reports</h1><p className="mt-2 text-sm text-slate-300">View and update the report card form for each student. Test management is available only to teachers.</p></section>{error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}{loading ? <Loading /> : <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{students.map((student) => <button key={student.id} onClick={() => setSelected(student)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-cyan-500"><p className="text-sm font-bold text-slate-800">{student.fullName}</p><p className="mt-1 text-sm text-slate-500">{student.admissionNumber || '-'} · {student.className || '-'}</p><span className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-cyan-700"><Eye size={15} /> Open report</span></button>)}</section>}</div>;
}

function DosReportEditor({ student, onBack }) {
    const [report, setReport] = useState(null); const [subjects, setSubjects] = useState([]); const [term, setTerm] = useState('Term 1'); const [academicYear, setAcademicYear] = useState(student.academicYear || '2025 / 2026'); const [subjectId, setSubjectId] = useState(''); const [score, setScore] = useState(''); const [maxScore, setMaxScore] = useState('100'); const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
    const load = async () => { const [reportResponse, subjectsResponse] = await Promise.all([api.get(`/students/${student.id}/report`), api.get('/dos/report-subjects')]); setReport(reportResponse.data); setTerm(reportResponse.data.term || 'Term 1'); setAcademicYear(reportResponse.data.student?.academicYear || academicYear); setSubjects(subjectsResponse.data.subjects || []); };
    useEffect(() => { load().catch((requestError) => setMessage(requestError.response?.data?.error || 'Unable to load report.')); }, [student.id]);
    const saveSettings = async () => { setSaving(true); try { await api.put(`/dos/reports/${student.id}/settings`, { term, academicYear }); setMessage('Report settings saved.'); await load(); } catch (requestError) { setMessage(requestError.response?.data?.error || 'Unable to save settings.'); } finally { setSaving(false); } };
    const addSubject = async (event) => { event.preventDefault(); setSaving(true); try { await api.post('/grades', { studentId: student.id, subjectId: Number(subjectId), score: Number(score), maxScore: Number(maxScore), assessmentName: `${term} report` }); setMessage('Subject added to report.'); setSubjectId(''); setScore(''); await load(); } catch (requestError) { setMessage(requestError.response?.data?.error || 'Unable to add subject.'); } finally { setSaving(false); } };
    const removeSubject = async (id) => { if (!window.confirm('Remove this subject and all its report marks?')) return; setSaving(true); try { await api.delete(`/dos/reports/${student.id}/subjects/${id}`); setMessage('Subject removed from report.'); await load(); } catch (requestError) { setMessage(requestError.response?.data?.error || 'Unable to remove subject.'); } finally { setSaving(false); } };
    if (!report) return <Loading />;
    return <div className="space-y-5"><button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={16} /> Back to students</button><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-bold text-slate-700">Academic year<input value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-normal" /></label><label className="text-sm font-bold text-slate-700">Term<select value={term} onChange={(event) => setTerm(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-normal"><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Final term</option></select></label><button onClick={saveSettings} disabled={saving} className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-bold text-white"><Save size={15} /> Save report settings</button></div><form onSubmit={addSubject} className="mt-4 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-[1fr_120px_120px_auto]"><select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="rounded-lg border border-slate-200 p-2 text-sm"><option value="">Add subject</option>{subjects.filter((subject) => !report.grades.some((grade) => grade.subjectId === subject.id)).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><input required type="number" min="0" value={score} onChange={(event) => setScore(event.target.value)} placeholder="Score" className="rounded-lg border border-slate-200 p-2 text-sm" /><input required type="number" min="1" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} placeholder="Max" className="rounded-lg border border-slate-200 p-2 text-sm" /><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-200 px-3 py-2 text-sm font-bold text-cyan-700"><Plus size={15} /> Add</button></form>{message && <p className="mt-3 text-sm font-semibold text-cyan-700">{message}</p>}</div><div className="relative"><StudentReportCard student={report.student} grades={report.grades} attendance={report.attendance} behavior={report.behavior} /><div className="mx-auto mt-3 max-w-5xl rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-sm font-bold text-slate-800">Remove subject from report</h2><div className="mt-2 flex flex-wrap gap-2">{report.grades.map((grade) => <button key={grade.subjectId} onClick={() => removeSubject(grade.subjectId)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700"><Trash2 size={14} />{grade.subject}</button>)}</div></div></div></div>;
}

function StudentReportView({ user, onBack }) {
    const [student, setStudent] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        const load = async () => {
            try {
                const studentResponse = user?.role === 'student' ? await api.get('/student/profile') : await api.get('/parent/summary');
                const profile = user?.role === 'student' ? studentResponse.data.profile : studentResponse.data.children?.[0];
                if (!profile?.id) throw new Error('No student profile found.');
                const { data } = await api.get(`/students/${profile.id}/report`);
                setStudent(data);
            } catch (requestError) { setError(requestError.response?.data?.error || requestError.message || 'Unable to load report card.'); }
        };
        load();
    }, [user]);
    if (error) return <div className="space-y-4"><button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={16} /> Back</button><div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div></div>;
    if (!student) return <Loading />;
    return <div className="space-y-5"><button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={16} /> Back</button><StudentReportCard student={student.student} term={student.term} grades={student.grades} attendance={student.attendance} behavior={student.behavior} /></div>;
}

function StudentReportCard({ student, term = 'Term 1', grades: initialGrades, attendance: initialAttendance, behavior: initialBehavior, onBack }) {
    const [data, setData] = useState({ grades: initialGrades, attendance: initialAttendance, behavior: initialBehavior });
    useEffect(() => {
        if (initialGrades) return;
        api.get(`/students/${student.id}/report`).then(({ data: next }) => setData(next)).catch(() => { });
    }, [initialGrades, student.id]);
    const grades = data.grades || [];
    const subjects = Object.values(grades.reduce((all, grade) => { const current = all[grade.subject] || { subject: grade.subject, score: 0, maxScore: 0 }; current.score += Number(grade.score || 0); current.maxScore += Number(grade.maxScore || 0); all[grade.subject] = current; return all; }, {})).map((row) => ({ ...row, average: row.maxScore ? (row.score / row.maxScore) * 100 : 0 }));
    const totalScore = subjects.reduce((sum, row) => sum + row.score, 0); const totalMax = subjects.reduce((sum, row) => sum + row.maxScore, 0); const overall = totalMax ? (totalScore / totalMax) * 100 : 0;
    const present = Number((data.attendance || []).find((item) => item.status === 'present')?.total || 0); const absent = Number((data.attendance || []).find((item) => item.status === 'absent')?.total || 0); const late = Number((data.attendance || []).find((item) => item.status === 'late')?.total || 0); const highest = subjects.slice().sort((a, b) => b.average - a.average)[0]; const lowest = subjects.slice().sort((a, b) => a.average - b.average)[0];
    return <div className="mx-auto max-w-5xl rounded-[18px] border-[5px] border-[#0758ad] bg-white p-3 text-[14px] text-[#102f63] shadow-xl sm:p-5"><div className="border-[3px] border-[#0758ad] p-3 sm:p-5"><header className="text-center"><div className="flex items-center justify-center gap-3"><img src="/forever.jpg" alt="Forever King Academy" className="h-16 w-16 rounded-full border-2 border-[#0758ad] object-cover" /><div><h1 className="font-display text-2xl font-black tracking-wide text-[#16489c] sm:text-4xl">FOREVER KING ACADEMY</h1><p className="font-serif text-base italic text-[#16489c] sm:text-xl">Learn &nbsp; • &nbsp; Grow &nbsp; • &nbsp; Succeed</p></div></div><div className="mt-3 rounded-lg bg-[#0758ad] px-3 py-2 text-lg font-black text-white sm:text-2xl">PRIMARY STUDENT REPORT CARD</div><div className="mt-3 grid gap-2 text-left sm:grid-cols-2"><Info label="School" value="Forever King Academy" /><Info label="Student Name" value={student.fullName} /><Info label="Academic Year" value={student.academicYear || '2025 / 2026'} /><Info label="Class" value={student.className || 'Not set'} /></div></header><ReportSection title="ACADEMIC RESULTS"><table className="w-full border-collapse text-left"><thead className="bg-[#d8efff]"><tr><Th>No.</Th><Th>Subject</Th><Th>Score</Th><Th>Max</Th><Th>Avg / 100</Th><Th>Grade</Th></tr></thead><tbody>{subjects.map((row, index) => <tr key={row.subject} className="odd:bg-white even:bg-[#f4fbff]"><Td>{index + 1}</Td><Td>{row.subject}</Td><Td>{row.score}</Td><Td>{row.maxScore}</Td><Td>{row.average.toFixed(1)}</Td><Td><span className={`inline-block min-w-10 rounded-full px-2 py-1 text-center font-bold text-white ${gradeColor(row.average)}`}>{gradeFromPercentage(row.average)}</span></Td></tr>)}</tbody></table>{!subjects.length && <p className="p-5 text-center text-slate-500">No marks have been added to this report yet.</p>}</ReportSection><ReportSection title="TERM SUMMARY"><div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5"><Summary label="Total Score" value={`${totalScore} / ${totalMax}`} /><Summary label="Overall Average" value={`${overall.toFixed(1)} %`} /><Summary label="Position" value="-" /><Summary label="Subjects" value={subjects.length} /><Summary label="Status" value={overall >= 50 ? 'Progressing' : 'Needs support'} /></div></ReportSection><div className="grid gap-3 lg:grid-cols-2"><ReportSection title="COLOUR SYSTEM"><div className="space-y-2"><Legend range="70 - 100" color="BLUE" className="bg-blue-600" meaning="Excellent" /><Legend range="50 - 69" color="GREEN" className="bg-green-600" meaning="Good / Satisfactory" /><Legend range="Below 50" color="RED" className="bg-red-600" meaning="Needs Improvement" /></div></ReportSection><ReportSection title="SUBJECT PERFORMANCE"><div className="space-y-2"><Info label="Highest Subject" value={highest ? `${highest.subject} — ${highest.average.toFixed(1)} / 100` : '-'} /><Info label="Lowest Subject" value={lowest ? `${lowest.subject} — ${lowest.average.toFixed(1)} / 100` : '-'} /><Info label="Number of Subjects ≥70" value={subjects.filter((row) => row.average >= 70).length} /><Info label="Number of Subjects <50" value={subjects.filter((row) => row.average < 50).length} /></div></ReportSection></div><div className="grid gap-3 lg:grid-cols-2"><ReportSection title="ATTENDANCE"><div className="grid grid-cols-3 text-center"><Summary label="Present" value={present} /><Summary label="Absent" value={absent} /><Summary label="Late" value={late} /></div></ReportSection><ReportSection title="TEACHER'S COMMENT"><p className="min-h-20 leading-6">{data.behavior?.[0]?.note || 'No teacher comment has been added yet.'}</p></ReportSection></div><footer className="mt-5 grid gap-4 border-t-2 border-[#0758ad] pt-4 text-sm sm:grid-cols-3"><Info label="Class Teacher" value="________________________" /><Info label="Head Teacher" value="________________________" /><Info label="Date" value={new Date().toISOString().slice(0, 10)} /></footer>{onBack && <button onClick={onBack} className="mt-5 rounded-lg bg-[#0758ad] px-4 py-2 text-sm font-bold text-white">Back to reports</button>}</div></div>;
}

function ReportSection({ title, children }) { return <section className="mt-4 overflow-hidden rounded-lg border-2 border-[#0758ad]"><h2 className="bg-[#0758ad] px-3 py-2 text-base font-black text-white">{title}</h2><div className="p-2 sm:p-3">{children}</div></section>; }
function Info({ label, value }) { return <div className="flex gap-2 border-b border-[#75b9ec] py-1"><b>{label}:</b><span className="min-w-0 flex-1">{value || '-'}</span></div>; }
function Summary({ label, value }) { return <div className="border border-[#75b9ec] p-2"><b className="block text-xs">{label}</b><span className="mt-1 block font-bold">{value}</span></div>; }
function Legend({ range, color, className, meaning }) { return <div className="flex items-center gap-2"><span className={`h-4 w-4 rounded-full ${className}`} /><b className="w-20">{range}</b><b className="w-16">{color}</b><span>{meaning}</span></div>; }
function Th({ children }) { return <th className="border border-[#75b9ec] px-2 py-2 text-xs font-black sm:text-sm">{children}</th>; }
function Td({ children }) { return <td className="border border-[#75b9ec] px-2 py-2 text-sm">{children}</td>; }
function gradeFromPercentage(value) { if (value >= 70) return 'A'; if (value >= 50) return 'B'; if (value >= 40) return 'C'; return 'D'; }
function gradeColor(value) { if (value >= 70) return 'bg-blue-600'; if (value >= 50) return 'bg-green-600'; return 'bg-red-600'; }
function Loading() { return <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-14 text-sm text-slate-500"><Loader size={17} className="mr-2 animate-spin" /> Loading report...</div>; }
function Empty({ text }) { return <p className="p-8 text-center text-sm text-slate-500">{text}</p>; }
