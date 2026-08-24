/**
 * Test Monitoring & Results Components
 * Provides views for teachers to:
 * 1. Monitor students currently taking tests
 * 2. View final scores and analytics
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, Users, CheckCircle2, Clock3, Loader, AlertCircle } from 'lucide-react';
import api from '../lib/api';

/**
 * TestProgressMonitor Component
 * Shows real-time progress of students taking the test
 */
export function TestProgressMonitor({ test, onBack, t }) {
    const [progress, setProgress] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        loadProgress();

        // Auto-refresh every 5 seconds if test is in progress
        let interval;
        if (autoRefresh) {
            interval = setInterval(loadProgress, 5000);
        }

        return () => clearInterval(interval);
    }, [test.id, autoRefresh]);

    const loadProgress = async () => {
        try {
            const { data } = await api.get(`/teacher/tests/${test.id}/progress`);
            setStats(data.stats);
            setProgress(data.progress || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to load progress.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'submitted':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'in_progress':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'expired':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'submitted':
                return '✓ Submitted';
            case 'in_progress':
                return '⏳ In Progress';
            case 'expired':
                return '⏱ Expired';
            default:
                return status;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                    title="Back"
                >
                    <ArrowLeft size={18} className="text-cyan-700" />
                </button>
                <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">{test.title}</h2>
                    <p className="text-sm text-slate-600">Real-time progress monitoring</p>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex gap-3 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">{error}</p>
                        <button
                            onClick={loadProgress}
                            className="mt-2 text-xs font-bold underline hover:no-underline"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard
                        label="Total Students"
                        value={stats.total}
                        icon={Users}
                        color="cyan"
                    />
                    <StatCard
                        label="Completed"
                        value={stats.completed}
                        icon={CheckCircle2}
                        color="emerald"
                    />
                    <StatCard
                        label="In Progress"
                        value={stats.inProgress}
                        icon={Clock3}
                        color="blue"
                    />
                    <StatCard
                        label="Expired"
                        value={stats.expired}
                        icon={Clock3}
                        color="amber"
                    />
                </div>
            )}

            {/* Auto-Refresh Toggle */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">
                        Auto-refresh every 5 seconds
                    </span>
                </label>
                <button
                    onClick={loadProgress}
                    className="ml-auto px-3 py-1 text-xs font-bold text-cyan-700 hover:bg-cyan-50 rounded"
                >
                    Refresh now
                </button>
            </div>

            {/* Progress List */}
            <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">Student Progress</h3>

                {loading && !progress ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
                        <Loader size={18} className="animate-spin" />
                        <span>Loading progress...</span>
                    </div>
                ) : progress && progress.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">
                        <p>No students have started this test yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {progress.map((p) => (
                            <div
                                key={p.attemptId}
                                className={`p-4 rounded-lg border ${getStatusColor(p.status)}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">{p.studentName}</p>
                                        <p className="text-xs mt-1">Admission: {p.admissionNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold px-2 py-1 bg-white rounded">
                                            {getStatusBadge(p.status)}
                                        </p>
                                        {p.score !== null && (
                                            <p className="text-sm font-bold mt-2">{p.score} pts</p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs mt-2 space-y-1">
                                    <p>Started: {new Date(p.startedAt).toLocaleString()}</p>
                                    {p.submittedAt && (
                                        <p>Submitted: {new Date(p.submittedAt).toLocaleString()}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * TestResultsPage Component
 * Shows detailed results and analytics after test completion
 */
export function TestResultsPage({ test, onBack, t }) {
    const [results, setResults] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('score'); // score, name, date

    useEffect(() => {
        loadResults();
    }, [test.id]);

    const loadResults = async () => {
        try {
            const { data } = await api.get(`/teacher/tests/${test.id}/results`);
            setStats(data.statistics);
            setResults(data.results || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to load results.');
        } finally {
            setLoading(false);
        }
    };

    const getSortedResults = () => {
        if (!results) return [];

        const sorted = [...results];
        switch (sortBy) {
            case 'name':
                return sorted.sort((a, b) =>
                    a.studentName.localeCompare(b.studentName)
                );
            case 'date':
                return sorted.sort((a, b) =>
                    new Date(b.submittedAt) - new Date(a.submittedAt)
                );
            case 'score':
            default:
                return sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
        }
    };

    const getScorePercentage = (score, maxScore = 100) => {
        return Math.round((score / maxScore) * 100);
    };

    const getScoreColor = (percentage) => {
        if (percentage >= 80) return 'bg-emerald-100 text-emerald-900';
        if (percentage >= 60) return 'bg-blue-100 text-blue-900';
        if (percentage >= 40) return 'bg-amber-100 text-amber-900';
        return 'bg-rose-100 text-rose-900';
    };

    const sortedResults = getSortedResults();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                    title="Back"
                >
                    <ArrowLeft size={18} className="text-cyan-700" />
                </button>
                <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">{test.title}</h2>
                    <p className="text-sm text-slate-600">Test Results & Analytics</p>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex gap-3 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">{error}</p>
                        <button
                            onClick={loadResults}
                            className="mt-2 text-xs font-bold underline hover:no-underline"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Statistics Summary */}
            {stats && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatBox
                        label="Average Score"
                        value={`${stats.averageScore}%`}
                        color="blue"
                    />
                    <StatBox
                        label="Highest Score"
                        value={`${stats.highestScore}%`}
                        color="emerald"
                    />
                    <StatBox
                        label="Lowest Score"
                        value={`${stats.lowestScore}%`}
                        color="amber"
                    />
                </div>
            )}

            {/* Score Distribution Chart (Optional) */}
            {stats && results && (
                <div className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Score Distribution</h3>
                    <ScoreDistributionChart results={results} />
                </div>
            )}

            {/* Sort Options */}
            <div className="flex gap-2">
                <label className="text-xs font-bold text-slate-600 self-center">Sort by:</label>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-cyan-600 outline-none"
                >
                    <option value="score">Highest Score</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="date">Most Recent</option>
                </select>
            </div>

            {/* Results Table */}
            <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">Student Results</h3>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
                        <Loader size={18} className="animate-spin" />
                        <span>Loading results...</span>
                    </div>
                ) : sortedResults.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">
                        <p>No submissions yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {sortedResults.map((result, idx) => {
                            const percentage = result.score !== null
                                ? getScorePercentage(result.score, 100)
                                : 0;

                            return (
                                <div
                                    key={result.studentId}
                                    className="p-4 border border-slate-200 rounded-lg hover:border-cyan-400 hover:bg-slate-50 transition"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-slate-900">{result.studentName}</p>
                                            <p className="text-xs text-slate-600 mt-0.5">
                                                {result.admissionNumber}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {result.status === 'submitted' && result.score !== null ? (
                                                <>
                                                    <div className="text-right">
                                                        <p className={`text-xs font-bold px-2 py-1 rounded ${getScoreColor(percentage)}`}>
                                                            {percentage}%
                                                        </p>
                                                        <p className="text-xs text-slate-600 mt-1">
                                                            {result.score} / 100
                                                        </p>
                                                    </div>
                                                    <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-100 to-cyan-50 border border-cyan-200">
                                                        <div
                                                            className="flex items-center justify-center text-xs font-bold text-cyan-700"
                                                        >
                                                            {percentage}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-right">
                                                    <p className="text-xs font-bold px-2 py-1 rounded bg-slate-200 text-slate-700">
                                                        {result.status === 'expired' ? 'Expired' : 'No Score'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-600 mt-2 flex gap-4">
                                        <span>Submitted: {new Date(result.submittedAt).toLocaleString()}</span>
                                        {result.durationTaken && (
                                            <span>Duration: {result.durationTaken} min</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * StatCard Component
 * Small card showing a statistic
 */
function StatCard({ label, value, icon: Icon, color }) {
    const colorClasses = {
        cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200'
    };

    return (
        <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon size={16} />
                <p className="text-xs font-bold">{label}</p>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}

/**
 * StatBox Component
 * Larger stat display
 */
function StatBox({ label, value, color }) {
    const colorClasses = {
        cyan: 'bg-cyan-50 border-cyan-200 text-cyan-900',
        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        blue: 'bg-blue-50 border-blue-200 text-blue-900',
        amber: 'bg-amber-50 border-amber-200 text-amber-900'
    };

    return (
        <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
            <p className="text-xs font-bold mb-2">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    );
}

/**
 * ScoreDistributionChart Component
 * Simple bar chart showing score distribution
 */
function ScoreDistributionChart({ results }) {
    // Group scores into ranges
    const ranges = [
        { min: 80, max: 100, label: '80-100%', count: 0 },
        { min: 60, max: 79, label: '60-79%', count: 0 },
        { min: 40, max: 59, label: '40-59%', count: 0 },
        { min: 0, max: 39, label: '0-39%', count: 0 }
    ];

    results.forEach((r) => {
        if (r.score === null) return;
        const percentage = Math.round((r.score / 100) * 100);

        for (let range of ranges) {
            if (percentage >= range.min && percentage <= range.max) {
                range.count++;
                break;
            }
        }
    });

    const maxCount = Math.max(...ranges.map((r) => r.count), 1);

    return (
        <div className="space-y-2">
            {ranges.map((range) => (
                <div key={range.label} className="flex items-center gap-2">
                    <div className="w-12 text-xs font-bold text-slate-600">{range.label}</div>
                    <div className="flex-1 h-6 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all rounded-full"
                            style={{
                                width: maxCount > 0 ? `${(range.count / maxCount) * 100}%` : '0%'
                            }}
                        />
                    </div>
                    <div className="w-8 text-right text-xs font-bold text-slate-700">
                        {range.count}
                    </div>
                </div>
            ))}
        </div>
    );
}
