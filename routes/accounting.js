const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => res.json(await db.getAccounting()));
router.post('/', async (req, res) => {
  const item = await db.createAccounting(req.body);
  await db.addLog('Додано запис бухгалтерії: ' + item.title, 'Бухгалтерія');
  res.json(item);
});
router.delete('/:id', async (req, res) => {
  await db.deleteAccounting(req.params.id);
  res.json({ success: true });
});
module.exports = router;