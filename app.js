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
// ТЕМНА ТЕМА ТА СИСТЕМНІ
// =====================================================
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('wl_theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '☀️ Світла тема' : '🌙 Темна тема';
}

function applyTheme() {
  if (localStorage.getItem('wl_theme') === 'dark') {
    document.body.classList.add('dark');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = '☀️ Світла тема';
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
  const res  = await fetch(API + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Помилка сервера');
  return data;
}

function toggleBlock(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// =====================================================
// АВТОРИЗАЦІЯ
// =====================================================
async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;
  const errEl = document.getElementById('loginError');

  try {
    const data = await api('POST', '/auth/login', { email, password });
    state.currentUser = data.user;

    if (remember) {
      localStorage.setItem('wl_saved_email', email);
      localStorage.setItem('wl_remember', '1');
    }
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
  sessionStorage.clear();
  location.reload();
}

// =====================================================
// UI ЗА РОЛЛЮ
// =====================================================
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

  // Показуємо кнопки відділів
  document.getElementById('nb-it').style.display = 'flex';
  const deptMap = { Finance: 'nb-finance', Sales: 'nb-sales' };
  
  if (isAdmin) {
    Object.values(deptMap).forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = 'flex'; });
    if(document.getElementById('nb-admin')) document.getElementById('nb-admin').style.display = 'flex';
  } else if (deptMap[u.dept]) {
    document.getElementById(deptMap[u.dept]).style.display = 'flex';
  }
}

async function showPage(page) {
  closeSidebar();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById('page-' + page)?.classList.add('active');
  document.getElementById('nb-' + page)?.classList.add('active');

  if (page === 'resources') await loadResources();
  if (page === 'my')        renderMyResources();
  if (page === 'it')        { await loadTickets(); renderTickets(); }
  if (page === 'finance')   await loadAccounting();
  if (page === 'sales')     await loadContractors();
  if (page === 'admin')     { await loadUsers(); await loadTickets(); await loadStats(); renderUsers(); renderAllTickets(); }
}

// =====================================================
// РЕСУРСИ (ЗІ ЗІРОЧКАМИ ТА ПОВНИМ ВЕРСТАННЯМ)
// =====================================================
async function loadResources() {
  state.resources = await api('GET', '/resources');
  filterAndRender();
}

function filterAndRender() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const cat = document.getElementById('catFilter')?.value || '';
  
  const filtered = state.resources.filter(r => {
    const matchT = r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q);
    const matchC = cat === '' || r.cat === cat;
    return matchT && matchC;
  });
  renderCards(filtered, 'cardsGrid');
}

function renderCards(data, containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  const isManager = ['admin', 'manager'].includes(state.currentUser.role);

  grid.innerHTML = data.map(r => {
    const mineClass = r.mine ? ' mine' : '';
    const mineText  = r.mine ? '★ Моє' : '☆ До моїх';
    const editBtns = isManager ? `
      <button class="btn-icon" onclick="openEditRes(${r.id})">✏️</button>
      <button class="btn-icon danger" onclick="deleteResource(${r.id})">🗑️</button>
    ` : '';

    return `
      <div class="card">
        <div class="card-header">
          <div><span class="card-title">${esc(r.name)}</span></div>
          <span class="badge">${CAT_LABELS[r.cat] || r.cat}</span>
        </div>
        <a class="card-url" href="${esc(r.url)}" target="_blank">${esc(r.url)}</a>
        <p class="card-desc">${esc(r.desc || 'Без опису')}</p>
        <div class="card-actions">
          ${editBtns}
          <button class="btn-icon ${mineClass}" onclick="toggleMine(${r.id})" style="margin-left:auto">${mineText}</button>
        </div>
      </div>`;
  }).join('') || '<div style="text-align:center;padding:40px;color:gray">Нічого не знайдено</div>';
}

function renderMyResources() {
  renderCards(state.resources.filter(r => r.mine), 'myGrid');
}

async function toggleMine(id) {
  const r = state.resources.find(x => x.id === id);
  if (r) {
    r.mine = !r.mine;
    showToast(r.mine ? '★ Додано до моїх' : 'Видалено з моїх');
    filterAndRender();
    renderMyResources();
  }
}

// =====================================================
// БУХГАЛТЕРІЯ ТА КОНТРАГЕНТИ (ХМАРА)
// =====================================================
async function loadAccounting() {
  state.accounting = await api('GET', '/accounting');
  renderAccounting();
}

async function submitAccounting() {
  const title = document.getElementById('financeResName').value.trim();
  const amount = document.getElementById('financeResUrl').value.trim();
  const desc = document.getElementById('financeResDesc').value.trim();
  if (!title || !amount) return showToast('Заповніть поля', true);

  await api('POST', '/accounting', { title, amount: Number(amount), description: desc });
  showToast('✅ Збережено в хмарі');
  toggleBlock('financeFormBlock');
  await loadAccounting();
}

