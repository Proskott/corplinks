const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const logs = await db.getLogs();
  res.json(logs);
});

module.exports = router;