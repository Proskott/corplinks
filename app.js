const API = window.location.origin + '/api';

let state = {
  currentUser: null,
  resources:   [],
  users:       [],
  logs:        [],
  tickets:     [],
  accounting:  [], // Нове для хмари
  contractors: [], // Нове для хмари
  editResId:   null,
  editUserId:  null,
};

const CAT_LABELS = {
  development: 'Розробка', design: 'Дизайн',
  management: 'Менеджмент', hr: 'HR', finance: 'Фінанси'
};
const ROLE_LABELS = {
  admin: 'Адміністратор', manager: 'Менеджер',
  user: 'Співробітник', viewer: 'Стажер'
};
const ROLE_COLORS = {
  admin:   '#fce4ec:#880e4f',
  manager: '#fff3e0:#e65100',
  user:    '#e8f0fe:#1557b0',
  viewer:  '#e8f5e9:#1b5e20'
};
const TICKET_CAT = {
  hardware: '🖥️ Обладнання', software: '💿 ПЗ',
  network: '🌐 Мережа', access: '🔑 Доступи', other: '📋 Інше'
};
const TICKET_PRIORITY = {
  low:     { label: '🟢 Низький',  color: '#16a34a' },
  medium: { label: '🟡 Середній', color: '#ca8a04' },
  high:   { label: '🔴 Високий',  color: '#dc2626' }
};
const TICKET_STATUS = {
  new:         { label: '🆕 Нова',     color: '#2563eb' },
  inprogress: { label: '⚙️ В роботі', color: '#ca8a04' },
  done:        { label: '✅ Виконано',  color: '#16a34a' }
};

// =====================================================
// СИСТЕМНІ ФУНКЦІЇ
// =====================================================
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('wl_theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '☀️ Світла' : '🌙 Темна';
}

function applyTheme() {
  if (localStorage.getItem('wl_theme') === 'dark') {
    document.body.classList.add('dark');
    if (document.getElementById('themeBtn')) document.getElementById('themeBtn').textContent = '☀️ Світла';
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getInitials(name) {
  return (name || '??').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

let toastTimer;
function showToast(msg, isError) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.borderLeftColor = isError ? '#ef4444' : '#2563eb';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

async function api(method, endpoint, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Помилка сервера');
  return data;
}

function toggleBlock(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// =====================================================
// АВТОРИЗАЦІЯ
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
  } catch (e) {
    errEl.textContent = e.message;
  }
}

function logout() {
  state.currentUser = null;
  sessionStorage.removeItem('wl_session');
  location.reload();
}

function setupUI() {
  const u = state.currentUser;
  const isAdmin = u.role === 'admin';
  const isManager = ['admin', 'manager'].includes(u.role);

  document.getElementById('currentUserProfile').innerHTML = `
    <div class="avatar">${getInitials(u.name)}</div>
    <div>
      <div style="font-size:13px;font-weight:600;color:white">${esc(u.name)}</div>
      <div style="font-size:11px;color:#94a3b8">${ROLE_LABELS[u.role]} · ${u.dept}</div>
    </div>`;

  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
  document.querySelectorAll('.manager-only').forEach(el => el.style.display = isManager ? '' : 'none');

  // Навігація по відділах
  const deptMap = { Finance: 'nb-finance', Sales: 'nb-sales', IT: 'nb-it' };
  Object.values(deptMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = isAdmin ? 'flex' : 'none';
  });
  if (!isAdmin && deptMap[u.dept]) {
      const el = document.getElementById(deptMap[u.dept]);
      if (el) el.style.display = 'flex';
  }
  // IT завжди бачать всі
  document.getElementById('nb-it').style.display = 'flex';
}

// =====================================================
// ПЕРЕМИКАННЯ СТОРІНОК
// =====================================================
async function showPage(page) {
  closeSidebar();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (document.getElementById('nb-' + page)) document.getElementById('nb-' + page).classList.add('active');

  if (page === 'resources') await loadResources();
  if (page === 'it') { await loadTickets(); renderTickets(); }
  if (page === 'finance') await loadAccounting();
  if (page === 'sales') await loadContractors();
  if (page === 'admin') { await loadUsers(); renderUsers(); await loadStats(); }
}

// =====================================================
// БУХГАЛТЕРІЯ (ХМАРА)
// =====================================================
async function loadAccounting() {
  state.accounting = await api('GET', '/accounting');
  renderAccounting();
}

async function submitAccounting() {
  const title = document.getElementById('financeResName').value.trim();
  const amount = document.getElementById('financeResUrl').value.trim();
  const desc = document.getElementById('financeResDesc').value.trim();

  if (!title || !amount) return showToast('Заповніть назву та суму', true);

  await api('POST', '/accounting', { title, amount: Number(amount), description: desc });
  showToast('✅ Запис збережено в хмарі');
  toggleBlock('financeFormBlock');
  await loadAccounting();
}

function renderAccounting() {
  const grid = document.getElementById('financeGrid');
  grid.innerHTML = state.accounting.map(item => `
    <div class="card" style="border-left:4px solid #059669">
      <div class="card-header"><span class="card-title">${esc(item.title)}</span></div>
      <div style="font-size:20px;font-weight:bold;margin:10px 0">${item.amount} грн</div>
      <p class="card-desc">${esc(item.description || 'Без опису')}</p>
      <div class="card-actions">
        <button class="btn-icon danger" onclick="deleteAccounting('${item.id}')">🗑️ Видалити</button>
      </div>
    </div>
  `).join('') || '<p style="text-align:center;grid-column:1/-1">Фінансових записів немає</p>';
}

async function deleteAccounting(id) {
  if (confirm('Видалити запис?')) {
    await api('DELETE', '/accounting/' + id);
    await loadAccounting();
  }
}

// =====================================================
// КОНТРАГЕНТИ (ХМАРА)
// =====================================================
async function loadContractors() {
  state.contractors = await api('GET', '/contractors');
  renderContractors();
}

async function submitContractor() {
  const company = document.getElementById('salesResName').value.trim();
  const phone = document.getElementById('salesResUrl').value.trim();
  const service = document.getElementById('salesResDesc').value.trim();

  if (!company) return showToast('Введіть назву компанії', true);

  await api('POST', '/contractors', { company, phone, service });
  showToast('✅ Контрагента додано');
  toggleBlock('salesFormBlock');
  await loadContractors();
}

function renderContractors() {
  const grid = document.getElementById('salesGrid');
  grid.innerHTML = state.contractors.map(c => `
    <div class="card">
      <div class="card-header"><span class="card-title">${esc(c.company)}</span></div>
      <div style="margin:8px 0;font-size:13px">📞 ${esc(c.phone)}</div>
      <p class="card-desc">${esc(c.service || 'Без опису')}</p>
      <div class="card-actions">
        <button class="btn-icon danger" onclick="deleteContractor('${c.id}')">🗑️ Видалити</button>
      </div>
    </div>
  `).join('') || '<p style="text-align:center;grid-column:1/-1">Список порожній</p>';
}

async function deleteContractor(id) {
  if (confirm('Видалити контрагента?')) {
    await api('DELETE', '/contractors/' + id);
    await loadContractors();
  }
}

// =====================================================
// РЕСУРСИ (IT)
// =====================================================
async function loadResources() {
  state.resources = await api('GET', '/resources');
  filterAndRender();
}

function filterAndRender() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = state.resources.filter(r => r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q));
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = filtered.map(r => `
    <div class="card">
      <div class="card-header"><span class="card-title">${esc(r.name)}</span></div>
      <a class="card-url" href="${esc(r.url)}" target="_blank">${esc(r.url)}</a>
      <p class="card-desc">${esc(r.desc || '')}</p>
      <div class="card-actions">
        <button class="btn-icon danger admin-only" onclick="deleteResource('${r.id}')">🗑️ Видалити</button>
      </div>
    </div>
  `).join('');
}

