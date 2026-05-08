const API = window.location.origin + '/api';

let state = {
  currentUser: null,
  resources:   [],
  users:       [],
  logs:        [],
  tickets:     [],
  deptRes:     { Finance: [], Sales: [] },
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
  low:    { label: '🟢 Низький',  color: '#16a34a' },
  medium: { label: '🟡 Середній', color: '#ca8a04' },
  high:   { label: '🔴 Високий',  color: '#dc2626' }
};
const TICKET_STATUS = {
  new:        { label: '🆕 Нова',     color: '#2563eb' },
  inprogress: { label: '⚙️ В роботі', color: '#ca8a04' },
  done:       { label: '✅ Виконано',  color: '#16a34a' }
};

// =====================================================
// ТЕМНА ТЕМА
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

// =====================================================
// МОБІЛЬНЕ МЕНЮ
// =====================================================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// =====================================================
// ДОПОМІЖНІ
// =====================================================
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getInitials(name) {
  return (name || '??').trim().split(/\s+/).slice(0, 2)
    .map(w => w[0] || '').join('').toUpperCase();
}

let toastTimer;
function showToast(msg, isError) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.borderLeftColor = isError ? '#ef4444' : 'var(--primary)';
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
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const remember = document.getElementById('rememberMe').checked;
  const errEl    = document.getElementById('loginError');

  errEl.textContent = '';
  if (!email)    { errEl.textContent = 'Введіть email';  return; }
  if (!password) { errEl.textContent = 'Введіть пароль'; return; }

  try {
    const resp = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json();
    if (!resp.ok) { errEl.textContent = data.error || 'Помилка входу'; return; }

    state.currentUser = data.user;

    if (remember) {
      localStorage.setItem('wl_saved_email', email);
      localStorage.setItem('wl_remember', '1');
    } else {
      localStorage.removeItem('wl_saved_email');
      localStorage.removeItem('wl_remember');
    }

    sessionStorage.setItem('wl_session', JSON.stringify(state.currentUser));
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    setupUI();
    await showPage('resources');
  } catch (e) {
    errEl.textContent = "Помилка з'єднання з сервером";
  }
}

function logout() {
  state.currentUser = null;
  sessionStorage.removeItem('wl_session');
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginOverlay').style.display = 'flex';

  const saved = localStorage.getItem('wl_saved_email');
  if (saved && localStorage.getItem('wl_remember') === '1') {
    document.getElementById('loginEmail').value = saved;
    document.getElementById('rememberMe').checked = true;
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
  } else {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
  }
  document.getElementById('loginError').textContent = '';
}

function resetDatabase() {
  alert('Зупини сервер (Ctrl+C), видали файл worklinks.json у папці проекту, та запусти сервер знову (node server.js).');
}

// =====================================================
// НАЛАШТУВАННЯ UI ЗА РОЛЛЮ
// =====================================================
function setupUI() {
  const u         = state.currentUser;
  const isAdmin   = u.role === 'admin';
  const isManager = ['admin', 'manager'].includes(u.role);

  document.getElementById('currentUserProfile').innerHTML = `
    <div class="avatar">${getInitials(u.name)}</div>
    <div>
      <div style="font-size:13px;font-weight:600;color:white">${esc(u.name)}</div>
      <div style="font-size:11px;color:#94a3b8">${ROLE_LABELS[u.role]} · ${u.dept}</div>
    </div>`;

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  document.querySelectorAll('.manager-only').forEach(el => {
    el.style.display = isManager ? '' : 'none';
  });

  document.getElementById('deptModules').style.display = 'block';
  const deptMap = { IT: 'nb-it', Finance: 'nb-finance', Sales: 'nb-sales' };
  // Показуємо кнопку свого відділу
  if (deptMap[u.dept]) {
    const btn = document.getElementById(deptMap[u.dept]);
    if (btn) btn.style.display = 'flex';
  }
  // Адмін бачить всі відділи
  if (isAdmin) {
    Object.values(deptMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'flex';
    });
  }

  // Завантажуємо заявки та ресурси відділів з localStorage
  const savedT = localStorage.getItem('wl_tickets');
  if (savedT) state.tickets = JSON.parse(savedT);
  const savedD = localStorage.getItem('wl_dept_res');
  if (savedD) state.deptRes = JSON.parse(savedD);

  applyTheme();
}