function renderAccounting() {
  const grid = document.getElementById('financeGrid');
  if(!grid) return;
  grid.innerHTML = state.accounting.map(item => `
    <div class="card" style="border-left:4px solid #059669">
      <div class="card-header"><span class="card-title">${esc(item.title)}</span></div>
      <div style="font-size:18px;font-weight:bold;margin:8px 0">${item.amount} грн</div>
      <p class="card-desc">${esc(item.description || '')}</p>
      <div class="card-actions"><button class="btn-icon danger" onclick="deleteAccounting(${item.id})">🗑️</button></div>
    </div>`).join('') || '<p>Записів немає</p>';
}

async function loadContractors() {
  state.contractors = await api('GET', '/contractors');
  renderContractors();
}

async function submitContractor() {
  const company = document.getElementById('salesResName').value.trim();
  const phone = document.getElementById('salesResUrl').value.trim();
  const service = document.getElementById('salesResDesc').value.trim();
  if (!company) return showToast('Введіть компанію', true);

  await api('POST', '/contractors', { company, phone, service });
  showToast('✅ Контрагента додано');
  toggleBlock('salesFormBlock');
  await loadContractors();
}

function renderContractors() {
  const grid = document.getElementById('salesGrid');
  if(!grid) return;
  grid.innerHTML = state.contractors.map(c => `
    <div class="card">
      <div class="card-header"><span class="card-title">${esc(c.company)}</span></div>
      <div style="margin:5px 0;font-size:13px">📞 ${esc(c.phone)}</div>
      <p class="card-desc">${esc(c.service || '')}</p>
      <div class="card-actions"><button class="btn-icon danger" onclick="deleteContractor(${c.id})">🗑️</button></div>
    </div>`).join('') || '<p>Контрагентів немає</p>';
}

// =====================================================
// ТІКЕТИ ТА АДМІНКА (ПОВНЕ ВЕРСТАННЯ)
// =====================================================
async function loadTickets() { state.tickets = await api('GET', '/tickets'); }

function renderTickets() {
  const el = document.getElementById('ticketsList');
  if(!el) return;
  el.innerHTML = state.tickets.slice().reverse().map(t => {
    const pr = TICKET_PRIORITY[t.priority] || { label: t.priority, color: '#666' };
    const st = TICKET_STATUS[t.status] || { label: t.status, color: '#666' };
    return `
      <div class="card" style="margin-bottom:12px; border-left: 4px solid ${pr.color}">
        <div style="font-weight:600">${esc(t.title)}</div>
        <div style="font-size:11px;color:gray;margin-bottom:8px">${t.author} · ${t.createdAt}</div>
        <div style="display:flex;gap:5px;margin-bottom:10px">
          <span class="badge" style="background:${pr.color}22;color:${pr.color}">${pr.label}</span>
          <span class="badge" style="background:${st.color}22;color:${st.color}">${st.label}</span>
        </div>
        <div class="card-actions">
          <button class="btn-icon danger" onclick="deleteTicket(${t.id})">🗑️ Видалити</button>
        </div>
      </div>`;
  }).join('') || '<p>Заявок немає</p>';
}

function renderAllTickets() {
  const el = document.getElementById('allTicketsList');
  if (!el) return;
  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Тема</th><th>Від кого</th><th>Статус</th><th>Дії</th></tr></thead>
        <tbody>
          ${state.tickets.map(t => `
            <tr>
              <td>${esc(t.title)}</td>
              <td>${esc(t.author)}</td>
              <td>${t.status}</td>
              <td><button class="btn-icon danger" onclick="deleteTicket(${t.id})">🗑️</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function loadUsers() { state.users = await api('GET', '/users'); }
function renderUsers() {
  const tbody = document.getElementById('usersBody');
  if(!tbody) return;
  tbody.innerHTML = state.users.map(u => `
    <tr>
      <td>${esc(u.name)}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td><button class="btn-icon danger" onclick="deleteUser(${u.id})">🗑️</button></td>
    </tr>`).join('');
}

async function loadStats() {
  const s = await api('GET', '/stats');
  const cards = document.getElementById('statsCards');
  if (cards) cards.innerHTML = `
    <div class="stat-card"><h3>${s.totalResources}</h3><p>Ресурсів</p></div>
    <div class="stat-card"><h3>${s.totalUsers}</h3><p>Юзерів</p></div>
    <div class="stat-card"><h3>${s.totalTickets}</h3><p>Тікетів</p></div>`;
}

// =====================================================
// ГЛОБАЛЬНІ ОБРОБНИКИ (ЩОБ ПРАЦЮВАЛИ ONCLICK)
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
window.deleteResource = async (id) => { if(confirm('Видалити?')){ await api('DELETE', '/resources/'+id); loadResources(); } };
window.deleteTicket = async (id) => { if(confirm('Видалити?')){ await api('DELETE', '/tickets/'+id); showPage('it'); } };
window.deleteAccounting = async (id) => { await api('DELETE', '/accounting/'+id); loadAccounting(); };
window.deleteContractor = async (id) => { await api('DELETE', '/contractors/'+id); loadContractors(); };
window.deleteUser = async (id) => { if(confirm('Видалити?')){ await api('DELETE', '/users/'+id); loadUsers(); renderUsers(); } };

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
});ы