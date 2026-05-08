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
// ДОПОМІЖНІ ТА СИСТЕМНІ
// =====================================================
function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getInitials(name) {
    return (name || '??').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

async function api(method, endpoint, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res  = await fetch(API + endpoint, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Помилка сервера');
    return data;
}

let toastTimer;
function showToast(msg, isError) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.borderLeftColor = isError ? '#ef4444' : '#2563eb';
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
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
// UI ТА НАВІГАЦІЯ
// =====================================================
function setupUI() {
    const u = state.currentUser;
    if (!u) return;

    const isAdmin = u.role === 'admin';
    const isManager = ['admin', 'manager'].includes(u.role);

    const profileEl = document.getElementById('currentUserProfile');
    if (profileEl) {
        profileEl.innerHTML = `
            <div class="avatar">${getInitials(u.name)}</div>
            <div>
                <div style="font-size:13px;font-weight:600;color:white">${esc(u.name)}</div>
                <div style="font-size:11px;color:#94a3b8">${ROLE_LABELS[u.role]} · ${u.dept}</div>
            </div>`;
    }

    // Доступи
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
    document.querySelectorAll('.manager-only').forEach(el => el.style.display = isManager ? '' : 'none');

    // Кнопки бокової панелі
    if (isAdmin) {
        ['nb-it', 'nb-finance', 'nb-sales', 'nb-admin'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = 'flex';
        });
    } else {
        const deptMap = { Finance: 'nb-finance', Sales: 'nb-sales', IT: 'nb-it' };
        if (deptMap[u.dept]) document.getElementById(deptMap[u.dept]).style.display = 'flex';
    }
}

async function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const pageEl = document.getElementById('page-' + page);
    const btnEl = document.getElementById('nb-' + page);
    
    if (pageEl) pageEl.classList.add('active');
    if (btnEl) btnEl.classList.add('active');

    if (page === 'resources') await loadResources();
    if (page === 'my')        renderMyResources();
    if (page === 'it')        { await loadTickets(); renderTickets(); }
    if (page === 'finance')   await loadAccounting();
    if (page === 'sales')     await loadContractors();
    if (page === 'admin')     { await loadUsers(); renderUsers(); await loadStats(); }
}

// =====================================================
// РЕСУРСИ ТА КАРТКИ (ЗІ ЗІРОЧКАМИ)
// =====================================================
async function loadResources() {
    try {
        state.resources = await api('GET', '/resources');
        filterAndRender();
    } catch (e) { showToast('Помилка завантаження', true); }
}

function filterAndRender() {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const filtered = state.resources.filter(r => r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q));
    renderCards(filtered, 'cardsGrid');
}

