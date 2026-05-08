const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => res.json(await db.getResources()));
router.post('/', async (req, res) => {
  const r = await db.createResource(req.body);
  await db.addLog(`Додано ресурс: ${r.name}`, 'IT');
  res.json(r);
});
router.delete('/:id', async (req, res) => {
  await db.deleteResource(req.params.id);
  res.json({ success: true });
});
module.exports = router;