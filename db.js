const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'worklinks.json');

const DEFAULT_DATA = {
  users: [
    { id: 1, name: 'Ходаківський Ігор Євгенійович', email: 'khodakivskyi@enterprise.com', dept: 'IT',      role: 'admin',   password: 'admin123', created_at: '2024-01-01 09:00:00' },
    { id: 2, name: 'Петренко Олена Василівна',       email: 'petrenko@enterprise.com',     dept: 'Finance', role: 'manager', password: '1234',     created_at: '2024-01-01 09:01:00' },
    { id: 3, name: 'Коваль Максим Іванович',         email: 'koval@enterprise.com',         dept: 'IT',      role: 'user',    password: '1234',     created_at: '2024-01-01 09:02:00' },
    { id: 4, name: 'Бондаренко Анна Сергіївна',      email: 'bondarenko@enterprise.com',    dept: 'HR',      role: 'user',    password: '1234',     created_at: '2024-01-01 09:03:00' },
    { id: 5, name: 'Шевченко Дмитро Олегович',       email: 'shevchenko@enterprise.com',    dept: 'Sales',   role: 'viewer',  password: '1234',     created_at: '2024-01-01 09:04:00' },
  ],
  resources: [
    { id: 1, name: 'GitHub організації',     url: 'https://github.com/company',       cat: 'development', desc: 'Репозиторій вихідного коду всіх проектів', access: 'IT',      created_at: '2024-01-01 09:10:00' },
    { id: 2, name: 'Figma — дизайн-система', url: 'https://figma.com/company',        cat: 'design',      desc: 'Компонентна бібліотека та макети',         access: 'ALL',     created_at: '2024-01-01 09:11:00' },
    { id: 3, name: 'Trello — дошка задач',   url: 'https://trello.com/company-board', cat: 'management',  desc: 'Планування спринтів та задач команди',     access: 'ALL',     created_at: '2024-01-01 09:12:00' },
    { id: 4, name: 'HR-портал',              url: 'https://hr.company.com',           cat: 'hr',          desc: 'Заявки на відпустку, довідки',             access: 'ALL',     created_at: '2024-01-01 09:13:00' },
    { id: 5, name: 'Бухгалтерський кабінет', url: 'https://finance.company.com',      cat: 'finance',     desc: 'Звіти, рахунки-фактури, документи',        access: 'Finance', created_at: '2024-01-01 09:14:00' },
    { id: 6, name: 'Confluence — документи', url: 'https://confluence.company.com',   cat: 'management',  desc: 'Технічна документація та бази знань',      access: 'IT',      created_at: '2024-01-01 09:15:00' },
    { id: 7, name: 'Jira — баг-трекер',      url: 'https://jira.company.com',         cat: 'development', desc: 'Управління задачами та помилками',         access: 'IT',      created_at: '2024-01-01 09:16:00' },
  ],
  user_resources: { "1": [1, 3, 6, 7] },
  logs: [
    { id: 1, action: 'Систему ініціалізовано. Додано демо-дані.', user_name: 'Система', created_at: '2024-01-01 09:00:00' },
  ],
  tickets: [],
  _counters: { users: 5, resources: 7, logs: 1, tickets: 0 }
};

