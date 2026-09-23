import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, DoorOpen, ImagePlus, Mail, Phone, Search, ShieldCheck, UploadCloud, UserPlus, XCircle } from 'lucide-react';
import api from '../lib/api';

const storageKey = 'fkams_security_requests_v1';
const securityGuardPermissionKey = 'fkams_security_guard_review_permission';

const buildTemplateMessage = (request, outcome, actorLabel = 'review team') => {
  const name = request.fullName || request.name || 'Guest';
  const schoolName = 'Forever King Academy';
  const comment = request.comment ? ` ${request.comment}` : '';
  const common = {
    approved: {
      en: `Hello ${name}, your request has been approved${comment ? ' by ' + actorLabel : ''}. You are allowed to enter ${schoolName}.`,
      fr: `Bonjour ${name}, votre demande a été approuvée${comment ? ' par ' + actorLabel : ''}. Vous êtes autorisé à entrer dans ${schoolName}.`,
      rw: `Muraho ${name}, icyifuzo cyawe cyemewe${comment ? ' na ' + actorLabel : ''}. Uremererwa kwinjira muri ${schoolName}.`,
    },
    rejected: {
      en: `Hello ${name}, your request was not approved${comment ? ' by ' + actorLabel : ''}. Please contact admin at admin@fkacademy.rw for more information.`,
      fr: `Bonjour ${name}, votre demande n'a pas été approuvée${comment ? ' par ' + actorLabel : ''}. Veuillez contacter l'administrateur à admin@fkacademy.rw pour plus d'informations.`,
      rw: `Muraho ${name}, icyifuzo cyawe nticyemewe${comment ? ' na ' + actorLabel : ''}. Mwambaze admin kuri admin@fkacademy.rw kugira mubone ibisobanuro.`,
    },
    pending: {
      en: `Hello ${name}, your request has been received and is waiting for review by the school guard and admin team.`,
      fr: `Bonjour ${name}, votre demande a bien été reçue et est en attente de validation par le personnel de sécurité et l'administration.`,
      rw: `Muraho ${name}, icyifuzo cyawe cyanditswe kandi kirategerezwa kugenzurwa n'abashinzwe umutekano n'abayobozi.`,
    },
    out: {
      en: `Hello ${name}, thank you for visiting ${schoolName}. We wish you a safe journey home.`,
      fr: `Bonjour ${name}, merci pour votre visite à ${schoolName}. Nous vous souhaitons un bon retour chez vous.`,
      rw: `Muraho ${name}, tubashimiye kuza kwa ${schoolName}. Tubifurije urugendo ruhire.`,
    },
  };

  return common[outcome] || common.pending;
};

const readRequests = () => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveRequests = (requests) => {
  localStorage.setItem(storageKey, JSON.stringify(requests));
};

const toDateTimeLocalValue = (date = new Date()) => {
  const current = new Date(date);
  const pad = (value) => String(value).padStart(2, '0');
  return `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(current.getMinutes())}`;
};

