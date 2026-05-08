const API = window.location.origin + '/api';

let state = {
  currentUser: null,
  resources:   [],
  users:       [],
  logs:        [],
  tickets:     [],
  accounting:  [], 
  contractors: [], 
  editResId:   null,
  editUserId:  null,
};

// Словники
const CAT_LABELS = { development: 'Розробка', design: 'Дизайн', management: 'Менеджмент', hr: 'HR', finance: 'Фінанси' };
const ROLE_LABELS = { admin: 'Адміністратор', manager: 'Менеджер', user: 'Співробітник', viewer: 'Стажер' };
const ROLE_COLORS = { admin: '#fce4ec:#880e4f', manager: '#fff3e0:#e65100', user: '#e8f0fe:#1557b0', viewer: '#e8f5e9:#1b5e20' };
const TICKET_CAT = { hardware: '🖥️ Обладнання', software: '💿 ПЗ', network: '🌐 Мережа', access: '🔑 Доступи', other: '📋 Інше' };
const TICKET_PRIORITY = {
  low: { label: '🟢 Низький', color: '#16a34a' },
  medium: { label: '🟡 Середній', color: '#ca8a04' },
  high: { label: '🔴 Високий', color: '#dc2626' }
};
const TICKET_STATUS = {
  new: { label: '🆕 Нова', color: '#2563eb' },
  inprogress: { label: '⚙️ В роботі', color: '#ca8a04' },
  done: { label: '✅ Виконано', color: '#16a34a' }
};

// =====================================================
// ДОПОМІЖНІ ФУНКЦІЇ (ОБОВ'ЯЗКОВО ДЛЯ РОБОТИ КНОПОК)
// =====================================================
function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function getInitials(name) { return (name || '??').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase(); }
function toggleBlock(id) { const el = document.getElementById(id); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('show'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); }

let toastTimer;
function showToast(msg, isError) {
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.style.borderLeftColor = isError ? '#ef4444' : '#2563eb';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

async function api(method, endpoint, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Помилка сервера');
  return data;
}

// =====================================================
// АВТОРИЗАЦІЯ ТА ТЕМА
// =====================================================
async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  try {
    const data = await api('POST', '/auth/login', { email, password });
    state.currentUser = data.user;
    sessionStorage.setItem('wl_session', JSON.stringify(state.currentUser));
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    setupUI();
    showPage('resources');
  } catch (e) { errEl.textContent = e.message; }
}

function logout() { sessionStorage.clear(); location.reload(); }

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('wl_theme', isDark ? 'dark' : 'light');
}

// =====================================================
// UI ТА НАВІГАЦІЯ
// =====================================================
function setupUI() {
  const u = state.currentUser;
  const isAdmin = u.role === 'admin';
  document.getElementById('currentUserProfile').innerHTML = `
    <div class="avatar">${getInitials(u.name)}</div>
    <div><div style="font-weight:600;color:white">${esc(u.name)}</div><div style="font-size:11px;color:#94a3b8">${u.dept}</div></div>`;
  
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
  
  // Відкриваємо кнопки в сайдбарі
  document.getElementById('nb-it').style.display = 'flex';
  if (isAdmin) {
    ['nb-finance', 'nb-sales', 'nb-admin'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = 'flex'; });
  } else {
    const deptMap = { Finance: 'nb-finance', Sales: 'nb-sales' };
    if (deptMap[u.dept]) document.getElementById(deptMap[u.dept]).style.display = 'flex';
  }
}

async function showPage(page) {
  closeSidebar();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.getElementById('nb-' + page)?.classList.add('active');

  if (page === 'resources') await loadResources();
  if (page === 'it') { await loadTickets(); renderTickets(); }
  if (page === 'finance') await loadAccounting();
  if (page === 'sales') await loadContractors();
  if (page === 'admin') { await loadUsers(); await loadTickets(); await loadStats(); renderUsers(); renderAllTickets(); }
}

// =====================================================
// РЕСУРСИ (ЗІ ЗІРОЧКАМИ)
// =====================================================
async function loadResources() {
  state.resources = await api('GET', '/resources');
  renderCards(state.resources, 'cardsGrid');
}

function renderCards(data, containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = data.map(r => `
    <div class="card">
      <div class="card-header"><span class="card-title">${esc(r.name)}</span><span class="badge">${CAT_LABELS[r.cat] || r.cat}</span></div>
      <a class="card-url" href="${esc(r.url)}" target="_blank">${esc(r.url)}</a>
      <p class="card-desc">${esc(r.desc || 'Без опису')}</p>
      <div class="card-actions">
        ${state.currentUser.role === 'admin' ? `<button class="btn-icon danger" onclick="deleteResource(${r.id})">🗑️</button>` : ''}
        <button class="btn-icon ${r.mine ? 'mine' : ''}" onclick="toggleMine(${r.id})" style="margin-left:auto">${r.mine ? '★ Моє' : '☆ До моїх'}</button>
      </div>
    </div>`).join('') || '<p style="padding:20px">Порожньо</p>';
}

async function toggleMine(id) {
  const r = state.resources.find(x => x.id === id);
  if (r) { r.mine = !r.mine; showPage('resources'); }
}