// =====================================================
// ПЕРЕМИКАННЯ СТОРІНОК
// =====================================================
async function showPage(page) {
  // Закриваємо мобільне меню при навігації
  closeSidebar();

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const btn = document.getElementById('nb-' + page);
  if (btn) btn.classList.add('active');

  if (page === 'resources') await loadResources();
  if (page === 'my')        renderMyResources();
  if (page === 'it')        renderTickets();
  if (page === 'finance')   renderDeptRes('Finance');
  if (page === 'sales')     renderDeptRes('Sales');
  if (page === 'admin')     { await loadUsers(); renderUsers(); await loadStats(); renderLogs(); renderAllTickets(); }
}

// =====================================================
// РЕСУРСИ — ЗАВАНТАЖЕННЯ ТА РЕНДЕР
// =====================================================
async function loadResources() {
  try {
    state.resources = await api('GET', '/resources?userId=' + state.currentUser.id);
    renderStatBar();
    renderCatFilter();
    filterAndRender();
  } catch (e) {
    showToast('Помилка завантаження ресурсів', true);
  }
}

function renderStatBar() {
  const counts = {};
  state.resources.forEach(r => { counts[r.cat] = (counts[r.cat] || 0) + 1; });
  document.getElementById('statsBar').innerHTML =
    '<div class="stat-chip">Всього:<span>' + state.resources.length + '</span></div>' +
    Object.entries(counts).map(function(e) {
      return '<div class="stat-chip">' + (CAT_LABELS[e[0]] || e[0]) + ':<span>' + e[1] + '</span></div>';
    }).join('');
}

function renderCatFilter() {
  const cats = [];
  state.resources.forEach(function(r) {
    if (cats.indexOf(r.cat) === -1) cats.push(r.cat);
  });
  document.getElementById('catFilter').innerHTML =
    '<option value="">Всі категорії</option>' +
    cats.map(function(c) {
      return '<option value="' + c + '">' + (CAT_LABELS[c] || c) + '</option>';
    }).join('');
}

function filterAndRender() {
  var q   = (document.getElementById('searchInput').value || '').toLowerCase();
  var cat = document.getElementById('catFilter').value;
  var filtered = state.resources.filter(function(r) {
    var matchText = r.name.toLowerCase().indexOf(q) !== -1 ||
                    r.url.toLowerCase().indexOf(q) !== -1 ||
                    (r.desc && r.desc.toLowerCase().indexOf(q) !== -1);
    var matchCat  = cat === '' || r.cat === cat;
    return matchText && matchCat;
  });
  renderCards(filtered, 'cardsGrid');
}

function renderCards(data, containerId) {
  var grid      = document.getElementById(containerId);
  var isManager = ['admin', 'manager'].indexOf(state.currentUser.role) !== -1;

  if (!data.length) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">' +
      '<div style="font-size:40px;margin-bottom:12px">📂</div>' +
      '<div style="font-size:16px;font-weight:600">Ресурсів не знайдено</div>' +
      '<div style="font-size:13px;margin-top:6px">Спробуйте змінити фільтр або додайте новий</div></div>';
    return;
  }

  grid.innerHTML = data.map(function(r) {
    var accessBadge = (r.access && r.access !== 'ALL')
      ? '<span class="access-badge">🔒 ' + esc(r.access) + '</span>' : '';
    var descHtml = r.desc
      ? '<p class="card-desc">' + esc(r.desc) + '</p>'
      : '<p class="card-desc" style="color:#94a3b8;font-style:italic">Без опису</p>';
    var editBtn = isManager ? '<button class="btn-icon" onclick="openEditRes(' + r.id + ')">✏️ Редагувати</button>' : '';
    var delBtn  = isManager ? '<button class="btn-icon danger" onclick="deleteResource(' + r.id + ')">🗑️ Видалити</button>' : '';
    var mineClass = r.mine ? ' mine' : '';
    var mineText  = r.mine ? '★ Моє' : '☆ До моїх';

    return '<div class="card">' +
      '<div class="card-header"><div><span class="card-title">' + esc(r.name) + '</span>' + accessBadge + '</div>' +
      '<span class="badge">' + (CAT_LABELS[r.cat] || r.cat) + '</span></div>' +
      '<a class="card-url" href="' + esc(r.url) + '" target="_blank">' + esc(r.url) + '</a>' +
      descHtml +
      '<div class="card-actions">' + editBtn + delBtn +
      '<button class="btn-icon' + mineClass + '" onclick="toggleMine(' + r.id + ')" style="margin-left:auto">' + mineText + '</button>' +
      '</div></div>';
  }).join('');
}

