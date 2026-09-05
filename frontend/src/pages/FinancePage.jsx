import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Building2, FileText, Landmark, Plus, Printer, RefreshCw, TrendingDown, TrendingUp, Users, WalletCards } from 'lucide-react';
import DataTable from '../components/DataTable';
import api from '../lib/api';

const managerRoles = ['admin', 'dos', 'accountant'];
const money = (value) => `${Number(value || 0).toLocaleString()} RWF`;

export default function FinancePage({ user, t, onBack, initialTab = 'payments', workspaceName = 'Finance' }) {
    const canManage = managerRoles.includes(user?.role);
    const workspaceTitle = workspaceName === 'Transport' ? 'Transport workspace' : 'School fees dashboard';
    const workspaceDescription = workspaceName === 'Transport' ? 'Manage transport plans, records and supporting documents.' : 'Track school fees, payments, invoices and balances across the academy.';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [payments, setPayments] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showFeeSettings, setShowFeeSettings] = useState(false);
    const [feeSettings, setFeeSettings] = useState({});
    const [selectedClass, setSelectedClass] = useState('');
    const [feeForm, setFeeForm] = useState({ className: '', amount: '', academicYear: '2025/2026' });
    const [selectedAction, setSelectedAction] = useState(null);

    const load = async () => {
        setLoading(true);
        setError('');
        const requests = [api.get('/finance/invoices'), api.get('/finance/payments')];
        if (canManage) requests.push(api.get('/finance/expenses'), api.get('/finance/budgets'));
        try {
            const responses = await Promise.all(requests);
            setInvoices(responses[0].data.invoices || []);
            setPayments(responses[1].data.payments || []);
            if (canManage) {
                setExpenses(responses[2].data.expenses || []);
                setBudgets(responses[3].data.budgets || []);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Unable to load finance records.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        if (canManage) {
            api.get('/students').then(({ data }) => {
                const nextStudents = data.students || [];
                setStudents(nextStudents);
                const classes = [...new Set(nextStudents.map((student) => student.className || 'Unassigned').filter(Boolean))];
                setFeeSettings((current) => {
                    const next = { ...current };
                    classes.forEach((className) => {
                        if (!(className in next)) next[className] = 150000;
                    });
                    return next;
                });
            }).catch(() => { });
        }
    }, [user?.role, canManage]);

    const classes = useMemo(() => {
        const values = [...new Set(students.map((student) => student.className || 'Unassigned').filter(Boolean))];
        return values.sort();
    }, [students]);

    const classSummaries = useMemo(() => {
        return classes.map((className) => {
            const classStudents = students.filter((student) => (student.className || 'Unassigned') === className);
            const totalStudents = classStudents.length;
            const expectedFees = Number(feeSettings[className] || 0) * totalStudents;
            const studentIds = new Set(classStudents.map((student) => student.id));
            const classInvoices = invoices.filter((invoice) => studentIds.has(invoice.studentId));
            const classPayments = payments.filter((payment) => studentIds.has(payment.studentId));
            const totalInvoiced = classInvoices.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const totalPaid = classPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const outstanding = Math.max(expectedFees - totalPaid, 0);
            const futureUse = classStudents.reduce((sum, student) => {
                const feeAmount = Number(feeSettings[student.className || className] || 0);
                const paidAmount = classPayments.filter((payment) => payment.studentId === student.id).reduce((paid, item) => paid + Number(item.amount || 0), 0);
                return sum + Math.max(paidAmount - feeAmount, 0);
            }, 0);

            return {
                className,
                totalStudents,
                expectedFees,
                totalInvoiced,
                totalPaid,
                outstanding,
                futureUse,
                students: classStudents,
            };
        });
    }, [classes, students, feeSettings, invoices, payments]);

    const totals = useMemo(() => {
        const schoolFees = classSummaries.reduce((sum, item) => sum + Number(item.expectedFees || 0), 0);
        const invoiced = classSummaries.reduce((sum, item) => sum + Number(item.totalInvoiced || 0), 0);
        const paid = classSummaries.reduce((sum, item) => sum + Number(item.totalPaid || 0), 0);
        const outstanding = classSummaries.reduce((sum, item) => sum + Number(item.outstanding || 0), 0);
        const futureUse = classSummaries.reduce((sum, item) => sum + Number(item.futureUse || 0), 0);
        const expensesTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const budgetTotal = budgets.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        return { schoolFees, invoiced, paid, outstanding, futureUse, expenses: expensesTotal, budgetTotal };
    }, [classSummaries, expenses]);

    const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const handleSaveFee = (event) => {
        event.preventDefault();
        const className = feeForm.className.trim();
        const amount = Number(feeForm.amount);
        if (!className || !Number.isFinite(amount) || amount <= 0) return;
        setFeeSettings((current) => ({ ...current, [className]: amount }));
        setFeeForm({ className: '', amount: '', academicYear: feeForm.academicYear });
        setShowFeeSettings(false);
    };

    const table = activeTab === 'payments'
        ? { title: 'Payment history', columns: [{ key: 'studentName', label: 'Student' }, { key: 'amount', label: 'Amount' }, { key: 'reference', label: 'Reference' }, { key: 'paidAt', label: 'Date' }], rows: payments }
        : activeTab === 'invoices'
            ? { title: 'Invoices and balances', columns: [{ key: 'invoiceNumber', label: 'Invoice' }, { key: 'studentName', label: 'Student' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount' }, { key: 'dueDate', label: 'Due date' }, { key: 'status', label: 'Status' }], rows: invoices }
            : activeTab === 'expenses'
                ? { title: 'Expenses', columns: [{ key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount' }, { key: 'spentAt', label: 'Date' }], rows: expenses }
                : { title: 'Budgets', columns: [{ key: 'name', label: 'Budget' }, { key: 'fiscalYear', label: 'Fiscal year' }, { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' }], rows: budgets };

    if (selectedClass) {
        const selectedSummary = classSummaries.find((item) => item.className === selectedClass) || classSummaries[0];
        const selectedStudents = selectedSummary?.students || [];

        return (
            <div className="space-y-6">
                <button onClick={() => setSelectedClass('')} className="flex items-center gap-2 text-xs font-bold text-cyan-700 hover:text-cyan-900"><ArrowLeft size={16} /> Back to finance</button>

                <section className="rounded-3xl bg-gradient-to-r from-[#17333d] to-[#0f6a8a] p-6 text-white shadow-xl">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="rounded-2xl bg-white/10 p-3">
                                <Building2 size={28} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100">Academic Year</p>
                                <h1 className="mt-1 font-display text-2xl font-bold">{feeForm.academicYear || '2025/2026'}</h1>
                            </div>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100">Class</div>
                            <div className="mt-1 text-lg font-bold">{selectedSummary?.className}</div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-4">
                    <InfoCard title="Fees" amount={money(selectedSummary?.expectedFees || 0)} tone="blue" icon={<WalletCards size={18} />} />
                    <InfoCard title="Pay" amount={money(selectedSummary?.totalPaid || 0)} tone="emerald" icon={<TrendingUp size={18} />} />
                    <InfoCard title="Unpay" amount={money(Math.max((selectedSummary?.expectedFees || 0) - (selectedSummary?.totalPaid || 0), 0))} tone="rose" icon={<TrendingDown size={18} />} />
                    <InfoCard title="Future use" amount={money(selectedSummary?.futureUse || 0)} tone="amber" icon={<Landmark size={18} />} />
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 bg-[#0f6a8a] px-5 py-3 text-sm font-bold text-white"><span>{selectedSummary?.className} · student fee records</span><button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[10px] font-bold hover:bg-white/20"><Printer size={14} /> Print report</button></div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                            <thead className="bg-blue-50 text-[10px] uppercase tracking-[0.2em] text-blue-700">
                                <tr>
                                    <th className="px-5 py-4 font-bold">Student</th>
                                    <th className="px-5 py-4 font-bold">Fees</th>
                                    <th className="px-5 py-4 font-bold">Pay</th>
                                    <th className="px-5 py-4 font-bold">Unpay</th>
                                    <th className="px-5 py-4 font-bold">Other term</th>
                                    <th className="px-5 py-4 font-bold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {selectedStudents.length ? selectedStudents.map((student) => {
                                    const feeAmount = Number(feeSettings[student.className || selectedSummary?.className] || 0);
                                    const paidAmount = payments.filter((payment) => payment.studentId === student.id).reduce((sum, item) => sum + Number(item.amount || 0), 0);
                                    const invoiceAmount = invoices.filter((invoice) => invoice.studentId === student.id).reduce((sum, item) => sum + Number(item.amount || 0), 0);
                                    const unpaid = Math.max(feeAmount - paidAmount, 0);
                                    const otherTerm = Math.max(paidAmount - feeAmount, 0);
                                    const status = paidAmount >= feeAmount ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid';
                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50">
                                            <td className="px-5 py-4 text-slate-700">{student.fullName || student.name || 'Student'}</td>
                                            <td className="px-5 py-4 text-slate-700">{money(feeAmount)}</td>
                                            <td className="px-5 py-4 text-emerald-700">{money(paidAmount)}</td>
                                            <td className="px-5 py-4 text-rose-700">{money(unpaid || Math.max(invoiceAmount - paidAmount, 0))}</td>
                                            <td className="px-5 py-4 text-amber-700">{money(otherTerm)}</td>
                                            <td className="px-5 py-4">
                                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : status === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : <tr><td className="px-5 py-10 text-center text-slate-400" colSpan={6}>No students in this class.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="space-y-7">
            <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700 hover:text-cyan-900"><ArrowLeft size={16} />{t.overview}</button>

            <section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl shadow-cyan-950/10 sm:p-8">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                    <div className="flex items-center gap-4">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-cyan-100"><Landmark size={28} /></div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">{t.app}</p>
                            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{workspaceTitle}</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{workspaceDescription}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-cyan-50">
                            {feeForm.academicYear || '2025/2026'}
                        </div>
                        {canManage && (
                            <button onClick={() => setShowFeeSettings(true)} className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-cyan-800 hover:bg-cyan-50"><Plus size={15} /> Setting school fees</button>
                        )}
                        <div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-bold text-white hover:bg-white/10"><Printer size={15} /> Print page</button><button onClick={refresh} className="flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-bold text-white hover:bg-white/10"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button></div>
                    </div>
                </div>
            </section>

            {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">{error}</div>}

            {showFeeSettings && canManage && (
                <form onSubmit={handleSaveFee} className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="font-display text-lg font-bold text-slate-800">School fees setup</h2>
                            <p className="mt-1 text-xs text-slate-500">Set the amount each student should pay for a selected class.</p>
                        </div>
                        <button type="button" onClick={() => setShowFeeSettings(false)} className="text-xs font-bold text-slate-400">Close</button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <select value={feeForm.className} onChange={(event) => setFeeForm((current) => ({ ...current, className: event.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs">
                            <option value="">Select class</option>
                            {classes.map((className) => <option key={className} value={className}>{className}</option>)}
                        </select>
                        <input value={feeForm.amount} onChange={(event) => setFeeForm((current) => ({ ...current, amount: event.target.value }))} type="number" placeholder="Amount per student" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" />
                        <input value={feeForm.academicYear} onChange={(event) => setFeeForm((current) => ({ ...current, academicYear: event.target.value }))} placeholder="Academic year" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" />
                        <button type="submit" className="rounded-xl bg-[#1d7b91] px-4 py-3 text-xs font-bold text-white">Save amount</button>
                    </div>
                </form>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard title="Predictable fees" value={money(totals.schoolFees)} tone="blue" note="Expected school fees" icon={<WalletCards size={18} />} action={() => setSelectedClass(classes[0] || '')} />
                <SummaryCard title="Payments received" value={money(totals.paid)} tone="emerald" note="Fees recorded" icon={<TrendingUp size={18} />} action={() => setActiveTab('payments')} />
                <SummaryCard title="Total invoiced" value={money(totals.invoiced)} tone="amber" note="School invoice value" icon={<FileText size={18} />} action={() => setActiveTab('invoices')} />
                <SummaryCard title="Outstanding" value={money(totals.outstanding)} tone="rose" note="Unpaid balance" icon={<TrendingDown size={18} />} action={() => setSelectedClass(classes[0] || '')} />
                <SummaryCard title="Future use" value={money(totals.futureUse)} tone="blue" note="Overpayments carried to another term" icon={<WalletCards size={18} />} action={() => setSelectedClass(classes[0] || '')} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-2"><BarChart3 size={18} className="text-cyan-700" /><h2 className="font-display text-base font-bold text-slate-800">Class fee collection</h2></div>
                    <div className="space-y-4">
                        {classSummaries.map((item) => {
                            const percent = item.expectedFees ? Math.min((item.totalPaid / item.expectedFees) * 100, 100) : 0;
                            return (
                                <div key={item.className}>
                                    <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                                        <button onClick={() => setSelectedClass(item.className)} className="font-bold text-cyan-700 hover:text-cyan-900">{item.className}</button>
                                        <span>{money(item.totalPaid)} / {money(item.expectedFees)}</span>
                                    </div>
                                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                        <div className={`h-full rounded-full ${percent >= 75 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.max(percent, 6)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center gap-2"><Users size={18} className="text-cyan-700" /><h2 className="font-display text-base font-bold text-slate-800">By class</h2></div>
                    <div className="space-y-3">
                        {classSummaries.map((item) => (
                            <button key={item.className} onClick={() => setSelectedClass(item.className)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-cyan-200 hover:bg-cyan-50">
                                <span className="text-xs font-bold text-slate-700">{item.className}</span>
                                <span className="text-[10px] font-bold text-cyan-700">View</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                {['payments', 'invoices', ...(canManage ? ['expenses', 'budgets'] : [])].map((tab) => (
                    <button key={tab} onClick={() => { setActiveTab(tab); setShowForm(false); }} className={`rounded-xl px-4 py-2.5 text-xs font-bold capitalize ${activeTab === tab ? 'bg-cyan-50 text-cyan-800' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {tab}
                    </button>
                ))}
                {canManage && <button onClick={() => setShowForm(true)} className="ml-auto flex items-center gap-2 rounded-xl bg-[#1d7b91] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#155f70]"><Plus size={15} /> Add record</button>}
            </section>

            {showForm && canManage && <FinanceForm type={activeTab === 'expenses' ? 'expense' : activeTab === 'invoices' ? 'invoice' : activeTab === 'budgets' ? 'budget' : 'payment'} students={students} classes={classes} budgets={budgets} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-2"><BarChart3 size={18} className="text-cyan-700" /><h2 className="font-display text-base font-bold text-slate-800">{activeTab === 'payments' ? 'Payment history' : activeTab === 'invoices' ? 'Invoices and balances' : activeTab === 'expenses' ? 'Expenses' : 'Budgets'}</h2></div>
                {loading ? <div className="p-12 text-center text-xs text-slate-400">{t.loading}</div> : <DataTable columns={[...table.columns, ...(activeTab === 'budgets' || activeTab === 'expenses' ? [{ key: 'action', label: 'Action', render: (row) => <button onClick={() => setSelectedAction({ type: activeTab, row })} className="font-bold text-cyan-700 hover:text-cyan-900">View action</button> }] : [])]} rows={table.rows} emptyLabel={t.noData} />}
                {activeTab === 'expenses' && !loading && <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2"><div className="rounded-xl bg-rose-50 px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-600">Total expense</p><p className="mt-2 text-xl font-black text-rose-800">{money(totals.expenses)}</p></div><div className="rounded-xl bg-blue-50 px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Total budget</p><p className="mt-2 text-xl font-black text-blue-800">{money(totals.budgetTotal)}</p></div></div>}
            </section>
            {selectedAction && <FinanceActionView type={selectedAction.type} row={selectedAction.row} onClose={() => setSelectedAction(null)} />}
        </div>
    );
}

function SummaryCard({ title, value, tone, note, icon, action }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700',
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone] || colors.blue}`}>
                    {icon}
                </div>
                <button onClick={action} className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">View more</button>
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
            <p className="mt-2 text-2xl font-black text-slate-800">{value}</p>
            <p className="mt-2 text-[11px] text-slate-500">{note}</p>
        </div>
    );
}

function InfoCard({ title, amount, tone, icon }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700',
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone] || colors.blue}`}>{icon}</div>
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-slate-400">{title}</p>
            <p className="mt-2 text-xl font-black text-slate-800">{amount}</p>
        </div>
    );
}

function FinanceActionView({ type, row, onClose }) {
    const media = [
        ['Photo', row.photoUrl, 'image'],
        ['Document', row.documentUrl, 'document'],
        ['Video', row.videoUrl, 'video'],
    ].filter(([, url]) => url);

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
            <article className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700">{type} action</p><h2 className="mt-1 font-display text-xl font-bold text-slate-800">{row.name || row.category || 'Finance record'}</h2></div>
                    <div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white"><Printer size={14} /> Print</button><button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500">Close</button></div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3"><InfoCard title="Amount" amount={money(row.amount)} tone="blue" icon={<WalletCards size={18} />} /><InfoCard title="Period" amount={row.fiscalYear || row.spentAt || '-'} tone="amber" icon={<FileText size={18} />} /><InfoCard title="Status" amount={row.budgetStatus || row.status || '-'} tone="emerald" icon={<TrendingUp size={18} />} /></div>
                <p className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{row.description || 'No description added.'}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {media.length ? media.map(([label, url, mediaType]) => <div key={label} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><div className="border-b border-slate-200 px-4 py-3 text-xs font-bold text-slate-700">{label}</div><div className="p-3">{mediaType === 'image' ? <img src={url} alt={label} className="max-h-72 w-full rounded-lg object-contain" /> : mediaType === 'video' ? <video src={url} controls className="max-h-72 w-full rounded-lg" /> : <a href={url} target="_blank" rel="noreferrer" className="block rounded-lg bg-white p-5 text-sm font-bold text-cyan-700">Open document</a>}</div></div>) : <p className="text-xs text-slate-400">No uploaded evidence for this record.</p>}
                </div>
            </article>
        </div>
    );
}

function FinanceForm({ type, students, classes, budgets, onClose, onSaved }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const visibleStudents = students.filter((student) => (!selectedClass || (student.className || 'Unassigned') === selectedClass) && (!studentSearch.trim() || `${student.fullName || ''} ${student.admissionNumber || ''}`.toLowerCase().includes(studentSearch.toLowerCase())));
    const submit = async (event) => {
        event.preventDefault(); setSaving(true); setError('');
        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData);
        try {
            const payload = type === 'payment' ? { studentId: Number(data.studentId), amount: Number(data.amount), reference: data.reference } : type === 'invoice' ? { studentId: Number(data.studentId), amount: Number(data.amount), invoiceNumber: data.invoiceNumber, description: data.description, dueDate: data.dueDate } : type === 'budget' ? { name: data.name, amount: Number(data.amount), fiscalYear: data.fiscalYear, status: data.status } : { category: data.category, description: data.description, amount: Number(data.amount), spentAt: data.spentAt };
            if (type === 'budget' || type === 'expense') {
                await api.post(type === 'budget' ? '/finance/budgets/upload' : '/finance/expenses/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await api.post(type === 'payment' ? '/finance/payments' : '/finance/invoices', payload);
            }
            onSaved();
        } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to save finance record.'); } finally { setSaving(false); }
    };

    return (
        <form onSubmit={submit} className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-5">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-slate-800">Add {type}</h2>
                <button type="button" onClick={onClose} className="text-xs font-bold text-slate-400">Cancel</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {type !== 'expense' && (
                    type === 'budget' ? <input name="name" required placeholder="Activity or budget name" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" /> : <>
                        <select value={selectedClass} onChange={(event) => { setSelectedClass(event.target.value); setStudentSearch(''); }} required className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs">
                            <option value="">Select class first</option>
                            {classes.map((className) => <option key={className} value={className}>{className}</option>)}
                        </select>
                        <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search student" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" />
                        <select name="studentId" required disabled={!selectedClass} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs">
                            <option value="">Select student</option>
                            {visibleStudents.map((student) => <option key={student.id} value={student.id}>{student.fullName} · {student.admissionNumber || 'No admission no.'}</option>)}
                        </select>
                    </>
                )}
                {type === 'budget' && <input name="fiscalYear" required placeholder="Term or academic year" defaultValue="2025/2026" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" />}
                {type === 'invoice' && (
                    <>
                        <input name="invoiceNumber" required placeholder="Invoice number" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" />
                        <input name="dueDate" required type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" />
                    </>
                )}
                {type === 'expense' && <><select name="category" required className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs"><option value="">Select budget</option>{budgets.map((budget) => <option key={budget.id} value={budget.name}>{budget.name}</option>)}</select><select name="budgetStatus" required className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs"><option value="less">Less budget</option><option value="equal">Equal budget</option><option value="greater">Greater budget</option></select></>}
                <input name="amount" required type="number" min="1" placeholder="Amount (RWF)" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" />
                {type === 'payment' && <input name="reference" required placeholder="Payment reference" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" />}
                {type === 'expense' && <input name="spentAt" required type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" />}
                {type === 'budget' && <select name="status" defaultValue="draft" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs"><option value="draft">Draft</option><option value="approved">Approved</option></select>}
                {(type === 'budget' || type === 'expense') && <><input name="photo" type="file" accept="image/*" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" /><input name="document" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" /></>}
                {type === 'expense' && <input name="video" type="file" accept="video/*" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs sm:col-span-2" />}
                <textarea name="description" required placeholder={type === 'payment' ? 'Payment note' : 'Description'} className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs sm:col-span-2" />
            </div>
            {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
            <button disabled={saving} className="mt-4 rounded-xl bg-[#1d7b91] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">
                {saving ? 'Saving...' : 'Save record'}
            </button>
        </form>
    );
}
