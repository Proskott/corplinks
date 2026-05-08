const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  res.json(db.getUsers());
});

router.get('/:id', (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Не знайдено' });
  res.json(user);
});

router.post('/', (req, res) => {
  try {
    const { name, email, dept, role, password, adminName } = req.body;
    const user = db.createUser({ name, email, dept, role, password });
    db.addLog(`Зареєстровано працівника "${name}" (${role})`, adminName);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, email, dept, role, password, adminName } = req.body;
    const user = db.updateUser(req.params.id, { name, email, dept, role, password });
    db.addLog(`Оновлено дані "${name}"`, adminName);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { adminName } = req.body;
    const user = db.deleteUser(req.params.id);
    db.addLog(`Видалено працівника "${user.name}"`, adminName);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;