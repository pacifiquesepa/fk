import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Cpu, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL || 'http://localhost:8001';
const REQUEST_TIMEOUT_MS = 4000;
const GENERATION_TIMEOUT_MS = 75000;
const questionTypes = [
    ['multiple_choice', 'Multiple choice', 6],
    ['match', 'Match', 5],
    ['rearrange', 'Rearrange', 5],
    ['fill_in_gap', 'Fill in gap', 5],
    ['drag_and_drop', 'Drag and drop', 3],
    ['open_question', 'Open question', 5],
];

export default function AIEnginePage({ user, onBack }) {
    const [status, setStatus] = useState('checking');
    const [error, setError] = useState('');
    const [assessment, setAssessment] = useState(null);
    const [showAnswers, setShowAnswers] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ subject: 'Mathematics', topic: 'Algebra', className: 'Level 3', difficulty: 'medium', provider: 'local' });
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
                    topic: form.topic,
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
            setError(requestError.name === 'AbortError' ? 'Question generation took longer than 75 seconds. Check the provider response or use the local dataset, then retry.' : requestError.message || 'Unable to generate assessment.');
        } finally {
            window.clearTimeout(timeout);
            setLoading(false);
        }
    };

    return <div className="space-y-7">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700 hover:text-cyan-900"><ArrowLeft size={16} />Back to dashboard</button>
        <section className="rounded-3xl bg-[#102a43] p-6 text-white shadow-xl sm:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/20 text-cyan-200"><Sparkles size={28} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">Assessment intelligence</p><h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">AI Engine</h1><p className="mt-2 text-sm text-slate-300">Generate curriculum-grounded questions for your class.</p></div></div>
                <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${status === 'online' ? 'bg-emerald-400/20 text-emerald-200' : status === 'checking' ? 'bg-white/10 text-slate-200' : 'bg-rose-400/20 text-rose-200'}`}>{status === 'online' ? <CheckCircle2 size={15} /> : status === 'checking' ? <Loader2 className="animate-spin" size={15} /> : <AlertCircle size={15} />}{status === 'online' ? 'AI Engine online' : status === 'checking' ? 'Checking service' : 'AI Engine offline'}</div>
            </div>
        </section>
        {error && <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><span>{error}</span><button onClick={() => { setError(''); checkHealth(); }} className="font-bold underline">Retry</button></div>}
        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <form onSubmit={generate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-2 text-cyan-700"><Cpu size={18} /><h2 className="font-display text-base font-bold text-slate-800">Build assessment</h2></div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Field label="Subject"><input value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} required /></Field><Field label="Topic"><input value={form.topic} onChange={(event) => updateForm('topic', event.target.value)} required /></Field><Field label="Class"><input value={form.className} onChange={(event) => updateForm('className', event.target.value)} required /></Field><Field label="Difficulty"><select value={form.difficulty} onChange={(event) => updateForm('difficulty', event.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="strong">Strong</option></select></Field><Field label="Question source"><select value={form.provider} onChange={(event) => updateForm('provider', event.target.value)}><option value="local">Approved local dataset</option><option value="openai">OpenAI + approved sources</option><option value="gemini">Gemini + approved sources</option></select></Field></div>
                <div className="mt-5 border-t border-slate-100 pt-4"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Question mix</p><span className="text-xs font-bold text-cyan-700">{totalRequested} total</span></div><div className="grid gap-2">{questionTypes.map(([type, label]) => <label key={type} className="flex items-center justify-between gap-3 text-xs text-slate-600"><span>{label}</span><input type="number" min="0" max="50" value={counts[type]} onChange={(event) => updateCount(type, event.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-right text-xs" /></label>)}</div></div>
                <button disabled={loading || totalRequested < 1} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-xs font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300">{loading && <Loader2 className="animate-spin" size={15} />}{loading ? 'Generating...' : 'Generate questions'}</button>
                <p className="mt-3 text-[10px] leading-5 text-slate-400">Requested by {user?.name || 'teacher'}. External questions require teacher review before publishing.</p>
            </form>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-base font-bold text-slate-800">Generated questions</h2>{assessment && <p className="mt-1 text-[10px] text-slate-400">{assessment.subject} · {assessment.topic} · {assessment.difficulty || form.difficulty}</p>}</div>{assessment && <button onClick={() => setShowAnswers((value) => !value)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">{showAnswers ? <EyeOff size={14} /> : <Eye size={14} />}{showAnswers ? 'Hide answers' : 'Show answers'}</button>}</div>{!assessment ? <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400"><div><Sparkles className="mx-auto mb-3 text-cyan-500" size={28} /><p>Choose a topic and generate an assessment.</p></div></div> : <div className="space-y-3">{assessment.questions.map((question, index) => <QuestionCard key={question.id || index} question={question} index={index} showAnswers={showAnswers} />)}</div>}</section>
        </section>
    </div>;
}

function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>{<div className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-slate-200 [&>input]:px-3 [&>input]:py-3 [&>input]:text-xs [&>input]:outline-none [&>input]:focus:border-cyan-500 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-slate-200 [&>select]:bg-white [&>select]:px-3 [&>select]:py-3 [&>select]:text-xs">{children}</div>}</label>; }
function QuestionCard({ question, index, showAnswers }) { return <article className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold leading-5 text-slate-700">{index + 1}. {question.prompt}</p><span className="shrink-0 rounded-full bg-cyan-100 px-2 py-1 text-[9px] font-bold uppercase text-cyan-700">{question.type.replaceAll('_', ' ')}</span></div>{question.options?.length > 0 && <ol className="mt-3 grid gap-2 text-xs text-slate-600">{question.options.map((option, optionIndex) => <li key={`${question.id}-${optionIndex}`} className="rounded-lg bg-white px-3 py-2">{String.fromCharCode(65 + optionIndex)}. {option}</li>)}</ol>}{showAnswers && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[10px] text-emerald-800"><b>Answer:</b> {formatAnswer(question.answer)}<p className="mt-1">{question.points} points · {question.difficulty}</p></div>}</article>; }
function formatAnswer(answer) { if (answer === null || answer === undefined) return 'Teacher/AI review required'; return typeof answer === 'object' ? JSON.stringify(answer) : String(answer); }