function renderCards(data, containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    const isManager = ['admin', 'manager'].includes(state.currentUser.role);

    if (!data.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:gray">Нічого не знайдено</div>';
        return;
    }

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
                    <span class="card-title">${esc(r.name)}</span>
                    <span class="badge">${CAT_LABELS[r.cat] || r.cat}</span>
                </div>
                <a class="card-url" href="${esc(r.url)}" target="_blank">${esc(r.url)}</a>
                <p class="card-desc">${esc(r.desc || 'Без опису')}</p>
                <div class="card-actions">
                    ${editBtns}
                    <button class="btn-icon ${mineClass}" onclick="toggleMine(${r.id})" style="margin-left:auto">${mineText}</button>
                </div>
            </div>`;
    }).join('');
}

function renderMyResources() {
    const mine = state.resources.filter(r => r.mine);
    renderCards(mine, 'myGrid');
}

async function toggleMine(id) {
    // Тимчасова логіка, поки немає еpoint на бекенді для Favorites
    const r = state.resources.find(x => x.id === id);
    if (r) {
        r.mine = !r.mine;
        showToast(r.mine ? 'Додано в обране' : 'Вилучено');
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
    if (!title || !amount) return showToast('Введіть назву та суму', true);
    await api('POST', '/accounting', { title, amount: Number(amount), description: desc });
    showToast('✅ Збережено в хмарі');
    document.getElementById('financeFormBlock').style.display = 'none';
    await loadAccounting();
}

function renderAccounting() {
    const grid = document.getElementById('financeGrid');
    if (!grid) return;
    grid.innerHTML = state.accounting.map(item => `
        <div class="card" style="border-left:4px solid #059669">
            <div class="card-header"><span class="card-title">${esc(item.title)}</span></div>
            <div style="font-size:20px;font-weight:bold;margin:10px 0">${item.amount} грн</div>
            <p class="card-desc">${esc(item.description || 'Без опису')}</p>
            <div class="card-actions">
                <button class="btn-icon danger" onclick="deleteAccounting(${item.id})">🗑️ Видалити</button>
            </div>
        </div>
    `).join('') || '<p style="text-align:center;grid-column:1/-1">Порожньо</p>';
}

async function loadContractors() {
    state.contractors = await api('GET', '/contractors');
    renderContractors();
}

async function submitContractor() {
    const company = document.getElementById('salesResName').value.trim();
    const phone = document.getElementById('salesResUrl').value.trim();
    const service = document.getElementById('salesResDesc').value.trim();
    if (!company) return showToast('Введіть назву', true);
    await api('POST', '/contractors', { company, phone, service });
    showToast('✅ Контрагента додано');
    document.getElementById('salesFormBlock').style.display = 'none';
    await loadContractors();
}

function renderContractors() {
    const grid = document.getElementById('salesGrid');
    if (!grid) return;
    grid.innerHTML = state.contractors.map(c => `
        <div class="card">
            <div class="card-header"><span class="card-title">${esc(c.company)}</span></div>
            <div style="margin:8px 0;font-size:13px">📞 ${esc(c.phone)}</div>
            <p class="card-desc">${esc(c.service || 'Без опису')}</p>
            <div class="card-actions">
                <button class="btn-icon danger" onclick="deleteContractor(${c.id})">🗑️ Видалити</button>
            </div>
        </div>
    `).join('') || '<p style="text-align:center;grid-column:1/-1">Порожньо</p>';
}

// Видалення
async function deleteAccounting(id) { if (confirm('Видалити?')) { await api('DELETE', '/accounting/' + id); loadAccounting(); } }
async function deleteContractor(id) { if (confirm('Видалити?')) { await api('DELETE', '/contractors/' + id); loadContractors(); } }

// =====================================================
// АДМІНІСТРУВАННЯ ТА ТІКЕТИ
// =====================================================
async function loadUsers() { state.users = await api('GET', '/users'); renderUsers(); }

function renderUsers() {
    const tbody = document.getElementById('usersBody');
    if (!tbody) return;
    tbody.innerHTML = state.users.map(u => `
        <tr>
            <td>${esc(u.name)}</td>
            <td>${u.email}</td>
            <td>${u.dept}</td>
            <td>${u.role}</td>
            <td><button class="btn-icon danger" onclick="deleteUser(${u.id})">🗑️</button></td>
        </tr>
    `).join('');
}

async function deleteUser(id) {
    if (confirm('Видалити?')) {
        await api('DELETE', '/users/' + id);
        showToast('Користувача видалено');
        loadUsers();
    }
}

async function loadTickets() { state.tickets = await api('GET', '/tickets'); }
function renderTickets() {
    const el = document.getElementById('ticketsList');
    if (!el) return;
    el.innerHTML = state.tickets.slice().reverse().map(t => `
        <div style="background:var(--surface);border:1px solid var(--border);padding:15px;border-radius:8px;margin-bottom:10px">
            <div style="font-weight:600">${esc(t.title)}</div>
            <div style="font-size:12px;color:gray">${t.status} · ${t.author}</div>
            <div style="margin-top:10px">
                 <button class="btn-icon danger" onclick="deleteTicket(${t.id})">🗑️</button>
            </div>
        </div>
    `).join('') || '<p>Заявок немає</p>';
}

async function deleteTicket(id) { await api('DELETE', '/tickets/' + id); loadTickets(); renderTickets(); }

async function loadStats() {
    const s = await api('GET', '/stats');
    const cards = document.getElementById('statsCards');
    if (cards) {
        cards.innerHTML = `
            <div class="stat-card"><h3>${s.totalResources}</h3><p>Ресурсів</p></div>
            <div class="stat-card"><h3>${s.totalUsers}</h3><p>Користувачів</p></div>
            <div class="stat-card"><h3>${s.totalTickets}</h3><p>Заявок</p></div>
        `;
    }
}

// =====================================================
// СТАРТ
// =====================================================
function toggleTheme() { document.body.classList.toggle('dark'); }

document.addEventListener('DOMContentLoaded', () => {
    const session = sessionStorage.getItem('wl_session');
    if (session) {
        state.currentUser = JSON.parse(session);
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
        setupUI();
        showPage('resources');
    }
});

// Робимо функції глобальними для кнопок
window.showPage = showPage;
window.submitAccounting = submitAccounting;
window.submitContractor = submitContractor;
window.deleteAccounting = deleteAccounting;
window.deleteContractor = deleteContractor;
window.deleteUser = deleteUser;
window.deleteTicket = deleteTicket;
window.toggleMine = toggleMine;
window.toggleBlock = toggleBlock;
window.toggleTheme = toggleTheme;