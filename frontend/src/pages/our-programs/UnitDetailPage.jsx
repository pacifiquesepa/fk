import { ArrowLeft, BriefcaseBusiness, ChartColumn, ClipboardCheck, ExternalLink, FileText, GraduationCap, Plus, Trash2, Upload, Users, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import ParticipantsTab from './ParticipantsTab';
import GradesTab from './GradesTab';
import ActivitiesTab from './ActivitiesTab';
import CompetenciesTab from './CompetenciesTab';

const emptyNoteForm = () => ({ name: '', header: '' });

export default function UnitDetailPage({ subject, unit, user, onBack }) {
    const subjectId = Number(subject?.subjectId ?? subject?.id ?? 0);
    const unitId = Number(unit?.id ?? 0);
    const isTeacher = user?.role === 'teacher';
    const [notes, setNotes] = useState(unit?.notes || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [noteForm, setNoteForm] = useState(emptyNoteForm());
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('course');
    const tabs = [
        { id: 'course', label: 'Course', icon: FileText },
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'grades', label: 'Grades', icon: ChartColumn },
        { id: 'activities', label: 'Activities', icon: ClipboardCheck },
        { id: 'competencies', label: 'Competencies', icon: BriefcaseBusiness },
        { id: 'more', label: 'More', icon: GraduationCap },
    ];

    const loadNotes = async () => {
        if (!subjectId || !unitId) return;
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get(`/subjects/${subjectId}/modules`);
            const matched = (data.modules || []).find((item) => Number(item.id) === Number(unitId));
            if (matched) {
                setNotes(matched.notes || []);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to load notes for this unit.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotes();
    }, [subjectId, unitId]);

    const submitNote = async (event) => {
        event.preventDefault();
        if (!subjectId || !unitId) return;

        const name = noteForm.name.trim();
        const header = noteForm.header.trim();
        if (!name || !header) {
            setError('Uploaded name and note header are required.');
            return;
        }

        const payload = new FormData();
        payload.append('name', name);
        payload.append('header', header);
        if (file) payload.append('file', file);

        setSaving(true);
        setError('');
        try {
            await api.request({
                method: 'POST',
                url: `/subjects/${subjectId}/modules/${unitId}/notes`,
                data: payload,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setNoteForm(emptyNoteForm());
            setFile(null);
            await loadNotes();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to save note.');
        } finally {
            setSaving(false);
        }
    };

    const deleteNote = async (noteId) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await api.delete(`/subjects/${subjectId}/modules/${unitId}/notes/${noteId}`);
            await loadNotes();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to delete note.');
        }
    };

    const deleteUnit = async () => {
        if (!window.confirm(`Delete unit "${unit?.title || 'this unit'}"?`)) return;
        try {
            await api.delete(`/subjects/${subjectId}/modules/${unitId}`);
            onBack();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to delete unit.');
        }
    };

    const summary = useMemo(() => ({ total: notes.length }), [notes]);

    const renderTabContent = () => {
        if (activeTab === 'participants') return <ParticipantsTab subject={subject} user={user} />;
        if (activeTab === 'grades') return <GradesTab subject={subject} user={user} />;
        if (activeTab === 'activities') return <ActivitiesTab subject={subject} user={user} />;
        if (activeTab === 'competencies') return <CompetenciesTab subject={subject} user={user} />;
        if (activeTab === 'more') {
            return (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p><span className="font-bold text-slate-800">Unit:</span> {unit?.title || 'Current unit'}</p>
                    <p><span className="font-bold text-slate-800">Subject:</span> {subject?.subjectName || 'Unknown subject'}</p>
                    <p><span className="font-bold text-slate-800">Class:</span> {subject?.className || 'Class not assigned'}</p>
                    <p><span className="font-bold text-slate-800">Notes stored:</span> {summary.total}</p>
                </div>
            );
        }

        return (
            <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700">Unit overview</p>
                    <p className="mt-2 text-base leading-7 text-slate-600">{unit?.description || 'This unit has no description yet.'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-3 font-display text-2xl font-black text-slate-800">Notes</h3>
                    {notes.length ? notes.map((note) => (
                        <div key={note.id} className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    {note.noteType === 'video' ? <Video size={15} className="text-cyan-700" /> : <FileText size={15} className="text-cyan-700" />}
                                    <p className="font-bold text-slate-800">{note.name}</p>
                                </div>
                                {note.fileUrl && (
                                    <div className="flex items-center gap-2">
                                        <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-cyan-50 px-3 py-1.5 text-[11px] font-bold text-cyan-700">View</a>
                                        <a href={note.fileUrl} download className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700">Download</a>
                                    </div>
                                )}
                            </div>
                            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{note.header}</p>
                        </div>
                    )) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No notes have been added to this unit yet.</div>}
                </div>
            </div>
        );
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
                        <img src={unit?.image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'} alt={unit?.title || 'Unit'} className="h-[220px] w-full object-cover" />
                    </div>

                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">Unit</p>
                            <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">{unit?.title || 'Unit title'}</h1>
                        </div>
                        <div className="rounded-full bg-cyan-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">{summary.total} notes</div>
                    </div>

                    <p className="mb-6 text-lg text-slate-600">{unit?.description || 'No description available.'}</p>

                    <div className="mb-6 border-b border-slate-200">
                        <div className="flex flex-wrap gap-2">
                            {tabs.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveTab(id)}
                                    className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${activeTab === id ? 'border-cyan-500 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">{renderTabContent()}</div>

                    {isTeacher && (
                        <div className="mb-6 flex flex-wrap gap-3">
                            <button type="button" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800">
                                <Plus size={15} /> Add note
                            </button>
                            <button type="button" onClick={deleteUnit} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100">
                                <Trash2 size={15} /> Delete
                            </button>
                        </div>
                    )}

                    {error && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

                    {isTeacher && (
                        <form onSubmit={submitNote} className="mb-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-5">
                            <div className="mb-4 grid gap-4 md:grid-cols-2">
                                <label className="block text-sm font-semibold text-slate-600">
                                    Uploaded name
                                    <input
                                        type="text"
                                        value={noteForm.name}
                                        onChange={(event) => setNoteForm((current) => ({ ...current, name: event.target.value }))}
                                        placeholder="e.g. Lesson 1 Summary"
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300"
                                        required
                                    />
                                </label>

                                <label className="block text-sm font-semibold text-slate-600">
                                    Upload file
                                    <input
                                        type="file"
                                        onChange={(event) => setFile(event.target.files?.[0] || null)}
                                        className="mt-1 block w-full rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                                        accept=".pdf,.doc,.docx,.mp4,.mov,.webm,.avi,.txt"
                                    />
                                </label>
                            </div>

                            <label className="block text-sm font-semibold text-slate-600">
                                Header of note
                                <textarea
                                    value={noteForm.header}
                                    onChange={(event) => setNoteForm((current) => ({ ...current, header: event.target.value }))}
                                    rows={5}
                                    placeholder="Write the lesson note or summary for this unit..."
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-300"
                                    required
                                />
                            </label>

                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-cyan-300">
                                    <Upload size={15} />
                                    {saving ? 'Uploading...' : 'Upload note'}
                                </button>
                                {file && <span className="text-xs text-slate-500">Selected: {file.name}</span>}
                            </div>
                        </form>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-display text-3xl font-black tracking-tight text-slate-800">Notes</h2>
                            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{summary.total} total</div>
                        </div>

                        {loading ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading notes...</div>
                        ) : notes.length ? (
                            notes.map((note) => (
                                <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {note.noteType === 'video' ? <Video size={15} className="text-cyan-700" /> : <FileText size={15} className="text-cyan-700" />}
                                                <p className="text-base font-bold text-slate-800">{note.name}</p>
                                            </div>
                                            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{note.header}</p>
                                        </div>

                                        {isTeacher && (
                                            <button type="button" onClick={() => deleteNote(note.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100">
                                                <Trash2 size={13} /> Delete
                                            </button>
                                        )}
                                    </div>

                                    {note.fileUrl && (
                                        <div className="mt-4 flex flex-wrap items-center gap-2">
                                            <a
                                                href={note.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-100"
                                            >
                                                <ExternalLink size={14} />
                                                View
                                            </a>
                                            <a
                                                href={note.fileUrl}
                                                download
                                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-cyan-200 hover:text-cyan-700"
                                            >
                                                Download
                                            </a>
                                            {isTeacher && (
                                                <button type="button" onClick={() => deleteNote(note.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100">
                                                    <Trash2 size={13} /> Delete
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {!note.fileUrl && !isTeacher && (
                                        <div className="mt-4 text-xs font-semibold text-slate-500">No file attached to this note.</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                                No notes have been added to this unit yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
