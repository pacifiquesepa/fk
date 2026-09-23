import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Eye, FileText, Megaphone, RefreshCw, Search, Users, X } from 'lucide-react';
import api from '../lib/api';

const initialForm = {
  title: '',
  messageType: 'announcement',
  audienceRole: 'parent',
  audienceScope: 'all',
  className: '',
  selectedUserId: '',
  startsAt: '',
  endsAt: '',
  body: '',
};

export default function SchoolCommunicationsPageFixed({ user, onBack }) {
  const manager = ['admin', 'dos', 'doc'].includes(user?.role);
  const canClose = ['admin', 'dos'].includes(user?.role);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [notes, setNotes] = useState('');
  const [noteFile, setNoteFile] = useState(null);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const roleOptions = ['parent', 'teacher', 'doc', 'librarian', 'student', 'accountant', 'all'].filter(
    (role) => user?.role !== 'doc' || ['parent', 'teacher', 'student'].includes(role),
  );

  const classOptions = useMemo(
    () => [...new Map(classes.map((item) => [item.name, item])).values()].sort((a, b) => a.name.localeCompare(b.name)),
    [classes],
  );

  const audienceUsers = useMemo(() => {
    const role = form.audienceRole;
    return allUsers.filter((person) => {
      if (role === 'all') {
        return ['parent', 'teacher', 'student', 'doc', 'librarian', 'accountant'].includes(person.role);
      }
      return person.role === role;
    });
  }, [allUsers, form.audienceRole]);

  useEffect(() => {
    if (form.audienceScope === 'selected' && !form.selectedUserId && audienceUsers[0]) {
      setForm((current) => ({ ...current, selectedUserId: String(audienceUsers[0].id) }));
    }
  }, [form.audienceScope, form.selectedUserId, audienceUsers]);

  const load = async () => {
    try {
      const { data } = await api.get('/school-messages');
      setMessages(data.messages || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load school communications.');
    }
  };

  const loadClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data.classes || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load classes.');
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setAllUsers(data.users || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load users.');
    }
  };

  useEffect(() => {
    load();
    loadClasses();
    loadUsers();
  }, []);

  const visible = useMemo(
    () => messages.filter((item) => `${item.title} ${item.body} ${item.messageType}`.toLowerCase().includes(query.toLowerCase())),
    [messages, query],
  );

  const visibleRecipients = useMemo(
    () => recipients.filter((item) => `${item.fullName} ${item.email} ${item.role}`.toLowerCase().includes(recipientQuery.toLowerCase())),
    [recipients, recipientQuery],
  );

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        if (key === 'className' && form.audienceScope !== 'class') return;
        if (key === 'selectedUserId' && form.audienceScope !== 'selected') return;
        data.append(key, value);
      });

      if (file) data.append('file', file);

      const response = await api.post('/school-messages', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setNotice(response.data.message);
      setForm(initialForm);
      setFile(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to publish communication.');
    } finally {
      setSaving(false);
    }
  };

  const view = async (item) => {
    try {
      await api.patch(`/school-messages/${item.id}/view`);
      setMessages((current) =>
        current.map((row) => (row.id === item.id ? { ...row, viewedAt: new Date().toISOString() } : row)),
      );
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to mark message as viewed.');
    }
  };

  const present = async (item) => {
    try {
      await api.patch(`/school-messages/${item.id}/present`);
      setNotice('Meeting attendance recorded.');
      setMessages((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, presentAt: new Date().toISOString(), viewedAt: row.viewedAt || new Date().toISOString() }
            : row,
        ),
      );

      if (selected && selected.id === item.id) {
        setRecipients((current) =>
          current.map((recipient) =>
            recipient.userId === user?.id
              ? { ...recipient, presentAt: new Date().toISOString(), viewedAt: recipient.viewedAt || new Date().toISOString() }
              : recipient,
          ),
        );
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to record attendance.');
    }
  };

  const openDetail = async (item) => {
    setSelected(item);
    setNotes('');
    setNoteFile(null);
    setRecipientQuery('');

    if (!manager) return;

    try {
      const { data } = await api.get(`/school-messages/${item.id}/recipients`);
      setRecipients(data.recipients || []);
      setNotes(data.message?.notesHtml || '');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load recipient details.');
    }
  };

  const markRecipientPresent = async (recipient) => {
    try {
      await api.patch(`/school-messages/${selected.id}/recipients/${recipient.userId}/present`);
      setRecipients((current) =>
        current.map((item) =>
          item.userId === recipient.userId
            ? { ...item, presentAt: new Date().toISOString(), viewedAt: item.viewedAt || new Date().toISOString() }
            : item,
        ),
      );
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to mark presence.');
    }
  };

  const saveNotes = async () => {
    if (!selected) return;

    try {
      const data = new FormData();
      data.append('notesHtml', notes || '');
      if (noteFile) data.append('file', noteFile);

      const response = await api.patch(`/school-messages/${selected.id}/notes`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setNotice(response.data.message);
      setNoteFile(null);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to save meeting notes.');
    }
  };

  const closeMeeting = async (item) => {
    if (!window.confirm('Close this meeting and notify invited people who did not attend?')) return;

    try {
      await api.patch(`/school-messages/${item.id}/end`);
      setNotice('Meeting closed.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to close meeting.');
    }
  };

  const resend = async (item) => {
    if (!window.confirm('Resend this communication to everyone who has not viewed it?')) return;

    try {
      const { data } = await api.post(`/school-messages/${item.id}/resend-unviewed`);
      setNotice(data.message);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to resend communication.');
    }
  };

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <button onClick={onBack} className="text-xs font-bold text-cyan-700">Back</button>

      <header className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">School communications</p>
        <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Announcements and meetings</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Publish targeted updates, track views, and confirm meeting attendance.
        </p>
      </header>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {notice && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      {manager && (
        <Composer
          form={form}
          setForm={setForm}
          update={update}
          file={file}
          setFile={setFile}
          submit={submit}
          saving={saving}
          roleOptions={roleOptions}
          classOptions={classOptions}
          audienceUsers={audienceUsers}
        />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">
            {manager ? 'Published communications' : 'My school communications'}
          </h2>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={15} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="w-40 text-xs outline-none"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {visible.map((item) => (
            <MessageCard
              key={item.id}
              item={item}
              manager={manager}
              canClose={canClose}
              onOpen={openDetail}
              onView={view}
              onPresent={present}
              onClose={closeMeeting}
              onResend={resend}
            />
          ))}
          {!visible.length && <p className="text-sm text-slate-500">No communications found.</p>}
        </div>
      </section>

      {selected && (
        <DetailPanel
          item={selected}
          manager={manager}
          recipients={visibleRecipients}
          notes={notes}
          setNotes={setNotes}
          recipientQuery={recipientQuery}
          setRecipientQuery={setRecipientQuery}
          onClose={() => setSelected(null)}
          onPresent={present}
          onSaveNotes={saveNotes}
          onCloseMeeting={closeMeeting}
          noteFile={noteFile}
          setNoteFile={setNoteFile}
          onMarkRecipientPresent={markRecipientPresent}
        />
      )}
    </div>
  );
}

function Composer({ form, setForm, update, file, setFile, submit, saving, roleOptions, classOptions, audienceUsers }) {
  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <input
            required
            value={form.title}
            onChange={update('title')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white"
          />
        </Field>

        <Field label="Type">
          <select
            value={form.messageType}
            onChange={update('messageType')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white"
          >
            <option value="announcement">Announcement</option>
            <option value="meeting">Meeting</option>
          </select>
        </Field>

        <Field label="Audience role">
          <select
            value={form.audienceRole}
            onChange={(event) => {
              const nextRole = event.target.value;
              setForm((current) => ({
                ...current,
                audienceRole: nextRole,
                audienceScope: 'all',
                className: '',
                selectedUserId: '',
              }));
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role === 'all' ? 'All people' : role}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Audience scope">
          <select
            value={form.audienceScope}
            onChange={(event) => {
              const nextScope = event.target.value;
              setForm((current) => ({
                ...current,
                audienceScope: nextScope,
                className: '',
                selectedUserId: '',
              }));
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white"
          >
            <option value="all">All selected people</option>
            <option value="class">Class</option>
            <option value="selected">Selected by name</option>
          </select>
        </Field>

        {form.audienceScope === 'class' && (
          <Field label="Class name">
            <select
              required
              value={form.className}
              onChange={update('className')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white"
            >
              <option value="">Select class</option>
              {classOptions.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {form.audienceScope === 'selected' && (
          <Field label="Select recipient">
            <select
              required
              value={form.selectedUserId}
              onChange={update('selectedUserId')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white"
            >
              <option value="">Select a person</option>
              {audienceUsers.map((person) => (
                <option key={person.id} value={String(person.id)}>
                  {person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim()}
                </option>
              ))}
            </select>
          </Field>
        )}

        {form.messageType === 'meeting' && (
          <Field label="Meeting start">
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={update('startsAt')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white"
            />
          </Field>
        )}

        {form.messageType === 'meeting' && (
          <Field label="Meeting end">
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={update('endsAt')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white"
            />
          </Field>
        )}

        <Field label="Upload file">
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full text-xs text-slate-600"
          />
          {file && <small className="mt-2 block text-slate-400">{file.name}</small>}
        </Field>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-semibold text-slate-600">Enter about of that</span>
        <textarea
          required
          rows="5"
          value={form.body}
          onChange={update('body')}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:bg-white"
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-xs font-bold text-white disabled:opacity-60"
      >
        {form.messageType === 'meeting' ? <Users size={15} /> : <Megaphone size={15} />}
        {saving ? 'Publishing...' : 'Add notification'}
      </button>
    </form>
  );
}

function MessageCard({ item, manager, canClose, onOpen, onView, onPresent, onClose, onResend }) {
  const isMeeting = item.messageType === 'meeting';

  return (
    <article className="rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
            {isMeeting ? <Users size={17} /> : <Bell size={17} />}
          </span>
          <div>
            <p className="font-bold text-slate-800">{item.title}</p>
            <p className="text-[10px] uppercase text-slate-400">
              {item.messageType} · {item.audienceRole} · {item.audienceScope}
            </p>
          </div>
        </div>

        {item.fileUrl && (
          <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-cyan-700">
            <FileText size={17} />
          </a>
        )}
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.body}</p>

      {manager ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat icon={<Users size={14} />} label="Invited" value={item.recipientCount || 0} />
            <Stat icon={<Eye size={14} />} label="Viewed" value={item.viewedCount || 0} />
            <Stat icon={<Check size={14} />} label="Present" value={item.presentCount || 0} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => onOpen(item)}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-700 px-3 py-2 text-[11px] font-bold text-white"
            >
              <Eye size={13} />
              View more
            </button>
            <button
              onClick={() => onResend(item)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700"
            >
              <RefreshCw size={13} />
              Resend unviewed
            </button>
            {isMeeting && canClose && !item.endedAt && (
              <button
                onClick={() => onClose(item)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-white"
              >
                Close meeting
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              onView(item);
              onOpen(item);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-cyan-700 px-3 py-2 text-[11px] font-bold text-white"
          >
            <Eye size={13} />
            View
          </button>
          {isMeeting && !item.presentAt && (
            <button
              onClick={() => onPresent(item)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700"
            >
              <Check size={13} />
              Mark present
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function DetailPanel({
  item,
  manager,
  recipients,
  notes,
  setNotes,
  recipientQuery,
  setRecipientQuery,
  onClose,
  onPresent,
  onSaveNotes,
  onCloseMeeting,
  noteFile,
  setNoteFile,
  onMarkRecipientPresent,
}) {
  const isMeeting = item.messageType === 'meeting';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-5">
      <section className="mx-auto mt-8 max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-700">{item.messageType} detail</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{item.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500" aria-label="Close detail">
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.body}</p>

        {manager && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="Invited" value={recipients.length} icon={<Users size={14} />} />
              <Stat label="Viewed" value={recipients.filter((row) => row.viewedAt).length} icon={<Eye size={14} />} />
              <Stat label="Present" value={recipients.filter((row) => row.presentAt).length} icon={<Check size={14} />} />
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search size={15} className="text-slate-400" />
              <input
                value={recipientQuery}
                onChange={(event) => setRecipientQuery(event.target.value)}
                placeholder="Search invited people"
                className="w-full text-xs outline-none"
              />
            </div>

            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-200">
              {recipients.map((recipient) => (
                <div key={recipient.userId} className="flex items-center justify-between border-b border-slate-100 px-3 py-3 text-xs">
                  <span>
                    <b>{recipient.fullName}</b>
                    <small className="ml-2 text-slate-400">
                      {recipient.role} · {recipient.viewedAt ? 'viewed' : 'not viewed'}
                    </small>
                  </span>
                  {isMeeting && (
                    <button
                      onClick={() => onMarkRecipientPresent(recipient)}
                      disabled={Boolean(recipient.presentAt)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Check size={13} />
                      {recipient.presentAt ? 'Present' : 'Tick present'}
                    </button>
                  )}
                </div>
              ))}
              {!recipients.length && <p className="p-4 text-xs text-slate-500">No invited people found.</p>}
            </div>
          </>
        )}

        {isMeeting && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800">Meeting follow-up</h3>
              {!manager && !item.presentAt && (
                <button
                  onClick={() => onPresent(item)}
                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-700 px-3 py-2 text-[11px] font-bold text-white"
                >
                  <Check size={13} />
                  Mark present
                </button>
              )}
            </div>

            {manager && (
              <>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">Notes</span>
                  <textarea
                    rows="5"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                </label>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    onChange={(event) => setNoteFile(event.target.files?.[0] || null)}
                    className="block text-xs text-slate-600"
                  />
                  {noteFile && <small className="text-slate-500">{noteFile.name}</small>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={onSaveNotes}
                    className="rounded-lg bg-cyan-700 px-3 py-2 text-[11px] font-bold text-white"
                  >
                    Save notes
                  </button>
                  {!item.endedAt && (
                    <button
                      onClick={() => onCloseMeeting(item)}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-white"
                    >
                      Close meeting
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2 text-center">
      <div className="flex justify-center gap-1 text-cyan-700">
        {icon}
        <span>{label}</span>
      </div>
      <strong className="mt-1 block text-lg text-slate-800">{value}</strong>
    </div>
  );
}
