const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Введіть email та пароль' });
    const user = db.loginUser(email, password);
    db.addLog('Вхід в систему', user.name);
    res.json({ success: true, user });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

const resourcesRouter = require('./routes/resources');
const usersRouter     = require('./routes/users');
const logsRouter      = require('./routes/logs');

app.use('/api/resources', resourcesRouter);
app.use('/api/users',     usersRouter);
app.use('/api/logs',      logsRouter);

app.get('/api/stats', (req, res) => {
  res.json(db.getStats());
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log('');
  console.log('===========================================');
  console.log('  CorpLinks сервер запущено!');
  console.log('  Відкрий браузер: http://localhost:3000');
  console.log('===========================================');
  console.log('');
});