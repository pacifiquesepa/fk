import { FileText, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import UnitDetailPage from './UnitDetailPage';

const defaultModuleImage = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80';
const emptyModuleForm = () => ({ title: '', description: '' });

export default function CourseTab({ subject, user }) {
    const subjectId = Number(subject?.subjectId ?? subject?.id ?? 0);
    if (!subjectId) {
        return <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Subject information is missing.</div>;
    }
    const isTeacher = user?.role === 'teacher';
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [moduleForm, setModuleForm] = useState(emptyModuleForm());
    const [modulePhoto, setModulePhoto] = useState(null);
    const [modulePhotoPreview, setModulePhotoPreview] = useState('');
    const [error, setError] = useState('');
    const [selectedUnit, setSelectedUnit] = useState(null);

    const loadModules = async () => {
        if (!subjectId) return;
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get(`/subjects/${subjectId}/modules`);
            setModules((data.modules || []).map((module) => ({
                ...module,
                image: module.image || module.imageUrl || defaultModuleImage,
                notes: (module.notes || []).map((note) => ({
                    ...note,
                    noteType: note.noteType || 'note',
                })),
            })));
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to load units.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadModules();
    }, [subjectId]);

    const addModule = async (event) => {
        event.preventDefault();
        if (!moduleForm.title.trim() || !moduleForm.description.trim()) {
            setError('Unit name and description are required.');
            return;
        }

        const payload = new FormData();
        payload.append('title', moduleForm.title.trim());
        payload.append('description', moduleForm.description.trim());
        if (modulePhoto) payload.append('photo', modulePhoto);

        try {
            setError('');
            await api.request({
                method: 'POST',
                url: `/subjects/${subjectId}/modules`,
                data: payload,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setModuleForm(emptyModuleForm());
            setModulePhoto(null);
            setModulePhotoPreview('');
            await loadModules();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to save unit.');
        }
    };

    const handleModulePhoto = (event) => {
        const selected = event.target.files?.[0];
        if (!selected) {
            setModulePhoto(null);
            setModulePhotoPreview('');
            return;
        }
        setModulePhoto(selected);
        setModulePhotoPreview(URL.createObjectURL(selected));
    };

    const deleteModule = async (moduleId) => {
        if (!window.confirm('Delete this unit?')) return;
        try {
            await api.delete(`/subjects/${subjectId}/modules/${moduleId}`);
            await loadModules();
            if (selectedUnit?.id === moduleId) setSelectedUnit(null);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to delete unit.');
        }
    };

    const summary = useMemo(() => {
        const totalNotes = modules.reduce((total, module) => total + (module.notes || []).length, 0);
        return {
            total: totalNotes,
            modules: modules.length,
        };
    }, [modules]);

    if (selectedUnit) {
        return <UnitDetailPage subject={subject} unit={selectedUnit} user={user} onBack={() => setSelectedUnit(null)} />;
    }

    return (
        <div className="space-y-6 text-sm leading-7 text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700">Module management</p>
                        <h5 className="mt-2 text-lg font-bold text-slate-800">{summary.modules} unit{summary.modules === 1 ? '' : 's'} created</h5>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {summary.total} note{summary.total === 1 ? '' : 's'}
                    </div>
                </div>

                {isTeacher && (
                    <form onSubmit={addModule} className="mt-5 space-y-4 rounded-2xl border border-cyan-100 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h6 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700">Add module / unit</h6>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="block text-xs font-semibold text-slate-600">
                                Unit name
                                <input
                                    type="text"
                                    value={moduleForm.title}
                                    onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))}
                                    placeholder="e.g. Unit 1: Reading Skills"
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300"
                                    required
                                />
                            </label>

                            <label className="block text-xs font-semibold text-slate-600">
                                Upload photo
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleModulePhoto}
                                    className="mt-1 block w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                                />
                            </label>
                        </div>

                        <label className="block text-xs font-semibold text-slate-600">
                            Description
                            <textarea
                                value={moduleForm.description}
                                onChange={(event) => setModuleForm((current) => ({ ...current, description: event.target.value }))}
                                rows={4}
                                placeholder="Describe what students will learn in this module..."
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300"
                                required
                            />
                        </label>

                        {modulePhotoPreview && (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                <img src={modulePhotoPreview} alt="module preview" className="h-36 w-full object-cover" />
                            </div>
                        )}

                        <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-cyan-800">
                            <ImagePlus size={15} />
                            Create module
                        </button>
                    </form>
                )}

                {error && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">{error}</div>}
            </div>

            {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">Loading modules...</div>
            ) : (
                <div className="space-y-4">
                    {modules.length ? modules.map((module) => (
                        <button
                            type="button"
                            key={module.id}
                            onClick={() => setSelectedUnit(module)}
                            className="block w-full overflow-hidden rounded-[26px] border border-slate-200 bg-white text-left shadow-sm transition hover:border-cyan-200 hover:shadow-md"
                        >
                            <div className="h-48 w-full overflow-hidden bg-slate-100">
                                <img src={module.image || defaultModuleImage} alt={module.title} className="h-full w-full object-cover" />
                            </div>

                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700">Unit / module</p>
                                        <h4 className="mt-2 font-display text-3xl font-black tracking-tight text-slate-800">{module.title}</h4>
                                    </div>
                                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">
                                        {(module.notes || []).length} notes
                                    </span>
                                </div>

                                <p className="mt-4 text-base leading-7 text-slate-600">{module.description}</p>

                                {isTeacher && (
                                    <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                        Click card to open this unit
                                    </div>
                                )}
                            </div>
                        </button>
                    )) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                            No units have been created yet for this subject.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
