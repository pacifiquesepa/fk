/**
 * FKAMS Test Builder API Endpoints
 * Add these endpoints to backend/server.js after the existing test endpoints
 * 
 * These endpoints support:
 * - Test creation as drafts
 * - Multi-question building with different question types
 * - Test publishing with notifications
 * - Real-time progress monitoring
 * - Results and analytics
 */

// ============================================
// TEST DRAFT MANAGEMENT ENDPOINTS
// ============================================

module.exports = ({ app, pool, requireAuth, authorize, bodyErrors, positiveNumber }) => {

    // Create a new test as draft
    app.post('/api/teacher/tests/draft', requireAuth, authorize('teacher'), async (req, res) => {
        const error = bodyErrors(req.body, [['title', 'Test title', 180]]);
        const classId = Number(req.body?.classId);
        const subjectId = Number(req.body?.subjectId);
        const duration = Number(req.body?.durationMinutes) || 60;

        if (error || !Number.isInteger(classId) || !Number.isInteger(subjectId)) {
            return res.status(400).json({ error: error || 'Test title, class, and subject are required.' });
        }

        if (req.user.role === 'teacher') {
            const [assignment] = await pool.query(
                'SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND subject_id = ? LIMIT 1',
                [req.user.sub, classId, subjectId]
            );
            if (!assignment.length) {
                return res.status(403).json({ error: 'You can only create tests for your assigned classes and subjects.' });
            }
        }

        try {
            const [result] = await pool.query(
                `INSERT INTO tests (title, class_id, subject_id, teacher_id, duration_minutes, is_draft, description, is_published)
       VALUES (?, ?, ?, ?, ?, TRUE, ?, FALSE)`,
                [req.body.title.trim(), classId, subjectId, req.user.sub, duration, req.body.description || null]
            );

            res.status(201).json({
                id: result.insertId,
                title: req.body.title.trim(),
                classId,
                subjectId,
                durationMinutes: duration,
                isDraft: true,
                isPublished: false,
                description: req.body.description || null,
                createdAt: new Date(),
                message: 'Test draft created. You can now add questions.'
            });
        } catch (dbError) {
            console.error(dbError.message);
            res.status(500).json({ error: 'Unable to create test draft.' });
        }
    });

    // Get all test drafts for a teacher
    app.get('/api/teacher/tests/drafts', requireAuth, authorize('teacher'), async (req, res) => {
        try {
            const [rows] = await pool.query(
                `SELECT id, title, class_id AS classId, subject_id AS subjectId,
              duration_minutes AS durationMinutes, description,
              starts_at AS startsAt, ends_at AS endsAt,
              is_draft AS isDraft, is_published AS isPublished,
              created_at AS createdAt, updated_at AS updatedAt
       FROM tests
       WHERE teacher_id = ? AND is_draft = TRUE
       ORDER BY updated_at DESC`,
                [req.user.sub]
            );

            res.json({ drafts: rows });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to load test drafts.' });
        }
    });

    // Get single test draft with questions
    app.get('/api/teacher/tests/:id/draft', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.id);
        if (!Number.isInteger(testId)) {
            return res.status(400).json({ error: 'Valid test ID is required.' });
        }

        try {
            const [tests] = await pool.query(
                `SELECT id, title, class_id AS classId, subject_id AS subjectId,
              duration_minutes AS durationMinutes, description,
              starts_at AS startsAt, ends_at AS endsAt,
              is_draft AS isDraft, is_published AS isPublished,
              created_at AS createdAt, updated_at AS updatedAt,
              teacher_id AS teacherId
       FROM tests
       WHERE id = ? LIMIT 1`,
                [testId]
            );

            const test = tests[0];
            if (!test) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && test.teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only access your own tests.' });
            }

            const [questions] = await pool.query(
                `SELECT id, question_order AS questionOrder, question_type AS questionType,
              prompt, options_json AS options, answer_json AS answer, points,
              is_draft AS isDraft
       FROM test_questions
       WHERE test_id = ?
       ORDER BY question_order`,
                [testId]
            );

            const parsedQuestions = questions.map(q => ({
                ...q,
                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
                answer: typeof q.answer === 'string' ? JSON.parse(q.answer) : q.answer
            }));

            res.json({ test, questions: parsedQuestions });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to load test.' });
        }
    });

    // Update test details
    app.put('/api/teacher/tests/:id', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.id);
        if (!Number.isInteger(testId)) {
            return res.status(400).json({ error: 'Valid test ID is required.' });
        }

        try {
            const [tests] = await pool.query(
                'SELECT id, teacher_id AS teacherId FROM tests WHERE id = ? LIMIT 1',
                [testId]
            );

            if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && tests[0].teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only update your own tests.' });
            }

            const updates = [];
            const values = [];

            const allowedFields = {
                title: 'title',
                description: 'description',
                durationMinutes: 'duration_minutes',
                startsAt: 'starts_at',
                endsAt: 'ends_at'
            };

            for (const [inputKey, dbColumn] of Object.entries(allowedFields)) {
                if (req.body[inputKey] !== undefined) {
                    updates.push(`${dbColumn} = ?`);
                    values.push(req.body[inputKey]);
                }
            }

            if (!updates.length) {
                return res.status(400).json({ error: 'No valid fields to update.' });
            }

            values.push(testId);
            await pool.query(
                `UPDATE tests SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
                values
            );

            res.json({ message: 'Test updated successfully.' });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to update test.' });
        }
    });

    // ============================================
    // QUESTION MANAGEMENT ENDPOINTS
    // ============================================

    // Add a single question to test
    app.post('/api/teacher/tests/:id/questions', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.id);
        if (!Number.isInteger(testId)) {
            return res.status(400).json({ error: 'Valid test ID is required.' });
        }

        const error = bodyErrors(req.body, [['prompt', 'Question prompt', 5000]]);
        const type = ['choice', 'fill', 'match', 'drag', 'rearrange'].includes(req.body?.questionType)
            ? req.body.questionType
            : null;
        const pointsError = positiveNumber(Number(req.body?.points || 1), 'Points');

        if (error || !type || pointsError || !Array.isArray(req.body.answer)) {
            return res.status(400).json({
                error: error || 'Question type, answer array, and positive points are required.'
            });
        }

        try {
            const [tests] = await pool.query(
                'SELECT id, teacher_id AS teacherId FROM tests WHERE id = ? LIMIT 1',
                [testId]
            );

            if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && tests[0].teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only edit your own tests.' });
            }

            const [[{ nextOrder }]] = await pool.query(
                'SELECT COALESCE(MAX(question_order), 0) + 1 AS nextOrder FROM test_questions WHERE test_id = ?',
                [testId]
            );

            const [result] = await pool.query(
                `INSERT INTO test_questions 
       (test_id, question_order, question_type, prompt, options_json, answer_json, points, is_draft)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
                [testId, nextOrder, type, req.body.prompt.trim(), JSON.stringify(req.body.options || []),
                    JSON.stringify(req.body.answer), Number(req.body.points || 1)]
            );

            res.status(201).json({
                id: result.insertId,
                questionOrder: nextOrder,
                questionType: type,
                prompt: req.body.prompt.trim(),
                options: req.body.options || [],
                answer: req.body.answer,
                points: Number(req.body.points || 1),
                isDraft: true,
                message: 'Question added successfully.'
            });
        } catch (dbError) {
            console.error(dbError.message);
            res.status(500).json({
                error: 'Unable to add question.',
                detail: process.env.NODE_ENV === 'production' ? undefined : dbError.message
            });
        }
    });

    // Update a question
    app.put('/api/teacher/tests/:testId/questions/:questionId', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.testId);
        const questionId = Number(req.params.questionId);

        if (!Number.isInteger(testId) || !Number.isInteger(questionId)) {
            return res.status(400).json({ error: 'Valid test and question IDs are required.' });
        }

        const error = bodyErrors(req.body, [['prompt', 'Question prompt', 5000]]);
        const type = ['choice', 'fill', 'match', 'drag', 'rearrange'].includes(req.body?.questionType)
            ? req.body.questionType
            : null;

        if (error || !type) {
            return res.status(400).json({ error: error || 'Question type is required.' });
        }

        try {
            const [tests] = await pool.query(
                'SELECT id, teacher_id AS teacherId FROM tests WHERE id = ? LIMIT 1',
                [testId]
            );

            if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && tests[0].teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only edit your own tests.' });
            }

            const [questions] = await pool.query(
                'SELECT id FROM test_questions WHERE id = ? AND test_id = ? LIMIT 1',
                [questionId, testId]
            );

            if (!questions[0]) return res.status(404).json({ error: 'Question not found.' });

            const updates = [];
            const values = [];

            if (req.body.prompt !== undefined) {
                updates.push('prompt = ?');
                values.push(req.body.prompt.trim());
            }
            if (req.body.questionType !== undefined) {
                updates.push('question_type = ?');
                values.push(type);
            }
            if (req.body.options !== undefined) {
                updates.push('options_json = ?');
                values.push(JSON.stringify(req.body.options));
            }
            if (req.body.answer !== undefined) {
                updates.push('answer_json = ?');
                values.push(JSON.stringify(req.body.answer));
            }
            if (req.body.points !== undefined) {
                updates.push('points = ?');
                values.push(Number(req.body.points));
            }

            if (!updates.length) {
                return res.status(400).json({ error: 'No valid fields to update.' });
            }

            values.push(questionId);
            await pool.query(
                `UPDATE test_questions SET ${updates.join(', ')} WHERE id = ?`,
                values
            );

            res.json({ message: 'Question updated successfully.' });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to update question.' });
        }
    });

    // Delete a question
    app.delete('/api/teacher/tests/:testId/questions/:questionId', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.testId);
        const questionId = Number(req.params.questionId);

        if (!Number.isInteger(testId) || !Number.isInteger(questionId)) {
            return res.status(400).json({ error: 'Valid test and question IDs are required.' });
        }

        try {
            const [tests] = await pool.query(
                'SELECT id, teacher_id AS teacherId FROM tests WHERE id = ? LIMIT 1',
                [testId]
            );

            if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && tests[0].teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only delete from your own tests.' });
            }

            await pool.query(
                'DELETE FROM test_questions WHERE id = ? AND test_id = ?',
                [questionId, testId]
            );

            res.json({ message: 'Question deleted successfully.' });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to delete question.' });
        }
    });

    // Reorder questions
    app.patch('/api/teacher/tests/:id/questions/reorder', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.id);
        if (!Number.isInteger(testId)) {
            return res.status(400).json({ error: 'Valid test ID is required.' });
        }

        if (!Array.isArray(req.body?.questionIds)) {
            return res.status(400).json({ error: 'Array of question IDs is required.' });
        }

        try {
            const [tests] = await pool.query(
                'SELECT id, teacher_id AS teacherId FROM tests WHERE id = ? LIMIT 1',
                [testId]
            );

            if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && tests[0].teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only reorder your own tests.' });
            }

            for (let i = 0; i < req.body.questionIds.length; i++) {
                await pool.query(
                    'UPDATE test_questions SET question_order = ? WHERE id = ? AND test_id = ?',
                    [i + 1, req.body.questionIds[i], testId]
                );
            }

            res.json({ message: 'Questions reordered successfully.' });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to reorder questions.' });
        }
    });

    // ============================================
    // TEST PUBLISHING & NOTIFICATIONS
    // ============================================

    // Publish test (make visible to students and create announcement)
    app.post('/api/teacher/tests/:id/publish', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.id);
        if (!Number.isInteger(testId)) {
            return res.status(400).json({ error: 'Valid test ID is required.' });
        }

        try {
            const [tests] = await pool.query(
                `SELECT t.id, t.title, t.class_id AS classId, t.teacher_id AS teacherId, t.is_published AS isPublished
       FROM tests t
       WHERE t.id = ? LIMIT 1`,
                [testId]
            );

            const test = tests[0];
            if (!test) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && test.teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only publish your own tests.' });
            }

            // Get student count in the class
            const [students] = await pool.query(
                `SELECT DISTINCT s.id, s.user_id AS userId FROM students s
       JOIN student_classes sc ON sc.student_id = s.id
       WHERE sc.class_id = ? AND s.status = 'active' AND s.user_id IS NOT NULL`,
                [test.classId]
            );

            if (students.length === 0) {
                return res.status(400).json({ error: 'No active students in this class.' });
            }

            // Update test as published and clear draft flag
            await pool.query(
                'UPDATE tests SET is_published = TRUE, is_draft = FALSE, updated_at = NOW() WHERE id = ?',
                [testId]
            );

            // Create announcement
            const [announcement] = await pool.query(
                `INSERT INTO announcements (title, message, type, related_test_id, created_by)
       VALUES (?, ?, 'test_published', ?, ?)`,
                [
                    `New Test: ${test.title}`,
                    `A new test "${test.title}" has been posted. Click to view and take the test.`,
                    testId,
                    req.user.sub
                ]
            );

            // Add announcement to all students in the class
            const recipientInserts = students.map(s => [announcement.insertId, s.userId]);
            if (recipientInserts.length > 0) {
                await pool.query(
                    'INSERT INTO announcement_recipients (announcement_id, user_id) VALUES ?',
                    [recipientInserts.map(r => [r[0], r[1]])]
                );
            }

            res.json({
                message: 'Test published successfully.',
                announcementId: announcement.insertId,
                studentCount: students.length
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to publish test.' });
        }
    });

    // ============================================
    // TEST MONITORING & RESULTS
    // ============================================

    // Get test progress (students currently taking test)
    app.get('/api/teacher/tests/:id/progress', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.id);
        if (!Number.isInteger(testId)) {
            return res.status(400).json({ error: 'Valid test ID is required.' });
        }

        try {
            const [tests] = await pool.query(
                'SELECT id, teacher_id AS teacherId FROM tests WHERE id = ? LIMIT 1',
                [testId]
            );

            if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && tests[0].teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only view your own tests.' });
            }

            // Get progress stats
            const [stats] = await pool.query(
                `SELECT
        COUNT(*) AS total,
        SUM(status = 'submitted') AS completed,
        SUM(status = 'in_progress') AS inProgress,
        SUM(status = 'expired') AS expired
       FROM test_attempts
       WHERE test_id = ?`,
                [testId]
            );

            // Get detailed student progress
            const [progress] = await pool.query(
                `SELECT 
        ta.id AS attemptId,
        s.id AS studentId,
        s.full_name AS studentName,
        s.admission_number AS admissionNumber,
        ta.started_at AS startedAt,
        ta.submitted_at AS submittedAt,
        ta.score AS score,
        ta.status
       FROM test_attempts ta
       JOIN students s ON s.id = ta.student_id
       WHERE ta.test_id = ?
       ORDER BY ta.started_at DESC`,
                [testId]
            );

            res.json({
                stats: stats[0],
                progress: progress
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to load test progress.' });
        }
    });

    // Get test results with scores
    app.get('/api/teacher/tests/:id/results', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.id);
        if (!Number.isInteger(testId)) {
            return res.status(400).json({ error: 'Valid test ID is required.' });
        }

        try {
            const [tests] = await pool.query(
                `SELECT t.id, t.title, t.duration_minutes AS durationMinutes, t.teacher_id AS teacherId
       FROM tests t
       WHERE t.id = ? LIMIT 1`,
                [testId]
            );

            if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && tests[0].teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only view your own tests.' });
            }

            // Get test results with statistics
            const [results] = await pool.query(
                `SELECT 
        s.id AS studentId,
        s.full_name AS studentName,
        s.admission_number AS admissionNumber,
        ta.score,
        ta.status,
        ta.started_at AS startedAt,
        ta.submitted_at AS submittedAt,
        TIMESTAMPDIFF(MINUTE, ta.started_at, ta.submitted_at) AS durationTaken
       FROM test_attempts ta
       JOIN students s ON s.id = ta.student_id
       WHERE ta.test_id = ?
       ORDER BY ta.score DESC`,
                [testId]
            );

            // Calculate statistics
            const scores = results
                .filter(r => r.status === 'submitted' && r.score !== null)
                .map(r => r.score);

            const statistics = {
                totalStudents: results.length,
                submittedCount: scores.length,
                averageScore: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
                highestScore: scores.length ? Math.max(...scores) : 0,
                lowestScore: scores.length ? Math.min(...scores) : 0
            };

            res.json({
                test: tests[0],
                statistics,
                results
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to load test results.' });
        }
    });

    // Delete a test (only if not published)
    app.delete('/api/teacher/tests/:id', requireAuth, authorize('teacher'), async (req, res) => {
        const testId = Number(req.params.id);
        if (!Number.isInteger(testId)) {
            return res.status(400).json({ error: 'Valid test ID is required.' });
        }

        try {
            const [tests] = await pool.query(
                'SELECT id, teacher_id AS teacherId, is_published AS isPublished FROM tests WHERE id = ? LIMIT 1',
                [testId]
            );

            if (!tests[0]) return res.status(404).json({ error: 'Test not found.' });

            if (req.user.role === 'teacher' && tests[0].teacherId !== req.user.sub) {
                return res.status(403).json({ error: 'You can only delete your own tests.' });
            }

            if (tests[0].isPublished) {
                return res.status(409).json({ error: 'Cannot delete a published test.' });
            }

            await pool.query('DELETE FROM tests WHERE id = ?', [testId]);

            res.json({ message: 'Test deleted successfully.' });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Unable to delete test.' });
        }
    });

};
