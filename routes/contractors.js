const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => res.json(await db.getContractors()));

router.post('/', async (req, res) => {
  // Теперь принимаем расширенный объект: { company, phone, service, docType, amount }
  const item = await db.createContractor(req.body);
  
  // Логируем событие с указанием типа документа для истории
  const actionText = `Додано запис контрагента: ${item.company} (${item.docType || 'Загальне'})`;
  await db.addLog(actionText, 'Sales/Manager');
  
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  await db.deleteContractor(req.params.id);
  res.json({ success: true });
});

module.exports = router;