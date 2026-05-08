const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.json(db.getTickets());
});

router.post('/', (req, res) => {
  const ticket = db.createTicket(req.body);
  db.addLog(`Створена нова IT-заявка: ${ticket.title}`, req.body.author);
  res.json(ticket);
});

router.put('/:id/status', (req, res) => {
  db.updateTicketStatus(req.params.id, req.body.status);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.deleteTicket(req.params.id);
  res.json({ success: true });
});

module.exports = router;