export default function SecurityGuardPage({ user, onBack, language = 'en' }) {
  const [guardReviewEnabled, setGuardReviewEnabled] = useState(() => {
    try {
      return localStorage.getItem(securityGuardPermissionKey) === 'enabled';
    } catch {
      return false;
    }
  });
  const canApproveByDefault = ['admin', 'dos', 'doc'].includes(user?.role);
  const canDecide = canApproveByDefault || (user?.role === 'security_guard' && guardReviewEnabled);
  const locale = language === 'fr' ? 'fr' : language === 'rw' ? 'rw' : 'en';
  const [requests, setRequests] = useState(readRequests);
  const [activeTab, setActiveTab] = useState('guest');
  const [requestView, setRequestView] = useState(['admin', 'dos', 'doc'].includes(user?.role) ? 'all' : 'guest');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [guardAssignment, setGuardAssignment] = useState({ title: '', description: '', permissionStart: toDateTimeLocalValue(), permissionEnd: toDateTimeLocalValue(Date.now() + 30 * 86400000) });
  const [guardAssignments, setGuardAssignments] = useState(() => {
    try {
      const raw = localStorage.getItem('fkams_security_guard_assignments');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [guestForm, setGuestForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    purpose: 'visit',
    arrivalTime: '',
    description: '',
    photo: '',
  });

  const [parentForm, setParentForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    purpose: 'visit',
    studentName: '',
    arrivalTime: '',
    description: '',
    photo: '',
  });

  useEffect(() => {
    const loadServerState = async () => {
      try {
        const [{ data: visitsData }, { data: permissionData }] = await Promise.all([
          api.get('/security-guard/visits'),
          api.get('/security-guard/permissions'),
        ]);
        const serverRequests = Array.isArray(visitsData.requests) ? visitsData.requests : [];
        if (serverRequests.length) {
          setRequests(serverRequests.map((item) => ({
            ...item,
            type: item.visitor_type || item.type,
            fullName: item.full_name || item.fullName,
            email: item.email,
            phone: item.phone,
            arrivalTime: item.arrival_time || item.arrivalTime,
            studentName: item.student_name || item.studentName || '',
            photo: item.photo_data || item.photo || '',
            status: item.status || 'pending',
            comment: item.review_comment || '',
            message: buildTemplateMessage({ fullName: item.full_name || item.fullName }, item.status || 'pending')[locale],
          })));
        }
        setGuardReviewEnabled(Boolean(permissionData.enabled));
      } catch {
        setRequests(readRequests());
      }
    };

    loadServerState();
  }, []);

  useEffect(() => {
    saveRequests(requests);
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('fkams_security_guard_assignments', JSON.stringify(guardAssignments));
  }, [guardAssignments]);

  useEffect(() => {
    try {
      localStorage.setItem(securityGuardPermissionKey, guardReviewEnabled ? 'enabled' : 'disabled');
    } catch {
      // Ignore localStorage write failures silently to keep the page usable in restricted browsers.
    }
  }, [guardReviewEnabled]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return requests.filter((request) => {
      const row = `${request.fullName || ''} ${request.email || ''} ${request.phone || ''} ${request.purpose || ''} ${request.type || ''}`.toLowerCase();
      const matchesType = requestView === 'all' || request.type === requestView;
      return row.includes(lower) && matchesType;
    });
  }, [requestView, requests, search]);

  const stats = useMemo(() => {
    const pending = requests.filter((request) => request.status === 'pending').length;
    const approved = requests.filter((request) => request.status === 'approved').length;
    const rejected = requests.filter((request) => request.status === 'rejected').length;
    return { total: requests.length, pending, approved, rejected };
  }, [requests]);

  const handleFileToBase64 = (file, callback) => {
    if (!file) return callback('');
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const createRequest = async (type, form) => {
    const entry = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      status: 'pending',
      createdAt: new Date().toISOString(),
      comment: '',
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      purpose: form.purpose,
      arrivalTime: form.arrivalTime,
      description: form.description,
      studentName: form.studentName || '',
      photo: form.photo || '',
      message: buildTemplateMessage({ fullName: form.fullName }, 'pending')[locale],
    };

    try {
      const { data } = await api.post('/security-guard/visits', {
        type,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        purpose: form.purpose,
        arrivalTime: form.arrivalTime,
        description: form.description,
        studentName: form.studentName || '',
        photo: form.photo || '',
        language: locale,
      });
      const saved = { ...data.request, type: data.request.visitor_type || type, fullName: data.request.full_name || form.fullName, email: data.request.email || form.email, phone: data.request.phone || form.phone, purpose: data.request.purpose || form.purpose, arrivalTime: data.request.arrival_time || form.arrivalTime, description: data.request.description || form.description, studentName: data.request.student_name || form.studentName || '', photo: data.request.photo || form.photo || '', status: data.request.status || 'pending', comment: data.request.review_comment || '', message: buildTemplateMessage({ fullName: data.request.full_name || form.fullName }, 'pending')[locale] };
      setRequests((current) => [saved, ...current]);
    } catch (requestError) {
      setRequests((current) => [entry, ...current]);
    }

    setNotice(`${type === 'guest' ? 'Guest' : 'Parent'} request submitted and sent for review.`);
    setError('');
  };

  const handleGuestSubmit = (event) => {
    event.preventDefault();
    if (!guestForm.fullName || !guestForm.email || !guestForm.phone || !guestForm.arrivalTime) {
      setError('Full name, email, phone, and arrival time are required.');
      return;
    }
    createRequest('guest', guestForm);
    setGuestForm({ fullName: '', email: '', phone: '', purpose: 'visit', arrivalTime: '', description: '', photo: '' });
  };

  const handleParentSubmit = (event) => {
    event.preventDefault();
    if (!parentForm.fullName || !parentForm.email || !parentForm.phone || !parentForm.studentName || !parentForm.arrivalTime) {
      setError('Parent name, email, phone, student name, and arrival time are required.');
      return;
    }
    createRequest('parent', parentForm);
    setParentForm({ fullName: '', email: '', phone: '', purpose: 'visit', studentName: '', arrivalTime: '', description: '', photo: '' });
  };

  const updateDecision = async (id, nextStatus, comment) => {
    const actorLabel = user?.role === 'security_guard' ? 'security guard' : ['admin', 'dos', 'doc'].includes(user?.role) ? 'school admin' : 'review team';

    try {
      const { data } = await api.patch(`/security-guard/visits/${id}/status`, { status: nextStatus, comment });
      const request = data.request || null;
      if (request) {
        setRequests((current) => current.map((item) => item.id === id ? {
          ...item,
          status: request.status || nextStatus,
          comment: request.review_comment || comment,
          decisionAt: new Date().toISOString(),
          message: buildTemplateMessage({ ...item, comment: request.review_comment || comment }, request.status === 'approved' ? 'approved' : request.status === 'rejected' ? 'rejected' : request.status === 'out' ? 'out' : 'pending', actorLabel)[locale],
        } : item));
      }
      setNotice(`${request?.full_name || 'Visitor'} marked as ${nextStatus}.`);
      return;
    } catch (error) {
      setError(error.response?.data?.error || 'Unable to update the visitor request.');
    }

    setRequests((current) => current.map((item) => {
      if (item.id !== id) return item;
      const messages = buildTemplateMessage({ ...item, comment }, nextStatus === 'approved' ? 'approved' : nextStatus === 'rejected' ? 'rejected' : nextStatus === 'out' ? 'out' : 'pending', actorLabel);
      return {
        ...item,
        status: nextStatus,
        comment,
        decisionAt: new Date().toISOString(),
        message: messages[locale],
      };
    }));

    const request = requests.find((item) => item.id === id);
    if (request) {
      const messages = buildTemplateMessage({ ...request, comment }, nextStatus === 'approved' ? 'approved' : nextStatus === 'rejected' ? 'rejected' : nextStatus === 'out' ? 'out' : 'pending', actorLabel);
      setNotice(`${request.fullName} marked as ${nextStatus}. Notification message: ${messages[locale]}`);
    }
  };

  const handleGrantRole = async (event) => {
    event.preventDefault();
    if (!guardAssignment.title.trim()) {
      setError('Add a title before confirming the security guard role.');
      return;
    }
    if (!guardAssignment.permissionStart || !guardAssignment.permissionEnd) {
      setError('Choose the permission start and end dates before confirming.');
      return;
    }

    try {
      const { data } = await api.post('/security-guard/permissions', {
        title: guardAssignment.title,
        description: guardAssignment.description,
        permissionStart: guardAssignment.permissionStart,
        permissionEnd: guardAssignment.permissionEnd,
      });
      const item = {
        id: data.permission?.id || `guard-${Date.now()}`,
        title: data.permission?.title || guardAssignment.title,
        description: data.permission?.description || guardAssignment.description,
        permissionStart: data.permission?.permissionStart || guardAssignment.permissionStart,
        permissionEnd: data.permission?.permissionEnd || guardAssignment.permissionEnd,
        createdAt: data.permission?.createdAt || new Date().toISOString(),
      };

      setGuardAssignments((current) => [item, ...current]);
      setGuardReviewEnabled(Boolean(data.enabled));
      setGuardAssignment({ title: '', description: '', permissionStart: toDateTimeLocalValue(), permissionEnd: toDateTimeLocalValue(Date.now() + 30 * 86400000) });
      setNotice(`Security guard review permission granted from ${item.permissionStart} to ${item.permissionEnd}. The guard can approve or reject visitor requests during this period.`);
      setError('');
    } catch (requestError) {
      const item = {
        id: `guard-${Date.now()}`,
        title: guardAssignment.title,
        description: guardAssignment.description,
        permissionStart: guardAssignment.permissionStart,
        permissionEnd: guardAssignment.permissionEnd,
        createdAt: new Date().toISOString(),
      };
      setGuardAssignments((current) => [item, ...current]);
      setGuardReviewEnabled(true);
      setGuardAssignment({ title: '', description: '', permissionStart: toDateTimeLocalValue(), permissionEnd: toDateTimeLocalValue(Date.now() + 30 * 86400000) });
      setNotice(`Security guard permission has been saved locally for ${item.permissionStart} to ${item.permissionEnd}.`);
      setError('');
    }
  };

  const renderForm = () => (activeTab === 'guest' ? (
    <form onSubmit={handleGuestSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-display text-xl font-bold text-slate-800">Guest visit request</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name"><input value={guestForm.fullName} onChange={(event) => setGuestForm((current) => ({ ...current, fullName: event.target.value }))} className="security-input" /></Field>
        <Field label="Email"><input type="email" value={guestForm.email} onChange={(event) => setGuestForm((current) => ({ ...current, email: event.target.value }))} className="security-input" /></Field>
        <Field label="Phone number"><input value={guestForm.phone} onChange={(event) => setGuestForm((current) => ({ ...current, phone: event.target.value }))} className="security-input" /></Field>
        <Field label="Purpose"><select value={guestForm.purpose} onChange={(event) => setGuestForm((current) => ({ ...current, purpose: event.target.value }))} className="security-input"><option value="visit">Visit</option><option value="delivery">Delivery</option><option value="other">Other</option></select></Field>
        <Field label="Arrival time"><input type="datetime-local" value={guestForm.arrivalTime} onChange={(event) => setGuestForm((current) => ({ ...current, arrivalTime: event.target.value }))} className="security-input" /></Field>
        <Field label="Photo"><input type="file" accept="image/*" capture="environment" onChange={(event) => handleFileToBase64(event.target.files?.[0], (photo) => setGuestForm((current) => ({ ...current, photo })))} className="security-input file:mr-3 file:rounded-full file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" /><small className="mt-1 block text-slate-400">Camera access is enabled for the photo capture step.</small></Field>
        <div className="md:col-span-2"><Field label="More description"><textarea value={guestForm.description} onChange={(event) => setGuestForm((current) => ({ ...current, description: event.target.value }))} rows="6" className="security-input security-textarea" /></Field></div>
      </div>
      <button type="submit" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-xs font-bold text-white"><ShieldCheck size={15} />Request permission</button>
    </form>
  ) : (
    <form onSubmit={handleParentSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-display text-xl font-bold text-slate-800">Parent visit request</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Parent full name"><input value={parentForm.fullName} onChange={(event) => setParentForm((current) => ({ ...current, fullName: event.target.value }))} className="security-input" /></Field>
        <Field label="Email"><input type="email" value={parentForm.email} onChange={(event) => setParentForm((current) => ({ ...current, email: event.target.value }))} className="security-input" /></Field>
        <Field label="Phone number"><input value={parentForm.phone} onChange={(event) => setParentForm((current) => ({ ...current, phone: event.target.value }))} className="security-input" /></Field>
        <Field label="Student name"><input value={parentForm.studentName} onChange={(event) => setParentForm((current) => ({ ...current, studentName: event.target.value }))} className="security-input" /></Field>
        <Field label="Reason"><select value={parentForm.purpose} onChange={(event) => setParentForm((current) => ({ ...current, purpose: event.target.value }))} className="security-input"><option value="visit">Visit</option><option value="other">Other problem</option></select></Field>
        <Field label="Arrival time"><input type="datetime-local" value={parentForm.arrivalTime} onChange={(event) => setParentForm((current) => ({ ...current, arrivalTime: event.target.value }))} className="security-input" /></Field>
        <Field label="Photo"><input type="file" accept="image/*" capture="environment" onChange={(event) => handleFileToBase64(event.target.files?.[0], (photo) => setParentForm((current) => ({ ...current, photo })))} className="security-input file:mr-3 file:rounded-full file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" /><small className="mt-1 block text-slate-400">Camera access is enabled for the photo capture step.</small></Field>
        <div className="md:col-span-2"><Field label="More description"><textarea value={parentForm.description} onChange={(event) => setParentForm((current) => ({ ...current, description: event.target.value }))} rows="6" className="security-input security-textarea" /></Field></div>
      </div>
      <button type="submit" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-xs font-bold text-white"><ShieldCheck size={15} />Request permission</button>
    </form>
  ));

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><AlertCircle size={15} />Overview</button>

      <header className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">Security guard</p>
            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Visitor management dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">Track visit requests, review new arrivals, approve or reject entries, and mark exit times for guests and parents.</p>
          </div>
          <ShieldCheck size={30} className="hidden text-teal-300 sm:block" />
        </div>
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total" value={stats.total} tone="cyan" />
        <SummaryCard label="Pending" value={stats.pending} tone="amber" />
        <SummaryCard label="Approved" value={stats.approved} tone="emerald" />
        <SummaryCard label="Rejected" value={stats.rejected} tone="rose" />
      </section>

      {['admin', 'dos', 'doc'].includes(user?.role) && (
        <form onSubmit={handleGrantRole} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="text-cyan-700" size={18} />
            <h2 className="font-display text-xl font-bold text-slate-800">Add security guard role</h2>
          </div>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-600" />
            {guardReviewEnabled ? 'Security guard review is enabled.' : 'Security guard review is currently disabled.'}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title"><input value={guardAssignment.title} onChange={(event) => setGuardAssignment((current) => ({ ...current, title: event.target.value }))} className="security-input" placeholder="Security guard assignment title" /></Field>
            <Field label="Permission start"><input type="datetime-local" value={guardAssignment.permissionStart} onChange={(event) => setGuardAssignment((current) => ({ ...current, permissionStart: event.target.value }))} className="security-input" /></Field>
            <Field label="Permission end"><input type="datetime-local" value={guardAssignment.permissionEnd} onChange={(event) => setGuardAssignment((current) => ({ ...current, permissionEnd: event.target.value }))} className="security-input" /></Field>
            <Field label="Description">
              <textarea value={guardAssignment.description} onChange={(event) => setGuardAssignment((current) => ({ ...current, description: event.target.value }))} rows="4" className="security-input security-textarea" placeholder="Describe the access or security reason" />
            </Field>
          </div>
          <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 text-xs font-bold text-white"><ShieldCheck size={15} />Confirm</button>
        </form>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1">
            {['all', 'guest', 'parent'].map((tab) => (
              <button key={tab} type="button" onClick={() => { setRequestView(tab); if (tab !== 'all') setActiveTab(tab); }} className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide ${requestView === tab ? 'bg-cyan-700 text-white' : 'text-slate-600'}`}>
                {tab === 'all' ? 'All requests' : tab === 'guest' ? 'Guest visit' : 'Parent visit'}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs">
            <Search size={15} className="text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search visitor" className="w-32 bg-transparent outline-none" />
          </label>
        </div>

        {renderForm()}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-slate-800">Request list</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{filtered.length} shown</span>
        </div>

        <div className="space-y-3">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  {item.photo ? <img src={item.photo} alt={item.fullName} className="h-14 w-14 rounded-full object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500"><ImagePlus size={18} /></div>}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{item.fullName}</h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><Mail size={12} />{item.email}</span>
                      <span className="inline-flex items-center gap-1"><Phone size={12} />{item.phone}</span>
                      {item.studentName && <span className="inline-flex items-center gap-1"><UserPlus size={12} />{item.studentName}</span>}
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{item.purpose || 'Visit'} · {new Date(item.arrivalTime).toLocaleString()} · {item.description || 'No extra description.'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canDecide && item.status === 'pending' && (
                    <>
                      <button type="button" onClick={() => updateDecision(item.id, 'approved', 'Approved by the review team.')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white"><CheckCircle2 size={12} />Approve</button>
                      <button type="button" onClick={() => updateDecision(item.id, 'rejected', 'Rejected by the review team.')} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-bold text-white"><XCircle size={12} />Reject</button>
                    </>
                  )}
                  {item.status === 'approved' && (
                    <button type="button" onClick={() => updateDecision(item.id, 'out', 'Guest exited the school grounds.')} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-white"><DoorOpen size={12} />Out gate</button>
                  )}
                </div>
              </div>

              {item.comment && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">Comment: {item.comment}</p>}
              {item.message && <p className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-[11px] text-cyan-800">{item.message}</p>}
            </article>
          ))}

          {!filtered.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No visitor requests found.</div>}
        </div>
      </section>

      {guardAssignments.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="text-cyan-700" size={18} />
            <h2 className="font-display text-xl font-bold text-slate-800">Security guard assignment log</h2>
          </div>
          <div className="space-y-3">
            {guardAssignments.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <b>{item.title}</b>
                <p className="mt-1 text-slate-500">{item.description || 'No description provided.'}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-700">{item.permissionStart || '—'} to {item.permissionEnd || '—'}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-1 shadow-sm transition focus-within:border-cyan-400 focus-within:bg-white">
        {children}
      </div>
    </label>
  );
}

function SummaryCard({ label, value, tone }) {
  const tones = {
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.cyan}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    out: 'bg-slate-200 text-slate-700',
  };

  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${map[status] || map.pending}`}>
      {status || 'pending'}
    </span>
  );
}
