const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res) => {
  const tickets = await db.getTickets();
  res.json(tickets);
});

router.post('/', async (req, res) => {
  const ticket = await db.createTicket(req.body);
  await db.addLog(`Створено IT-заявку: ${ticket.title}`, req.body.author);
  res.json(ticket);
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