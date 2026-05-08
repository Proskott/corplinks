const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => res.json(await db.getResources()));

router.post('/', async (req, res) => {
  try {
    const r = await db.createResource(req.body);
    await db.addLog(`Додано ресурс: ${r.name}`, req.body.userName || 'Система');
    res.json(r);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  await db.deleteResource(req.params.id);
  res.json({ success: true });
});

module.exports = router;