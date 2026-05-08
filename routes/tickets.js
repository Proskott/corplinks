const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => res.json(await db.getTickets()));

router.post('/', async (req, res) => {
  const t = await db.createTicket(req.body);
  await db.addLog(`Нова заявка: ${t.title}`, req.body.author);
  res.json(t);
});

router.put('/:id/status', async (req, res) => {
  await db.updateTicketStatus(req.params.id, req.body.status);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  await db.deleteTicket(req.params.id);
  res.json({ success: true });
});

module.exports = router;