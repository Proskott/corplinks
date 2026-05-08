const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => res.json(await db.getContractors()));
router.post('/', async (req, res) => {
  const item = await db.createContractor(req.body);
  await db.addLog('Додано контрагента: ' + item.company, 'Sales');
  res.json(item);
});
router.delete('/:id', async (req, res) => {
  await db.deleteContractor(req.params.id);
  res.json({ success: true });
});
module.exports = router;