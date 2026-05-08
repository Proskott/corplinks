const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => res.json(await db.getUsers()));

router.post('/', async (req, res) => {
  try {
    const user = await db.createUser(req.body);
    await db.addLog('Створено працівника: ' + user.name, 'Адмін');
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const { name, email, dept, role, password } = req.body;
    var update = { name, email, dept, role };
    if (password && password.length >= 4) update.password = password;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ error: 'Не знайдено' });
    await db.addLog('Оновлено дані: ' + user.name, 'Адмін');
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;