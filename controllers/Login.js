const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbPromise = require('../db'); 

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

exports.signup = async (req, res) => {
  try {
    const db = await dbPromise;
    const { username, email, empId, password, role } = req.body;

    
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields (username, email, password, role) are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    if (role === 'employee' && !empId) {
      return res.status(400).json({ message: 'Employee ID is required for employee role' });
    }

   
    const validRoles = ['admin', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ? OR empId = ?',
      [email, empId || null]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already exists' : 'Employee ID already exists'
      });
    }

   
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, email, empId, password, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, empId || null, hashedPassword, role]
    );

    return res.status(201).json({ message: 'Signup successful' });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const db = await dbPromise;
    const { email, empId, password, role } = req.body;

    // Input validation
    if (!password || !role) {
      return res.status(400).json({ message: 'Password and role are required' });
    }

    if (role === 'admin' && !email) {
      return res.status(400).json({ message: 'Email is required for admin login' });
    }

    if (role === 'employee' && !empId) {
      return res.status(400).json({ message: 'Employee ID is required for employee login' });
    }

    // Validate role
    const validRoles = ['admin', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Get user based on role
    let query, params;
    if (role === 'admin') {
      query = 'SELECT * FROM users WHERE email = ? AND role = ?';
      params = [email, role];
    } else {
      query = 'SELECT * FROM users WHERE empId = ? AND role = ?';
      params = [empId, role];
    }

    const [results] = await db.query(query, params);
    const user = results[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        empId: user.empId,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Log token for debugging
    console.log('Generated Token:', token);

    // Send response
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        empId: user.empId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};