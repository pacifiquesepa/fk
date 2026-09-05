import { useEffect, useState } from 'react';
import { ArrowLeft, Bus, MapPin, Plus, Printer, RefreshCw, Users } from 'lucide-react';
import DataTable from '../components/DataTable';
import api from '../lib/api';

export default function TransportPage({ user, t, onBack }) {
    const canManage = ['admin', 'dos', 'accountant'].includes(user?.role);
    const [routes, setRoutes] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showRouteForm, setShowRouteForm] = useState(false);
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        setLoading(true); setError('');
        try {
            const requests = [api.get('/transport/routes'), api.get('/transport/assignments')];
            if (canManage) requests.push(api.get('/students'));
            const responses = await Promise.all(requests);
            setRoutes(responses[0].data.routes || []);
            setAssignments(responses[1].data.assignments || []);
            if (canManage) setStudents(responses[2].data.students || []);
        } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to load transport records.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [user?.role]);
    const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
    const saveRoute = async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); try { await api.post('/transport/routes', { ...data, capacity: Number(data.capacity) }); setShowRouteForm(false); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to save route.'); } };
    const assignStudent = async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const route = routes.find((item) => item.id === Number(data.routeId)); if (route && Number(route.availableCapacity) < 1) { setError('This route has reached its capacity.'); return; } try { await api.post('/transport/assign', { studentId: Number(data.studentId), routeId: Number(data.routeId), pickupPoint: data.pickupPoint }); setShowAssignForm(false); await load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Unable to assign student.'); } };

    return <div className="space-y-7">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-cyan-700 hover:text-cyan-900"><ArrowLeft size={16} />{t.overview}</button>
        <section className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl shadow-cyan-950/10 sm:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-cyan-100"><Bus size={28} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">{t.app}</p><h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Transport workspace</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Manage buses, routes, drivers and student pickup points.</p></div></div><div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-bold"><Printer size={15} /> Print</button><button onClick={refresh} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-xs font-bold"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button></div></div></section>
        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">{error}</div>}
        <section className="grid gap-4 sm:grid-cols-3"><Metric title="Routes" value={routes.length} icon={<MapPin size={18} />} /><Metric title="Assigned students" value={assignments.length} icon={<Users size={18} />} /><Metric title="Available capacity" value={routes.reduce((sum, route) => sum + Number(route.availableCapacity ?? route.capacity ?? 0), 0)} icon={<Bus size={18} />} /></section>
        {canManage && <div className="flex flex-wrap gap-3"><button onClick={() => setShowRouteForm((value) => !value)} className="flex items-center gap-2 rounded-xl bg-[#1d7b91] px-4 py-3 text-xs font-bold text-white"><Plus size={15} /> Add route</button><button onClick={() => setShowAssignForm((value) => !value)} className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-3 text-xs font-bold text-cyan-800"><Plus size={15} /> Assign student</button></div>}
        {showRouteForm && <form onSubmit={saveRoute} className="grid gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-5 sm:grid-cols-2"><input name="name" required placeholder="Route name" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" /><input name="busNumber" required placeholder="Bus number" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" /><input name="driverName" required placeholder="Driver name" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" /><input name="driverPhone" required placeholder="Driver phone" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" /><input name="capacity" required min="1" type="number" placeholder="Capacity" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" /><button className="rounded-xl bg-[#1d7b91] px-4 py-3 text-xs font-bold text-white">Save route</button></form>}
        {showAssignForm && <form onSubmit={assignStudent} className="grid gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-5 sm:grid-cols-3"><select name="studentId" required className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs"><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName} · {student.className}</option>)}</select><select name="routeId" required className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs"><option value="">Select route</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.name} · {route.busNumber}</option>)}</select><input name="pickupPoint" required placeholder="Pickup point" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs" /><button className="rounded-xl bg-[#1d7b91] px-4 py-3 text-xs font-bold text-white sm:col-span-3">Assign transport</button></form>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-5 font-display text-base font-bold text-slate-800">Transport routes</h2>{loading ? <div className="p-12 text-center text-xs text-slate-400">{t.loading}</div> : <DataTable columns={[{ key: 'name', label: 'Route' }, { key: 'busNumber', label: 'Bus' }, { key: 'driverName', label: 'Driver' }, { key: 'driverPhone', label: 'Phone' }, { key: 'assignedCount', label: 'Assigned' }, { key: 'availableCapacity', label: 'Available' }, { key: 'capacity', label: 'Capacity' }]} rows={routes} emptyLabel="No routes available." />}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-5 font-display text-base font-bold text-slate-800">Student transport assignments</h2>{loading ? <div className="p-12 text-center text-xs text-slate-400">{t.loading}</div> : <DataTable columns={[{ key: 'studentName', label: 'Student' }, { key: 'className', label: 'Class' }, { key: 'routeName', label: 'Route' }, { key: 'busNumber', label: 'Bus' }, { key: 'pickupPoint', label: 'Pickup point' }]} rows={assignments} emptyLabel="No student assignments available." />}</section>
    </div>;
}

function Metric({ title, value, icon }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">{icon}</div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p><p className="mt-2 text-2xl font-black text-slate-800">{value}</p></div>; }