function renderMyResources() {
  var mine = state.resources.filter(function(r) { return r.mine; });
  renderCards(mine, 'myGrid');
}

// =====================================================
// ДОДАВАННЯ / РЕДАГУВАННЯ РЕСУРСУ
// =====================================================
function openResModal() {
  state.editResId = null;
  document.getElementById('resModalTitle').textContent = 'Новий ресурс';
  document.getElementById('rName').value = '';
  document.getElementById('rUrl').value  = '';
  document.getElementById('rDesc').value = '';
  document.getElementById('resOverlay').classList.add('open');
}

function openEditRes(id) {
  var r = state.resources.filter(function(x) { return x.id === id; })[0];
  if (!r) return;
  state.editResId = id;
  document.getElementById('resModalTitle').textContent = 'Редагувати ресурс';
  document.getElementById('rName').value = r.name;
  document.getElementById('rUrl').value  = r.url;
  document.getElementById('rCat').value  = r.cat;
  document.getElementById('rDesc').value = r.desc || '';
  var accessArr = (r.access || 'ALL').split(',');
  var opts = document.getElementById('rAccess').options;
  for (var i = 0; i < opts.length; i++) {
    opts[i].selected = accessArr.indexOf(opts[i].value) !== -1;
  }
  document.getElementById('resOverlay').classList.add('open');
}

async function saveResource() {
  var name = document.getElementById('rName').value.trim();
  var url  = document.getElementById('rUrl').value.trim();
  var cat  = document.getElementById('rCat').value;
  var desc = document.getElementById('rDesc').value.trim();
  var opts = document.getElementById('rAccess').selectedOptions;
  var access = [];
  for (var i = 0; i < opts.length; i++) access.push(opts[i].value);
  var body = { name: name, url: url, cat: cat, desc: desc, access: access, userName: state.currentUser.name };

  try {
    if (state.editResId) {
      await api('PUT', '/resources/' + state.editResId, body);
      showToast('✅ Ресурс оновлено');
    } else {
      await api('POST', '/resources', body);
      showToast('✅ Ресурс додано');
    }
    closeModal('resOverlay');
    await loadResources();
  } catch (e) {
    showToast('❌ ' + e.message, true);
  }
}

async function deleteResource(id) {
  var r = state.resources.filter(function(x) { return x.id === id; })[0];
  if (!r || !confirm('Видалити "' + r.name + '"?')) return;
  try {
    await api('DELETE', '/resources/' + id, { userName: state.currentUser.name });
    showToast('🗑️ Ресурс видалено');
    await loadResources();
  } catch (e) {
    showToast('❌ ' + e.message, true);
  }
}

async function toggleMine(id) {
  try {
    var result = await api('POST', '/resources/' + id + '/toggle-mine', { userId: state.currentUser.id });
    var r = state.resources.filter(function(x) { return x.id === id; })[0];
    if (r) r.mine = result.mine ? 1 : 0;
    showToast(result.mine ? '★ Додано до моїх' : 'Видалено з моїх');
    filterAndRender();
  } catch (e) {
    showToast('❌ ' + e.message, true);
  }
}

