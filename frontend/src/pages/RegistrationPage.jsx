import { useEffect, useState } from 'react';
import { CheckCircle2, GraduationCap, UserPlus } from 'lucide-react';
import api from '../lib/api';

const initial = { fullName: '', username: '', email: '', className: '', classId: '', parentEmail: '', gender: 'female', birthday: '', academicYear: '', password: '', repassword: '', subjectOrModule: '', diplomaKey: '', resultSlipKey: '' };

export default function RegistrationPage({ onBack }) {
    const [type, setType] = useState('student');
    const [form, setForm] = useState(initial);
    const [classes, setClasses] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [currentYear, setCurrentYear] = useState(null);

    useEffect(() => {
        Promise.all([api.get('/classes'), api.get('/academic-years/current')]).then(([classResponse, yearResponse]) => {
            setCurrentYear(yearResponse.data);
            setClasses((classResponse.data.classes || []).filter((item) => item.academicYear === yearResponse.data?.name));
            setForm((current) => ({ ...current, academicYear: yearResponse.data?.name || '' }));
        }).catch(() => setError('Unable to load the active academic year and classes.'));
    }, []);

    const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
    const submit = async (event) => {
        event.preventDefault(); setError(''); setMessage('');
        if (form.password !== form.repassword) return setError('Passwords do not match.');
        if (type === 'student' && (!form.classId || !currentYear?.name)) return setError('Select a class and configure an active academic year first.');
        try {
            const endpoint = type === 'student' ? '/students' : '/teachers/register';
            const { data } = await api.post(endpoint, form);
            setMessage(`${data.message} ${data.admissionNumber ? `Admission number: ${data.admissionNumber}` : ''} ${data.username ? `Username: ${data.username}` : ''}`); setForm({ ...initial, academicYear: currentYear?.name || '' });
        } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to register record.'); }
    };

    return <div className="mx-auto max-w-4xl space-y-6">
        <button onClick={onBack} className="text-xs font-bold text-cyan-700">← Back to dashboard</button>
        <section className="rounded-3xl bg-[#17333d] p-6 text-white sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">DOS registration</p><h1 className="mt-2 font-display text-2xl font-bold">Register a student or teacher</h1><p className="mt-2 text-sm text-slate-300">QR codes are generated automatically. DOS controls all records after registration.</p></section>
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><button onClick={() => setType('student')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold ${type === 'student' ? 'bg-cyan-700 text-white' : 'text-slate-500'}`}><GraduationCap size={16} /> Student</button><button onClick={() => setType('teacher')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold ${type === 'teacher' ? 'bg-cyan-700 text-white' : 'text-slate-500'}`}><UserPlus size={16} /> Teacher</button></div>
        {message && <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700"><CheckCircle2 size={16} />{message}</div>}
        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}
        <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7">
            <Field label="Full name" name="fullName" value={form.fullName} onChange={update('fullName')} required />
            {type === 'teacher' ? <Field label="Email" name="email" type="email" value={form.email} onChange={update('email')} required /> : <span />}
            {type === 'student' && <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Class</span><select required value={form.classId} onChange={(event) => { const selected = classes.find((item) => String(item.id) === event.target.value); setForm((current) => ({ ...current, classId: event.target.value, className: selected?.name || '' })); }} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs"><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</select></label>}
            <Field label="Username (optional)" name="username" value={form.username} onChange={update('username')} />
            <Field label="Birthday" name="birthday" type="date" value={form.birthday} onChange={update('birthday')} required />
            <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Gender</span><select value={form.gender} onChange={update('gender')} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs"><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
            {type === 'student' ? <Field label="Parent email" name="parentEmail" type="email" value={form.parentEmail} onChange={update('parentEmail')} required /> : <Field label="Subject or module" name="subjectOrModule" value={form.subjectOrModule} onChange={update('subjectOrModule')} required />}
            <Field label="Active academic year" name="academicYear" value={form.academicYear || currentYear?.name || ''} readOnly required />
            <Field label="Password" name="password" type="password" value={form.password} onChange={update('password')} required />
            <Field label="Repeat password" name="repassword" type="password" value={form.repassword} onChange={update('repassword')} required />
            <button className="rounded-xl bg-cyan-700 px-4 py-3 text-xs font-bold text-white sm:col-span-2">{type === 'student' ? 'Register student' : 'Register teacher'}</button>
        </form>
    </div>;
}

function Field({ label, name, value, onChange, type = 'text', required = false, readOnly = false }) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">{label}</span><input name={name} type={type} value={value} onChange={onChange} required={required} readOnly={readOnly} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-cyan-600 read-only:bg-slate-50 read-only:text-slate-500" /></label>; }
