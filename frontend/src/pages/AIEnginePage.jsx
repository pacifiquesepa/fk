import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Brain, CheckCircle2, Cpu, Eye, EyeOff, ImageUp, Loader2, MessageSquareText, Paperclip, Sparkles } from 'lucide-react';

const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL || 'http://localhost:8001';
const REQUEST_TIMEOUT_MS = 4000;
const GENERATION_TIMEOUT_MS = 120000;
const questionTypes = [
    ['multiple_choice', 'Multiple choice', 6],
    ['match', 'Match', 5],
    ['rearrange', 'Rearrange', 5],
    ['fill_in_gap', 'Fill in gap', 5],
    ['drag_and_drop', 'Drag and drop', 3],
    ['open_question', 'Open question', 5],
];

export default function AIEnginePage({ user, onBack }) {
    const buildAssessmentRef = useRef(null);
    const [status, setStatus] = useState('checking');
    const [error, setError] = useState('');
    const [assessment, setAssessment] = useState(null);
    const [showAnswers, setShowAnswers] = useState(false);
    const [loading, setLoading] = useState(false);
    const [training, setTraining] = useState(false);
    const [trainingMessage, setTrainingMessage] = useState('');
    const [questionFile, setQuestionFile] = useState(null);
    const [attachedFile, setAttachedFile] = useState(null);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        {
            role: 'assistant',
            text: 'I can answer using approved curriculum context, uploaded files, and teacher-reviewed material. Ask a topic question and I will return an evidence-based answer with the source used.',
        },
    ]);
    const [form, setForm] = useState({ subject: 'Mathematics', unit: 'Unit 1', className: 'Level 3', difficulty: 'medium', provider: 'local' });
    const [counts, setCounts] = useState(Object.fromEntries(questionTypes.map(([type, , count]) => [type, count])));

    const checkHealth = async () => {
        setStatus('checking');
        setError('');
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(`${AI_ENGINE_URL}/health`, { signal: controller.signal });
            if (!response.ok) throw new Error('AI Engine health check failed.');
            setStatus('online');
        } catch (requestError) {
            setStatus('offline');
            setError(requestError.name === 'AbortError' ? 'AI Engine did not respond within 4 seconds. Start the Python service on port 8001, then retry.' : requestError.message || 'AI Engine is unavailable. Start the Python service on port 8001.');
        } finally {
            window.clearTimeout(timeout);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    const totalRequested = useMemo(() => Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0), [counts]);
    const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const updateCount = (type, value) => setCounts((current) => ({ ...current, [type]: Math.max(0, Math.min(50, Number(value) || 0)) }));
    const jumpToBuildAssessment = () => buildAssessmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const generate = async (event) => {
        event.preventDefault();
        setLoading(true); setError(''); setAssessment(null); setShowAnswers(false);
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
        try {
            const response = await fetch(`${AI_ENGINE_URL}/api/assessments/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    subject_name: form.subject,
                    unit: form.unit,
                    class_name: form.className,
                    difficulty: form.difficulty,
                    provider: form.provider,
                    question_types: questionTypes.filter(([type]) => counts[type] > 0).map(([type]) => type),
                    counts,
                }),
            });
            const responseText = await response.text();
            let data;
            try { data = responseText ? JSON.parse(responseText) : {}; } catch { data = {}; }
            if (!response.ok) {
                const detail = Array.isArray(data.detail) ? data.detail.map((item) => item.msg).join(', ') : data.detail;
                throw new Error(detail || data.error || `AI Engine returned HTTP ${response.status}.`);
            }
            if (!data.assessment) throw new Error('AI Engine returned no assessment. Check the Python server log.');
            setAssessment(data.assessment);
        } catch (requestError) {
            setError(requestError.name === 'AbortError' ? 'Question generation took too long. Reduce the number of questions, check the provider API key, or use the local dataset.' : requestError.message || 'Unable to generate assessment.');
        } finally {
            window.clearTimeout(timeout);
            setLoading(false);
        }
    };

    const askReferenceQuestion = async () => {
        const prompt = chatInput.trim();
        if (!prompt) return;
        setChatLoading(true);
        setError('');
        const userMessage = { role: 'user', text: attachedFile ? `${prompt} (context file: ${attachedFile.name})` : prompt };
        setChatMessages((current) => [...current, userMessage]);
        setChatInput('');
        try {
            const isAssessmentRequest = /\b(give me|generate|create|make|mpa|tanga)\b.*\b(question|quiz|assessment|ibibazo)\b/i.test(prompt);
            const response = await fetch(`${AI_ENGINE_URL}${isAssessmentRequest ? '/api/assessments/request' : '/api/ai/reference'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isAssessmentRequest ? { request: prompt } : {
                    provider: form.provider,
                    prompt,
                    subject: form.subject,
                    topic: form.unit,
                    limit: 5,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || 'AI reference request failed.');
            if (isAssessmentRequest) {
                setAssessment(data.assessment);
                setShowAnswers(false);
                setTrainingMessage('Assessment generated from your request. Review the answers, then train approved questions into the local dataset.');
                setChatMessages((current) => [...current, { role: 'assistant', text: `I generated ${data.assessment.total_questions} question(s). Review them in Generated questions.` }]);
                return;
            }
            const answer = data.answer || 'No verified answer was available from the approved sources.';
            const evidence = Array.isArray(data.sources) && data.sources.length ? data.sources.map((item) => item.title || 'Approved source').join(', ') : 'Approved local context';
            setChatMessages((current) => [...current, { role: 'assistant', text: `${answer}\n\nEvidence: ${evidence}` }]);
            if (data.confidence === 'requires_teacher_review') {
                setTrainingMessage('AI answer was generated from approved context; teacher review is still recommended before it is used for training.');
            }
        } catch (requestError) {
            setChatMessages((current) => [...current, { role: 'assistant', text: `I could not answer that yet. ${requestError.message || 'Please check the AI Engine connection.'}` }]);
            setError(requestError.message || 'Unable to answer this question.');
        } finally {
            setChatLoading(false);
            setAttachedFile(null);
        }
    };

    const trainModel = async () => {
        if (!assessment?.questions?.length) return;
        setTraining(true); setTrainingMessage(''); setError('');
        try {
            const response = await fetch(`${AI_ENGINE_URL}/api/assessments/train`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questions: assessment.questions }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || 'Training failed.');
            setTrainingMessage(`${data.added || 0} questions saved; ${data.skipped || 0} without validated answers skipped.`);
        } catch (requestError) { setError(requestError.message || 'Training failed.'); }
        finally { setTraining(false); }
    };

    const uploadQuestionDocument = async () => {
        if (!questionFile) return;
        setTraining(true); setTrainingMessage(''); setError('');
        try {
            const formData = new FormData();
            formData.append('file', questionFile);
            formData.append('subject', form.subject);
            formData.append('unit', form.unit);
            formData.append('class_name', form.className);
            const response = await fetch(`${AI_ENGINE_URL}/api/assessments/train-document`, { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || 'Question document could not be evaluated.');
            setAssessment({ subject: form.subject, unit: form.unit, topic: 'Teacher question document', class_name: form.className, difficulty: form.difficulty, questions: data.questions || [] });
            setTrainingMessage(`${data.added || 0} questions saved; ${data.skipped || 0} without validated answers skipped.`);
            setQuestionFile(null);
        } catch (requestError) { setError(requestError.message || 'Question document could not be evaluated.'); }
        finally { setTraining(false); }
    };

    return <div className="space-y-7">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700 hover:text-cyan-900"><ArrowLeft size={16} />Back to dashboard</button>
        <section className="rounded-3xl bg-[#102a43] p-6 text-white shadow-xl sm:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/20 text-cyan-200"><Sparkles size={28} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">Assessment intelligence</p><h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">AI Engine</h1><p className="mt-2 text-sm text-slate-300">Generate curriculum-grounded questions for your class and ask follow-up questions with teacher-reviewed context.</p></div></div>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    <button type="button" onClick={jumpToBuildAssessment} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#102a43] shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400">Build assessment</button>
                    <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${status === 'online' ? 'bg-emerald-400/20 text-emerald-200' : status === 'checking' ? 'bg-white/10 text-slate-200' : 'bg-rose-400/20 text-rose-200'}`}>{status === 'online' ? <CheckCircle2 size={15} /> : status === 'checking' ? <Loader2 className="animate-spin" size={15} /> : <AlertCircle size={15} />}{status === 'online' ? 'AI Engine online' : status === 'checking' ? 'Checking service' : 'AI Engine offline'}</div>
                </div>
            </div>
        </section>
        {error && <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><span>{error}</span><button onClick={() => { setError(''); checkHealth(); }} className="font-bold underline">Retry</button></div>}
        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-5">
                <form ref={buildAssessmentRef} onSubmit={generate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-2 text-cyan-700"><Cpu size={18} /><h2 className="font-display text-base font-bold text-slate-800">Build assessment</h2></div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Field label="Subject"><input value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} required /></Field><Field label="Unit"><input value={form.unit} onChange={(event) => updateForm('unit', event.target.value)} placeholder="e.g. Unit 1" required /></Field><Field label="Class"><input value={form.className} onChange={(event) => updateForm('className', event.target.value)} required /></Field><Field label="Difficulty"><select value={form.difficulty} onChange={(event) => updateForm('difficulty', event.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="strong">Strong</option></select></Field><Field label="Question source"><select value={form.provider} onChange={(event) => updateForm('provider', event.target.value)}><option value="local">Approved local dataset</option><option value="openai">OpenAI + approved sources</option><option value="gemini">Gemini + approved sources</option></select></Field><Field label="Teacher question document"><input type="file" accept=".docx,.pdf,.txt,.md" onChange={(event) => setQuestionFile(event.target.files?.[0] || null)} className="text-xs" /><button type="button" onClick={uploadQuestionDocument} disabled={!questionFile || training} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300"><Brain size={14} />{training ? 'Evaluating...' : 'Evaluate and train document'}</button></Field></div>
                    <div className="mt-5 border-t border-slate-100 pt-4"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Question mix</p><span className="text-xs font-bold text-cyan-700">{totalRequested} total</span></div><div className="grid gap-2">{questionTypes.map(([type, label]) => <label key={type} className="flex items-center justify-between gap-3 text-xs text-slate-600"><span>{label}</span><input type="number" min="0" max="50" value={counts[type]} onChange={(event) => updateCount(type, event.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs" /></label>)}</div></div>
                    <button type="submit" disabled={loading || totalRequested < 1} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-xs font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300">{loading && <Loader2 className="animate-spin" size={15} />}{loading ? 'Generating...' : 'Build assessment'}</button>
                    <p className="mt-3 text-[10px] leading-5 text-slate-400">Requested by {user?.name || 'teacher'}. External questions require teacher review before publishing.</p>
                </form>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 text-cyan-700"><MessageSquareText size={18} /><h3 className="font-display text-base font-bold text-slate-800">Teacher Q&A</h3></div>
                    <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                        {chatMessages.map((message, index) => (
                            <div key={`${message.role}-${index}`} className={`rounded-xl px-3 py-2 text-xs leading-6 ${message.role === 'assistant' ? 'bg-white text-slate-700' : 'bg-cyan-700 text-white'}`}>
                                <div className="whitespace-pre-line">{message.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 space-y-3">
                        <label className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            <Paperclip size={14} />
                            <span>{attachedFile ? attachedFile.name : 'Attach image or document'}</span>
                            <input type="file" accept=".png,.jpg,.jpeg,.pdf,.docx,.txt,.md" onChange={(event) => setAttachedFile(event.target.files?.[0] || null)} className="hidden" />
                        </label>
                        <div className="flex gap-2">
                            <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about the lesson, upload a photo, or request a concept explanation..." className="min-h-[80px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-cyan-500" />
                        </div>
                        <div className="flex justify-between gap-2">
                            <button type="button" onClick={() => setAttachedFile(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">Clear file</button>
                            <button type="button" onClick={askReferenceQuestion} disabled={chatLoading || !chatInput.trim()} className="flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-[10px] font-bold text-white disabled:bg-slate-300">
                                {chatLoading ? <Loader2 className="animate-spin" size={14} /> : <ImageUp size={14} />}
                                {chatLoading ? 'Thinking...' : 'Ask AI'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-base font-bold text-slate-800">Generated questions</h2>{assessment && <p className="mt-1 text-[10px] text-slate-400">{assessment.subject} · {assessment.unit || form.unit} · {assessment.topic || 'Book activities'} · {assessment.difficulty || form.difficulty}</p>}{trainingMessage && <p className="mt-2 text-[10px] text-emerald-700">{trainingMessage}</p>}</div>{assessment && <div className="flex gap-2"><button onClick={() => setShowAnswers((value) => !value)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">{showAnswers ? <EyeOff size={14} /> : <Eye size={14} />}{showAnswers ? 'Hide answers' : 'Show answers'}</button><button onClick={trainModel} disabled={training} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white disabled:bg-slate-300"><Brain size={14} />{training ? 'Training...' : 'Train model'}</button></div>}</div>{!assessment ? <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400"><div><Sparkles className="mx-auto mb-3 text-cyan-500" size={28} /><p>Build an assessment or upload a teacher document to generate reviewable questions.</p></div></div> : <div className="space-y-3">{assessment.questions.map((question, index) => <QuestionCard key={question.id || index} question={question} index={index} showAnswers={showAnswers} />)}</div>}</section>
        </section>
    </div>;
}

function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>{<div className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-slate-200 [&>input]:px-3 [&>input]:py-3 [&>input]:text-xs [&>input]:outline-none [&>input]:focus:border-cyan-500 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-slate-200 [&>select]:bg-white [&>select]:px-3 [&>select]:py-3 [&>select]:text-xs">{children}</div>}</label>; }
function QuestionCard({ question, index, showAnswers }) {
    const metadata = question.metadata || {};
    return <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3"><p className="text-xs font-bold leading-5 text-slate-700">{index + 1}. {question.prompt}</p><span className="shrink-0 rounded-full bg-cyan-100 px-2 py-1 text-[9px] font-bold uppercase text-cyan-700">{question.type.replaceAll('_', ' ')}</span></div>
        {metadata.instruction && <p className="mt-2 text-[10px] italic text-slate-500">{metadata.instruction}</p>}
        {question.options?.length > 0 && <ol className="mt-3 grid gap-2 text-xs text-slate-600">{question.options.map((option, optionIndex) => <li key={`${question.id}-${optionIndex}`} className="rounded-lg bg-white px-3 py-2">{String.fromCharCode(65 + optionIndex)}. {option}</li>)}</ol>}
        {question.type === 'match' && metadata.left && metadata.right && <div className="mt-3 grid gap-2 sm:grid-cols-2"><div><p className="mb-1 text-[9px] font-bold uppercase text-slate-400">Items</p>{metadata.left.map((item) => <p key={item} className="rounded bg-white px-2 py-1 text-[10px] text-slate-600">{item}</p>)}</div><div><p className="mb-1 text-[9px] font-bold uppercase text-slate-400">Choices</p>{metadata.right.map((item) => <p key={item} className="rounded bg-white px-2 py-1 text-[10px] text-slate-600">{item}</p>)}</div></div>}
        {question.type === 'drag_and_drop' && metadata.groups && <p className="mt-2 text-[10px] text-slate-500">Groups: {metadata.groups.join(', ')}</p>}
        {showAnswers && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[10px] text-emerald-800"><b>Answer:</b> {formatAnswer(question.answer, question.options)}{metadata.accepted_answers?.length > 0 && <p className="mt-2"><b>Accepted:</b> {metadata.accepted_answers.join(', ')}</p>}{(metadata.marking_scheme || metadata.grading) && <p className="mt-2"><b>Marking scheme:</b> {formatAnswer(metadata.marking_scheme || metadata.grading)}</p>}{metadata.explanation && <p className="mt-2 leading-5"><b>Explanation:</b> {metadata.explanation}</p>}<p className="mt-1">{question.points} points · {question.type === 'open_question' ? 'Teacher review' : question.difficulty}</p></div>}
    </article>;
}
function formatAnswer(answer, options) { if (answer === null || answer === undefined) return 'Teacher/AI review required'; if (typeof answer === 'number' && Array.isArray(options) && options[answer] !== undefined) return `${String.fromCharCode(65 + answer)}. ${options[answer]}`; if (Array.isArray(answer)) return answer.join(' → '); if (typeof answer === 'object') return Object.entries(answer).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' · '); return String(answer); }
