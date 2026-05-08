const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
});

router.post('/', async (req, res) => {
  try {
    const user = await db.createUser(req.body);
    await db.addLog(`Зареєстровано користувача: ${user.name}`, req.body.adminName || 'Система');
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;