import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function CompetenciesTab({ subject, user }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [studentId, setStudentId] = useState('');

    useEffect(() => {
        let active = true;

        const loadStudentId = async () => {
            try {
                if (user?.role === 'student') {
                    const { data } = await api.get('/student/profile');
                    if (active) setStudentId(String(data.profile?.id || ''));
                    return;
                }

                const { data } = await api.get('/students');
                const className = subject?.className;
                const students = (data.students || []).filter((student) => !className || student.className === className);
                if (active) setStudentId(String(students[0]?.id || ''));
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.error || 'Unable to load competencies.');
            }
        };

        loadStudentId();
        return () => { active = false; };
    }, [subject, user]);

    useEffect(() => {
        if (!studentId) {
            setItems([]);
            return;
        }

        let active = true;
        const loadCompetencies = async () => {
            try {
                setLoading(true);
                setError('');
                const { data } = await api.get(`/grades?studentId=${studentId}`);
                const ranked = (data.grades || [])
                    .filter((grade) => String(grade.subject) === String(subject?.subjectName) || String(grade.subjectId || '') === String(subject?.subjectId ?? subject?.id ?? ''))
                    .map((grade) => ({
                        ...grade,
                        percentage: grade.maxScore ? Math.round((Number(grade.score || 0) / Number(grade.maxScore || 1)) * 100) : 0,
                    }))
                    .filter((grade) => grade.percentage >= 70);

                if (active) setItems(ranked);
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.error || 'Unable to load competencies.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadCompetencies();
        return () => { active = false; };
    }, [studentId, subject]);

    if (loading) {
        return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading competencies...</div>;
    }

    if (error) {
        return <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>;
    }

    if (!items.length) {
        return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No assessments or tests above 70% have been recorded yet for this subject.</div>;
    }

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-800">{item.assessmentName}</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">{item.percentage}%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.score} / {item.maxScore} · Strong performance</p>
                </div>
            ))}
        </div>
    );
}
