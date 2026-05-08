const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  const userId = req.query.userId;
  res.json(db.getResources(userId));
});

router.post('/', (req, res) => {
  try {
    const resrc = db.createResource(req.body);
    db.addLog(`Добавлен ресурс: ${resrc.name}`, req.body.userName);
    res.json(resrc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const resrc = db.updateResource(req.params.id, req.body);
    db.addLog(`Обновлен ресурс: ${resrc.name}`, req.body.userName);
    res.json(resrc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const resrc = db.deleteResource(req.params.id);
    db.addLog(`Удален ресурс: ${resrc.name}`, req.body.userName);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/toggle-mine', (req, res) => {
  const mine = db.toggleMine(req.params.id, req.body.userId);
  res.json({ mine });
});

module.exports = router;