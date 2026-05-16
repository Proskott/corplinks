const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendMail } = require('../mailer');

router.get('/', async (req, res) => {
  try { res.json(await db.getTickets()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    var ticket = await db.createTicket(req.body);
    await db.addLog('Нова заявка: ' + ticket.title, req.body.author || 'Система');

    if (ticket.assignedTo) {
      var users = await db.getUsers();
      var assignee = users.find(u => u._id.toString() === ticket.assignedTo);
      if (assignee) {
        sendMail(assignee.email,
          'Нова заявка: ' + ticket.title,
          '<div style="font-family:Arial,sans-serif;max-width:600px;padding:20px">' +
          '<h2 style="color:#2563eb;margin-bottom:20px">Вам призначено нову заявку</h2>' +
          '<table style="border-collapse:collapse;width:100%">' +
          '<tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:120px">Тема</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:bold">' + ticket.title + '</td></tr>' +
          '<tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280">Категорія</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">' + ticket.cat + '</td></tr>' +
          '<tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280">Пріоритет</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:bold;color:' + (ticket.priority === 'high' ? '#dc2626' : ticket.priority === 'medium' ? '#ca8a04' : '#16a34a') + '">' + ticket.priority + '</td></tr>' +
          '<tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280">Від кого</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">' + ticket.author + ' (' + ticket.dept + ')</td></tr>' +
          '<tr><td style="padding:10px 12px;color:#6b7280">Опис</td><td style="padding:10px 12px">' + (ticket.desc || 'Без опису') + '</td></tr>' +
          '</table>' +
          '<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px">Цей лист надіслано автоматично системою CorpLinks</p></div>'
        );
      }
    }

    res.json(ticket);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    var ticket = await db.updateTicketStatus(req.params.id, req.body.status);
    await db.addLog('Статус заявки "' + ticket.title + '": ' + req.body.status, req.body.adminName || 'IT');

    if (ticket.authorId) {
      var users = await db.getUsers();
      var author = users.find(u => u._id.toString() === ticket.authorId);
      var statusLabels = { new: 'Нова', inprogress: 'В роботі', done: 'Виконано' };
      var statusColors = { new: '#2563eb', inprogress: '#ca8a04', done: '#16a34a' };
      if (author) {
        sendMail(author.email,
          'Заявка "' + ticket.title + '" — ' + (statusLabels[req.body.status] || req.body.status),
          '<div style="font-family:Arial,sans-serif;max-width:600px;padding:20px">' +
          '<h2 style="color:#059669;margin-bottom:20px">Статус вашої заявки змінено</h2>' +
          '<p style="font-size:16px;margin-bottom:16px"><strong>' + ticket.title + '</strong></p>' +
          '<p>Новий статус: <span style="display:inline-block;padding:6px 16px;border-radius:6px;background:' + (statusColors[req.body.status] || '#666') + '18;color:' + (statusColors[req.body.status] || '#666') + ';font-weight:bold;border:1px solid ' + (statusColors[req.body.status] || '#666') + '33">' + (statusLabels[req.body.status] || req.body.status) + '</span></p>' +
          (ticket.assignedToName && ticket.assignedToName !== 'Не призначено' ? '<p style="margin-top:12px;color:#6b7280">Виконавець: ' + ticket.assignedToName + '</p>' : '') +
          '<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px">Цей лист надіслано автоматично системою CorpLinks</p></div>'
        );
      }
    }

    res.json(ticket);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id/assign', async (req, res) => {
  try {
    var ticket = await db.updateTicketAssignee(req.params.id, req.body.assignedTo, req.body.assignedToName);
    await db.addLog('Заявку "' + ticket.title + '" призначено: ' + req.body.assignedToName, req.body.adminName || 'Адмін');

    var users = await db.getUsers();
    var assignee = users.find(u => u._id.toString() === req.body.assignedTo);
    if (assignee) {
      sendMail(assignee.email,
        'Вам призначено заявку: ' + ticket.title,
        '<div style="font-family:Arial,sans-serif;max-width:600px;padding:20px">' +
        '<h2 style="color:#7c3aed;margin-bottom:20px">Вам призначено заявку</h2>' +
        '<p style="font-size:16px;margin-bottom:8px"><strong>' + ticket.title + '</strong></p>' +
        '<p style="color:#6b7280">Пріоритет: ' + ticket.priority + '</p>' +
        '<p style="color:#6b7280">Від: ' + ticket.author + ' (' + ticket.dept + ')</p>' +
        '<p style="color:#6b7280">Опис: ' + (ticket.desc || 'Без опису') + '</p>' +
        '<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px">Цей лист надіслано автоматично системою CorpLinks</p></div>'
      );
    }

    res.json(ticket);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await db.deleteTicket(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;