// =====================================================
// БУХГАЛТЕРІЯ ТА КОНТРАГЕНТИ (ХМАРА)
// =====================================================
async function loadAccounting() { state.accounting = await api('GET', '/accounting'); renderAccounting(); }
function renderAccounting() {
  const grid = document.getElementById('financeGrid');
  grid.innerHTML = state.accounting.map(item => `
    <div class="card" style="border-left:4px solid #059669">
      <div class="card-title">${esc(item.title)}</div>
      <div style="font-size:18px;font-weight:bold">${item.amount} грн</div>
      <div class="card-actions"><button class="btn-icon danger" onclick="deleteAccounting(${item.id})">🗑️</button></div>
    </div>`).join('') || '<p>Записів немає</p>';
}

async function loadContractors() { state.contractors = await api('GET', '/contractors'); renderContractors(); }
function renderContractors() {
  const grid = document.getElementById('salesGrid');
  grid.innerHTML = state.contractors.map(c => `
    <div class="card">
      <div class="card-title">${esc(c.company)}</div>
      <div style="font-size:13px">📞 ${esc(c.phone)}</div>
      <div class="card-actions"><button class="btn-icon danger" onclick="deleteContractor(${c.id})">🗑️</button></div>
    </div>`).join('') || '<p>Контрагентів немає</p>';
}

// =====================================================
// ТІКЕТИ ТА АДМІНКА
// =====================================================
async function loadTickets() { state.tickets = await api('GET', '/tickets'); }
function renderTickets() {
  const el = document.getElementById('ticketsList');
  el.innerHTML = state.tickets.slice().reverse().map(t => `
    <div class="card" style="margin-bottom:10px">
      <div style="font-weight:600">${esc(t.title)}</div>
      <div style="font-size:12px;color:gray">${t.status} | ${t.author}</div>
      <button class="btn-icon danger" onclick="deleteTicket(${t.id})" style="margin-top:10px">🗑️ Видалити</button>
    </div>`).join('') || '<p>Заявок немає</p>';
}

function renderAllTickets() {
  const el = document.getElementById('allTicketsList');
  if (!el) return;
  el.innerHTML = `<table class="data-table"><thead><tr><th>Тема</th><th>Автор</th><th>Дії</th></tr></thead>
    <tbody>${state.tickets.map(t => `<tr><td>${esc(t.title)}</td><td>${t.author}</td><td><button class="btn-icon danger" onclick="deleteTicket(${t.id})">🗑️</button></td></tr>`).join('')}</tbody></table>`;
}

async function loadUsers() { state.users = await api('GET', '/users'); }
function renderUsers() {
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = state.users.map(u => `<tr><td>${esc(u.name)}</td><td>${u.email}</td><td><button class="btn-icon danger" onclick="deleteUser(${u.id})">🗑️</button></td></tr>`).join('');
}

async function loadStats() {
    const s = await api('GET', '/stats');
    const el = document.getElementById('statsCards');
    if (el) el.innerHTML = `<div class="stat-card"><h3>${s.totalUsers}</h3><p>Користувачів</p></div><div class="stat-card"><h3>${s.totalTickets}</h3><p>Заявок</p></div>`;
}

// =====================================================
// ОБРОБНИКИ ВИДАЛЕННЯ ТА ДОДАВАННЯ
// =====================================================
async function deleteResource(id) { if(confirm('Видалити?')) { await api('DELETE', '/resources/'+id); await loadResources(); } }
async function deleteTicket(id) { if(confirm('Видалити?')) { await api('DELETE', '/tickets/'+id); await showPage('it'); } }
async function deleteAccounting(id) { await api('DELETE', '/accounting/'+id); await loadAccounting(); }
async function deleteContractor(id) { await api('DELETE', '/contractors/'+id); await loadContractors(); }
async function deleteUser(id) { if(confirm('Видалити?')) { await api('DELETE', '/users/'+id); await loadUsers(); renderUsers(); } }

async function submitAccounting() {
  const title = document.getElementById('financeResName').value;
  const amount = document.getElementById('financeResUrl').value;
  await api('POST', '/accounting', { title, amount });
  toggleBlock('financeFormBlock');
  await loadAccounting();
}

async function submitContractor() {
  const company = document.getElementById('salesResName').value;
  const phone = document.getElementById('salesResUrl').value;
  await api('POST', '/contractors', { company, phone });
  toggleBlock('salesFormBlock');
  await loadContractors();
}

// =====================================================
// СТАРТ ТА ГЛОБАЛЬНИЙ ЕКСПОРТ (ЩОБ КНОПКИ ПРАЦЮВАЛИ)
// =====================================================
window.login = login;
window.logout = logout;
window.showPage = showPage;
window.toggleMine = toggleMine;
window.toggleBlock = toggleBlock;
window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.submitAccounting = submitAccounting;
window.submitContractor = submitContractor;
window.deleteResource = deleteResource;
window.deleteTicket = deleteTicket;
window.deleteAccounting = deleteAccounting;
window.deleteContractor = deleteContractor;
window.deleteUser = deleteUser;

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('wl_theme') === 'dark') document.body.classList.add('dark');
  const session = sessionStorage.getItem('wl_session');
  if (session) {
    state.currentUser = JSON.parse(session);
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    setupUI();
    showPage('resources');
  }
});