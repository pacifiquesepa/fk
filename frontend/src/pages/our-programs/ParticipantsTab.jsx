import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function ParticipantsTab({ subject, user }) {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const loadParticipants = async () => {
            if (!subject?.className && !subject?.classId) {
                setParticipants([]);
                return;
            }

            try {
                setLoading(true);
                setError('');

                let studentList = [];
                if (user?.role === 'student') {
                    const [{ data: profileData }, { data: studentsData }] = await Promise.all([
                        api.get('/student/profile'),
                        api.get('/students'),
                    ]);

                    const currentClassName = profileData.profile?.className;
                    studentList = (studentsData.students || []).filter((student) => student.className === currentClassName);
                } else {
                    const { data } = await api.get('/students');
                    const className = subject?.className || '';
                    studentList = (data.students || []).filter((student) => !className || student.className === className);
                }

                if (active) setParticipants(studentList);
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.error || 'Unable to load participants.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadParticipants();
        return () => { active = false; };
    }, [subject, user]);

    if (loading) {
        return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading participants...</div>;
    }

    if (error) {
        return <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>;
    }

    return (
        <div className="space-y-3">
            {participants.length ? participants.map((person) => (
                <div key={person.id || person.fullName} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-700">{person.fullName || person.name || person}</span>
                    <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-700">
                        active
                    </span>
                </div>
            )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    No participants found for this subject yet.
                </div>
            )}
        </div>
    );
}
