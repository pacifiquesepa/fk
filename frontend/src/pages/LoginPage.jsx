import { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import api from '../lib/api';

export default function LoginPage({ t, language, onLanguageChange, onAuthenticated, onBackToPublic }) {
  const [step, setStep] = useState('password');
  const [form, setForm] = useState({ identifier: '', password: '', code: '', challengeId: '', resetToken: '', newPassword: '', confirmPassword: '' });
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  useEffect(() => {
    if (!secondsLeft) return undefined;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  async function submitPassword(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (!form.identifier.trim() || form.password.length < 8) return setError('Enter a valid username/email and a password of at least 8 characters.');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { identifier: form.identifier.trim(), password: form.password });
      if (data.requiresOtp) { setForm((current) => ({ ...current, challengeId: data.challengeId, code: '' })); setNotice(`${t.otpHint} ${data.destination}`); setSecondsLeft(data.expiresInSeconds || 300); setStep('otp'); } else onAuthenticated(data);
    } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to sign in. Please try again.'); } finally { setBusy(false); }
  }

  async function submitOtp(event) {
    event.preventDefault(); setError('');
    if (!/^\d{6}$/.test(form.code)) return setError(t.incorrectOtp);
    setBusy(true);
    try { const { data } = await api.post('/auth/verify-otp', { challengeId: form.challengeId, code: form.code }); onAuthenticated(data); } catch (requestError) { setError(requestError.response?.data?.error || 'The verification code is not valid.'); } finally { setBusy(false); }
  }

  async function resendLogin() {
    setError(''); setBusy(true);
    try { const { data } = await api.post('/auth/resend-otp', { challengeId: form.challengeId }); setForm((current) => ({ ...current, challengeId: data.challengeId, code: '' })); setNotice(`${t.otpHint} ${data.destination}`); setSecondsLeft(data.expiresInSeconds || 300); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to resend the code.'); } finally { setBusy(false); }
  }

  async function requestReset(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (!form.identifier.trim()) return setError('Enter your email address or username.');
    setBusy(true);
    try { const { data } = await api.post('/auth/forgot-password', { identifier: form.identifier.trim() }); setForm((current) => ({ ...current, challengeId: data.challengeId, code: '' })); setNotice(`A reset code was sent to ${data.destination}.`); setSecondsLeft(120); setStep('resetOtp'); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to send a reset code.'); } finally { setBusy(false); }
  }

  async function verifyReset(event) {
    event.preventDefault(); setError('');
    if (!/^\d{6}$/.test(form.code)) return setError('Enter the six-digit OTP.');
    if (!secondsLeft) return setError('This OTP is invalid or expired. Request a new code.');
    setBusy(true);
    try { const { data } = await api.post('/auth/verify-reset-otp', { challengeId: form.challengeId, code: form.code }); setForm((current) => ({ ...current, resetToken: data.resetToken })); setStep('newPassword'); setNotice('OTP verified. Create your new password.'); } catch (requestError) { setError(requestError.response?.data?.error || 'This OTP is invalid or expired.'); } finally { setBusy(false); }
  }

  async function resendReset() { setError(''); setBusy(true); try { const { data } = await api.post('/auth/forgot-password', { identifier: form.identifier.trim() }); setForm((current) => ({ ...current, challengeId: data.challengeId, code: '' })); setNotice(`A new reset code was sent to ${data.destination}.`); setSecondsLeft(120); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to resend the reset code.'); } finally { setBusy(false); } }

  async function savePassword(event) {
    event.preventDefault(); setError('');
    if (form.newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match.');
    setBusy(true);
    try { await api.post('/auth/reset-password', { resetToken: form.resetToken, password: form.newPassword }); setNotice('Password reset successfully. You can now sign in.'); setForm((current) => ({ ...current, password: '', code: '', newPassword: '', confirmPassword: '' })); setStep('password'); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to reset password.'); } finally { setBusy(false); }
  }

  const backToPassword = () => { setError(''); setNotice(''); setSecondsLeft(0); setStep('password'); };
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0'); const seconds = String(secondsLeft % 60).padStart(2, '0');
  return <div className="min-h-screen bg-[#102b35] text-white"><div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]"><section className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(74,190,183,0.24),transparent_32%),linear-gradient(135deg,#123641,#0d232b)]" /><div className="relative z-10 flex items-center gap-3"><img src="/forever.jpg" alt="Forever King Academy logo" className="h-12 w-12 rounded-xl border border-white/15 object-cover shadow-lg shadow-cyan-950/20 sm:h-14 sm:w-14" /><div><b className="font-display text-sm">Forever King</b><span className="block text-[9px] font-bold tracking-[0.2em] text-teal-200/60">ACADEMY · FKAMS</span></div></div><div className="relative z-10 max-w-xl pb-10"><p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-teal-200/70">Forever King Digital Platform</p><h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight">One calm place to run your school.</h1><p className="mt-6 max-w-md text-sm leading-7 text-slate-300">Students, teachers, families and school operations connected with clarity and care.</p></div><p className="relative z-10 text-[11px] text-slate-400">© 2026 Forever King Academy · FKAMS</p></section><section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-10"><div className="w-full max-w-md"><div className="mb-12 flex items-center justify-between lg:justify-end"><div className="flex items-center gap-2 lg:hidden"><img src="/forever.jpg" alt="Forever King Academy logo" className="h-9 w-9 rounded-lg border border-white/15 object-cover shadow-lg shadow-cyan-950/20" /><b className="font-display text-sm">Forever King</b></div><LanguageSwitcher language={language} onChange={onLanguageChange} light /></div><div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur sm:p-8"><LockKeyhole className="text-teal-300" size={24} /><h2 className="mt-5 font-display text-2xl font-bold">{step === 'password' ? 'Welcome back' : step === 'newPassword' ? 'Create new password' : 'Verify your code'}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{step === 'password' ? 'Sign in to your secure school workspace.' : step === 'newPassword' ? 'Your OTP was accepted. Choose a strong password.' : 'The code expires after two minutes for password recovery.'}</p>{notice && <p className="mt-5 rounded-xl bg-teal-300/10 px-4 py-3 text-xs text-teal-100">{notice}</p>}{error && <p className="mt-5 rounded-xl bg-rose-400/10 px-4 py-3 text-xs text-rose-200">{error}</p>}{step === 'password' && <form onSubmit={submitPassword} className="mt-7 grid gap-4"><Input label="Username or email" value={form.identifier} onChange={update('identifier')} /><label className="grid gap-2 text-xs font-semibold text-slate-300">Password<div className="relative"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white outline-none focus:border-teal-300" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><button disabled={busy} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 py-3.5 text-xs font-extrabold text-[#10333d] disabled:opacity-50">{busy ? 'Signing in...' : 'Sign in'} <ArrowRight size={16} /></button><button type="button" onClick={() => { setError(''); setNotice(''); setStep('forgot'); }} className="text-xs font-semibold text-teal-200 hover:text-white">Forgot password?</button></form>}{step === 'forgot' && <form onSubmit={requestReset} className="mt-7 grid gap-4"><Input label="Email or username" value={form.identifier} onChange={update('identifier')} /><button disabled={busy} className="rounded-xl bg-teal-300 px-4 py-3.5 text-xs font-extrabold text-[#10333d] disabled:opacity-50">{busy ? 'Sending code...' : 'Send OTP'}</button><button type="button" onClick={backToPassword} className="text-xs font-semibold text-slate-300 hover:text-white">Back to sign in</button></form>}{(step === 'otp' || step === 'resetOtp') && <form onSubmit={step === 'otp' ? submitOtp : verifyReset} className="mt-7 grid gap-4"><Input label="Six-digit OTP" value={form.code} onChange={update('code')} inputMode="numeric" maxLength={6} /><p className={`text-center text-xs ${secondsLeft ? 'text-teal-200' : 'text-rose-300'}`}>{secondsLeft ? `Time remaining: ${minutes}:${seconds}` : 'This code has expired.'}</p><button disabled={busy || !secondsLeft} className="rounded-xl bg-teal-300 px-4 py-3.5 text-xs font-extrabold text-[#10333d] disabled:opacity-50">{busy ? 'Verifying...' : 'Verify OTP'}</button><button type="button" disabled={busy} onClick={step === 'otp' ? resendLogin : resendReset} className="text-xs font-semibold text-teal-200 hover:text-white disabled:opacity-50">Resend OTP</button><button type="button" onClick={step === 'otp' ? backToPassword : () => setStep('forgot')} className="text-xs font-semibold text-slate-300 hover:text-white">Back</button></form>}{step === 'newPassword' && <form onSubmit={savePassword} className="mt-7 grid gap-4"><Input label="New password" type="password" value={form.newPassword} onChange={update('newPassword')} /><Input label="Confirm new password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} /><button disabled={busy} className="rounded-xl bg-teal-300 px-4 py-3.5 text-xs font-extrabold text-[#10333d] disabled:opacity-50">{busy ? 'Saving...' : 'Reset password'}</button></form>}<button onClick={onBackToPublic} className="mt-6 text-xs font-semibold text-slate-400 hover:text-white">Back to public site</button></div></div></section></div></div>;
}

function Input({ label, value, onChange, type = 'text', inputMode, maxLength }) { return <label className="grid gap-2 text-xs font-semibold text-slate-300">{label}<input required value={value} onChange={onChange} type={type} inputMode={inputMode} maxLength={maxLength} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-teal-300" /></label>; }
