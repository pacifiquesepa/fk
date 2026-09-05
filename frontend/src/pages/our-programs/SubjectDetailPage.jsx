import { ArrowLeft, BookOpen, BriefcaseBusiness, ChartColumn, ClipboardCheck, GraduationCap, Users } from 'lucide-react';
import { useState } from 'react';
import CourseTab from './CourseTab';
import ParticipantsTab from './ParticipantsTab';
import GradesTab from './GradesTab';
import ActivitiesTab from './ActivitiesTab';
import CompetenciesTab from './CompetenciesTab';
import MoreTab from './MoreTab';

const tabs = [
    { id: 'course', label: 'Course', icon: BookOpen },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'grades', label: 'Grades', icon: ChartColumn },
    { id: 'activities', label: 'Activities', icon: ClipboardCheck },
    { id: 'competencies', label: 'Competencies', icon: BriefcaseBusiness },
    { id: 'more', label: 'More', icon: GraduationCap },
];

export default function SubjectDetailPage({ subject, user, onBack }) {
    const [activeTab, setActiveTab] = useState('course');
    const normalizedSubject = {
        ...subject,
        id: Number(subject?.subjectId ?? subject?.id ?? 0),
        subjectId: Number(subject?.subjectId ?? subject?.id ?? 0),
    };
    const tabMap = {
        course: <CourseTab subject={normalizedSubject} user={user} />,
        participants: <ParticipantsTab subject={normalizedSubject} user={user} />,
        grades: <GradesTab subject={normalizedSubject} user={user} />,
        activities: <ActivitiesTab subject={normalizedSubject} user={user} />,
        competencies: <CompetenciesTab subject={normalizedSubject} user={user} />,
        more: <MoreTab />,
    };

    return (
        <div className="min-h-screen bg-[#f4f5f3] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700"
                >
                    <ArrowLeft size={15} />
                    Back
                </button>

                <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6 lg:p-8">
                    <div className="mb-6 overflow-hidden rounded-[26px] bg-[#edf3f1]">
                        <img
                            src={subject?.image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'}
                            alt={subject?.subjectName || 'Subject'}
                            className="h-[280px] w-full object-cover"
                        />
                    </div>

                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">Blended Learning</p>
                            <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-slate-800">
                                {subject?.subjectName || 'Subject title'}
                            </h1>
                        </div>
                        <div className="rounded-full bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700">
                            {subject?.className || 'Class'}
                        </div>
                    </div>

                    <div className="border-b border-slate-200">
                        <div className="flex flex-wrap gap-2">
                            {tabs.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveTab(id)}
                                    className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${activeTab === id
                                        ? 'border-cyan-500 text-cyan-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6">{tabMap[activeTab]}</div>
                </div>
            </div>
        </div>
    );
}
