import UploadTestSidebar from '../components/UploadTestSidebar';

export default function UploadTestPage({ t, onBack }) {
    return (
        <div className="space-y-6">
            <div className="rounded-3xl bg-[#17333d] p-6 text-white shadow-xl shadow-cyan-950/10 sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200">Teacher assessments</p>
                <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Upload Test</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Create a complete assessment paper, add every question type, review it, set timing, and publish it to your class.</p>
            </div>
            <UploadTestSidebar t={t} onClose={onBack} fullPage />
        </div>
    );
}
