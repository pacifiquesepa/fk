import { useEffect, useState } from 'react';
import {
    ArrowLeft,
    Plus,
    FileText,
    Loader,
    Trash2,
    Eye,
    Send,
    AlertCircle,
    Maximize2,
    Minimize2
} from 'lucide-react';
import api from '../lib/api';
import {
    default as ChooseQuestion
} from '../pages/typeQuestion/ChooseQuestion';
import FillInGapQuestion from '../pages/typeQuestion/FillInGapQuestion';
import MatchQuestion from '../pages/typeQuestion/MatchQuestion';
import DropAndDragQuestion from '../pages/typeQuestion/DropAndDragQuestion';
import ArrangeQuestion from '../pages/typeQuestion/ArrangeQuestion';

/**
 * UploadTestSidebar Component
 * Main interface for teachers to create, edit, and manage tests
 * Serves as the entry point for the test builder workflow
 */
export default function UploadTestSidebar({ t, onClose, classId, subjectId, fullPage = false }) {
    const [drafts, setDrafts] = useState([]);
    const [selectedTest, setSelectedTest] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showNewTestForm, setShowNewTestForm] = useState(fullPage);
    const [isExpanded, setIsExpanded] = useState(true);
    const [assignments, setAssignments] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(classId || '');
    const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        durationMinutes: 60,
        questionPlan: { choice: 0, fill: 0, match: 0, rearrange: 0 }
    });

    useEffect(() => {
        loadDrafts();
        api.get('/teacher/my-assignments').then(({ data }) => {
            const nextAssignments = data.assignments || [];
            setAssignments(nextAssignments);
            if (!selectedClassId && nextAssignments[0]) setSelectedClassId(String(nextAssignments[0].classId));
            if (!selectedSubjectId && nextAssignments[0]) setSelectedSubjectId(String(nextAssignments[0].subjectId));
        }).catch((err) => setError(err.response?.data?.error || 'Unable to load your class assignments.'));
    }, []);

    const availableSubjects = assignments.filter((item) => String(item.classId) === String(selectedClassId));
    const selectedAssignment = assignments.find((item) => String(item.classId) === String(selectedClassId) && String(item.subjectId) === String(selectedSubjectId));

    const loadDrafts = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/teacher/tests/drafts');
            setDrafts(data.drafts || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to load test drafts.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTest = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            setError('Test title is required.');
            return;
        }
        if (!selectedAssignment) {
            setError('Select a class and subject that you are assigned to teach.');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('/teacher/tests/draft', {
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                durationMinutes: Number(formData.durationMinutes),
                questionPlan: formData.questionPlan,
                classId: Number(selectedClassId),
                subjectId: Number(selectedSubjectId)
            });

            setSelectedTest({ ...data, questionPlan: formData.questionPlan });
            setDrafts([data, ...drafts]);
            setShowNewTestForm(false);
            setFormData({ title: '', description: '', durationMinutes: 60, questionPlan: { choice: 0, fill: 0, match: 0, rearrange: 0 } });
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to create test.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTest = async (testId) => {
        if (!window.confirm('Are you sure you want to delete this test? This cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/teacher/tests/${testId}`);
            setDrafts(drafts.filter(d => d.id !== testId));
            if (selectedTest?.id === testId) {
                setSelectedTest(null);
            }
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to delete test.');
        }
    };

    if (selectedTest) {
        return (
            <TestBuilderWizard
                test={selectedTest}
                questionPlan={selectedTest.questionPlan}
                onBack={() => {
                    setSelectedTest(null);
                    loadDrafts();
                }}
                onSave={(updated) => {
                    setDrafts(drafts.map(d => d.id === updated.id ? updated : d));
                }}
                isExpanded={isExpanded}
                fullPage={fullPage}
                onToggleSize={() => setIsExpanded((expanded) => !expanded)}
                t={t}
            />
        );
    }

    return (
        <div className={`flex flex-col bg-white transition-all duration-200 ${fullPage ? 'min-h-[70vh] w-full rounded-2xl border border-slate-200 shadow-sm' : isExpanded ? 'h-full w-full sm:w-[min(42rem,calc(100vw-2rem))]' : 'h-auto w-[min(22rem,calc(100vw-2rem))]'}`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
                <div className="flex items-center gap-2">
                    <FileText size={20} className="text-cyan-700" />
                    <h2 className="font-display text-base font-bold text-slate-800">Upload test</h2>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded((expanded) => !expanded)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title={isExpanded ? 'Minimize sidebar' : 'Maximize sidebar'}
                        aria-label={isExpanded ? 'Minimize sidebar' : 'Maximize sidebar'}
                    >
                        {isExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="Close"
                        aria-label="Close sidebar"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={`${isExpanded ? 'flex-1 overflow-y-auto p-5 space-y-5' : 'hidden'}`}>
                {error && (
                    <div className="flex gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                {/* New Test Form */}
                {showNewTestForm && (
                    <form onSubmit={handleCreateTest} className="space-y-4 rounded-lg border border-slate-200 p-4 bg-slate-50">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-600">Class*</label>
                                <select required value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSubjectId(''); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" disabled={loading || !assignments.length}>
                                    <option value="">Select assigned class</option>
                                    {[...new Map(assignments.map((item) => [item.classId, item])).values()].map((item) => <option key={item.classId} value={item.classId}>{item.className}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-600">Subject*</label>
                                <select required value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" disabled={loading || !availableSubjects.length}>
                                    <option value="">Select assigned subject</option>
                                    {availableSubjects.map((item) => <option key={item.subjectId} value={item.subjectId}>{item.subjectName}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Test Title*</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Mathematics Final Exam"
                                maxLength={180}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-cyan-600 outline-none"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional instructions for students..."
                                maxLength={500}
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-cyan-600 outline-none resize-none"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Duration (minutes)*</label>
                            <input
                                type="number"
                                value={formData.durationMinutes}
                                onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-cyan-600 outline-none"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-xs font-bold text-slate-600">QUESTION TYPES</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {[['choice', 'Multiple choice'], ['fill', 'Fill in gap'], ['match', 'Match'], ['rearrange', 'Re-arrange']].map(([type, label]) => <label key={type} className="text-xs text-slate-600">{label}
                                    <input type="number" min="0" max="200" value={formData.questionPlan[type]} onChange={(e) => setFormData({ ...formData, questionPlan: { ...formData.questionPlan, [type]: Number(e.target.value) } })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" disabled={loading} />
                                </label>)}
                            </div>
                            <p className="text-xs font-bold text-cyan-700">Total questions: {Object.values(formData.questionPlan).reduce((total, count) => total + Number(count || 0), 0)}</p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-3 py-2 text-sm font-bold text-white bg-cyan-700 rounded-lg hover:bg-cyan-800 disabled:bg-slate-300"
                            >
                                {loading ? 'Creating...' : 'Create Test'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowNewTestForm(false)}
                                className="flex-1 px-3 py-2 text-sm font-bold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* New Test Button */}
                {!showNewTestForm && (
                    <button
                        onClick={() => setShowNewTestForm(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-cyan-700 rounded-lg hover:bg-cyan-800"
                    >
                        <Plus size={16} />
                        New Test
                    </button>
                )}

                {/* Test Drafts List */}
                <div>
                    <p className="text-xs font-bold text-slate-600 mb-2">YOUR DRAFTS ({drafts.length})</p>
                    {loading && !drafts.length && (
                        <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
                            <Loader size={16} className="animate-spin" />
                            Loading...
                        </div>
                    )}

                    {!loading && drafts.length === 0 && (
                        <div className="text-center py-6 text-sm text-slate-500">
                            <p>No test drafts yet.</p>
                            <p className="text-xs mt-1">Create a new test to get started.</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        {drafts.map((draft) => (
                            <div
                                key={draft.id}
                                className="p-3 border border-slate-200 rounded-lg hover:border-cyan-400 hover:bg-slate-50 transition cursor-pointer group"
                                onClick={() => setSelectedTest(draft)}
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h3 className="text-sm font-bold text-slate-800 flex-1">{draft.title}</h3>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTest(draft.id);
                                            }}
                                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {draft.durationMinutes} min · {new Date(draft.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * TestBuilderWizard Component
 * Multi-step wizard for building tests with different question types
 */
function TestBuilderWizard({ test, questionPlan, onBack, onSave, isExpanded, onToggleSize, fullPage, t }) {
    const [currentTest, setCurrentTest] = useState(test);
    const [questions, setQuestions] = useState([]);
    const [activeStep, setActiveStep] = useState('overview'); // overview, build, review, publish
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedQuestion, setSelectedQuestion] = useState(null);

    useEffect(() => {
        loadTestDetails();
    }, [test.id]);

    const loadTestDetails = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/teacher/tests/${test.id}/draft`);
            setCurrentTest(data.test);
            setQuestions(data.questions || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to load test details.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = async (questionData) => {
        setLoading(true);
        try {
            const { data } = await api.post(`/teacher/tests/${test.id}/questions`, questionData);
            setQuestions([...questions, data]);
            setSelectedQuestion(null);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to add question.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm('Delete this question?')) return;

        try {
            await api.delete(`/teacher/tests/${test.id}/questions/${questionId}`);
            setQuestions(questions.filter(q => q.id !== questionId));
            setSelectedQuestion(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to delete question.');
        }
    };
    const handleUpdateQuestion = async (questionId, questionData) => {
        setLoading(true);
        try {
            const { data } = await api.put(`/teacher/tests/${test.id}/questions/${questionId}`, questionData);
            setQuestions(questions.map((question) => question.id === questionId ? { ...question, ...questionData, ...data } : question));
            setSelectedQuestion(null);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to update question.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTest = async (updates) => {
        setLoading(true);
        try {
            await api.put(`/teacher/tests/${test.id}`, updates);
            const updated = { ...currentTest, ...updates };
            setCurrentTest(updated);
            onSave(updated);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to update test settings.');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (questions.length === 0) {
            setError('Add at least one question before publishing.');
            return;
        }

        setLoading(true);
        try {
            await api.post(`/teacher/tests/${test.id}/publish`);
            setActiveStep('published');
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to publish test.');
        } finally {
            setLoading(false);
        }
    };

    const stepContent = {
        overview: (
            <TestOverviewStep test={currentTest} questionCount={questions.length} questionPlan={questionPlan} onNext={() => setActiveStep('build')} />
        ),
        build: (
            <TestBuildStep
                test={currentTest}
                questions={questions}
                onUpdateTest={handleUpdateTest}
                selectedQuestion={selectedQuestion}
                onSelectQuestion={setSelectedQuestion}
                onAddQuestion={handleAddQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onUpdateQuestion={handleUpdateQuestion}
                loading={loading}
            />
        ),
        review: (
            <TestReviewStep
                test={currentTest}
                questions={questions}
                onUpdateTest={handleUpdateTest}
                onPublish={handlePublish}
                loading={loading}
            />
        ),
        published: (
            <div className="text-center py-8">
                <div className="text-4xl mb-3">✓</div>
                <h3 className="text-lg font-bold text-slate-800">Test Published!</h3>
                <p className="text-sm text-slate-500 mt-2">
                    Students have been notified and can now take the test.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <button
                        onClick={() => setActiveStep('build')}
                        className="px-4 py-2 text-sm font-bold text-white bg-cyan-700 rounded-lg hover:bg-cyan-800"
                    >
                        Edit test questions
                    </button>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 text-sm font-bold text-white bg-slate-700 rounded-lg hover:bg-slate-800"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    };

    return (
        <div className={`flex flex-col bg-white transition-all duration-200 ${fullPage ? 'min-h-[70vh] w-full' : isExpanded ? 'h-full w-full sm:w-[min(42rem,calc(100vw-2rem))]' : 'h-auto w-[min(22rem,calc(100vw-2rem))]'}`}>
            {/* Header with Navigation */}
            <div className="border-b border-slate-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="p-1 hover:bg-slate-100 rounded-lg"
                        title="Back"
                    >
                        <ArrowLeft size={18} className="text-cyan-700" />
                    </button>
                    <div className="flex-1">
                        <h2 className="font-display text-base font-bold text-slate-800">{currentTest.title}</h2>
                        <p className="text-xs text-slate-500">{currentTest.durationMinutes} minutes</p>
                    </div>
                    <button
                        onClick={onToggleSize}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title={isExpanded ? 'Minimize sidebar' : 'Maximize sidebar'}
                        aria-label={isExpanded ? 'Minimize sidebar' : 'Maximize sidebar'}
                    >
                        {isExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                    </button>
                </div>

                {/* Step Indicators */}
                {['overview', 'build', 'review', 'published'].includes(activeStep) && (
                    <div className="flex gap-2 text-xs">
                        {[
                            { key: 'overview', label: 'Overview' },
                            { key: 'build', label: 'Build' },
                            { key: 'review', label: 'Review' },
                            { key: 'published', label: 'Done' }
                        ].map((step) => (
                            <button
                                key={step.key}
                                onClick={() => setActiveStep(step.key)}
                                className={`px-3 py-1 rounded-full font-bold ${activeStep === step.key
                                    ? 'bg-cyan-700 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                {step.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Error Display */}
            {isExpanded && error && (
                <div className="mx-5 mt-4 flex gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Content */}
            <div className={`${isExpanded ? 'flex-1 overflow-y-auto p-5' : 'hidden'}`}>
                {loading && activeStep !== 'published' ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                        <Loader size={18} className="animate-spin" />
                        Loading...
                    </div>
                ) : (
                    stepContent[activeStep]
                )}
            </div>

            {/* Navigation Footer */}
            {isExpanded && activeStep !== 'published' && (
                <div className="border-t border-slate-200 p-5 flex gap-2">
                    {activeStep !== 'overview' && (
                        <button
                            onClick={() => {
                                if (activeStep === 'build') setActiveStep('overview');
                                else if (activeStep === 'review') setActiveStep('build');
                            }}
                            className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300"
                        >
                            Back
                        </button>
                    )}
                    {activeStep === 'overview' && (
                        <button
                            onClick={() => setActiveStep('build')}
                            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-cyan-700 rounded-lg hover:bg-cyan-800"
                        >
                            Start Building
                        </button>
                    )}
                    {activeStep === 'build' && questions.length > 0 && (
                        <button
                            onClick={() => setActiveStep('review')}
                            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-cyan-700 rounded-lg hover:bg-cyan-800"
                        >
                            Review & Publish
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * TestOverviewStep Component
 * Shows test configuration overview
 */
function TestOverviewStep({ test, questionCount, questionPlan, onNext }) {
    const plannedCount = questionPlan ? Object.values(questionPlan).reduce((total, count) => total + Number(count || 0), 0) : 0;
    return (
        <div className="space-y-6">
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div>
                    <p className="text-xs font-bold text-slate-600">Title</p>
                    <p className="text-sm text-slate-900 mt-1">{test.title}</p>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-600">Duration</p>
                    <p className="text-sm text-slate-900 mt-1">{test.durationMinutes} minutes</p>
                </div>
                {test.description && (
                    <div>
                        <p className="text-xs font-bold text-slate-600">Description</p>
                        <p className="text-sm text-slate-900 mt-1">{test.description}</p>
                    </div>
                )}
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-bold text-slate-600">Questions Added</p>
                <p className="text-2xl font-bold text-cyan-700 mt-2">{questionCount}</p>
                <p className="text-xs text-slate-500 mt-1">
                    {questionCount === 0 ? 'Add questions to get started' : 'Ready to review'}
                </p>
            </div>

            {plannedCount > 0 && <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(questionPlan).map(([type, count]) => <div key={type} className="rounded-lg bg-cyan-50 p-3 text-slate-700"><span className="font-bold capitalize">{type}</span><br />{Number(count || 0)} planned</div>)}
            </div>}

            <button
                onClick={onNext}
                className="w-full px-4 py-3 text-sm font-bold text-white bg-cyan-700 rounded-lg hover:bg-cyan-800"
            >
                {questionCount > 0 ? 'Continue Building' : 'Add First Question'}
            </button>
        </div>
    );
}

/**
 * TestBuildStep Component
 * Main interface for adding and managing questions
 */
function TestBuildStep({ test, questions, selectedQuestion, onSelectQuestion, onAddQuestion, onUpdateQuestion, onDeleteQuestion, loading }) {
    return (
        <div className="space-y-4">
            {!selectedQuestion ? (
                <>
                    {questions.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-slate-300 rounded-lg">
                            <Plus size={32} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-700">No questions yet</p>
                            <p className="text-xs text-slate-500 mt-1">Click below to add your first question</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {questions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    className="p-3 border border-slate-200 rounded-lg hover:border-cyan-400 hover:bg-slate-50 transition"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 cursor-pointer" onClick={() => onSelectQuestion(q)}>
                                            <p className="text-xs font-bold text-slate-600">Question {idx + 1}</p>
                                            <p className="text-sm text-slate-900 mt-1 line-clamp-2">{q.prompt}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {q.questionType.charAt(0).toUpperCase() + q.questionType.slice(1)} • {q.points} pts
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => onSelectQuestion(q)}
                                                className="px-2 py-1 text-[11px] font-bold text-cyan-700 bg-cyan-50 rounded hover:bg-cyan-100"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => onDeleteQuestion(q.id)}
                                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                                title="Delete question"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <QuestionTypeSelector
                        onSelect={(type) => onSelectQuestion({ questionType: type })}
                        disabled={loading}
                    />
                </>
            ) : selectedQuestion.id ? (
                <QuestionEditor
                    question={selectedQuestion}
                    onBack={() => onSelectQuestion(null)}
                    onSave={(data) => onUpdateQuestion(selectedQuestion.id, data)}
                    disabled={loading}
                />
            ) : (
                <QuestionCreator
                    questionType={selectedQuestion.questionType}
                    onCancel={() => onSelectQuestion(null)}
                    onSave={(data) => {
                        onAddQuestion({ ...data, questionType: selectedQuestion.questionType });
                    }}
                    disabled={loading}
                />
            )}
        </div>
    );
}

/**
 * TestReviewStep Component
 * Final review before publishing
 */
function TestReviewStep({ test, questions, onUpdateTest, onPublish, loading }) {
    const [settings, setSettings] = useState({
        durationMinutes: test.durationMinutes,
        startsAt: test.startsAt ? String(test.startsAt).slice(0, 16) : '',
        endsAt: test.endsAt ? String(test.endsAt).slice(0, 16) : ''
    });

    const saveSettings = async () => {
        await onUpdateTest({
            durationMinutes: Number(settings.durationMinutes),
            startsAt: settings.startsAt || null,
            endsAt: settings.endsAt || null
        });
    };
    const totalPoints = questions.reduce((sum, q) => sum + Number(q.points), 0);

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <div className="flex-shrink-0 text-blue-700 font-bold text-lg">ℹ</div>
                <div className="text-sm text-blue-900">
                    <p className="font-bold">Ready to publish?</p>
                    <p className="mt-1">Once published, students will be notified and can begin taking the test.</p>
                </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total Questions</span>
                    <span className="text-sm font-bold text-slate-900">{questions.length}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total Points</span>
                    <span className="text-sm font-bold text-slate-900">{totalPoints}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Duration</span>
                    <span className="text-sm font-bold text-slate-900">{test.durationMinutes} minutes</span>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600">QUESTIONS OVERVIEW</p>
                {questions.map((q, idx) => (
                    <div key={q.id} className="text-xs p-2 border border-slate-200 rounded bg-white">
                        <p className="font-bold text-slate-800">Q{idx + 1}: {q.prompt.substring(0, 50)}...</p>
                        <p className="text-slate-600 mt-1">
                            Type: <span className="font-bold capitalize">{q.questionType}</span> • Points: {q.points}
                        </p>
                    </div>
                ))}
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-600">TEST SETTINGS</p>
                <label className="block text-xs text-slate-600">Duration (minutes)
                    <input type="number" min="1" max="480" value={settings.durationMinutes} onChange={(event) => setSettings({ ...settings, durationMinutes: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-slate-600">Start date and time
                        <input type="datetime-local" value={settings.startsAt} onChange={(event) => setSettings({ ...settings, startsAt: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-xs text-slate-600">End date and time
                        <input type="datetime-local" value={settings.endsAt} onChange={(event) => setSettings({ ...settings, endsAt: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                </div>
                <button type="button" onClick={saveSettings} disabled={loading} className="rounded-lg border border-cyan-200 px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-50 disabled:opacity-50">Save settings</button>
            </div>

            <button
                onClick={onPublish}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:bg-slate-300"
            >
                <Send size={16} />
                {loading ? 'Publishing...' : 'Publish Test Now'}
            </button>
        </div>
    );
}

/**
 * QuestionTypeSelector Component
 * Allows teacher to select which question type to create
 */
function QuestionTypeSelector({ onSelect, disabled }) {
    const types = [
        {
            id: 'choice',
            label: 'Multiple Choice',
            description: 'Single correct answer from options',
            icon: '◯'
        },
        {
            id: 'fill',
            label: 'Fill in Gap',
            description: 'Type the answer in blank space',
            icon: '✎'
        },
        {
            id: 'match',
            label: 'Matching',
            description: 'Match items with their pairs',
            icon: '⇄'
        },
        {
            id: 'drag',
            label: 'Drag & Drop',
            description: 'Drag items to correct positions',
            icon: '⇦'
        },
        {
            id: 'rearrange',
            label: 'Rearrange',
            description: 'Put items in correct order',
            icon: '↕'
        }
    ];

    return (
        <div className="space-y-2">
            <p className="text-xs font-bold text-slate-600">ADD QUESTION TYPE</p>
            <div className="grid grid-cols-1 gap-2">
                {types.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => onSelect(type.id)}
                        disabled={disabled}
                        className="p-3 text-left border border-slate-200 rounded-lg hover:border-cyan-400 hover:bg-cyan-50 transition disabled:opacity-50"
                    >
                        <div className="flex items-start gap-2">
                            <span className="text-lg">{type.icon}</span>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900">{type.label}</p>
                                <p className="text-xs text-slate-600 mt-0.5">{type.description}</p>
                            </div>
                            <Plus size={16} className="text-slate-400 flex-shrink-0" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * QuestionCreator Component
 * Form for creating a new question of a specific type
 */
function QuestionCreator({ questionType, onCancel, onSave, disabled }) {
    const [formData, setFormData] = useState({
        prompt: '',
        points: 1,
        options: [],
        answer: []
    });

    const componentMap = {
        choice: ChooseQuestion,
        fill: FillInGapQuestion,
        match: MatchQuestion,
        drag: DropAndDragQuestion,
        rearrange: ArrangeQuestion
    };

    const EditorComponent = componentMap[questionType];

    if (!EditorComponent) {
        return (
            <div className="space-y-4">
                <button onClick={onCancel} className="text-sm text-cyan-700 font-bold">← Back</button>
                <p className="text-sm text-slate-600">Question type not recognized</p>
            </div>
        );
    }

    return (
        <EditorComponent
            formData={formData}
            setFormData={setFormData}
            onCancel={onCancel}
            onSave={onSave}
            disabled={disabled}
        />
    );
}

/**
 * QuestionEditor Component
 * Edit an existing question with the same editors used for creation.
 */
function QuestionEditor({ question, onBack, onSave, disabled }) {
    const [formData, setFormData] = useState({ ...question, options: question.options || [], answer: question.answer || [] });
    const componentMap = { choice: ChooseQuestion, fill: FillInGapQuestion, match: MatchQuestion, drag: DropAndDragQuestion, rearrange: ArrangeQuestion };
    const EditorComponent = componentMap[question.questionType];
    if (!EditorComponent) return <p className="text-sm text-slate-600">Question type not recognized.</p>;
    return <EditorComponent formData={formData} setFormData={setFormData} onCancel={onBack} onSave={onSave} disabled={disabled} />;
}

// Placeholder question type editors - to be expanded
// (Full editors are now in QuestionEditors.jsx)
