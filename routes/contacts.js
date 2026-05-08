const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => res.json(await db.getContacts()));

router.post('/', async (req, res) => {
  const c = await db.createContact(req.body);
  await db.addLog('Додано новий контакт: ' + c.name, 'System');
  res.json(c);
});

router.delete('/:id', async (req, res) => {
  await db.deleteContact(req.params.id);
  res.json({ success: true });
});

module.exports = router;