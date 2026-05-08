const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => res.json(await db.getUsers()));

router.post('/', async (req, res) => {
  try {
    const user = await db.createUser(req.body);
    await db.addLog(`Новий юзер: ${user.name}`, req.body.adminName || 'Система');
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;