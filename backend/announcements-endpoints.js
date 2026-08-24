/**
 * Announcements API Endpoints (add to backend/server.js)
 * Handles student notifications for test uploads
 */

module.exports = ({ app, pool, requireAuth }) => {
    // Get announcements for logged-in user
    app.get('/api/announcements', requireAuth, async (req, res) => {
        try {
            const [announcements] = await pool.query(
                `SELECT 
        a.id, a.title, a.message, a.type,
        a.related_test_id AS testId,
        a.created_at AS createdAt,
        u.full_name AS createdBy,
        ar.read_at AS readAt
       FROM announcements a
       LEFT JOIN announcement_recipients ar ON ar.announcement_id = a.id AND ar.user_id = ?
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.id IN (
         SELECT announcement_id FROM announcement_recipients WHERE user_id = ?
       )
       ORDER BY a.created_at DESC
       LIMIT 50`,
                [req.user.sub, req.user.sub]
            );

            res.json({ announcements });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to load announcements.' });
        }
    });

    // Get unread announcement count
    app.get('/api/announcements/unread/count', requireAuth, async (req, res) => {
        try {
            const [[{ unreadCount }]] = await pool.query(
                `SELECT COUNT(*) AS unreadCount 
       FROM announcement_recipients 
       WHERE user_id = ? AND read_at IS NULL`,
                [req.user.sub]
            );

            res.json({ unreadCount });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to load announcement count.' });
        }
    });

    // Mark announcement as read
    app.patch('/api/announcements/:id/read', requireAuth, async (req, res) => {
        try {
            await pool.query(
                'UPDATE announcement_recipients SET read_at = NOW() WHERE announcement_id = ? AND user_id = ? AND read_at IS NULL',
                [req.params.id, req.user.sub]
            );

            res.json({ message: 'Announcement marked as read.' });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to update announcement.' });
        }
    });

    // Mark all announcements as read
    app.patch('/api/announcements/read-all', requireAuth, async (req, res) => {
        try {
            await pool.query(
                'UPDATE announcement_recipients SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
                [req.user.sub]
            );

            res.json({ message: 'All announcements marked as read.' });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to update announcements.' });
        }
    });

};
