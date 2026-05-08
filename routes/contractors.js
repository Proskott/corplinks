const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => res.json(await db.getContractors()));
router.post('/', async (req, res) => {
  const c = await db.createContractor(req.body);
  await db.addLog(`Новий контрагент: ${c.company}`, 'Адмін');
  res.json(c);
});
router.delete('/:id', async (req, res) => {
  await db.deleteContractor(req.params.id);
  res.json({ success: true });
});
module.exports = router;