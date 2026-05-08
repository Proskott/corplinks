const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  try {
    const resources = await db.getResources();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Додавання ресурсів (якщо ти реалізував цю функцію в db.js)
router.post('/', async (req, res) => {
  try {
    // Якщо в db.js є функція createResource, викликаємо її через await
    // const newRes = await db.createResource(req.body);
    // res.json(newRes);
    res.json({ message: "Функція в розробці" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;