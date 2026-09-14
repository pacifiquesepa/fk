import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Eye, FileCheck2, GripVertical, ShieldAlert } from 'lucide-react';
import api from '../lib/api';

export default function TestRunnerPage({ onBack }) {
    const [tests, setTests] = useState([]);
    const [selectedTest, setSelectedTest] = useState(null);
    const [instructions, setInstructions] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [attempt, setAttempt] = useState(null);
    const [answers, setAnswers] = useState({});
    const [questionIndex, setQuestionIndex] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [result, setResult] = useState(null);
    const [warning, setWarning] = useState('');
    const [error, setError] = useState('');
    const submitting = useRef(false);

    useEffect(() => {
        api.get('/tests').then(({ data }) => setTests(data.tests || [])).catch((requestError) => setError(requestError.response?.data?.error || 'Unable to load tests.'));
    }, []);

    useEffect(() => {
        if (!attempt || seconds <= 0) return undefined;
        const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
        return () => window.clearInterval(timer);
    }, [attempt, seconds]);

    useEffect(() => {
        if (attempt && seconds === 0 && !submitting.current) submit();
    }, [attempt, seconds]);

    useEffect(() => {
        if (!attempt) return undefined;
        const report = (reason) => { setWarning(reason); api.post(`/test-attempts/${attempt.id}/cheating`, { reason }).catch(() => { }); };
        const block = (event) => { event.preventDefault(); report(`Blocked ${event.type} action`); };
        const keydown = (event) => { if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'p'].includes(event.key.toLowerCase())) block(event); };
        const fullscreenChange = () => { if (!document.fullscreenElement) report('Fullscreen mode exited'); };
        window.addEventListener('copy', block); window.addEventListener('cut', block); window.addEventListener('paste', block); window.addEventListener('contextmenu', block); window.addEventListener('keydown', keydown); document.addEventListener('fullscreenchange', fullscreenChange); document.documentElement.requestFullscreen?.().catch(() => { });
        return () => { window.removeEventListener('copy', block); window.removeEventListener('cut', block); window.removeEventListener('paste', block); window.removeEventListener('contextmenu', block); window.removeEventListener('keydown', keydown); document.removeEventListener('fullscreenchange', fullscreenChange); };
    }, [attempt]);

    const start = async () => {
        if (!window.confirm(`Are you ready to start "${selectedTest?.title || 'this test'}"? The timer starts immediately and copy/paste shortcuts are disabled.`)) return;
        try {
            const [questionResponse, attemptResponse] = await Promise.all([api.get(`/tests/${selectedTest.id}/questions`), api.post(`/tests/${selectedTest.id}/attempts`)]);
            const nextAttempt = attemptResponse.data.attempt;
            if (nextAttempt.status && nextAttempt.status !== 'in_progress') { setError(`This test was already submitted. Score: ${nextAttempt.score ?? 0}`); return; }
            setQuestions(questionResponse.data.questions || []); setAttempt(nextAttempt); setInstructions(null); setAnswers({}); setQuestionIndex(0); setSeconds(Number(nextAttempt.durationMinutes || selectedTest.durationMinutes) * 60); submitting.current = false;
        } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to start this test.'); }
    };

    const submit = async () => {
        if (!attempt || submitting.current) return;
        submitting.current = true;
        try { const { data } = await api.post(`/test-attempts/${attempt.id}/submit`, { answers }); setResult(data); setAttempt(null); setWarning(''); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to submit test.'); submitting.current = false; }
    };

    const groups = tests.reduce((all, test) => { const subject = test.subjectName || 'Other subjects'; all[subject] = [...(all[subject] || []), test]; return all; }, {});
    const current = questions[questionIndex];
    const unanswered = questions.filter((question) => answers[question.id] === undefined).length;

    if (result) return <Results test={selectedTest} result={result} questions={questions} onBack={() => { setResult(null); setSelectedTest(null); }} />;

    if (!attempt) return (
        <div className="min-h-screen bg-[#f4f5f3] px-3 py-4 text-slate-800 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <button onClick={onBack} className="mb-4 flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={16} /> Dashboard</button>
                <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3d9f4] text-xl text-[#d32f8d] shadow-inner">☑</div>
                        <h1 className="font-display text-3xl font-black tracking-tight text-slate-800">End of term quiz</h1>
                    </div>

                    {error && <Notice>{error}</Notice>}

                    {Object.entries(groups).map(([subject, subjectTests]) => (
                        <section key={subject} className="mb-6 space-y-3">
                            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-800">
                                <FileCheck2 size={18} className="text-cyan-700" />
                                {subject}
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {subjectTests.map((test) => (
                                    <article key={test.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                                        <h3 className="font-display text-lg font-bold text-slate-800">{test.title}</h3>
                                        <p className="mt-2 text-sm text-slate-500">{test.className} · {test.durationMinutes} minutes · {test.startsAt || test.createdAt ? new Date(test.startsAt || test.createdAt).toLocaleString() : 'Date not set'}</p>
                                        <button
                                            onClick={() => { setSelectedTest(test); setInstructions(test); }}
                                            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2 text-xs font-bold text-cyan-700"
                                        >
                                            <Eye size={15} /> View uploaded test
                                        </button>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}

                    {instructions && <Instructions test={instructions} onCancel={() => setInstructions(null)} onStart={start} />}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f4f5f3] px-3 py-4 text-slate-800 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <div className="mb-4 flex items-center justify-between">
                    <button onClick={() => setAttempt(null)} className="inline-flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={15} /> Back</button>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{selectedTest?.title || 'Test'}</span>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
                        <div className="mb-5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3d9f4] text-xl text-[#d32f8d]">☑</div>
                                <h1 className="font-display text-3xl font-black tracking-tight text-slate-800">{selectedTest?.title || 'Assessment'}</h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="rounded-md border border-[#ff7a7a] bg-white px-3 py-2 text-sm font-bold text-[#d63030]">
                                    <span className="mr-2">Time left</span>
                                    <span>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
                                </div>
                                <button className="rounded-md bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Hide</button>
                            </div>
                        </div>

                        {warning && <SecurityWarning message={warning} onCancel={() => setWarning('')} onConfirm={submit} />}

                        {current && (
                            <div className="rounded-[24px] border border-slate-200 bg-[#dbeef3] p-4 sm:p-6">
                                <div className="mb-5 flex items-center justify-between gap-3">
                                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                                        Question {questionIndex + 1}
                                    </div>
                                    <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Not yet answered</div>
                                </div>

                                <div className="flex flex-col gap-5 lg:flex-row">
                                    <div className="w-full min-w-0 flex-1">
                                        <h2 className="text-xl font-bold leading-relaxed text-slate-800">{current.prompt}</h2>
                                        <div className="mt-5">
                                            <QuestionAnswer question={current} value={answers[current.id]} onChange={(value) => setAnswers((all) => ({ ...all, [current.id]: value }))} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-between gap-3">
                            <button disabled={questionIndex === 0} onClick={() => setQuestionIndex((value) => value - 1)} className="rounded-xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-40">
                                Previous page
                            </button>
                            {questionIndex < questions.length - 1 ? (
                                <button onClick={() => setQuestionIndex((value) => value + 1)} className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-bold text-white">
                                    Next page <ArrowRight size={15} className="ml-2 inline" />
                                </button>
                            ) : (
                                <button onClick={submit} className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-bold text-white">Submit test</button>
                            )}
                        </div>
                    </div>

                    <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800">Quiz navigation</h3>
                            <button className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">Hide</button>
                        </div>
                        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 xl:grid-cols-4">
                            {questions.map((question, index) => (
                                <button
                                    key={question.id}
                                    onClick={() => setQuestionIndex(index)}
                                    className={`grid h-12 place-items-center rounded-lg border text-sm font-bold ${index === questionIndex ? 'border-cyan-700 bg-cyan-50 text-cyan-700' : 'border-slate-300 bg-white text-slate-700'}`}
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                        <div className="mt-5 text-sm text-slate-500">Finish attempt ...</div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

function Instructions({ test, onCancel, onStart }) { return <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><h2 className="font-display text-lg font-bold">Test instructions</h2><p className="mt-2 text-sm text-slate-600">{test.description || 'Read each question carefully. The timer starts when you start the test.'}</p><p className="mt-3 text-xs text-slate-700">Duration: {test.durationMinutes} minutes · Fullscreen required</p><div className="mt-5 flex gap-2"><button onClick={onCancel} className="rounded-xl border bg-white px-4 py-2 text-xs font-bold">Cancel</button><button onClick={onStart} className="rounded-xl bg-cyan-700 px-4 py-2 text-xs font-bold text-white">Start test</button></div></div>; }
function QuestionAnswer({ question, value, onChange }) { const options = Array.isArray(question.options) ? question.options : []; if (question.questionType === 'choice') return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">{options.map((option) => <label key={String(option)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-base text-slate-700"><input type="radio" className="h-4 w-4 accent-cyan-700" checked={value === option} onChange={() => onChange(option)} />{option}</label>)}</div>; if (['fill', 'open'].includes(question.questionType)) return <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder="Type your answer" className="min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />; if (question.questionType === 'match') return <MatchAnswer question={question} value={value} onChange={onChange} />; if (question.questionType === 'drag') return <DragAnswer question={question} value={value} onChange={onChange} />; const items = Array.isArray(value) && value.length ? value : options; return <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5">{items.map((item, itemIndex) => <div key={`${item}-${itemIndex}`} draggable onDragStart={(event) => event.dataTransfer.setData('index', String(itemIndex))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData('index')); const next = [...items]; const [moved] = next.splice(from, 1); next.splice(itemIndex, 0, moved); onChange(next); }} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><GripVertical size={16} className="text-slate-400" />{item}<span className="ml-auto text-xs font-bold text-slate-500">{itemIndex + 1}</span></div>)}</div>; }

function DragAnswer({ question, value, onChange }) { const config = question.options && !Array.isArray(question.options) ? question.options : {}; const groups = Array.isArray(config.groups) ? config.groups : Object.keys(config); const items = Array.isArray(config.items) ? config.items : []; const selected = value && typeof value === 'object' ? value : {}; const move = (item, group) => { const next = Object.fromEntries(groups.map((key) => [key, (selected[key] || []).filter((entry) => entry !== item)])); if (group) next[group] = [...(next[group] || []), item]; onChange(next); }; return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold text-slate-500">Place each item in the correct group.</p>{items.map((item) => <label key={item} className="flex items-center gap-3 text-sm"><span className="flex-1 rounded-lg bg-slate-50 p-2">{item}</span><select value={groups.find((group) => (selected[group] || []).includes(item)) || ''} onChange={(event) => move(item, event.target.value)} className="rounded-lg border border-slate-200 p-2"><option value="">Choose group</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>)}</div>; }
function MatchAnswer({ question, value, onChange }) { const config = question.options && !Array.isArray(question.options) ? question.options : {}; const left = config.leftItems || question.options?.left || []; const right = config.rightItems || question.options?.right || []; const selected = Array.isArray(value) ? value : []; return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold text-slate-500">Match each item with the correct answer.</p>{left.map((item, index) => <div key={String(item)} className="flex items-center gap-3 text-sm text-slate-700"><span className="flex-1 rounded-xl bg-slate-50 p-3">{item}</span><select value={selected[index] || ''} onChange={(event) => { const next = [...selected]; next[index] = event.target.value; onChange(next); }} className="flex-1 rounded-xl border border-slate-200 p-3"><option value="">Select match</option>{right.map((option) => <option key={String(option)} value={option}>{option}</option>)}</select></div>)}</div>; }
function SecurityWarning({ message, onCancel, onConfirm }) { return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="flex gap-2 text-sm font-bold text-amber-900"><ShieldAlert size={17} /> Security warning</p><p className="mt-2 text-xs text-amber-800">{message} This action was reported to your teacher.</p><div className="mt-3 flex gap-2"><button onClick={onCancel} className="rounded-xl border bg-white px-4 py-2 text-xs font-bold">Cancel</button><button onClick={onConfirm} className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white">Submit</button></div></div>; }
function Notice({ children }) { return <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{children}</div>; }
function gradeFromPercentage(percentage) { if (percentage >= 80) return 'A'; if (percentage >= 70) return 'B'; if (percentage >= 60) return 'C'; if (percentage >= 50) return 'D'; return 'F'; }
function Results({ test, result, questions, onBack }) { const percentage = Number(result.percentage ?? 0); return <div className="mx-auto max-w-3xl space-y-5"><button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={16} /> Available tests</button><section className="rounded-3xl bg-[#17333d] p-6 text-white"><p className="text-xs text-teal-200">{test?.title}</p><div className="mt-2 flex items-end gap-4"><h1 className="font-display text-3xl font-bold">{percentage}%</h1><span className="rounded-lg bg-white/15 px-3 py-2 text-xl font-black">Grade {gradeFromPercentage(percentage)}</span></div><p className="mt-2 text-sm text-teal-200">{result.score} / {result.maxScore ?? 0} points</p></section>{(result.breakdown || []).map((item, index) => <article key={item.questionId} className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold text-slate-500">Question {index + 1}</p><p className="mt-1 text-sm">{questions.find((question) => String(question.id) === String(item.questionId))?.prompt || item.prompt}</p><p className={`mt-2 text-sm font-bold ${item.correct ? 'text-emerald-700' : 'text-rose-700'}`}>{item.correct ? 'Correct' : 'Incorrect'} · Your answer: {formatResultAnswer(item.actual)}</p>{item.expected !== undefined && <p className="mt-1 text-sm font-semibold text-cyan-800">Correct answer: {formatResultAnswer(item.expected)}</p>}<p className="mt-1 text-sm text-slate-500">Points: {item.correct ? item.points : 0} / {item.points}</p></article>)}</div>; }
function formatResultAnswer(answer) { if (Array.isArray(answer)) return answer.join(' → '); if (answer && typeof answer === 'object') return Object.entries(answer).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' · '); return String(answer ?? 'Not available'); }
