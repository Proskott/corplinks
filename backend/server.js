const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use('/api/users',     require('./routes/users'));
app.use('/api/tickets',   require('./routes/tickets'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/logs',      require('./routes/logs'));

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

app.get('/api/stats', async (req, res) => res.json(await db.getStats()));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`🚀 Cloud Server on port ${PORT}`));