function load() {
  if (!fs.existsSync(DB_FILE)) {
    save(DEFAULT_DATA);
    console.log('✅ Базу даних ініціалізовано (worklinks.json)');
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function nextId(data, table) {
  data._counters[table] = (data._counters[table] || 0) + 1;
  return data._counters[table];
}

function now() {
  return new Date().toLocaleString('uk-UA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).replace(',', '');
}

const db = {

  loginUser(email, password) {
    const data = load();
    const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user)                      throw new Error('Користувача з таким email не знайдено');
    if (user.password !== password)  throw new Error('Невірний пароль');
    const { password: _p, ...safeUser } = user;
    return safeUser;
  },

  getUsers() {
    return load().users.sort((a, b) => a.name.localeCompare(b.name)).map(({ password: _p, ...u }) => u);
  },

  getUserById(id) {
    const user = load().users.find(u => u.id === Number(id));
    if (!user) return null;
    const { password: _p, ...safeUser } = user;
    return safeUser;
  },

  createUser({ name, email, dept, role, password }) {
    const data = load();
    if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error('Користувач з таким email вже існує');
    if (!password || password.length < 4) throw new Error('Пароль має містити мінімум 4 символи');
    const user = { id: nextId(data, 'users'), name, email: email.toLowerCase(), dept, role, password, created_at: now() };
    data.users.push(user);
    save(data);
    const { password: _p, ...safeUser } = user;
    return safeUser;
  },

  updateUser(id, { name, email, dept, role, password }) {
    const data = load();
    const idx  = data.users.findIndex(u => u.id === Number(id));
    if (idx === -1) throw new Error('Користувача не знайдено');
    const dup = data.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== Number(id));
    if (dup) throw new Error('Цей email вже використовується');
    const updatedPassword = (password && password.length >= 4) ? password : data.users[idx].password;
    data.users[idx] = { ...data.users[idx], name, email: email.toLowerCase(), dept, role, password: updatedPassword };
    save(data);
    const { password: _p, ...safeUser } = data.users[idx];
    return safeUser;
  },

  deleteUser(id) {
    const data = load();
    const user = data.users.find(u => u.id === Number(id));
    if (!user) throw new Error('Користувача не знайдено');
    data.users = data.users.filter(u => u.id !== Number(id));
    delete data.user_resources[String(id)];
    save(data);
    const { password: _p, ...safeUser } = user;
    return safeUser;
  },

  getResources(userId) {
    const data = load();
    const mine = new Set((data.user_resources[String(userId)] || []).map(Number));
    return data.resources.map(r => ({ ...r, mine: mine.has(r.id) ? 1 : 0 })).sort((a, b) => b.id - a.id);
  },

  createResource({ name, url, cat, desc, access }) {
    const data = load();
    const res = { id: nextId(data, 'resources'), name, url, cat, desc: desc || '', access: access || 'ALL', created_at: now() };
    data.resources.push(res);
    save(data);
    return res;
  },

  updateResource(id, { name, url, cat, desc, access }) {
    const data = load();
    const idx = data.resources.findIndex(r => r.id === Number(id));
    if (idx === -1) throw new Error('Ресурс не знайдено');
    data.resources[idx] = { ...data.resources[idx], name, url, cat, desc: desc || '', access: access || 'ALL' };
    save(data);
    return data.resources[idx];
  },

  deleteResource(id) {
    const data = load();
    const res = data.resources.find(r => r.id === Number(id));
    if (!res) throw new Error('Ресурс не знайдено');
    data.resources = data.resources.filter(r => r.id !== Number(id));
    for (const uid in data.user_resources) {
      data.user_resources[uid] = data.user_resources[uid].filter(rid => rid !== Number(id));
    }
    save(data);
    return res;
  },

  toggleMine(resourceId, userId) {
    const data = load();
    const key = String(userId);
    const resId = Number(resourceId);
    if (!data.user_resources[key]) data.user_resources[key] = [];
    const idx = data.user_resources[key].indexOf(resId);
    let mine;
    if (idx === -1) { data.user_resources[key].push(resId); mine = true; }
    else { data.user_resources[key].splice(idx, 1); mine = false; }
    save(data);
    return mine;
  },

  getLogs() { return load().logs.slice().reverse().slice(0, 100); },

  addLog(action, userName) {
    const data = load();
    data.logs.push({ id: nextId(data, 'logs'), action, user_name: userName || 'Система', created_at: now() });
    if (data.logs.length > 500) data.logs = data.logs.slice(-500);
    save(data);
  },

  getStats() {
    const data = load();
    const byCategory = {}; data.resources.forEach(r => { byCategory[r.cat] = (byCategory[r.cat] || 0) + 1; });
    const byRole = {}; data.users.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1; });
    return {
      totalResources: data.resources.length, totalUsers: data.users.length,
      adminCount: data.users.filter(u => u.role === 'admin').length,
      managerCount: data.users.filter(u => u.role === 'manager').length,
      byCategory: Object.entries(byCategory).map(([cat, count]) => ({ cat, count })),
      byRole: Object.entries(byRole).map(([role, count]) => ({ role, count })),
    };
  },

  // ==========================================
  // НОВІ ФУНКЦІЇ ДЛЯ IT-ЗАЯВОК (HELPDESK)
  // ==========================================
  getTickets() {
    return load().tickets;
  },

  createTicket({ title, cat, priority, desc, author, authorId, dept }) {
    const data = load();
    const ticket = { 
      id: nextId(data, 'tickets'), 
      title, 
      cat, 
      priority, 
      desc: desc || '', 
      status: 'new', 
      author, 
      authorId, 
      dept, 
      createdAt: now() 
    };
    data.tickets.push(ticket);
    save(data);
    return ticket;
  },

  updateTicketStatus(id, status) {
    const data = load();
    const idx = data.tickets.findIndex(t => t.id === Number(id));
    if (idx === -1) throw new Error('Заявку не знайдено');
    
    data.tickets[idx].status = status;
    save(data);
    return data.tickets[idx];
  },

  deleteTicket(id) {
    const data = load();
    const ticket = data.tickets.find(t => t.id === Number(id));
    if (!ticket) throw new Error('Заявку не знайдено');
    
    data.tickets = data.tickets.filter(t => t.id !== Number(id));
    save(data);
    return ticket;
  }
};

module.exports = db;