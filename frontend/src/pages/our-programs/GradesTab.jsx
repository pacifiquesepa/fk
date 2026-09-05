import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';

function getGradeBand(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

export default function GradesTab({ subject, user }) {
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ assessmentName: '', score: '', maxScore: '' });

    const subjectId = Number(subject?.subjectId ?? subject?.id ?? 0);

    const filteredGrades = useMemo(() => {
        return (grades || []).filter((grade) => grade.subject === subject?.subjectName || !subject?.subjectName || String(grade.subjectId || '') === String(subjectId));
    }, [grades, subject, subjectId]);

    useEffect(() => {
        let active = true;

        const loadStudents = async () => {
            try {
                if (user?.role === 'student') {
                    const { data } = await api.get('/student/profile');
                    if (active) {
                        setStudents([{ id: data.profile?.id, fullName: data.profile?.fullName || user.name }]);
                        setSelectedStudentId(String(data.profile?.id || ''));
                    }
                    return;
                }

                const { data } = await api.get('/students');
                const className = subject?.className;
                const nextStudents = (data.students || []).filter((student) => !className || student.className === className);
                if (active) {
                    setStudents(nextStudents);
                    setSelectedStudentId((current) => current || String(nextStudents[0]?.id || ''));
                }
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.error || 'Unable to load students.');
            }
        };

        loadStudents();
        return () => { active = false; };
    }, [subject, user]);

    useEffect(() => {
        if (!selectedStudentId) {
            setGrades([]);
            return;
        }

        let active = true;
        const loadGrades = async () => {
            try {
                setLoading(true);
                setError('');
                const { data } = await api.get(`/grades?studentId=${selectedStudentId}`);
                if (active) setGrades(data.grades || []);
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.error || 'Unable to load grades.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadGrades();
        return () => { active = false; };
    }, [selectedStudentId]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const score = Number(form.score);
        const maxScore = Number(form.maxScore);

        if (!selectedStudentId || !subjectId || !form.assessmentName.trim() || !Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) {
            setError('Enter a valid assessment name, score and maximum score.');
            return;
        }

        try {
            setError('');
            await api.post('/grades', {
                studentId: Number(selectedStudentId),
                subjectId,
                assessmentName: form.assessmentName.trim(),
                score,
                maxScore,
            });
            setForm({ assessmentName: '', score: '', maxScore: '' });
            const { data } = await api.get(`/grades?studentId=${selectedStudentId}`);
            setGrades(data.grades || []);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to save the grade.');
        }
    };

    const canEdit = ['admin', 'dos', 'teacher'].includes(user?.role);

    return (
        <div className="space-y-4">
            {students.length > 1 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <label className="block text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                        Student
                        <select
                            value={selectedStudentId}
                            onChange={(event) => setSelectedStudentId(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300"
                        >
                            {students.map((student) => (
                                <option key={student.id} value={student.id}>{student.fullName}</option>
                            ))}
                        </select>
                    </label>
                </div>
            )}

            {canEdit && (
                <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-600">
                            Assessment name
                            <input
                                value={form.assessmentName}
                                onChange={(event) => setForm((current) => ({ ...current, assessmentName: event.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300"
                                placeholder="Quiz, Test, Assignment"
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Score
                            <input
                                type="number"
                                min="0"
                                value={form.score}
                                onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300"
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Max score
                            <input
                                type="number"
                                min="1"
                                value={form.maxScore}
                                onChange={(event) => setForm((current) => ({ ...current, maxScore: event.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300"
                            />
                        </label>
                        <div className="flex items-end">
                            <button type="submit" className="w-full rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white">
                                Save grade
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                        <tr>
                            <th className="px-4 py-3 font-bold">Assessment</th>
                            <th className="px-4 py-3 font-bold">Score</th>
                            <th className="px-4 py-3 font-bold">Percentage</th>
                            <th className="px-4 py-3 font-bold">Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="px-4 py-5 text-center text-slate-500">Loading grades...</td></tr>
                        ) : filteredGrades.length ? filteredGrades.map((row) => {
                            const percentage = row.maxScore ? Math.round((Number(row.score || 0) / Number(row.maxScore || 1)) * 100) : 0;
                            return (
                                <tr key={row.id} className="border-t border-slate-200">
                                    <td className="px-4 py-3 text-slate-700">{row.assessmentName}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700">{row.score} / {row.maxScore}</td>
                                    <td className="px-4 py-3 font-semibold text-cyan-700">{percentage}%</td>
                                    <td className="px-4 py-3 font-bold text-emerald-700">{getGradeBand(percentage)}</td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={4} className="px-4 py-5 text-center text-slate-500">No grades recorded for this subject yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
