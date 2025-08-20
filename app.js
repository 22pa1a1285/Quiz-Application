const express = require('express');
const path = require('path');
const cors = require('cors');
const loginController = require('./controllers/Login'); // Ensure this path is correct
const quizRoutes = require('./routes/quizRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { authMiddleware, roleCheck } = require('./middleware/auth');
const app = express();
const dbPromise = require('./db');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Set view engine to EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes
app.post('/api/login', loginController.login);
app.post('/api/signup', loginController.signup);
app.post('/api/logout', (req, res) => {
  // Implement logout logic if needed (e.g., clearing session)
  res.json({ message: 'Logged out successfully' });
});

// Health check for deployment verification
app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.VERCEL ? 'vercel' : 'local' });
});

// Mount quiz routes
app.use('/api/quizzes', quizRoutes);
app.use('/api/admin', adminRoutes);


// Dashboard routes
app.get('/admin/dashboard', async (req, res) => {
  const db = await dbPromise;
  const userData = {
    email: req.query.email || 'Admin User',
    role: 'admin'
  };

  // Fetch dashboard statistics from your database
  const [quizRows, userRows, submissionRows, completedRows, recentRows] = await Promise.all([
    db.query('SELECT * FROM quizzes'),
    db.query('SELECT * FROM users'),
    db.query('SELECT * FROM submissions'),
    db.query('SELECT COUNT(DISTINCT quiz_id, user_id) AS completed FROM submissions'),
    db.query(`SELECT s.*, u.username, q.title AS quiz_title FROM submissions s JOIN users u ON s.user_id = u.id JOIN quizzes q ON s.quiz_id = q.id ORDER BY s.submitted_at DESC LIMIT 5`)
  ]);

  const dashboardData = {
    user: userData,
    totalQuizzes: quizRows[0].length,
    totalUsers: userRows[0].length,
    totalResults: submissionRows[0].length,
    completedQuizzes: completedRows[0][0].completed || 0,
    recentActivity: recentRows[0],
    quizzes: quizRows[0]
  };

  res.render('admin/dashboard', dashboardData);
});

// Admin manage quiz route
app.get('/admin/manageQuiz', (req, res) => {
  res.render('admin/manageQuiz');
});

app.get('/admin/submissions', (req, res) => {
  res.render('admin/submissions');
});

app.get('/admin/leaderboard', (req, res) => {
  res.render('admin/leaderboard');
});

app.get('/admin/profile', (req, res) => {
  res.render('admin/profile');
});

app.get('/employee/dashboard', (req, res) => {
  const userData = {
    email: req.query.email || 'Employee User',
    role: 'employee'
  };
  res.render('employee/empdashboard', { user: userData });
});

app.get('/employee/availableQuizzes', async (req, res) => {
  const db = await dbPromise;

  try {
    const [quizRows] = await db.query('SELECT * FROM quizzes'); // Optional filter
    console.log('Available quizzes:', quizRows);
    const userData = {
      email: req.query.email || 'Employee User',
      role: 'employee'
    };

    res.render('employee/availableQuizzes', {
      user: userData,
      quizzes: quizRows
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).send('Error loading available quizzes');
  }
});

// Employee my submissions page
app.get('/employee/mySubmissions', (req, res) => {
  res.render('employee/mysubmissions');
});

// Employee leaderboard page
app.get('/employee/leaderboard', (req, res) => {
  res.render('employee/leaderboard');
});

// Employee profile page
app.get('/employee/profile', (req, res) => {
  res.render('employee/profile');
});

// Employee quiz attempt page
app.get('/employee/attempt/:quizId', (req, res) => {
  res.render('employee/attemptQuiz', { quizId: req.params.quizId });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start the server (only when not running on Vercel)
const PORT = process.env.PORT || 3000;
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
