const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => res.json(await db.getLogs()));

module.exports = router;