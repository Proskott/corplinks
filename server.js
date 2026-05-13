const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API МАРШРУТИ (ОБОВ'ЯЗКОВО ПЕРЕД app.get('*'))
app.use('/api/users',        require('./routes/users'));
app.use('/api/tickets',      require('./routes/tickets'));
app.use('/api/resources',    require('./routes/resources'));
app.use('/api/logs',         require('./routes/logs'));
app.use('/api/accounting',   require('./routes/accounting'));
app.use('/api/contractors',  require('./routes/contractors'));
app.use('/api/hr',           require('./routes/hr'));       // Додано для HR
app.use('/api/contacts',     require('./routes/contacts')); // Додано для Контактів

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.loginUser(email, password);
    await db.addLog('Вхід в систему', user.name);
    res.json({ success: true, user });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});
app.post('/api/auth/change-password', async (req, res) => {
  try {
    var { userId, oldPassword, newPassword } = req.body;
    await db.changePassword(userId, oldPassword, newPassword);
    await db.addLog('Змінено пароль', 'Система');
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.get('/api/stats', async (req, res) => res.json(await db.getStats()));

// Кінцева точка для SPA
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`🚀 Cloud Server running on port ${PORT}`));
