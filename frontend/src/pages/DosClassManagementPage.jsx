import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ClipboardList, Edit3, Eye, Printer, QrCode, Save, School, Trash2, UserPlus, Users, X } from 'lucide-react';
import api from '../lib/api';

const emptySubject = () => ({ name: '', code: '' });

export default function DosClassManagementPage({ t, onBack }) {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [classDetails, setClassDetails] = useState(null);
    const [showAddClass, setShowAddClass] = useState(false);
    const [classForm, setClassForm] = useState({ name: '', academicYear: '', subjects: [emptySubject()] });
    const [assignment, setAssignment] = useState({ subjectId: '', teacherId: '' });
    const [scanValue, setScanValue] = useState('');
    const [editingClass, setEditingClass] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [classResponse, subjectResponse, teacherResponse, assignmentResponse] = await Promise.all([api.get('/classes?current=true'), api.get('/subjects'), api.get('/teachers'), api.get('/teacher-assignments')]);
            setClasses(classResponse.data.classes || []);
            setSubjects(subjectResponse.data.subjects || []);
            setTeachers(teacherResponse.data.teachers || []);
            setAssignments(assignmentResponse.data.assignments || []);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to load school structure.');
        } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const openClass = async (schoolClass) => {
        setSelectedClass(schoolClass);
        setClassDetails(null);
        setAssignment({ subjectId: '', teacherId: '' });
        try {
            const { data } = await api.get(`/dos/classes/${schoolClass.id}`);
            setClassDetails(data);
        } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to load class details.'); }
    };

    const createClass = async (event) => {
        event.preventDefault();
        setError(''); setNotice('');
        try {
            const response = editingClass
                ? await api.put(`/classes/${editingClass.id}`, { name: classForm.name })
                : await api.post('/classes', { name: classForm.name });
            const classId = editingClass?.id || response.data.id;
            if (!editingClass) {
                for (const subject of classForm.subjects.filter((item) => item.name.trim())) {
                    const subjectResponse = await api.post('/subjects', { name: subject.name, code: subject.code || subject.name.slice(0, 8).toUpperCase(), classId });
                }
            }
            setShowAddClass(false); setEditingClass(null); setClassForm({ name: '', academicYear: '2025 / 2026', subjects: [emptySubject()] }); setNotice('Class and subjects saved.'); await loadData();
        } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to save class.'); }
    };

    const addSubject = async () => {
        const subject = classForm.subjects[classForm.subjects.length - 1];
        if (!subject.name.trim()) return setError('Write the subject name before adding another subject.');
        setClassForm({ ...classForm, subjects: [...classForm.subjects, emptySubject()] });
    };

    const assignTeacher = async (event) => {
        event.preventDefault();
        if (!selectedClass || !assignment.subjectId || !assignment.teacherId) return setError('Select a subject and teacher.');
        try {
            await api.post('/teacher-assignments', { classId: selectedClass.id, ...assignment });
            setAssignment({ subjectId: '', teacherId: '' }); setNotice('Teacher assigned to subject.'); await loadData(); await openClass(selectedClass);
        } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to assign teacher.'); }
    };

    const removeAssignment = async (item) => {
        try { await api.delete('/teacher-assignments', { data: { teacherId: item.teacherId, classId: item.classId, subjectId: item.subjectId } }); setNotice('Teacher assignment removed.'); await loadData(); if (selectedClass) await openClass(selectedClass); }
        catch (requestError) { setError(requestError.response?.data?.error || 'Unable to remove assignment.'); }
    };

    const deleteClass = async () => {
        if (!selectedClass || !window.confirm(`Delete ${selectedClass.name}? This removes its subjects and assignments.`)) return;
        try { await api.delete(`/classes/${selectedClass.id}`); setSelectedClass(null); setClassDetails(null); setNotice('Class deleted.'); await loadData(); }
        catch (requestError) { setError(requestError.response?.data?.error || 'Unable to delete class.'); }
    };

    const printAssignments = () => {
        const printable = assignments.map((item) => `<tr><td>${item.className}</td><td>${item.subjectName}</td><td>${item.teacherName}</td></tr>`).join('');
        const page = window.open('', '_blank');
        page.document.write(`<html><head><title>FKAMS Teacher Assignments</title><style>body{font-family:Arial;padding:32px}h1{color:#17333d}table{border-collapse:collapse;width:100%}td,th{border:1px solid #cbd5e1;padding:10px;text-align:left}</style></head><body><h1>Forever King Academy</h1><h2>Teacher and Subject Register</h2><table><thead><tr><th>Class</th><th>Subject</th><th>Teacher</th></tr></thead><tbody>${printable}</tbody></table><p style="text-align:right;margin-top:60px">Scan: ____________________</p></body></html>`);
        page.document.close(); page.print();
    };

    const visibleAssignments = selectedClass ? assignments.filter((item) => item.classId === selectedClass.id) : assignments;
    const assignmentSubjects = selectedClass ? (classDetails?.subjects || []) : [];

    useEffect(() => {
        setAssignment({ subjectId: '', teacherId: '' });
    }, [selectedClass?.id]);

    return <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={15} /> Back to DOS workspace</button>
        <header className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">DOS CONTROL CENTRE</p><h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Classes, subjects & teachers</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Build the school structure, connect every subject to a teacher, and inspect class performance.</p></div><School className="text-teal-300" size={30} /></div></header>
        {(error || notice) && <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{error || notice}<button className="float-right" onClick={() => { setError(''); setNotice(''); }}><X size={16} /></button></div>}
        <div className="grid gap-4 sm:grid-cols-3"><Metric icon={School} label="Classes" value={classes.length} /><Metric icon={BookOpen} label="Subjects" value={subjects.length} /><Metric icon={Users} label="Assignments" value={assignments.length} /></div>
        <section className="flex flex-wrap gap-3"><button onClick={() => { setEditingClass(null); setShowAddClass(true); }} className="flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-xs font-bold text-white"><School size={16} /> Add class on school</button><button onClick={printAssignments} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700"><Printer size={16} /> Print register</button><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"><QrCode size={17} /><input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="Scan class code" className="w-36 outline-none" /></label></section>
        {showAddClass && <form onSubmit={createClass} className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><div className="flex items-center justify-between"><h2 className="font-display text-base font-bold text-slate-800">{editingClass ? 'Edit class' : 'Add class and subjects'}</h2><button type="button" onClick={() => setShowAddClass(false)}><X size={17} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input required value={classForm.name} onChange={(event) => setClassForm({ ...classForm, name: event.target.value })} placeholder="Class name e.g. P2" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" /><input required value={classForm.academicYear} onChange={(event) => setClassForm({ ...classForm, academicYear: event.target.value })} placeholder="Academic year" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none" /></div>{!editingClass && <div className="mt-4 space-y-2">{classForm.subjects.map((subject, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]"><input value={subject.name} onChange={(event) => { const next = [...classForm.subjects]; next[index] = { ...subject, name: event.target.value }; setClassForm({ ...classForm, subjects: next }); }} placeholder="Subject e.g. Mathematics" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" /><input value={subject.code} onChange={(event) => { const next = [...classForm.subjects]; next[index] = { ...subject, code: event.target.value }; setClassForm({ ...classForm, subjects: next }); }} placeholder="Code" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" /><button type="button" onClick={addSubject} className="rounded-xl border border-cyan-200 bg-white px-3 text-xs font-bold text-cyan-700">Add subject</button></div>)}</div>}<button className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white"><Save size={15} /> Save class</button></form>}
        <div className="grid gap-5 lg:grid-cols-[1fr_1.25fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-display text-base font-bold text-slate-800">All classes</h2><span className="text-xs text-slate-400">{loading ? 'Loading...' : `${classes.length} records`}</span></div><div className="mt-4 space-y-2">{classes.map((schoolClass) => <button key={schoolClass.id} onClick={() => openClass(schoolClass)} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${selectedClass?.id === schoolClass.id ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 hover:border-cyan-300'}`}><span><b className="block text-sm text-slate-800">{schoolClass.name}</b><small className="text-xs text-slate-400">{schoolClass.academicYear}</small></span><Eye size={17} className="text-cyan-700" /></button>)}</div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{classDetails ? <><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-700">Selected class</p><h2 className="mt-1 font-display text-xl font-bold text-slate-800">{classDetails.class.name}</h2></div><div className="flex gap-3"><button onClick={() => { setEditingClass(classDetails.class); setClassForm({ name: classDetails.class.name, academicYear: classDetails.class.academicYear, subjects: [emptySubject()] }); setShowAddClass(true); }} className="flex items-center gap-1 text-xs font-bold text-cyan-700"><Edit3 size={14} /> Edit</button><button onClick={deleteClass} className="flex items-center gap-1 text-xs font-bold text-rose-600"><Trash2 size={14} /> Delete</button></div></div><div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Students" value={classDetails.metrics.students} /><Metric label="Tests" value={classDetails.metrics.tests} /><Metric label="Avg %" value={classDetails.metrics.average} /></div><h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Subjects and teachers</h3><div className="mt-2 divide-y divide-slate-100">{classDetails.subjects.map((item) => <div key={`${item.id}-${item.teacherId}`} className="flex items-center justify-between py-3"><span><b className="block text-sm text-slate-700">{item.name}</b><small className="text-xs text-slate-400">{item.teacherName || 'No teacher assigned'}</small></span>{item.teacherId && <button onClick={() => removeAssignment({ ...item, classId: selectedClass.id, subjectId: item.id })} className="text-rose-500"><Trash2 size={15} /></button>}</div>)}</div><h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Performance and test access</h3><div className="mt-2 space-y-2">{(classDetails.subjectStats || []).map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between text-xs"><b className="text-slate-700">{item.name}</b><span className="font-bold text-cyan-700">{item.average || 0}% average</span></div><p className="mt-1 text-[11px] text-slate-400">{item.gradedStudents || 0} graded students · {item.tests || 0} tests · {item.testParticipants || 0} test attempts</p></div>)}</div><form onSubmit={assignTeacher} className="mt-5 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select required value={assignment.subjectId} onChange={(event) => setAssignment({ ...assignment, subjectId: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" disabled={!assignmentSubjects.length}><option value="">{assignmentSubjects.length ? 'Select subject' : 'No subjects available'}</option>{assignmentSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><select required value={assignment.teacherId} onChange={(event) => setAssignment({ ...assignment, teacherId: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs"><option value="">Select teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}</select><button className="flex items-center justify-center gap-1 rounded-xl bg-cyan-700 px-3 py-2 text-xs font-bold text-white"><UserPlus size={14} /> Add teach</button></form></> : <div className="grid min-h-72 place-items-center text-center text-sm text-slate-400"><ClipboardList size={30} className="mb-2 text-slate-300" />Select a class to view subjects, teachers and performance.</div>}</section></div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-display text-base font-bold text-slate-800">Teacher register</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-400"><th className="p-3">Class</th><th className="p-3">Subject</th><th className="p-3">Teacher</th><th className="p-3">Action</th></tr></thead><tbody>{visibleAssignments.map((item) => <tr key={`${item.teacherId}-${item.classId}-${item.subjectId}`} className="border-b border-slate-100"><td className="p-3 font-bold text-slate-700">{item.className}</td><td className="p-3">{item.subjectName}</td><td className="p-3">{item.teacherName}</td><td className="p-3"><button onClick={() => removeAssignment(item)} className="text-rose-500"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div></section>
    </div>;
}

function Metric({ icon: Icon, label, value }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs text-slate-500">{Icon && <Icon size={15} className="text-cyan-700" />}{label}</div><b className="mt-2 block text-2xl font-bold text-slate-800">{value}</b></div>; }