// =====================================================
// IT-ЗАЯВКИ (HELPDESK)
// =====================================================
function submitTicket() {
  var title    = document.getElementById('ticketTitle').value.trim();
  var cat      = document.getElementById('ticketCat').value;
  var priority = document.getElementById('ticketPriority').value;
  var desc     = document.getElementById('ticketDesc').value.trim();

  if (!title) { showToast('Введіть тему заявки', true); return; }

  state.tickets.push({
    id:        Date.now(),
    title:     title,
    cat:       cat,
    priority:  priority,
    desc:      desc,
    status:    'new',
    author:    state.currentUser.name,
    authorId:  state.currentUser.id,
    dept:      state.currentUser.dept,
    createdAt: new Date().toLocaleString('uk-UA')
  });
  localStorage.setItem('wl_tickets', JSON.stringify(state.tickets));

  document.getElementById('ticketTitle').value = '';
  document.getElementById('ticketDesc').value  = '';
  document.getElementById('ticketFormBlock').style.display = 'none';
  showToast('📨 Заявку надіслано');
  renderTickets();
}

function renderTickets() {
  var filterEl = document.getElementById('ticketFilter');
  var filter   = filterEl ? filterEl.value : '';
  var userId   = state.currentUser.id;
  var isAdmin  = state.currentUser.role === 'admin';
  var isIT     = state.currentUser.dept === 'IT';

  var tickets = (isAdmin || isIT)
    ? state.tickets
    : state.tickets.filter(function(t) { return t.authorId === userId; });

  if (filter) {
    tickets = tickets.filter(function(t) { return t.status === filter; });
  }

  var el = document.getElementById('ticketsList');
  if (!tickets.length) {
    el.innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--text-muted)">' +
      '<div style="font-size:36px;margin-bottom:10px">🎉</div>' +
      '<div style="font-size:15px;font-weight:600">Заявок немає</div></div>';
    return;
  }

  el.innerHTML = tickets.slice().reverse().map(function(t) {
    var pr = TICKET_PRIORITY[t.priority] || { label: t.priority, color: '#666' };
    var st = TICKET_STATUS[t.status]     || { label: t.status,   color: '#666' };
    var canChange = isAdmin || isIT;

    var buttons = '';
    if (canChange) {
      if (t.status !== 'new')        buttons += '<button class="btn-icon" onclick="changeTicketStatus(' + t.id + ',\'new\')">🆕 Нова</button>';
      if (t.status !== 'inprogress') buttons += '<button class="btn-icon" onclick="changeTicketStatus(' + t.id + ',\'inprogress\')">⚙️ В роботі</button>';
      if (t.status !== 'done')       buttons += '<button class="btn-icon" onclick="changeTicketStatus(' + t.id + ',\'done\')">✅ Виконано</button>';
      buttons += '<button class="btn-icon danger" onclick="deleteTicket(' + t.id + ')">🗑️</button>';
    }

    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px;margin-bottom:12px;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap;">' +
      '<div><div style="font-weight:600;font-size:14px;color:var(--text-main);">' + esc(t.title) + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:3px;">' + (TICKET_CAT[t.cat] || t.cat) + ' · ' + esc(t.author) + ' · ' + esc(t.createdAt) + '</div></div>' +
      '<div style="display:flex;gap:6px;flex-shrink:0;">' +
      '<span style="font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600;background:' + pr.color + '22;color:' + pr.color + ';border:1px solid ' + pr.color + '44;">' + pr.label + '</span>' +
      '<span style="font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600;background:' + st.color + '22;color:' + st.color + ';border:1px solid ' + st.color + '44;">' + st.label + '</span>' +
      '</div></div>' +
      (t.desc ? '<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px;">' + esc(t.desc) + '</div>' : '') +
      (canChange ? '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + buttons + '</div>' : '') +
      '</div>';
  }).join('');
}

function changeTicketStatus(id, status) {
  for (var i = 0; i < state.tickets.length; i++) {
    if (state.tickets[i].id === id) { state.tickets[i].status = status; break; }
  }
  localStorage.setItem('wl_tickets', JSON.stringify(state.tickets));
  showToast('✅ Статус оновлено');
  renderTickets();
  renderAllTickets();
}

