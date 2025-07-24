const dbPromise = require('../db');

// Get all submissions
exports.getAllSubmissions = async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.query(
      `SELECT s.id, u.username, q.title AS quiz_title, s.score, s.submitted_at
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       JOIN quizzes q ON s.quiz_id = q.id
       ORDER BY s.submitted_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch submissions', error: err.message });
  }
};

// Get submissions for a specific quiz
exports.getQuizSubmissions = async (req, res) => {
  try {
    const db = await dbPromise;
    const quizId = req.params.quizId;
    const [rows] = await db.query(
      `SELECT s.id, u.username, s.score, s.submitted_at
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       WHERE s.quiz_id = ?
       ORDER BY s.score DESC, s.submitted_at ASC`,
      [quizId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch quiz submissions', error: err.message });
  }
};

// Get leaderboard for a quiz
exports.getLeaderboard = async (req, res) => {
  try {
    const db = await dbPromise;
    const quizId = req.params.quizId;
    const [rows] = await db.query(
      `SELECT u.username, MAX(s.score) AS top_score
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       WHERE s.quiz_id = ?
       GROUP BY s.user_id
       ORDER BY top_score DESC, MIN(s.submitted_at) ASC
       LIMIT 10`,
      [quizId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error: err.message });
  }
};

// Employee submits a quiz
exports.submitQuiz = async (req, res) => {
  try {
    const db = await dbPromise;
    const userId = req.user.id;
    const quizId = req.params.quizId;
    const { score } = req.body;
    const [result] = await db.query(
      'INSERT INTO submissions (user_id, quiz_id, score, submitted_at) VALUES (?, ?, ?, NOW())',
      [userId, quizId, score]
    );
    res.json({ success: true, message: 'Submission saved', submissionId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save submission', error: err.message });
  }
};

// Get all submissions for the logged-in employee
exports.getMySubmissions = async (req, res) => {
  try {
    const db = await dbPromise;
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT s.id, q.title AS quiz_title, s.score, s.submitted_at
       FROM submissions s
       JOIN quizzes q ON s.quiz_id = q.id
       WHERE s.user_id = ?
       ORDER BY s.submitted_at DESC`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch your submissions', error: err.message });
  }
};

// Employee leaderboard: highest scores per user per quiz
exports.employeeLeaderboard = async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.query(`
      SELECT u.username, q.title AS quiz_title, MAX(s.score) AS score
      FROM submissions s
      JOIN users u ON s.user_id = u.id
      JOIN quizzes q ON s.quiz_id = q.id
      GROUP BY s.user_id, s.quiz_id
      ORDER BY score DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error: err.message });
  }
};

// Get number of attempts for a user on a quiz
exports.getQuizAttempts = async (req, res) => {
  try {
    const db = await dbPromise;
    const userId = req.user.id;
    const quizId = req.params.quizId;
    const [[{ attempts }]] = await db.query(
      'SELECT COUNT(*) AS attempts FROM submissions WHERE user_id = ? AND quiz_id = ?',
      [userId, quizId]
    );
    res.json({ attempts: attempts || 0 });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attempts', error: err.message });
  }
}; 