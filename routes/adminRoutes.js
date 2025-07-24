const express = require('express');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/auth');
const submissionController = require('../controllers/submissionController');
const profileController = require('../controllers/profileController');

// Submissions
router.get('/submissions', authMiddleware, roleCheck(['admin']), submissionController.getAllSubmissions);
router.get('/submissions/quiz/:quizId', authMiddleware, roleCheck(['admin']), submissionController.getQuizSubmissions);

// Leaderboard
router.get('/leaderboard/:quizId', authMiddleware, roleCheck(['admin']), submissionController.getLeaderboard);

// Profile
router.get('/profile', authMiddleware, roleCheck(['admin']), profileController.getProfile);
router.put('/profile', authMiddleware, roleCheck(['admin']), profileController.updateProfile);

module.exports = router; 