function deleteTicket(id) {
  if (!confirm('Видалити заявку?')) return;
  state.tickets = state.tickets.filter(function(t) { return t.id !== id; });
  localStorage.setItem('wl_tickets', JSON.stringify(state.tickets));
  showToast('🗑️ Заявку видалено');
  renderTickets();
  renderAllTickets();
}

function renderAllTickets() {
  var el = document.getElementById('allTicketsList');
  if (!el) return;
  if (!state.tickets.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Заявок ще не було</div>';
    return;
  }

  var rows = state.tickets.slice().reverse().map(function(t) {
    var pr = TICKET_PRIORITY[t.priority] || { label: t.priority, color: '#666' };
    var st = TICKET_STATUS[t.status]     || { label: t.status,   color: '#666' };
    return '<tr>' +
      '<td><div style="font-weight:600">' + esc(t.title) + '</div><div style="font-size:11px;color:var(--text-muted)">' + esc(t.createdAt) + '</div></td>' +
      '<td>' + (TICKET_CAT[t.cat] || t.cat) + '</td>' +
      '<td>' + esc(t.author) + '<br><span style="font-size:11px;color:var(--text-muted)">' + esc(t.dept) + '</span></td>' +
      '<td><span style="font-size:11px;padding:2px 7px;border-radius:4px;background:' + pr.color + '22;color:' + pr.color + ';font-weight:600">' + pr.label + '</span></td>' +
      '<td><select onchange="changeTicketStatus(' + t.id + ',this.value)" style="font-size:11px;padding:4px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text-main)">' +
      '<option value="new"'        + (t.status === 'new'        ? ' selected' : '') + '>🆕 Нова</option>' +
      '<option value="inprogress"' + (t.status === 'inprogress' ? ' selected' : '') + '>⚙️ В роботі</option>' +
      '<option value="done"'       + (t.status === 'done'       ? ' selected' : '') + '>✅ Виконано</option>' +
      '</select> <button class="btn-icon danger" onclick="deleteTicket(' + t.id + ')" style="margin-left:4px">🗑️</button></td>' +
      '</tr>';
  }).join('');

  el.innerHTML = '<div class="table-wrap"><table class="data-table">' +
    '<thead><tr><th>Тема</th><th>Категорія</th><th>Від кого</th><th>Пріоритет</th><th>Статус / Дії</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
}

// =====================================================
// РЕСУРСИ ВІДДІЛІВ (БУХГАЛТЕРІЯ / SALES)
// =====================================================
function submitDeptRes(access, prefix) {
  var name = document.getElementById(prefix + 'ResName').value.trim();
  var url  = document.getElementById(prefix + 'ResUrl').value.trim();
  var desc = document.getElementById(prefix + 'ResDesc').value.trim();

  if (!name) { showToast('Введіть назву', true); return; }
  if (!url || url.indexOf('http') !== 0) { showToast('Введіть коректний URL', true); return; }

  if (!state.deptRes[access]) state.deptRes[access] = [];

  state.deptRes[access].push({
    id:        Date.now(),
    name:      name,
    url:       url,
    desc:      desc,
    access:    access,
    author:    state.currentUser.name,
    createdAt: new Date().toLocaleString('uk-UA')
  });

  localStorage.setItem('wl_dept_res', JSON.stringify(state.deptRes));

  document.getElementById(prefix + 'ResName').value = '';
  document.getElementById(prefix + 'ResUrl').value  = '';
  document.getElementById(prefix + 'ResDesc').value = '';

  var formId = access === 'Finance' ? 'financeFormBlock' : 'salesFormBlock';
  document.getElementById(formId).style.display = 'none';

  showToast('✅ Посилання додано');
  renderDeptRes(access);
}

function deleteDeptRes(access, id) {
  if (!confirm('Видалити це посилання?')) return;
  state.deptRes[access] = (state.deptRes[access] || []).filter(function(r) { return r.id !== id; });
  localStorage.setItem('wl_dept_res', JSON.stringify(state.deptRes));
  showToast('🗑️ Видалено');
  renderDeptRes(access);
}

