import { useEffect, useState } from 'react';
import api from '../../lib/api';
import UploadTestSidebar from '../../components/UploadTestSidebar';

export default function ActivitiesTab({ subject, user }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', durationMinutes: '30' });
  const [showUploader, setShowUploader] = useState(false);

  const subjectId = Number(subject?.subjectId ?? subject?.id ?? 0);
  const classId = Number(subject?.classId ?? 0);
  const canManage = ['admin', 'dos', 'teacher'].includes(user?.role);

  useEffect(() => {
    let active = true;

    const loadActivities = async () => {
      if (!subjectId || !classId) {
        setActivities([]);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const { data } = await api.get('/tests');
        const filtered = (data.tests || []).filter((test) => Number(test.subjectId) === subjectId && Number(test.classId) === classId);
        if (active) setActivities(filtered);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.error || 'Unable to load activities.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadActivities();
    return () => { active = false; };
  }, [subjectId, classId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!subjectId || !classId || !form.title.trim()) {
      setError('Please provide a valid test title.');
      return;
    }

    try {
      setError('');
      await api.post('/tests', {
        title: form.title.trim(),
        subjectId,
        classId,
        durationMinutes: Number(form.durationMinutes || 30),
        isPublished: true,
      });
      setForm({ title: '', durationMinutes: '30' });
      const { data } = await api.get('/tests');
      setActivities((data.tests || []).filter((test) => Number(test.subjectId) === subjectId && Number(test.classId) === classId));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to create the activity.');
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">Assessment builder</p>
            <button
              type="button"
              onClick={() => setShowUploader((value) => !value)}
              className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-bold text-white"
            >
              {showUploader ? 'Hide upload tool' : 'Add activity'}
            </button>
          </div>

          {showUploader ? (
            <UploadTestSidebar
              t={{}}
              onClose={() => setShowUploader(false)}
              classId={classId}
              subjectId={subjectId}
              fullPage={false}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[1.5fr_0.7fr_auto]">
                <label className="text-xs font-semibold text-slate-600">
                  Activity / test title
                  <input
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300"
                    placeholder="Assessment, Quiz, Project"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Minutes
                  <input
                    type="number"
                    min="1"
                    value={form.durationMinutes}
                    onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-300"
                  />
                </label>
                <div className="flex items-end">
                  <button type="submit" className="w-full rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white">
                    Add activity
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading activities...</div>
      ) : activities.length ? (
        <div className="space-y-3">
          {activities.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-800">{item.title}</p>
                <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">
                  {item.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{item.subjectName || subject?.subjectName} · {item.durationMinutes || 30} min</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          No tests or assessments have been added for this subject yet.
        </div>
      )}
    </div>
  );
}
