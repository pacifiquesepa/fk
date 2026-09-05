import { ArrowLeft, BookOpen, CalendarDays, GraduationCap, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import SubjectDetailPage from './our-programs/SubjectDetailPage';

const programs = [
    {
        title: 'Digital Library',
        description: 'A digital library featuring open books across various trades, multimedia and flexible learning tools.',
        categoryLabel: '2 subcategories',
        enrolledLabel: '0 enrolled',
        image: '/sepa.jpg',
        accent: '#f5f7f8',
        icon: BookOpen,
    },
    {
        title: 'Blended Learning',
        description: 'A modern learning model combining in-class teaching, project work and digital support for practical growth.',
        categoryLabel: '3 subcategories',
        enrolledLabel: '28 enrolled',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
        accent: '#eef8f7',
        icon: Users,
    },
];

export default function OurProgramsPage({ onBack, user, autoOpenSubjects = false }) {
    const [selectedProgram, setSelectedProgram] = useState('Blended Learning');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showProgramSubjects, setShowProgramSubjects] = useState(autoOpenSubjects);

    useEffect(() => {
        if (autoOpenSubjects && selectedProgram === 'Blended Learning') {
            setShowProgramSubjects(true);
        }
    }, [autoOpenSubjects, selectedProgram]);

    useEffect(() => {
        let active = true;
        const loadProgramData = async () => {
            if (selectedProgram !== 'Blended Learning') {
                setSubjects([]);
                setShowProgramSubjects(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                if (user?.role === 'teacher') {
                    const { data } = await api.get('/teacher/my-assignments');
                    if (active) setSubjects((data.assignments || []).map((item) => ({
                        id: Number(item.subjectId),
                        subjectId: Number(item.subjectId),
                        classId: Number(item.classId),
                        className: item.className,
                        subjectName: item.subjectName,
                        teacherName: user?.name || 'You',
                        image: '/sepa.jpg',
                    })));
                    return;
                }

                if (user?.role === 'student') {
                    const [{ data: profileData }, { data: classesData }] = await Promise.all([
                        api.get('/student/profile'),
                        api.get('/classes?current=true'),
                    ]);

                    const className = profileData.profile?.className;
                    const matchedClass = (classesData.classes || []).find((item) => item.name === className);

                    if (!matchedClass) {
                        if (active) setSubjects([]);
                        return;
                    }

                    const { data: classSubjectsData } = await api.get(`/classes/${matchedClass.id}/subjects`);
                    if (active) setSubjects((classSubjectsData.subjects || []).map((item) => ({
                        id: Number(item.subjectId),
                        subjectId: Number(item.subjectId),
                        classId: Number(matchedClass.id),
                        className: className,
                        subjectName: item.subjectName,
                        teacherName: item.teacherName || 'Assigned teacher',
                        image: '/sepa.jpg',
                    })));
                    return;
                }

                if (user?.role === 'dos' || user?.role === 'admin') {
                    const { data } = await api.get('/teacher-assignments');
                    if (active) setSubjects((data.assignments || []).map((item) => ({
                        id: Number(item.subjectId),
                        subjectId: Number(item.subjectId),
                        classId: Number(item.classId),
                        className: item.className,
                        subjectName: item.subjectName,
                        teacherName: item.teacherName,
                        image: '/sepa.jpg',
                    })));
                    return;
                }

                if (active) setSubjects([]);
            } catch (requestError) {
                if (active) setError(requestError.response?.data?.error || 'Unable to load programs.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadProgramData();
        return () => { active = false; };
    }, [selectedProgram, user]);

    const sectionTitle = useMemo(() => {
        if (user?.role === 'teacher') return 'Subjects you teach';
        if (user?.role === 'student') return 'Subjects in your class';
        if (user?.role === 'dos' || user?.role === 'admin') return 'Subjects and assigned teachers';
        return 'Available blended learning subjects';
    }, [user]);

    if (selectedSubject) {
        return <SubjectDetailPage subject={selectedSubject} user={user} onBack={() => setSelectedSubject(null)} />;
    }

    if (showProgramSubjects && selectedProgram === 'Blended Learning') {
        return (
            <div className="min-h-screen bg-[#f4f5f3] px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <button
                        type="button"
                        onClick={() => setShowProgramSubjects(false)}
                        className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700"
                    >
                        <ArrowLeft size={15} />
                        Back to programs
                    </button>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">Blended Learning</p>
                                <h3 className="mt-2 font-display text-2xl font-bold text-slate-800">{sectionTitle}</h3>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700">
                                <CalendarDays size={14} />
                                {subjects.length} units
                            </div>
                        </div>

                        {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

                        {loading ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading subjects...</div>
                        ) : subjects.length ? (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {subjects.map((item) => (
                                    <button
                                        type="button"
                                        key={item.id}
                                        onClick={() => setSelectedSubject(item)}
                                        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left transition hover:border-cyan-200 hover:shadow-sm"
                                    >
                                        <div className="h-36 w-full overflow-hidden bg-slate-100">
                                            <img src={item.image} alt={item.subjectName} className="h-full w-full object-cover" />
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 text-cyan-700">
                                                <GraduationCap size={16} />
                                                <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{item.className}</span>
                                            </div>
                                            <h4 className="mt-3 font-display text-xl font-bold text-slate-800">{item.subjectName}</h4>
                                            <p className="mt-2 text-sm text-slate-600">Teacher: {item.teacherName}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                                No blended learning subjects are available for this account yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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

                <div className="rounded-3xl bg-[#f3f5f4] p-4 sm:p-6 lg:p-8">
                    <div className="mb-8 text-center">
                        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl">Explore Our Programs</h1>
                        <p className="mt-4 text-lg text-slate-600">Choose from our diverse range of courses</p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {programs.map(({ title, description, categoryLabel, enrolledLabel, image, accent, icon: Icon }) => {
                            const active = title === selectedProgram;
                            return (
                                <button
                                    type="button"
                                    key={title}
                                    onClick={() => {
                                        setSelectedProgram(title);
                                        if (title === 'Blended Learning') {
                                            setShowProgramSubjects(true);
                                        }
                                    }}
                                    className={`overflow-hidden rounded-[30px] border text-left shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition ${active ? 'border-cyan-300 bg-white ring-2 ring-cyan-100' : 'border-slate-200 bg-white hover:border-cyan-200'}`}
                                >
                                    <div className="h-[320px] overflow-hidden bg-slate-100" style={{ backgroundColor: accent }}>
                                        <img src={image} alt={title} className="h-full w-full object-cover" />
                                    </div>

                                    <div className="p-5 sm:p-6 lg:p-7">
                                        <h2 className="font-display text-[2rem] font-black uppercase tracking-tight text-slate-800">
                                            {title}
                                        </h2>

                                        <p className="mt-4 text-base leading-8 text-slate-600">{description}</p>

                                        <div className="mt-6 flex items-center gap-4 text-base font-medium text-slate-700">
                                            <span className="inline-flex items-center gap-2 text-slate-700">
                                                <span className="grid h-7 w-7 place-items-center rounded-md bg-cyan-50 text-cyan-700">
                                                    <Icon size={17} />
                                                </span>
                                                {categoryLabel}
                                            </span>
                                            <span className="inline-flex items-center gap-2 text-slate-700">
                                                <span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-100 text-cyan-700">
                                                    <Users size={16} />
                                                </span>
                                                {enrolledLabel}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                </div>
            </div>
        </div>
    );
}