function renderDeptRes(access) {
  var gridId = access === 'Finance' ? 'financeGrid' : 'salesGrid';
  var grid   = document.getElementById(gridId);
  var list   = state.deptRes[access] || [];

  if (!list.length) {
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">' +
      '<div style="font-size:36px;margin-bottom:10px">📎</div>' +
      '<div style="font-size:15px;font-weight:600">Посилань ще немає</div>' +
      '<div style="font-size:13px;margin-top:6px">Натисніть "+ Додати посилання"</div></div>';
    return;
  }

  grid.innerHTML = list.slice().reverse().map(function(r) {
    return '<div class="card">' +
      '<div class="card-header"><span class="card-title">' + esc(r.name) + '</span></div>' +
      '<a class="card-url" href="' + esc(r.url) + '" target="_blank">' + esc(r.url) + '</a>' +
      (r.desc ? '<p class="card-desc">' + esc(r.desc) + '</p>' : '') +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Додав: ' + esc(r.author) + ' · ' + esc(r.createdAt) + '</div>' +
      '<div class="card-actions" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">' +
      '<button class="btn-icon danger" onclick="deleteDeptRes(\'' + access + '\',' + r.id + ')">🗑️ Видалити</button>' +
      '</div></div>';
  }).join('');
}

// =====================================================
// КОРИСТУВАЧІ
// =====================================================
async function loadUsers() {
  state.users = await api('GET', '/users');
}

function renderUsers() {
  var tbody = document.getElementById('usersBody');
  if (!state.users.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">Список порожній</td></tr>';
    return;
  }
  tbody.innerHTML = state.users.map(function(u) {
    var parts = (ROLE_COLORS[u.role] || '#e2e8f0:#555').split(':');
    var bg = parts[0]; var color = parts[1];
    return '<tr>' +
      '<td><div style="display:flex;align-items:center;gap:10px">' +
      '<div class="avatar" style="width:34px;height:34px;font-size:11px;flex-shrink:0">' + getInitials(u.name) + '</div>' +
      '<div><div style="font-weight:600;font-size:13px">' + esc(u.name) + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted)">' + esc(u.email) + '</div></div></div></td>' +
      '<td style="color:var(--text-muted)">' + esc(u.email) + '</td>' +
      '<td><span style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600">' + esc(u.dept) + '</span></td>' +
      '<td><span class="role-badge" style="background:' + bg + ';color:' + color + ';border:1px solid ' + color + '22">' + (ROLE_LABELS[u.role] || u.role) + '</span></td>' +
      '<td><div style="display:flex;gap:6px">' +
      '<button class="btn-icon" onclick="openEditUser(' + u.id + ')">✏️</button>' +
      '<button class="btn-icon danger" onclick="deleteUser(' + u.id + ')">🗑️</button>' +
      '</div></td></tr>';
  }).join('');
}

function openUserModal() {
  state.editUserId = null;
  document.getElementById('userModalTitle').textContent = 'Новий працівник';
  document.getElementById('uName').value     = '';
  document.getElementById('uEmail').value    = '';
  document.getElementById('uDept').value     = 'IT';
  document.getElementById('uRole').value     = 'user';
  document.getElementById('uPassword').value = '';
  document.getElementById('userOverlay').classList.add('open');
}

function openEditUser(id) {
  var u = state.users.filter(function(x) { return x.id === id; })[0];
  if (!u) return;
  state.editUserId = id;
  document.getElementById('userModalTitle').textContent = 'Редагувати працівника';
  document.getElementById('uName').value     = u.name;
  document.getElementById('uEmail').value    = u.email;
  document.getElementById('uDept').value     = u.dept;
  document.getElementById('uRole').value     = u.role;
  document.getElementById('uPassword').value = '';
  document.getElementById('userOverlay').classList.add('open');
}

