const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  res.json(db.getResources(req.query.userId));
});

router.post('/', (req, res) => {
  try {
    const { name, url, cat, desc, access, userName } = req.body;
    const accessStr = Array.isArray(access) ? access.join(',') : access;
    const r = db.createResource({ name, url, cat, desc, access: accessStr });
    db.addLog(`Додано ресурс "${name}"`, userName);
    res.json(r);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, url, cat, desc, access, userName } = req.body;
    const accessStr = Array.isArray(access) ? access.join(',') : access;
    const r = db.updateResource(req.params.id, { name, url, cat, desc, access: accessStr });
    db.addLog(`Відредаговано ресурс "${name}"`, userName);
    res.json(r);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { userName } = req.body;
    const r = db.deleteResource(req.params.id);
    db.addLog(`Видалено ресурс "${r.name}"`, userName);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/toggle-mine', (req, res) => {
  try {
    const { userId } = req.body;
    const mine = db.toggleMine(req.params.id, userId);
    res.json({ mine });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;