async function deleteResource(id) {
    if (confirm('Видалити ресурс?')) {
        await api('DELETE', '/resources/' + id);
        await loadResources();
    }
}

// =====================================================
// IT-ЗАЯВКИ
// =====================================================
async function loadTickets() {
  state.tickets = await api('GET', '/tickets');
}

function renderTickets() {
  const el = document.getElementById('ticketsList');
  el.innerHTML = state.tickets.slice().reverse().map(t => `
    <div style="background:var(--surface);border:1px solid var(--border);padding:15px;border-radius:8px;margin-bottom:10px">
      <div style="font-weight:600">${esc(t.title)}</div>
      <div style="font-size:12px;color:gray">${t.status} · ${t.author}</div>
      <div style="margin-top:10px">
         <button class="btn-icon danger" onclick="deleteTicket('${t.id}')">🗑️ Видалити</button>
      </div>
    </div>
  `).join('');
}

async function deleteTicket(id) {
    await api('DELETE', '/tickets/' + id);
    await loadTickets();
    renderTickets();
}

// =====================================================
// АДМІНІСТРУВАННЯ
// =====================================================
async function loadUsers() {
  state.users = await api('GET', '/users');
}

function renderUsers() {
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = state.users.map(u => `
    <tr>
      <td>${esc(u.name)}</td>
      <td>${u.email}</td>
      <td>${u.dept}</td>
      <td>${u.role}</td>
      <td><button class="btn-icon danger" onclick="deleteUser('${u.id}')">🗑️</button></td>
    </tr>
  `).join('');
}

async function deleteUser(id) {
    if (confirm('Видалити користувача?')) {
        await api('DELETE', '/users/' + id);
        await loadUsers();
        renderUsers();
    }
}

async function loadStats() {
    const s = await api('GET', '/stats');
    const container = document.getElementById('statsCards');
    if (container) {
        container.innerHTML = `
            <div class="stat-card"><h3>${s.totalUsers}</h3><p>Користувачів</p></div>
            <div class="stat-card"><h3>${s.totalResources}</h3><p>Ресурсів</p></div>
            <div class="stat-card"><h3>${s.totalTickets}</h3><p>Заявок</p></div>
        `;
    }
}

// =====================================================
// ЗАПУСК
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  const session = sessionStorage.getItem('wl_session');
  if (session) {
    state.currentUser = JSON.parse(session);
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    setupUI();
    showPage('resources');
  }
});