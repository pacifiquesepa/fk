import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, CircleX, Clock3, FileText, Save, ShieldCheck, UploadCloud } from 'lucide-react';
import api from '../lib/api';

const roleLabelMap = {
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  librarian: 'Librarian',
  accountant: 'Accountant',
  admin: 'Admin',
  dos: 'DOS',
};

export default function PermissionPage({ user, t, onBack }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [children, setChildren] = useState([]);
  const [decisionRequest, setDecisionRequest] = useState(null);
  const [decisionForm, setDecisionForm] = useState({ status: 'approved', permissionStart: '', permissionEnd: '', decisionNote: '' });
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [form, setForm] = useState({
    title: '',
    reason: '',
    description: '',
    permissionStart: '',
    permissionEnd: '',
    studentId: '',
  });

  const isAdmin = ['admin', 'dos'].includes(user?.role);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get('/permission-requests');
        if (active) setRequests(data.requests || []);

        if (user?.role === 'parent') {
          const { data: summary } = await api.get('/parent/summary');
          if (active) setChildren(summary.children || []);
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.error || 'Unable to load permission requests.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [user]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('reason', form.reason);
      payload.append('description', form.description);
      if (form.permissionStart) payload.append('permissionStart', form.permissionStart);
      if (form.permissionEnd) payload.append('permissionEnd', form.permissionEnd);
      if (user?.role === 'parent' && form.studentId) payload.append('studentId', String(form.studentId));
      if (file) payload.append('attachment', file);

      const { data } = await api.post('/permission-requests', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage(data.message || 'Permission request submitted.');
      setForm({ title: '', reason: '', description: '', permissionStart: '', permissionEnd: '', studentId: '' });
      setFile(null);
      const { data: refreshed } = await api.get('/permission-requests');
      setRequests(refreshed.requests || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to submit permission request.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDecision = (request, status) => {
    setDecisionRequest(request);
    setDecisionForm({
      status,
      permissionStart: request.permissionStart ? String(request.permissionStart).slice(0, 10) : '',
      permissionEnd: request.permissionEnd ? String(request.permissionEnd).slice(0, 10) : '',
      decisionNote: request.decisionNote || '',
    });
    setError('');
  };

  const handleDecision = async (event) => {
    event.preventDefault();
    if (!decisionRequest) return;
    setDecisionSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/permission-requests/${decisionRequest.id}/decision`, {
        status: decisionForm.status,
        permissionStart: decisionForm.permissionStart,
        permissionEnd: decisionForm.permissionEnd,
        decisionNote: decisionForm.decisionNote,
      });
      setMessage(data.message || 'Decision saved.');
      const { data: refreshed } = await api.get('/permission-requests');
      setRequests(refreshed.requests || []);
      setDecisionRequest(null);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to process this decision.');
    } finally {
      setDecisionSaving(false);
    }
  };

  const departmentNames = ['teacher', 'dos', 'accountant', 'librarian', 'student', 'parent'];
  const departmentCounts = departmentNames.map((role) => ({ role, total: requests.filter((request) => request.requesterRole === role).length, approved: requests.filter((request) => request.requesterRole === role && request.status === 'approved').length, denied: requests.filter((request) => request.requesterRole === role && request.status === 'denied').length }));

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={16} />{t?.overview || 'Overview'}</button>

      <section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">Permission</p>
            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Permission request centre</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Submit a permission request, attach a letter if required, and let the admin approve, deny, and set the start and end dates.</p>
          </div>
          <ShieldCheck className="hidden text-teal-300 sm:block" size={28} />
        </div>
      </section>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}

      {isAdmin && <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {departmentCounts.map((item) => <button type="button" key={item.role} onClick={() => setSelectedDepartment(item.role)} className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${selectedDepartment === item.role ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white'}`}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{roleLabelMap[item.role]}</p><p className="mt-2 text-2xl font-black text-slate-800">{item.total}</p><p className="mt-1 text-[11px] text-emerald-700">{item.approved} allowed · {item.denied} denied</p></button>)}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><BarChart3 className="text-cyan-700" size={18} /><h2 className="font-display text-base font-bold text-slate-800">Permission requests by department</h2></div><button type="button" onClick={() => setSelectedDepartment('all')} className="text-xs font-bold text-cyan-700">Show all</button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departmentCounts.map((item) => <button type="button" key={item.role} onClick={() => setSelectedDepartment(item.role)} className={`text-left ${selectedDepartment !== 'all' && selectedDepartment !== item.role ? 'opacity-40' : ''}`}><div className="mb-1 flex justify-between text-xs font-bold text-slate-600"><span>{roleLabelMap[item.role]}</span><span>{item.total}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-600 transition-all" style={{ width: `${requests.length ? Math.max(6, (item.total / requests.length) * 100) : 0}%` }} /></div></button>)}
          </div>
        </div>
      </section>}

      {!isAdmin && (
        <form onSubmit={submitRequest} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <FileText className="text-cyan-700" size={18} />
            <h2 className="font-display text-xl font-bold text-slate-800">New permission request</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Title</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required placeholder="Example: Medical leave request" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
            </label>

            {user?.role === 'parent' && (
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Child</span>
                <select value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-600">
                  <option value="">Choose child</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>{child.fullName}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Permission start</span>
              <input type="date" value={form.permissionStart} onChange={(event) => setForm((current) => ({ ...current, permissionStart: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Permission end</span>
              <input type="date" value={form.permissionEnd} onChange={(event) => setForm((current) => ({ ...current, permissionEnd: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Reason</span>
              <input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} required placeholder="Brief reason for this permission" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Description</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add details, context, and any supporting notes here. You can use headings, bold text, lists, and rich text-style formatting when the editor supports it." className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-600" />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Upload letter</span>
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4">
                <UploadCloud className="text-cyan-700" size={18} />
                <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className="w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
              </div>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-[#1d7b91] px-5 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-70">
              <Save size={15} />{submitting ? 'Submitting...' : 'Permission request'}
            </button>
            <div className="text-xs text-slate-500">This request will be visible to admin and DOS in the system.</div>
          </div>
        </form>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Clock3 className="text-cyan-700" size={18} />
          <h2 className="font-display text-xl font-bold text-slate-800">{isAdmin ? 'Permission requests queue' : 'My permission requests'}</h2>
        </div>

        {isAdmin && decisionRequest && <form onSubmit={handleDecision} className="mb-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wide text-cyan-700">Review request</p><h3 className="mt-1 text-base font-bold text-slate-800">{decisionRequest.title}</h3><p className="mt-1 text-xs text-slate-500">{decisionRequest.requesterName || 'System user'} · {roleLabelMap[decisionRequest.requesterRole] || decisionRequest.requesterRole}</p></div><button type="button" onClick={() => setDecisionRequest(null)} className="text-xs font-bold text-slate-500">Cancel</button></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="space-y-1"><span className="text-xs font-bold text-slate-600">Decision</span><select value={decisionForm.status} onChange={(event) => setDecisionForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="approved">Allow permission</option><option value="denied">Deny permission</option></select></label><label className="space-y-1"><span className="text-xs font-bold text-slate-600">Permission start</span><input type="date" required value={decisionForm.permissionStart} onChange={(event) => setDecisionForm((current) => ({ ...current, permissionStart: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-slate-600">Permission end</span><input type="date" required value={decisionForm.permissionEnd} onChange={(event) => setDecisionForm((current) => ({ ...current, permissionEnd: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label><label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-slate-600">Admin description / comment</span><textarea value={decisionForm.decisionNote} onChange={(event) => setDecisionForm((current) => ({ ...current, decisionNote: event.target.value }))} placeholder="Explain the decision to the requester" className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label></div>
          <button type="submit" disabled={decisionSaving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Save size={14} />{decisionSaving ? 'Saving...' : 'Confirm decision'}</button>
        </form>}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Loading permission requests...</div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No permission requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-xs">
              <thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Requester</th><th className="px-3 py-3">Title / reason</th><th className="px-3 py-3">Start</th><th className="px-3 py-3">End</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Action</th></tr></thead>
              <tbody>
            {requests.map((request) => (
              <tr id={`permission-${request.requesterRole}`} key={request.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="px-3 py-4"><p className="font-bold text-slate-800">{request.requesterName || 'System user'}</p><p className="mt-1 text-[10px] text-slate-500">{roleLabelMap[request.requesterRole] || request.requesterRole}</p>{request.studentName && <p className="mt-1 text-[10px] text-slate-500">Student: {request.studentName}</p>}</td>
                <td className="max-w-xs px-3 py-4"><p className="font-bold text-slate-800">{request.title}</p><p className="mt-1 text-slate-600">{request.reason}</p>{request.description && <p className="mt-1 whitespace-pre-wrap text-slate-400">{request.description}</p>}</td>
                <td className="px-3 py-4 text-slate-600">{request.permissionStart ? String(request.permissionStart).slice(0, 10) : '-'}</td>
                <td className="px-3 py-4 text-slate-600">{request.permissionEnd ? String(request.permissionEnd).slice(0, 10) : '-'}</td>
                <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : request.status === 'denied' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{request.status}</span>{request.decisionNote && <p className="mt-2 max-w-[180px] text-[10px] text-slate-500">{request.decisionNote}</p>}</td>
                <td className="px-3 py-4">{isAdmin ? <div className="flex gap-2">{request.status === 'pending' && <><button onClick={() => openDecision(request, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-2 text-[10px] font-bold text-white"><CheckCircle2 size={13} />Allow</button><button onClick={() => openDecision(request, 'denied')} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-2 text-[10px] font-bold text-white"><CircleX size={13} />Deny</button></>}{request.status !== 'pending' && <button onClick={() => openDecision(request, request.status)} className="rounded-lg bg-slate-200 px-2.5 py-2 text-[10px] font-bold text-slate-700">Edit</button>}</div> : request.attachmentPath ? <a href={request.attachmentPath} target="_blank" rel="noreferrer" className="font-bold text-cyan-700">View letter</a> : '-'}</td>
              </tr>
            ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}