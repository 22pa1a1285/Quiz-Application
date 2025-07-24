const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const questionController = require('../controllers/questionController');
const { authMiddleware, roleCheck } = require('../middleware/auth');

// Render manageQuiz page (admin only)
router.get('/admin/manage', authMiddleware, roleCheck(['admin']), async (req, res, next) => {
  try {
    res.render('admin/manageQuiz', { user: req.user });
  } catch (error) {
    next(error); // Pass errors to global error handler
  }
});

// API Routes
// Get all quizzes (admin only)
router.get('/', authMiddleware, roleCheck(['admin']), async (req, res, next) => {
  try {
    await quizController.getAllQuizzes(req, res);
  } catch (error) {
    next(error);
  }
});

// Get dashboard statistics (admin only)
router.get('/dashboard-stats', authMiddleware, roleCheck(['admin']), async (req, res, next) => {
  try {
    await quizController.getDashboardStats(req, res);
  } catch (error) {
    next(error);
  }
});

// Create sample data (admin only)
router.post('/create-sample-data', authMiddleware, roleCheck(['admin']), async (req, res, next) => {
  try {
    await quizController.createSampleData(req, res);
  } catch (error) {
    next(error);
  }
});

// Create a new quiz (admin only)
router.post('/', authMiddleware, roleCheck(['admin']), async (req, res, next) => {
  try {
    await quizController.createQuiz(req, res);
  } catch (error) {
    next(error);
  }
});

// Delete a quiz (admin only)
router.delete('/:id', authMiddleware, roleCheck(['admin']), async (req, res, next) => {
  try {
    await quizController.deleteQuiz(req, res);
  } catch (error) {
    next(error);
  }
});

// Question routes
// Add a new question (admin only)
router.post('/questions', authMiddleware, roleCheck(['admin']), async (req, res, next) => {
  try {
    await questionController.addQuestion(req, res);
  } catch (error) {
    next(error);
  }
});


router.get('/questions', authMiddleware, roleCheck(['admin']), async (req, res, next) => {
  try {
    await questionController.getFilteredQuestions(req, res);
  } catch (error) {
    next(error);
  }
});

// Get questions for a specific quiz (employee only)
router.get('/:quizId/questions', authMiddleware, roleCheck(['employee']), async (req, res, next) => {
  try {
    await questionController.getQuestionsByQuizId(req, res);
  } catch (error) {
    next(error);
  }
});

// Get available quizzes (employee only)
router.get('/available', authMiddleware, roleCheck(['employee']), async (req, res, next) => {
  try {
    await quizController.getAvailableQuizzes(req, res);
  } catch (error) {
    next(error);
  }
});

// Employee submits a quiz
router.post('/:quizId/submit', authMiddleware, roleCheck(['employee']), async (req, res, next) => {
  try {
    await require('../controllers/submissionController').submitQuiz(req, res);
  } catch (error) {
    next(error);
  }
});

// Employee gets their own submissions
router.get('/my-submissions', authMiddleware, roleCheck(['employee']), async (req, res, next) => {
  try {
    await require('../controllers/submissionController').getMySubmissions(req, res);
  } catch (error) {
    next(error);
  }
});

// Employee leaderboard
router.get('/leaderboard', authMiddleware, roleCheck(['employee']), async (req, res, next) => {
  try {
    await require('../controllers/submissionController').employeeLeaderboard(req, res);
  } catch (error) {
    next(error);
  }
});

// Employee change password
router.post('/change-password', authMiddleware, roleCheck(['employee']), async (req, res, next) => {
  try {
    await require('../controllers/quizController').changePassword(req, res);
  } catch (error) {
    next(error);
  }
});

// Employee dashboard stats
router.get('/employee-stats', authMiddleware, roleCheck(['employee']), async (req, res, next) => {
  try {
    await require('../controllers/quizController').employeeStats(req, res);
  } catch (error) {
    next(error);
  }
});

// Get number of attempts for a user on a quiz
router.get('/:quizId/attempts', authMiddleware, roleCheck(['employee']), async (req, res, next) => {
  try {
    await require('../controllers/submissionController').getQuizAttempts(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;