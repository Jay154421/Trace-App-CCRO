const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/auth/has-users — check if any user accounts exist
router.get('/has-users', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) AS count FROM users').get();
    res.json({ hasUsers: (row && row.count) > 0 });
  } catch (err) {
    console.error('has-users error:', err);
    res.status(500).json({ error: 'Failed to check users.' });
  }
});

// POST /api/auth/register — create a new user account
router.post('/register', (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (existing) {
      return res.status(409).json({ error: 'Username already exists.' });
    }

    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username.trim(), password);
    res.json({ ok: true });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Failed to register user.' });
  }
});

// POST /api/auth/login — validate credentials
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = getDb();
    const user = db
      .prepare('SELECT id, username FROM users WHERE username = ? AND password = ?')
      .get(username.trim(), password);

    if (!user) {
      return res.json({ user: null });
    }

    res.json({ user: { username: user.username } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

module.exports = router;