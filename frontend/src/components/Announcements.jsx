/**
 * Student Notifications Component
 * Displays test upload announcements and other notifications to students
 */

import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertCircle, X, Loader } from 'lucide-react';
import api from '../lib/api';

/**
 * AnnouncementBell Component
 * Shows unread count badge in header
 */
export function AnnouncementBell({ t }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [showPanel, setShowPanel] = useState(false);

    useEffect(() => {
        loadUnreadCount();

        // Check for new announcements every 10 seconds
        const interval = setInterval(loadUnreadCount, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadUnreadCount = async () => {
        try {
            const { data } = await api.get('/announcements/unread/count');
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="relative p-2 hover:bg-slate-100 rounded-lg transition"
                title="Announcements"
            >
                <Bell size={20} className="text-slate-700" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-rose-600 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showPanel && (
                <AnnouncementPanel
                    onClose={() => setShowPanel(false)}
                    onReadAll={() => loadUnreadCount()}
                    t={t}
                />
            )}
        </div>
    );
}

/**
 * AnnouncementPanel Component
 * Dropdown panel showing announcements
 */
export function AnnouncementPanel({ onClose, onReadAll, t }) {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/announcements');
            setAnnouncements(data.announcements || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to load announcements.');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (announcementId) => {
        try {
            await api.patch(`/announcements/${announcementId}/read`);
            setAnnouncements(
                announcements.map((a) =>
                    a.id === announcementId ? { ...a, readAt: new Date() } : a
                )
            );
        } catch (err) {
            console.error('Failed to mark announcement as read:', err);
        }
    };

    const handleReadAll = async () => {
        try {
            await api.patch('/announcements/read-all');
            setAnnouncements(
                announcements.map((a) => ({ ...a, readAt: new Date() }))
            );
            onReadAll?.();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const unreadCount = announcements.filter((a) => !a.readAt).length;

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">Announcements</h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-100 rounded"
                    title="Close"
                >
                    <X size={16} className="text-slate-600" />
                </button>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
                {error && (
                    <div className="p-4 text-sm text-rose-700 bg-rose-50">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
                        <Loader size={16} className="animate-spin" />
                        <span className="text-sm">Loading...</span>
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="p-4 text-center text-slate-600 text-sm">
                        No announcements yet.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {announcements.map((announcement) => (
                            <AnnouncementItem
                                key={announcement.id}
                                announcement={announcement}
                                onMarkAsRead={handleMarkAsRead}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {announcements.length > 0 && unreadCount > 0 && (
                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={handleReadAll}
                        className="w-full text-xs font-bold text-cyan-700 hover:text-cyan-800 py-1"
                    >
                        Mark all as read
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * AnnouncementItem Component
 * Individual announcement in the list
 */
function AnnouncementItem({ announcement, onMarkAsRead }) {
    const isUnread = !announcement.readAt;

    const getIcon = () => {
        switch (announcement.type) {
            case 'test_published':
                return '📋';
            case 'test_closed':
                return '⏹';
            case 'grade_available':
                return '📊';
            default:
                return '📢';
        }
    };

    const getColor = () => {
        switch (announcement.type) {
            case 'test_published':
                return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
            case 'test_closed':
                return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
            case 'grade_available':
                return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
            default:
                return 'bg-slate-50 border-slate-200 hover:bg-slate-100';
        }
    };

    return (
        <div
            className={`p-3 border-l-4 ${getColor()} transition cursor-pointer`}
            onClick={() => isUnread && onMarkAsRead(announcement.id)}
        >
            <div className="flex gap-2">
                <span className="text-lg flex-shrink-0">{getIcon()}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${isUnread ? 'font-bold' : 'font-medium'} text-slate-900`}>
                            {announcement.title}
                        </p>
                        {isUnread && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-cyan-600 mt-1.5" />
                        )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {announcement.message}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {new Date(announcement.createdAt).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * TestAnnouncementList Component
 * Displays test upload announcements on dashboard
 */
export function TestAnnouncementList({ t }) {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/announcements');
            // Filter only test-related announcements
            const testAnnouncements = data.announcements.filter(
                (a) => a.type === 'test_published' || a.type === 'test_closed'
            );
            setAnnouncements(testAnnouncements);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Unable to load announcements.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-4 text-slate-600">
                <Loader size={16} className="animate-spin" />
                <span>Loading announcements...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                {error}
            </div>
        );
    }

    if (announcements.length === 0) {
        return (
            <div className="text-center py-6 text-slate-600">
                <p className="text-sm">No new test announcements.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {announcements.slice(0, 5).map((announcement) => (
                <div
                    key={announcement.id}
                    className="p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition"
                >
                    <div className="flex gap-2">
                        <CheckCircle2 size={16} className="text-blue-700 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-blue-900">{announcement.title}</p>
                            <p className="text-xs text-blue-800 mt-1">{announcement.message}</p>
                            <p className="text-xs text-blue-700 mt-1">
                                {new Date(announcement.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            ))}

            {announcements.length > 5 && (
                <p className="text-xs text-slate-600 text-center py-2">
                    +{announcements.length - 5} more announcements
                </p>
            )}
        </div>
    );
}