async function saveUser() {
  var name     = document.getElementById('uName').value.trim();
  var email    = document.getElementById('uEmail').value.trim();
  var dept     = document.getElementById('uDept').value;
  var role     = document.getElementById('uRole').value;
  var password = document.getElementById('uPassword').value;
  var body     = { name: name, email: email, dept: dept, role: role, password: password, adminName: state.currentUser.name };

  try {
    if (state.editUserId) {
      await api('PUT', '/users/' + state.editUserId, body);
      showToast('✅ Дані оновлено');
    } else {
      await api('POST', '/users', body);
      showToast('✅ Працівника зареєстровано');
    }
    closeModal('userOverlay');
    await loadUsers();
    renderUsers();
    await loadStats();
  } catch (e) {
    showToast('❌ ' + e.message, true);
  }
}

async function deleteUser(id) {
  var u = state.users.filter(function(x) { return x.id === id; })[0];
  if (!u || !confirm('Видалити "' + u.name + '"?')) return;
  try {
    await api('DELETE', '/users/' + id, { adminName: state.currentUser.name });
    showToast('🗑️ Працівника видалено');
    await loadUsers();
    renderUsers();
    await loadStats();
  } catch (e) {
    showToast('❌ ' + e.message, true);
  }
}

// =====================================================
// СТАТИСТИКА ТА ЖУРНАЛ
// =====================================================
async function loadStats() {
  try {
    var s = await api('GET', '/stats');
    document.getElementById('statsCards').innerHTML = [
      ['Ресурсів у базі',            s.totalResources, '#0284c7'],
      ['Зареєстрованих працівників', s.totalUsers,     '#059669'],
      ['Адміністраторів',            s.adminCount,     '#7c3aed'],
      ['Керівників',                 s.managerCount,   '#d97706'],
      ['IT-заявок всього',           state.tickets.length, '#dc2626'],
      ['Заявок в роботі',            state.tickets.filter(function(t){ return t.status==='inprogress'; }).length, '#ca8a04'],
    ].map(function(item) {
      return '<div class="stat-card" style="border-left-color:' + item[2] + '">' +
        '<div class="num">' + item[1] + '</div>' +
        '<div style="font-size:13px;color:var(--text-muted);margin-top:6px">' + item[0] + '</div></div>';
    }).join('');

    state.logs = await api('GET', '/logs');
    renderLogs();
  } catch (e) {
    console.error('Помилка статистики:', e);
  }
}

function renderLogs() {
  document.getElementById('logsBody').innerHTML = state.logs.map(function(l) {
    return '<tr>' +
      '<td style="color:var(--text-muted);font-family:monospace;white-space:nowrap">' + l.created_at + '</td>' +
      '<td>' + esc(l.action) + '</td>' +
      '<td style="color:var(--text-muted)">' + esc(l.user_name) + '</td></tr>';
  }).join('');
}

// =====================================================
// ВКЛАДКИ АДМІН-ПАНЕЛІ
// =====================================================
function switchTab(tab) {
  ['users', 'stats', 'logs', 'tickets'].forEach(function(t) {
    document.getElementById('at-' + t).classList.toggle('active', t === tab);
    document.getElementById('asec-' + t).classList.toggle('active', t === tab);
  });
  if (tab === 'tickets') renderAllTickets();
}

// =====================================================
// МОДАЛЬНІ ВІКНА
// =====================================================
function closeModal(overlayId) {
  document.getElementById(overlayId).classList.remove('open');
}

function overlayClick(event, overlayId) {
  if (event.target.id === overlayId) closeModal(overlayId);
}

// =====================================================
// СТАРТ
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
  applyTheme();

  var savedEmail = localStorage.getItem('wl_saved_email');
  if (savedEmail && localStorage.getItem('wl_remember') === '1') {
    document.getElementById('loginEmail').value = savedEmail;
    document.getElementById('rememberMe').checked = true;
    document.getElementById('loginPassword').focus();
  }

  var session = sessionStorage.getItem('wl_session');
  if (session) {
    try {
      state.currentUser = JSON.parse(session);
      var savedT = localStorage.getItem('wl_tickets');
      if (savedT) state.tickets = JSON.parse(savedT);
      var savedD = localStorage.getItem('wl_dept_res');
      if (savedD) state.deptRes = JSON.parse(savedD);
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('appContainer').style.display = 'flex';
      setupUI();
      showPage('resources');
    } catch (e) {
      sessionStorage.removeItem('wl_session');
    }
  }
});