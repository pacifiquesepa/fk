import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Clock3, Eye, MapPin, Save, ShieldCheck, Trash2 } from 'lucide-react';
import api from '../lib/api';

const roleNames = { teacher: 'Teacher', dos: 'DOS', doc: 'DOC', accountant: 'Accountant', librarian: 'Librarian' };

export default function DepartmentAttendanceOnLocation({ user, onBack }) {
  const isAdmin = user?.role === 'admin';
  const canManageRecords = ['admin', 'dos'].includes(user?.role);
  const [settings, setSettings] = useState(null);
  const [records, setRecords] = useState([]);
  const [members, setMembers] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ locationName: '', latitude: '', longitude: '', radiusMeters: 5, morningCutoff: '08:00', afternoonTime: '13:00' });
  const [session, setSession] = useState('morning');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [capturedPreview, setCapturedPreview] = useState('');
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const captureTimerRef = useRef(null);
    const captureAttemptsRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const [photoPreview, setPhotoPreview] = useState('');
  const [chartRole, setChartRole] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: settingsData }, { data: recordsData }] = await Promise.all([api.get('/department-attendance/settings'), api.get(`/department-attendance?month=${month}`)]);
      setSettings(settingsData.settings);
      setRecords(recordsData.records || []);
      setMembers(recordsData.members || []);
      if (settingsData.settings) setForm({ locationName: settingsData.settings.locationName, latitude: settingsData.settings.latitude, longitude: settingsData.settings.longitude, radiusMeters: settingsData.settings.radiusMeters, morningCutoff: String(settingsData.settings.morningCutoff).slice(0, 5), afternoonTime: String(settingsData.settings.afternoonTime).slice(0, 5) });
    } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to load department attendance.'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month]);
  useEffect(() => {
    if (isAdmin) return undefined;
    const refreshSchedule = async () => {
      try {
        const { data } = await api.get('/department-attendance/settings');
        setSettings(data.settings || null);
      } catch { }
    };
    const timer = window.setInterval(refreshSchedule, 30000);
    return () => window.clearInterval(timer);
  }, [isAdmin]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const handlePhotoClick = (event) => {
      const link = event.target.closest('a[target="_blank"]');
      if (!link || !link.href.includes('/uploads/')) return;
      event.preventDefault();
      setPhotoPreview(link.href);
    };
    document.addEventListener('click', handlePhotoClick);
    return () => document.removeEventListener('click', handlePhotoClick);
  }, []);
  useEffect(() => () => {
    window.clearTimeout(captureTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const setCurrentLocation = () => {
    setError('');
    if (!navigator.geolocation) return setError('This device does not provide location services.');
    navigator.geolocation.getCurrentPosition((position) => setForm((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude })), () => setError('Allow location access so the attendance location can be saved.'));
  };

  const saveSettings = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { await api.put('/department-attendance/settings', form); setMessage('Department attendance location and times saved.'); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to save attendance settings.'); } finally { setSaving(false); }
  };

  const openCamera = async () => {
    setError('');
    if (sessionRecorded) return setError(`${session} attendance has already been recorded.`);
    if (!navigator.mediaDevices?.getUserMedia) return setError('This device or browser does not provide camera access.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      captureAttemptsRef.current = 0;
      setCameraOpen(true);
      window.requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        const scheduleCapture = () => {
          video.play().catch(() => {});
          window.clearTimeout(captureTimerRef.current);
          captureTimerRef.current = window.setTimeout(() => capturePhoto(), 1000);
        };
        video.onloadedmetadata = scheduleCapture;
        video.onloadeddata = scheduleCapture;
        if (video.readyState >= 2) scheduleCapture();
      });
    } catch (requestError) {
      setError(requestError.name === 'NotAllowedError' ? 'Allow camera access to take the attendance photo.' : 'Unable to open the device camera.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      captureAttemptsRef.current += 1;
      if (captureAttemptsRef.current < 60) captureTimerRef.current = window.setTimeout(() => capturePhoto(), 100);
      else setError('The camera did not provide a usable image. Please try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedPreview(canvas.toDataURL('image/jpeg', 0.9));
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const retakePhoto = () => {
    setCapturedPreview('');
    openCamera();
  };

  const checkIn = async () => {
    if (sessionRecorded) return setError(`${session} attendance has already been recorded.`);
    if (!capturedPreview) return setError('Take a photo and confirm it before recording attendance.');
    setSaving(true); setError(''); setMessage('');
    if (!navigator.geolocation) { setError('This device does not provide location services.'); setSaving(false); return; }
    const locationOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 };
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const photoBlob = await (await fetch(capturedPreview)).blob();
        const payload = new FormData(); payload.append('session', session); payload.append('latitude', position.coords.latitude); payload.append('longitude', position.coords.longitude); payload.append('accuracy', position.coords.accuracy || 0); payload.append('photo', photoBlob, `attendance-${session}.jpg`);
        const { data } = await api.post('/department-attendance/check-in', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMessage(`${data.message} Status: ${data.status}. Remaining score: ${data.scoreRemaining}/100.`); setCapturedPreview(''); setCameraOpen(false); await load();
      } catch (requestError) {
        const response = requestError.response?.data;
        setError(response?.code === 'ROLE_NOT_ALLOWED'
          ? response.error
          : response?.code === 'ATTENDANCE_ALREADY_RECORDED'
          ? response.error
          : response?.code === 'OUTSIDE_ATTENDANCE_LOCATION'
          ? `${response.error} GPS accuracy may vary; ask admin to confirm the saved location or increase the allowed radius.`
          : response?.error || 'Unable to record attendance.');
      } finally { setSaving(false); }
    }, (locationError) => { setError(locationError.code === 3 ? 'GPS location timed out. Move outside or enable device location and try again.' : 'Allow device location before taking attendance.'); setSaving(false); }, locationOptions);
  };

  const days = useMemo(() => { const grouped = new Map(); const source = chartRole === 'all' ? records : records.filter((record) => record.role === chartRole); source.forEach((record) => { const key = `${record.userId}-${String(record.attendanceDate).slice(0, 10)}`; grouped.set(key, record); }); return Array.from(grouped.values()).sort((a, b) => String(a.attendanceDate).localeCompare(String(b.attendanceDate))); }, [records, chartRole]);
  const dailyScore = days.map((record) => ({ ...record, score: record.scoreDeduction ? Math.max(12, 100 - Number(record.scoreDeduction) * 10) : 100 }));
  const formatTime = (value) => {
    const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '--:--';
    const date = new Date(); date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const minutesUntil = (value) => {
    const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    const target = new Date(now); target.setHours(hours, minutes, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / 60000);
  };
  const morningMinutes = minutesUntil(settings?.morningCutoff);
  const afternoonMinutes = minutesUntil(settings?.afternoonTime);
  const warningText = !isAdmin && [morningMinutes, afternoonMinutes].some((minutes) => minutes !== null && minutes >= 0 && minutes <= 2)
    ? 'Ihutire gukora attendance kuko igihe cyenda kugera.'
    : '';
  const filteredRecords = chartRole === 'all' ? records : records.filter((record) => record.role === chartRole);
  const todayRecord = records.find((record) => String(record.attendanceDate).slice(0, 10) === new Date().toISOString().slice(0, 10) && record.userId === user?.id);
  const sameSettingsVersion = todayRecord?.attendanceSettingsUpdatedAt && settings?.updatedAt && new Date(todayRecord.attendanceSettingsUpdatedAt).getTime() === new Date(settings.updatedAt).getTime();
  const sessionRecorded = sameSettingsVersion && (session === 'morning' ? Boolean(todayRecord?.morningStatus) : Boolean(todayRecord?.afternoonStatus));
  const statusCounts = ['present', 'late', 'on_time', 'before_time', 'inactive'].map((status) => ({ status, count: filteredRecords.filter((record) => record.morningStatus === status || record.afternoonStatus === status).length }));
  const scoreSummaries = members.filter((member) => chartRole === 'all' || member.role === chartRole);
  const myScore = members.find((member) => member.userId === user?.id)?.scoreRemaining ?? 100;
  const departmentChart = ['teacher', 'dos', 'librarian', 'accountant'].map((role) => ({ role, total: members.filter((member) => member.role === role).length, scores: members.filter((member) => member.role === role).reduce((sum, member) => sum + Number(member.scoreRemaining || 100), 0) }));

  const photoUrl = (record) => {
    const path = record.morningPhotoPath || record.afternoonPhotoPath;
    if (!path) return '';
    return path.startsWith('http') ? path : `${(import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '')}${path}`;
  };

  const updateRecord = async (record) => {
    const morningStatus = window.prompt('Morning status', record.morningStatus || '');
    if (morningStatus === null) return;
    const afternoonStatus = window.prompt('Afternoon status', record.afternoonStatus || '');
    if (afternoonStatus === null) return;
    try { await api.patch(`/department-attendance/${record.id}`, { morningStatus: morningStatus || null, afternoonStatus: afternoonStatus || null }); setMessage('Attendance record updated.'); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to edit attendance record.'); }
  };
  const deleteRecord = async (record) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try { await api.delete(`/department-attendance/${record.id}`); setMessage('Attendance record deleted.'); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to delete attendance record.'); }
  };

  return <div className="space-y-6 p-5 sm:p-8">
    <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700"><ArrowLeft size={15} />Back</button>
    <section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl sm:p-8"><div className="flex items-start justify-between gap-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">Department attendance</p><h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Department attendance on location</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Attendance works only inside the administrator’s configured location. Weekends are automatically skipped.</p></div><ShieldCheck className="hidden text-teal-300 sm:block" size={30} /></div></section>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}{message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}{warningText && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{warningText}</div>}{!isAdmin && <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-900">Remaining attendance score: {myScore}/100<div className="mt-2 h-2 rounded-full bg-cyan-100"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${Math.max(0, Math.min(100, Number(myScore)))}%` }} /></div></div>}

    {isAdmin ? <form onSubmit={saveSettings} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><MapPin className="text-cyan-700" size={18} /><h2 className="font-display text-xl font-bold text-slate-800">Attendance location and time settings</h2></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Location name"><input required value={form.locationName} onChange={(event) => setForm({ ...form, locationName: event.target.value })} placeholder="Forever King Academy" className="input" /></Field><Field label="Allowed radius in metres"><input required min="5" type="number" value={form.radiusMeters} onChange={(event) => setForm({ ...form, radiusMeters: event.target.value })} className="input" /></Field><Field label="Morning attendance cutoff"><input required type="time" step="60" value={form.morningCutoff} onChange={(event) => setForm({ ...form, morningCutoff: event.target.value })} className="input" /></Field><Field label="Afternoon attendance time"><input required type="time" step="60" value={form.afternoonTime} onChange={(event) => setForm({ ...form, afternoonTime: event.target.value })} className="input" /></Field><Field label="Latitude"><input readOnly value={form.latitude} className="input bg-slate-100" /></Field><Field label="Longitude"><input readOnly value={form.longitude} className="input bg-slate-100" /></Field></div><div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900"><b>Saved schedule:</b> Morning cutoff {formatTime(form.morningCutoff)} · Afternoon time {formatTime(form.afternoonTime)}</div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={setCurrentLocation} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 px-4 py-3 text-xs font-bold text-cyan-700"><MapPin size={15} />Set current location</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-xs font-bold text-white disabled:opacity-60"><Save size={15} />{saving ? 'Saving...' : 'Save settings'}</button></div></form> : <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><MapPin className="text-cyan-700" size={18} /><h2 className="font-display text-xl font-bold text-slate-800">Add attendance</h2></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-cyan-50 p-3 text-sm text-cyan-900"><b>Morning cutoff:</b> {formatTime(settings?.morningCutoff)}<br /><span className="text-xs">{morningMinutes !== null && morningMinutes >= 0 ? `${morningMinutes} minute(s) remaining` : 'Time passed'}</span></div><div className="rounded-xl bg-cyan-50 p-3 text-sm text-cyan-900"><b>Afternoon time:</b> {formatTime(settings?.afternoonTime)}<br /><span className="text-xs">{afternoonMinutes !== null && afternoonMinutes >= 0 ? `${afternoonMinutes} minute(s) remaining` : 'Time passed'}</span></div></div><p className="mt-2 text-sm text-slate-500">Configured location: {settings?.locationName || 'Not configured'} · Radius: {settings?.radiusMeters || 5}m</p><div className="mt-5 flex flex-wrap gap-2">{['morning', 'afternoon'].map((value) => <button type="button" key={value} onClick={() => setSession(value)} className={`rounded-xl px-4 py-2.5 text-xs font-bold capitalize ${session === value ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{value} attendance</button>)}</div>{cameraOpen && <div className="mt-5 overflow-hidden rounded-2xl border border-cyan-200 bg-slate-950 p-3"><video ref={videoRef} autoPlay playsInline muted className={`aspect-video w-full rounded-xl object-cover ${capturedPreview ? 'hidden' : 'block'}`} />{capturedPreview && <img src={capturedPreview} alt="Attendance preview" className="aspect-video w-full rounded-xl object-cover" />}<div className="mt-3 flex flex-wrap gap-2">{capturedPreview ? <><button type="button" onClick={retakePhoto} className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700">Retake</button><button type="button" onClick={checkIn} disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'OK attendance'}</button></> : <span className="text-xs text-slate-300">Preparing camera...</span>}</div></div>}<button type="button" onClick={openCamera} disabled={saving || !settings || cameraOpen} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-xs font-bold text-white disabled:opacity-60"><Camera size={15} />{cameraOpen ? 'Preparing photo...' : 'Confirm attendance'}</button></section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Clock3 className="text-cyan-700" size={18} /><h2 className="font-display text-xl font-bold text-slate-800">{canManageRecords ? 'Attendance records' : 'My attendance chart'}</h2></div><div className="flex gap-2"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />{canManageRecords && <select value={chartRole} onChange={(event) => setChartRole(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs"><option value="all">All departments</option>{['teacher', 'accountant', 'librarian'].map((role) => <option key={role} value={role}>{roleNames[role]}</option>)}</select>}</div></div>{canManageRecords && <><div className="mt-5 grid gap-3 sm:grid-cols-5">{statusCounts.map((item) => <div key={item.status} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{item.status.replace('_', ' ')}</p><p className="mt-1 text-xl font-black text-slate-800">{item.count}</p><div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${filteredRecords.length ? `${(item.count / filteredRecords.length) * 100}%` : '0%'}` }} /></div></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{scoreSummaries.map((record) => <div key={record.userId} className="rounded-xl border border-cyan-100 bg-cyan-50 p-3"><p className="truncate text-xs font-bold text-slate-800">{record.fullName}</p><p className="mt-1 text-[10px] uppercase text-slate-500">{roleNames[record.role] || record.role}</p><p className="mt-2 text-xl font-black text-cyan-700">{record.scoreRemaining ?? 100}<span className="text-xs text-slate-500">/100</span></p></div>)}</div></>}<div className="mt-5 flex h-48 items-end gap-1 overflow-x-auto border-b border-slate-200 pb-1">{dailyScore.length ? dailyScore.map((record) => <div key={`${record.userId}-${record.attendanceDate}`} title={`${record.attendanceDate}: ${record.morningStatus || 'inactive'} / ${record.afternoonStatus || 'inactive'}`} className="flex min-w-8 flex-1 flex-col items-center justify-end gap-1"><div className={`w-full rounded-t-md ${record.morningStatus === 'late' || record.afternoonStatus === 'before_time' ? 'bg-amber-400' : record.morningStatus === 'inactive' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ height: `${record.score}%` }} /><span className="text-[9px] text-slate-400">{String(record.attendanceDate).slice(8, 10)}</span></div>) : <p className="m-auto text-sm text-slate-400">No attendance records for this month.</p>}</div>{!canManageRecords && <p className="mt-3 text-xs text-slate-500">Green = complete day, amber = late/before time, red = inactive.</p>}</section>
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><table className="w-full min-w-[1100px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Date</th>{canManageRecords && <><th className="px-3 py-3">Department</th><th className="px-3 py-3">Name</th><th className="px-3 py-3">Score remaining</th></>}<th className="px-3 py-3">Morning</th><th className="px-3 py-3">Afternoon</th><th className="px-3 py-3">Deduction</th><th className="px-3 py-3">Photo</th>{canManageRecords && <th className="px-3 py-3">Actions</th>}</tr></thead><tbody>{filteredRecords.map((record) => <tr key={record.id} className="border-b border-slate-100"><td className="px-3 py-3">{String(record.attendanceDate).slice(0, 10)}</td>{canManageRecords && <><td className="px-3 py-3 capitalize">{roleNames[record.role] || record.role}</td><td className="px-3 py-3 font-bold">{record.fullName}</td><td className="px-3 py-3 font-bold text-cyan-700">{record.scoreRemaining ?? 100}/100</td></>}<td className="px-3 py-3 capitalize">{record.morningStatus || 'inactive'}<small className="ml-2 text-slate-400">{record.morningAt ? String(record.morningAt).slice(11, 16) : ''}</small></td><td className="px-3 py-3 capitalize">{record.afternoonStatus || 'inactive'}<small className="ml-2 text-slate-400">{record.afternoonAt ? String(record.afternoonAt).slice(11, 16) : ''}</small></td><td className="px-3 py-3 font-bold text-rose-600">{record.scoreDeduction || 0}</td><td className="px-3 py-3">{record.morningPhotoPath || record.afternoonPhotoPath ? <a href={(record.morningPhotoPath || record.afternoonPhotoPath).startsWith('http') ? (record.morningPhotoPath || record.afternoonPhotoPath) : `${(import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '')}${record.morningPhotoPath || record.afternoonPhotoPath}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-cyan-700"><Eye size={14} />View</a> : '-'}</td>{canManageRecords && <td className="px-3 py-3"><div className="flex gap-2"><button type="button" onClick={() => updateRecord(record)} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">Edit</button><button type="button" onClick={() => deleteRecord(record)} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700"><Trash2 size={13} />Delete</button></div></td>}</tr>)}</tbody></table>{loading && <p className="p-5 text-center text-sm text-slate-400">Loading...</p>}</section>
    {photoPreview && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-5" onClick={() => setPhotoPreview('')}><div className="relative max-h-[90vh] max-w-3xl rounded-2xl bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setPhotoPreview('')} className="absolute right-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-sm font-bold text-white">Close</button><img src={photoPreview} alt="Attendance evidence" className="max-h-[82vh] max-w-full rounded-xl object-contain" /></div></div>}
  </div>;
}

function Field({ label, children }) { return <label className="space-y-2"><span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>; }
