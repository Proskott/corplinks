const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', (req, res) => {
  res.json(db.getLogs());
});

module.exports = router;