const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => res.json(await db.getUsers()));
router.post('/', async (req, res) => {
  const user = await db.createUser(req.body);
  await db.addLog(`Створено юзера: ${user.name}`, 'Адмін');
  res.json(user);
});
router.delete('/:id', async (req, res) => {
  await db.deleteUser(req.params.id);
  res.json({ success: true });
});
module.exports = router;