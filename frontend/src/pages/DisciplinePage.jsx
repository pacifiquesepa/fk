import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw, Shield, Trash2 } from 'lucide-react';
import api from '../lib/api';

const emptyForm = { studentId: '', category: 'good', note: '' };

export default function DisciplinePage({ user, t, onBack }) {
    const canModify = ['admin', 'dos', 'teacher'].includes(user?.role);
    const isStudent = user?.role === 'student';
    const [students, setStudents] = useState([]);
    const [records, setRecords] = useState([]);
    const [scores, setScores] = useState({});
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            let scopedStudents;
            if (isStudent) {
                const { data } = await api.get('/student/profile');
                scopedStudents = data.profile ? [data.profile] : [];
            } else {
                const { data } = await api.get('/students');
                scopedStudents = data.students || [];
            }
            const loaded = await Promise.all(scopedStudents.map(async (student) => {
                const { data } = await api.get(`/behavior?studentId=${student.id}`);
                return { student, score: data.score ?? 100, records: data.records || [] };
            }));
            const nextScores = Object.fromEntries(loaded.map(({ student, score }) => [student.id, score]));
            const loadedRecords = loaded.flatMap(({ student, records: studentRecords }) => studentRecords.map((record) => ({ ...record, student })));
            setStudents(scopedStudents);
            setScores(nextScores);
            setRecords(loadedRecords);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to load behavior records.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [user?.role]);

    const saveRecord = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.post('/behavior', form);
            setForm(emptyForm);
            setShowForm(false);
            await load();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to save behavior record.');
        } finally {
            setSaving(false);
        }
    };

    const deleteRecord = async (id) => {
        if (!window.confirm('Delete this behavior record?')) return;
        try {
            await api.delete(`/behavior/${id}`);
            await load();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to delete behavior record.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <button onClick={onBack} className="mb-3 text-xs font-bold text-cyan-700">← {t.overview}</button>
                    <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-slate-800">
                        <Shield size={24} className="text-cyan-700" /> Discipline & Behavior
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {isStudent ? 'View your behavior records.' : 'Review and manage student behavior records.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">
                        <RefreshCw size={15} /> Refresh
                    </button>
                    {canModify && <button onClick={() => setShowForm((value) => !value)} className="flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-xs font-bold text-white">
                        <Plus size={16} /> Add record
                    </button>}
                </div>
            </div>

            {error && <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"><AlertTriangle size={16} /> {error}</div>}

            {showForm && canModify && <form onSubmit={saveRecord} className="grid gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-5 sm:grid-cols-2">
                <select required value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs">
                    <option value="">Select student</option>
                    {students.map((student) => <option key={student.id} value={student.id}>{student.fullName} · {student.admissionNumber}</option>)}
                </select>
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs">
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="needs_improvement">Needs improvement</option>
                    <option value="discipline">Discipline</option>
                </select>
                <textarea required value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Behavior note" className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs sm:col-span-2" />
                <div className="flex gap-2 sm:col-span-2">
                    <button type="submit" disabled={saving} className="rounded-xl bg-cyan-700 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save record'}</button>
                    <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">Cancel</button>
                </div>
            </form>}

            {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-xs text-slate-400">{t.loading}</div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Note</th><th className="px-4 py-3">Date</th>{canModify && <th className="px-4 py-3 text-right">Action</th>}</tr></thead>
                    <tbody>{records.length === 0 ? <tr><td colSpan={canModify ? 6 : 5} className="px-4 py-12 text-center text-slate-400">No behavior records found.</td></tr> : records.map((record) => <tr key={record.id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 font-bold text-slate-700">{record.student.fullName}</td><td className="px-4 py-3 font-bold text-cyan-700">{record.scoreAfter ?? scores[record.student.id] ?? 100}/100{record.deduction > 0 && <span className="ml-1 text-rose-600">(-{record.deduction})</span>}</td><td className="px-4 py-3 capitalize">{record.category.replace('_', ' ')}</td><td className="max-w-md px-4 py-3 text-slate-600">{record.note}</td><td className="px-4 py-3 text-slate-400">{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '-'}</td>{canModify && <td className="px-4 py-3 text-right"><button onClick={() => deleteRecord(record.id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="Delete"><Trash2 size={15} /></button></td>}</tr>)}</tbody>
                </table>
            </div>}
        </div>
    );
}
