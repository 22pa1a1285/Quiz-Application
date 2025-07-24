const dbPromise = require('../db');
const bcrypt = require('bcrypt');

// Get admin profile
exports.getProfile = async (req, res) => {
  try {
    const db = await dbPromise;
    const userId = req.user.id;
    const [rows] = await db.query('SELECT id, username, email, role FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: err.message });
  }
};

// Update admin profile
exports.updateProfile = async (req, res) => {
  try {
    const db = await dbPromise;
    const userId = req.user.id;
    const { username, email, password } = req.body;
    let updateFields = [];
    let params = [];

    if (username) {
      updateFields.push('username = ?');
      params.push(username);
    }
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      params.push(hashed);
    }
    if (!updateFields.length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    params.push(userId);
    await db.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile', error: err.message });
  }
}; 