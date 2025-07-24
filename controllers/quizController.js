const dbPromise = require('../db'); // Using mysql2/promise pool
const bcrypt = require('bcrypt');

// Get all quizzes with statistics
exports.getAllQuizzes = async (req, res) => {
  try {
    const db = await dbPromise;
    const [quizzes] = await db.query(`
      SELECT 
        q.*,
        COUNT(DISTINCT s.user_id) as participants,
        AVG(s.score) as avgScore,
        COUNT(qst.id) as questionCount
      FROM quizzes q
      LEFT JOIN submissions s ON q.id = s.quiz_id
      LEFT JOIN questions qst ON q.id = qst.quiz_id
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `);
    
    // Format the data for frontend
    const formattedQuizzes = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      category: quiz.category,
      difficulty: quiz.difficulty,
      duration: quiz.duration,
      status: quiz.status,
      participants: quiz.participants || 0,
      avgScore: quiz.avgScore ? Math.round(quiz.avgScore) : 0,
      questions: quiz.questionCount || 0,
      created: new Date(quiz.created_at).toLocaleDateString()
    }));
    
    res.status(200).json({ success: true, data: formattedQuizzes });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quizzes.' });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const db = await dbPromise;
    
    // Get total quizzes
    const [[{ totalQuizzes }]] = await db.query('SELECT COUNT(*) as totalQuizzes FROM quizzes');
    
    // Get published quizzes
    const [[{ publishedQuizzes }]] = await db.query("SELECT COUNT(*) as publishedQuizzes FROM quizzes WHERE status = 'Published'");
    
    // Get draft quizzes
    const [[{ draftQuizzes }]] = await db.query("SELECT COUNT(*) as draftQuizzes FROM quizzes WHERE status = 'Draft'");
    
    // Get total participants (distinct users who submitted any quiz)
    const [[{ totalParticipants }]] = await db.query('SELECT COUNT(DISTINCT user_id) as totalParticipants FROM submissions');
    
    res.status(200).json({
      success: true,
      data: {
        totalQuizzes: totalQuizzes || 0,
        publishedQuizzes: publishedQuizzes || 0,
        draftQuizzes: draftQuizzes || 0,
        totalParticipants: totalParticipants || 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics.' });
  }
};

// Create sample quiz data for testing
// exports.createSampleData = async (req, res) => {
//   try {
//     const db = await dbPromise;
    
//     // Check if sample data already exists
//     const [existing] = await db.query('SELECT COUNT(*) as count FROM quizzes');
//     if (existing[0].count > 0) {
//       return res.status(200).json({ success: true, message: 'Sample data already exists' });
//     }
    
    // Sample quiz data
    // const sampleQuizzes = [
    //   {
    //     title: 'Basic Computer Hardware',
    //     category: 'Hardware',
    //     difficulty: 'Easy',
    //     duration: 15,
    //     status: 'Published'
    //   },
    //   {
    //     title: 'Software Development Fundamentals',
    //     category: 'Software',
    //     difficulty: 'Medium',
    //     duration: 20,
    //     status: 'Published'
    //   },
    //   {
    //     title: 'Advanced Networking',
    //     category: 'Hardware',
    //     difficulty: 'Hard',
    //     duration: 30,
    //     status: 'Draft'
    //   },
    //   {
    //     title: 'Database Management',
    //     category: 'Software',
    //     difficulty: 'Medium',
    //     duration: 25,
    //     status: 'Published'
    //   },
    //   {
    //     title: 'Cybersecurity Basics',
    //     category: 'Software',
    //     difficulty: 'Easy',
    //     duration: 15,
    //     status: 'Draft'
    //   }
    // ];
    
    // // Insert sample quizzes
    // for (const quiz of sampleQuizzes) {
    //   await db.query(
    //     'INSERT INTO quizzes (title, category, difficulty, duration, status) VALUES (?, ?, ?, ?, ?)',
    //     [quiz.title, quiz.category, quiz.difficulty, quiz.duration, quiz.status]
    //   );
    // }
    
//     res.status(200).json({ success: true, message: 'Sample data created successfully' });
//   } catch (error) {
//     console.error('Error creating sample data:', error);
//     res.status(500).json({ success: false, message: 'Failed to create sample data.' });
//   }
// };

// Create a new quiz
exports.createQuiz = async (req, res) => {
  try {
    const db = await dbPromise;
    const { title, category, difficulty, duration, status } = req.body;

    // Validation
    if (!title || !category || !difficulty || !duration) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const validCategories = ['Hardware', 'Software'];
    const validDifficulties = ['Easy', 'Medium', 'Hard'];
    const validStatuses = ['Draft', 'Published', 'Archived'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category value. Only Hardware and Software are allowed.' });
    }

    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ success: false, message: 'Invalid difficulty value.' });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const [result] = await db.query(
      `INSERT INTO quizzes (title, category, difficulty, duration, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [title, category, difficulty, duration, status || 'Draft']
    );

    const newQuiz = {
      id: result.insertId,
      title,
      category,
      difficulty,
      duration,
      status: status || 'Draft'
    };

    res.status(201).json({ success: true, data: newQuiz });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ success: false, message: 'Failed to create quiz.' });
  }
};

// Delete a quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const db = await dbPromise;
    const quizId = req.params.id;

    const [existing] = await db.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    await db.query('DELETE FROM quizzes WHERE id = ?', [quizId]);
    res.status(200).json({ success: true, message: 'Quiz deleted successfully.' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ success: false, message: 'Failed to delete quiz.' });
  }
};

// Get available quizzes for employees
exports.getAvailableQuizzes = async (req, res) => {
  try {
    const db = await dbPromise;
    const [quizzes] = await db.query("SELECT * FROM quizzes");
    res.status(200).json({ success: true, data: quizzes });
  } catch (error) {
    console.error('Error fetching available quizzes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available quizzes.' });
  }
};

// Employee change password
exports.changePassword = async (req, res) => {
  try {
    const db = await dbPromise;
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing fields.' });
    }
    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = users[0];
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Old password is incorrect.' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password', error: err.message });
  }
};

// Employee dashboard stats
exports.employeeStats = async (req, res) => {
  try {
    const db = await dbPromise;
    // Total quizzes
    const [[{ totalQuizzes }]] = await db.query('SELECT COUNT(*) AS totalQuizzes FROM quizzes');
    // Total participants (distinct users who submitted any quiz)
    const [[{ totalParticipants }]] = await db.query('SELECT COUNT(DISTINCT user_id) AS totalParticipants FROM submissions');
    // Average duration (of published quizzes)
    const [[{ avgDuration }]] = await db.query('SELECT AVG(duration) AS avgDuration FROM quizzes');
    // Average rating (if you have a rating column, else set to 0)
    let avgRating = 0;
    try {
      const [[r]] = await db.query('SELECT AVG(rating) AS avgRating FROM quizzes WHERE');
      avgRating = r.avgRating || 0;
    } catch { avgRating = 0; }
    res.json({
      success: true,
      data: {
        totalQuizzes: totalQuizzes || 0,
        totalParticipants: totalParticipants || 0,
        avgDuration: avgDuration ? Math.round(avgDuration) : 0,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: err.message });
  }
};
