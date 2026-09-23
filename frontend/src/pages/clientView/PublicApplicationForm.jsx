import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Upload, X } from 'lucide-react';
import api from '../../lib/api';

const emptyForm = { applicantName: '', parentEmail: '', desiredClass: '', birthday: '', gender: '', academicYear: '', motherName: '', motherPhone: '', fatherName: '', fatherPhone: '', province: '', district: '', sector: '', cell: '', village: '', previousSchool: '' };
const steps = ['Personal', 'Academic', 'Account'];
export const fallbackLocations = [
    ['Kigali City', 'Kigali', ['Nyarugenge', 'Gasabo', 'Kicukiro']],
    ['Northern Province', 'North', ['Rulindo', 'Gakenke', 'Musanze', 'Burera', 'Gicumbi']],
    ['Southern Province', 'South', ['Nyanza', 'Gisagara', 'Nyaruguru', 'Huye', 'Nyamagabe', 'Ruhango', 'Muhanga', 'Kamonyi']],
    ['Eastern Province', 'East', ['Rwamagana', 'Nyagatare', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Bugesera']],
    ['Western Province', 'West', ['Karongi', 'Rutsiro', 'Rubavu', 'Nyabihu', 'Ngororero', 'Rusizi', 'Nyamasheke']],
].flatMap(([province_name, province_code, districtNames]) => [
    { province_name, province_code },
    ...districtNames.flatMap((district_name, districtIndex) => {
        const district_code = `${province_code}-${districtIndex + 1}`;
        return [
            { province_name, province_code, district_name, district_code },
            ...[1, 2, 3].flatMap((sectorNumber) => {
                const sector_code = `${district_code}-S${sectorNumber}`;
                const sector_name = `${district_name} Sector ${sectorNumber}`;
                return [
                    { province_name, province_code, district_name, district_code, sector_name, sector_code },
                    ...[1, 2, 3].flatMap((cellNumber) => {
                        const cell_code = `${sector_code}-C${cellNumber}`;
                        const cell_name = `${sector_name} Cell ${cellNumber}`;
                        return [
                            { province_name, province_code, district_name, district_code, sector_name, sector_code, cell_name, cell_code },
                            ...[1, 2, 3].map((villageNumber) => ({
                                province_name,
                                province_code,
                                district_name,
                                district_code,
                                sector_name,
                                sector_code,
                                cell_name,
                                cell_code,
                                village_name: `${cell_name} Village ${villageNumber}`,
                                village_code: `${cell_code}-V${villageNumber}`,
                            })),
                        ];
                    }),
                ];
            }),
        ];
    }),
]);

export default function PublicApplicationForm({ onClose }) {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState(emptyForm);
    const [files, setFiles] = useState({ applicantPhoto: null, report: null });
    const [classes, setClasses] = useState([]);
    const [currentYear, setCurrentYear] = useState(null);
    const [locations, setLocations] = useState([]);
    const [status, setStatus] = useState({ loading: false, error: '', success: '' });
    useEffect(() => {
        Promise.all([api.get('/public/classes'), api.get('/public/academic-years/current')]).then(([classResponse, yearResponse]) => {
            setClasses(classResponse.data.classes || []); setCurrentYear(yearResponse.data); setLocations(fallbackLocations); setForm((current) => ({ ...current, academicYear: yearResponse.data?.name || '' }));
        }).catch(() => setStatus((current) => ({ ...current, error: 'Unable to load the current academic year and classes.' })));
    }, []);
    const update = (field) => (event) => { const value = event.target.value; setForm((current) => ({ ...current, [field]: value, ...(field === 'province' ? { district: '', sector: '', cell: '', village: '' } : {}), ...(field === 'district' ? { sector: '', cell: '', village: '' } : {}), ...(field === 'sector' ? { cell: '', village: '' } : {}), ...(field === 'cell' ? { village: '' } : {}) })); };
    const next = (event) => { event.preventDefault(); const validContact = (value) => value.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : /^\+?[0-9\s()-]{7,20}$/.test(value); if (step === 1 && (!form.motherPhone.trim() || !form.fatherPhone.trim() || !validContact(form.motherPhone.trim()) || !validContact(form.fatherPhone.trim()))) { setStatus((current) => ({ ...current, error: 'Enter a valid phone number or email for both parents.' })); return; } setStatus((current) => ({ ...current, error: '' })); setStep((current) => Math.min(current + 1, 2)); };
    const back = () => setStep((current) => Math.max(current - 1, 0));
    const submit = async (event) => { event.preventDefault(); setStatus({ loading: true, error: '', success: '' }); const data = new FormData(); Object.entries(form).forEach(([key, value]) => data.append(key, value)); data.append('parentPhone', ''); if (files.applicantPhoto) data.append('applicantPhoto', files.applicantPhoto); if (files.report) data.append('report', files.report); try { const { data: response } = await api.post('/applications', data, { headers: { 'Content-Type': 'multipart/form-data' } }); setForm(emptyForm); setFiles({ applicantPhoto: null, report: null }); setStep(0); setStatus({ loading: false, error: '', success: `Application submitted. Your application number is ${response.id}. Check your parent email for the review code.` }); } catch (requestError) { setStatus({ loading: false, error: requestError.response?.data?.error || 'Unable to submit your application. Please try again.', success: '' }); } };
    const optionLabelMap = {
        province_code: 'province_name',
        district_code: 'district_name',
        sector_code: 'sector_name',
        cell_code: 'cell_name',
        village_code: 'village_name',
    };
    const options = (code, parentCode, parentValue) => {
        const seen = new Map();
        for (const item of locations) {
            if (item[code] == null) continue;
            if (parentValue != null) {
                if (!parentCode || String(item[parentCode] ?? '') !== String(parentValue)) continue;
            }
            const value = String(item[optionLabelMap[code]] || item[code]);
            if (!seen.has(value)) {
                seen.set(value, { value, name: value });
            }
        }
        return [...seen.values()];
    };
    const provinces = options('province_code'); const districts = options('district_code', 'province_name', form.province); const sectors = options('sector_code', 'district_name', form.district); const cells = options('cell_code', 'sector_name', form.sector); const villages = options('village_code', 'cell_name', form.cell);
    const personal = step === 0; const academic = step === 1;
    return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"><div className="bg-gradient-to-r from-[#4438a8] to-[#6435c5] px-5 py-6 text-white sm:px-8"><div className="mx-auto flex max-w-3xl items-center">{steps.map((label, index) => <div key={label} className="flex flex-1 items-center"><div className="text-center"><span className={`mx-auto grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${step >= index ? 'bg-amber-400 text-white' : 'bg-white/20 text-white/80'}`}>{index + 1}</span><span className="mt-1 block text-[11px] font-bold">{label}</span></div>{index < 2 && <span className={`mx-2 h-0.5 flex-1 ${step > index ? 'bg-amber-300' : 'bg-white/20'}`} />}</div>)}</div></div><div className="p-6 sm:p-8"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Step {step + 1} of 3</p><h2 className="mt-2 font-display text-2xl font-bold text-slate-800">{steps[step]} information</h2></div>{onClose && <button onClick={onClose} aria-label="Close application form" className="text-slate-400"><X size={20} /></button>}</div>{status.success && <p className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><CheckCircle2 size={16} />{status.success}</p>}{status.error && <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{status.error}</p>}<form onSubmit={step < 2 ? next : submit} className="grid gap-4 sm:grid-cols-2">{personal && <><Field label="Full name" value={form.applicantName} onChange={update('applicantName')} required /><Field label="Parent email" type="email" value={form.parentEmail} onChange={update('parentEmail')} required /><SelectField label="Desired class" value={form.desiredClass} onChange={update('desiredClass')} options={[['', classes.length ? 'Select class' : 'No classes available'], ...classes.map((item) => [item.name, item.name])]} required /><Field label="Birthday" type="date" value={form.birthday} onChange={update('birthday')} required /><SelectField label="Gender" value={form.gender} onChange={update('gender')} options={[['', 'Select gender'], ['male', 'Male'], ['female', 'Female'], ['other', 'Other']]} required /><Field label="Academic year" value={form.academicYear || currentYear?.name || ''} onChange={update('academicYear')} required readOnly /><FileField label="Applicant photo" accept="image/jpeg,image/png,image/webp" file={files.applicantPhoto} onChange={(file) => setFiles((current) => ({ ...current, applicantPhoto: file }))} /><FileField label="Report or result slip" accept="image/jpeg,image/png,image/webp,application/pdf" file={files.report} onChange={(file) => setFiles((current) => ({ ...current, report: file }))} /></>}{academic && <><Field label="Mother name" value={form.motherName} onChange={update('motherName')} required /><Field label="Mother phone or email" value={form.motherPhone} onChange={update('motherPhone')} required /><Field label="Father name" value={form.fatherName} onChange={update('fatherName')} required /><Field label="Father phone or email" value={form.fatherPhone} onChange={update('fatherPhone')} required /></>}{step === 2 && <><SelectField label="Province" value={form.province} onChange={update('province')} options={[['', 'Select province'], ...provinces.map((item) => [item.value, item.name])]} required /><SelectField label="District" value={form.district} onChange={update('district')} options={[['', 'Select district'], ...districts.map((item) => [item.value, item.name])]} required disabled={!form.province} /><SelectField label="Sector" value={form.sector} onChange={update('sector')} options={[['', 'Select sector'], ...sectors.map((item) => [item.value, item.name])]} required disabled={!form.district} /><SelectField label="Cell" value={form.cell} onChange={update('cell')} options={[['', 'Select cell'], ...cells.map((item) => [item.value, item.name])]} required disabled={!form.sector} /><SelectField label="Village" value={form.village} onChange={update('village')} options={[['', 'Select village'], ...villages.map((item) => [item.value, item.name])]} required disabled={!form.cell} /><Field label="Previous school" value={form.previousSchool} onChange={update('previousSchool')} /></>}<div className="mt-4 flex gap-3 sm:col-span-2">{step > 0 && <button type="button" onClick={back} className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600"><ArrowLeft size={15} /> Back</button>}<button disabled={status.loading || (step === 0 && !classes.length)} className="ml-auto flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{status.loading ? 'Submitting...' : step < 2 ? 'Continue' : 'Submit application'} <ArrowRight size={15} /></button></div></form></div></section>;
}
function Field({ label, value, onChange, type = 'text', required = false, readOnly = false }) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">{label}{required && ' *'}</span><input required={required} readOnly={readOnly} type={type} value={value} onChange={onChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-cyan-600 read-only:bg-slate-50" /></label>; }
function SelectField({ label, value, onChange, options, required = false, disabled = false }) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">{label}{required && ' *'}</span><select required={required} disabled={disabled} value={value} onChange={onChange} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-50">{options.map(([optionValue, optionLabel], index) => <option key={`${optionValue}-${index}`} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function FileField({ label, accept, file, onChange }) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">{label}</span><span className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500 hover:border-cyan-600"><Upload size={16} className="text-cyan-700" />{file?.name || 'Choose file'}<input type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] || null)} className="hidden" /></span></label>; }
