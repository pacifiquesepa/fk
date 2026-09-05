import { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Phone, Save, Shield, User } from 'lucide-react';
import api from '../lib/api';

export default function SettingsPage({ user, t, onBack, onUserUpdated }) {
    const [form, setForm] = useState({
        fullName: user?.name || '',
        phone: user?.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [status, setStatus] = useState(null);
    const [saving, setSaving] = useState(false);

    const uploadPhoto = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setStatus(null);
        const data = new FormData();
        data.append('photo', file);
        try {
            const { data: response } = await api.post('/auth/profile/photo-upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            onUserUpdated({ ...user, photoKey: response.photoKey });
            setStatus({ type: 'success', text: response.message });
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.error || 'Unable to upload your photo.' });
        }
    };

    const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setStatus(null);
        if (!form.fullName.trim()) return setStatus({ type: 'error', text: 'Full name is required.' });
        if (form.newPassword && form.newPassword !== form.confirmPassword) return setStatus({ type: 'error', text: 'New passwords do not match.' });
        setSaving(true);
        try {
            const { data } = await api.patch('/auth/profile', {
                fullName: form.fullName,
                phone: form.phone,
                currentPassword: form.currentPassword,
                newPassword: form.newPassword
            });
            onUserUpdated(data.user);
            setForm((current) => ({ ...current, currentPassword: '', newPassword: '', confirmPassword: '' }));
            setStatus({ type: 'success', text: data.message });
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.error || 'Unable to update your profile.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700 hover:text-cyan-900"><ArrowLeft size={16} />{t.overview}</button>
            <section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl shadow-cyan-950/10 sm:p-8">
                <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10"><User size={25} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">{t.app}</p><h1 className="mt-2 font-display text-2xl font-bold">Account settings</h1><p className="mt-1 text-sm text-slate-300">Update your personal details and account security.</p></div></div>
            </section>
            <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                {status && <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs ${status.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{status.text}</div>}
                <section><h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-800"><User size={18} className="text-cyan-700" />Personal information</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Full name" value={form.fullName} onChange={update('fullName')} required /><Field label="Phone number" value={form.phone} onChange={update('phone')} icon={Phone} /><ReadOnly label="Email" value={user?.email} /><ReadOnly label="Role" value={user?.role} icon={Shield} /></div><div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4"><p className="text-xs font-bold text-cyan-800">Profile photo</p><div className="mt-3 flex flex-wrap gap-2"><label className="cursor-pointer rounded-xl bg-cyan-700 px-4 py-3 text-xs font-bold text-white">Upload photo<input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" /></label><label className="cursor-pointer rounded-xl bg-teal-700 px-4 py-3 text-xs font-bold text-white">Use camera<input type="file" accept="image/*" capture="user" onChange={uploadPhoto} className="hidden" /></label></div></div></section>
                <section><h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-800"><KeyRound size={18} className="text-cyan-700" />Change password</h2><p className="mt-1 text-xs text-slate-500">Leave these fields empty if you do not want to change your password.</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Current password" type="password" value={form.currentPassword} onChange={update('currentPassword')} /><Field label="New password" type="password" value={form.newPassword} onChange={update('newPassword')} minLength={8} /><Field label="Confirm password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} minLength={8} /></div></section>
                <button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-[#1d7b91] px-5 py-3 text-xs font-bold text-white hover:bg-[#155f70] disabled:opacity-50"><Save size={16} />{saving ? 'Saving...' : 'Save changes'}</button>
            </form>
        </div>
    );
}

function Field({ label, icon: Icon, ...props }) {
    return <label className="block text-xs font-bold text-slate-600">{label}<span className="relative mt-2 block">{Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}<input {...props} className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-cyan-600 ${Icon ? 'pl-10' : ''}`} /></span></label>;
}

function ReadOnly({ label, value, icon: Icon }) {
    return <div><label className="text-xs font-bold text-slate-600">{label}</label><p className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm capitalize text-slate-500">{Icon && <Icon size={15} />}{value || '-'}</p></div>;
}
