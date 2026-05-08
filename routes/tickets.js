const express = require('express');
const router  = express.Router();
const db      = require('../db');

// Получить все заявки
router.get('/', (req, res) => {
  res.json(db.getTickets());
});

// Создать новую заявку
router.post('/', (req, res) => {
  try {
    const ticket = db.createTicket(req.body);
    db.addLog(`Создана IT-заявка: ${ticket.title}`, req.body.author);
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Обновить статус заявки
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const ticket = db.updateTicketStatus(req.params.id, status);
    db.addLog(`Изменен статус заявки #${req.params.id} на "${status}"`, 'Система');
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Удалить заявку
router.delete('/:id', (req, res) => {
  try {
    db.deleteTicket(req.params.id);
    db.addLog(`Удалена заявка #${req.params.id}`, 'Администратор');
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;