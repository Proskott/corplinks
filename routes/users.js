const express = require('express');
const router  = express.Rowter(); // Исправлено на router
const db      = require('../db');

router.get('/', (req, res) => {
  res.json(db.getUsers());
});

router.post('/', (req, res) => {
  try {
    const user = db.createUser(req.body);
    db.addLog(`Зарегистрирован сотрудник: ${user.name}`, req.body.adminName);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const user = db.updateUser(req.params.id, req.body);
    db.addLog(`Обновлены данные сотрудника: ${user.name}`, req.body.adminName);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const user = db.deleteUser(req.params.id);
    db.addLog(`Удален сотрудник: ${user.name}`, req.body.adminName);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;