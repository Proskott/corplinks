const express = require('express');
const router = express.Router();
const db = require('../db');

// Отримання всіх HR ресурсів
router.get('/', async (req, res) => res.json(await db.getHR()));

// Додавання нового ресурсу
router.post('/', async (req, res) => {
  const item = await db.createHR(req.body);
  await db.addLog('Додано HR-ресурс: ' + item.title, 'HR-Manager');
  res.json(item);
});

// Видалення
router.delete('/:id', async (req, res) => {
  await db.deleteHR(req.params.id);
  res.json({ success: true });
});

module.exports = router;