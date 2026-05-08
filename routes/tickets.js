const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try { res.json(await db.getTickets()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    var t = await db.createTicket(req.body);
    await db.addLog('Нова заявка: ' + t.title, t.author);
    res.json(t);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    await db.updateTicketStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.deleteTicket(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;