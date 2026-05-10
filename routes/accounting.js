const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try { res.json(await db.getAccounting()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    var item = await db.createAccounting(req.body);
    await db.addLog('Додано запис бухгалтерії: ' + item.title, 'Бухгалтерія');
    res.json(item);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    var item = await db.updateAccounting(req.params.id, req.body);
    await db.addLog('Оновлено запис бухгалтерії: ' + item.title, 'Бухгалтерія');
    res.json(item);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await db.deleteAccounting(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;