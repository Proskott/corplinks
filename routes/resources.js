const express = require('express');
const router = express.Router();
const db = require('../db');

// ВАРІАНТ 2: Якщо передано userId — фільтрує по доступу
router.get('/', async (req, res) => {
  try {
    if (req.query.userId) {
      res.json(await db.getResourcesForUser(req.query.userId));
    } else {
      res.json(await db.getResources());
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ВАРІАНТ 1: Рекомендації для юзера
router.get('/recommendations/:userId', async (req, res) => {
  try {
    res.json(await db.getRecommendations(req.params.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ВАРІАНТ 1: Зафіксувати клік
router.post('/:id/click', async (req, res) => {
  try {
    await db.trackClick(req.body.userId, req.params.id, req.body.userDept);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    var r = await db.createResource(req.body);
    await db.addLog('Додано ресурс: ' + r.name, req.body.userName || 'Система');
    res.json(r);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    var r = await db.updateResource(req.params.id, req.body);
    await db.addLog('Оновлено ресурс: ' + r.name, req.body.userName || 'Система');
    res.json(r);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.deleteResource(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;