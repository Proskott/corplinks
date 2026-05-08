const API = window.location.origin + '/api';

var state = {
  currentUser: null, resources: [], users: [], logs: [],
  tickets: [], accounting: [], contractors: [],
  editResId: null, editUserId: null
};

var CAT_LABELS = { development: 'Розробка', design: 'Дизайн', management: 'Менеджмент', hr: 'HR', finance: 'Фінанси' };
var ROLE_LABELS = { admin: 'Адміністратор', manager: 'Менеджер', user: 'Співробітник', viewer: 'Стажер' };
var ROLE_COLORS = { admin: '#fce4ec:#880e4f', manager: '#fff3e0:#e65100', user: '#e8f0fe:#1557b0', viewer: '#e8f5e9:#1b5e20' };
var TICKET_CAT = { hardware: '🖥️ Обладнання', software: '💿 ПЗ', network: '🌐 Мережа', access: '🔑 Доступи', other: '📋 Інше' };
var TICKET_PRIORITY = { low: {label:'🟢 Низький',color:'#16a34a'}, medium: {label:'🟡 Середній',color:'#ca8a04'}, high: {label:'🔴 Високий',color:'#dc2626'} };
var TICKET_STATUS = { new: {label:'🆕 Нова',color:'#2563eb'}, inprogress: {label:'⚙️ В роботі',color:'#ca8a04'}, done: {label:'✅ Виконано',color:'#16a34a'} };

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function getInitials(n) { return (n||'??').trim().split(/\s+/).slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase(); }
function toggleBlock(id) { var el=document.getElementById(id); if(el) el.style.display=el.style.display==='none'?'block':'none'; }
function closeModal(id) { var el=document.getElementById(id); if(el) el.classList.remove('open'); }
function overlayClick(e,id) { if(e.target.id===id) closeModal(id); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('show'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); }

var toastTimer;
function showToast(msg,isErr) {
  var el=document.getElementById('toast'); if(!el) return;
  el.textContent=msg; el.style.borderLeftColor=isErr?'#ef4444':'#2563eb';
  el.classList.add('show'); clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){el.classList.remove('show');},3000);
}

function api(method,endpoint,body) {
  var opts={method:method,headers:{'Content-Type':'application/json'}};
  if(body) opts.body=JSON.stringify(body);
  return fetch(API+endpoint,opts).then(function(res){
    return res.json().then(function(data){
      if(!res.ok) throw new Error(data.error||'Помилка');
      return data;
    });
  });
}

// =====================================================
// ТЕМА
// =====================================================
function toggleTheme() {
  var isDark=document.body.classList.toggle('dark');
  localStorage.setItem('wl_theme',isDark?'dark':'light');
  document.getElementById('themeBtn').textContent=isDark?'☀️ Світла тема':'🌙 Темна тема';
}
function applyTheme() {
  if(localStorage.getItem('wl_theme')==='dark') {
    document.body.classList.add('dark');
    var b=document.getElementById('themeBtn'); if(b) b.textContent='☀️ Світла тема';
  }
}

// =====================================================
// ЛОГІН
// =====================================================
function login() {
  var email=document.getElementById('loginEmail').value.trim();
  var password=document.getElementById('loginPassword').value;
  var remember=document.getElementById('rememberMe').checked;
  var err=document.getElementById('loginError');
  err.textContent='';
  if(!email){err.textContent='Введіть email';return;}
  if(!password){err.textContent='Введіть пароль';return;}
  api('POST','/auth/login',{email:email,password:password}).then(function(data){
    state.currentUser=data.user;
    if(remember){localStorage.setItem('wl_saved_email',email);localStorage.setItem('wl_remember','1');}
    else{localStorage.removeItem('wl_saved_email');localStorage.removeItem('wl_remember');}
    sessionStorage.setItem('wl_session',JSON.stringify(state.currentUser));
    document.getElementById('loginOverlay').style.display='none';
    document.getElementById('appContainer').style.display='flex';
    setupUI(); showPage('resources');
  }).catch(function(e){err.textContent=e.message;});
}

function logout() {
  sessionStorage.removeItem('wl_session');
  location.reload();
}

function resetDatabase() { alert('Видали базу в MongoDB Atlas та перезапусти сервер.'); }

// =====================================================
// UI
// =====================================================
function setupUI() {
  var u=state.currentUser; if(!u) return;
  var isAdmin=u.role==='admin';
  var isManager=isAdmin||u.role==='manager';

  document.getElementById('currentUserProfile').innerHTML=
    '<div class="avatar">'+getInitials(u.name)+'</div>'+
    '<div><div style="font-weight:600;color:white">'+esc(u.name)+'</div>'+
    '<div style="font-size:11px;color:#94a3b8">'+(ROLE_LABELS[u.role]||u.role)+' · '+u.dept+'</div></div>';

  document.querySelectorAll('.admin-only').forEach(function(el){el.style.display=isAdmin?'':'none';});
  document.querySelectorAll('.manager-only').forEach(function(el){el.style.display=isManager?'':'none';});

  var dm=document.getElementById('deptModules'); if(dm) dm.style.display='block';
  
  // IT-ЗАЯВКИ: Залишаємо доступним для ВСІХ працівників підприємства
  var it=document.getElementById('nb-it'); if(it) it.style.display='flex';

  // Спочатку приховуємо всі специфічні вкладки
  ['nb-finance','nb-sales','nb-hr'].forEach(function(id){
    var e = document.getElementById(id); 
    if(e) e.style.display = 'none'; 
  });

  if(isAdmin){
    // Адмін бачить АБСОЛЮТНО ВСІ вкладки
    ['nb-finance','nb-sales','nb-hr'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='flex';});
  } else {
    // БУХГАЛТЕРІЯ: бачать тільки Finance
    if (u.dept === 'Finance') {
      var f = document.getElementById('nb-finance'); if(f) f.style.display='flex';
    }
    // HR: бачать тільки HR
    if (u.dept === 'HR') {
      var h = document.getElementById('nb-hr'); if(h) h.style.display='flex';
    }
    // КОНТРАГЕНТИ: бачать Sales (продажі), Finance (бухи) та Legal (юристи)
    if (['Sales', 'Finance', 'Legal'].includes(u.dept)) {
      var s = document.getElementById('nb-sales'); if(s) s.style.display='flex';
    }
  }
  
  applyTheme();
}

// =====================================================
// НАВІГАЦІЯ
// =====================================================
function showPage(page) {
  closeSidebar();
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  var pe=document.getElementById('page-'+page); if(pe) pe.classList.add('active');
  var be=document.getElementById('nb-'+page); if(be) be.classList.add('active');

  if(page==='resources') loadResources();
  if(page==='my') renderMyResources();
  if(page==='it') { loadTickets().then(function(){renderTickets();}); }
  if(page==='finance') loadAccounting();
  if(page==='sales') loadContractors();
  if(page==='admin') { loadUsers().then(function(){renderUsers(); loadTickets().then(function(){renderAllTickets();}); loadStats(); loadLogs();}); }
}

function switchTab(tab) {
  ['users','stats','logs','tickets'].forEach(function(t){
    var tb=document.getElementById('at-'+t); if(tb) tb.classList.toggle('active',t===tab);
    var sc=document.getElementById('asec-'+t); if(sc) sc.classList.toggle('active',t===tab);
  });
  if(tab==='tickets') renderAllTickets();
  if(tab==='logs') loadLogs();
}

// =====================================================
// РЕСУРСИ
// =====================================================
function loadResources() {
  return api('GET','/resources').then(function(data){
    state.resources=data;
    renderStatBar();
    renderCatFilter();
    filterAndRender();
  }).catch(function(){showToast('Помилка завантаження',true);});
}

function renderStatBar() {
  var c={}; state.resources.forEach(function(r){c[r.cat]=(c[r.cat]||0)+1;});
  var el=document.getElementById('statsBar'); if(!el) return;
  el.innerHTML='<div class="stat-chip">Всього:<span>'+state.resources.length+'</span></div>'+
    Object.keys(c).map(function(k){return '<div class="stat-chip">'+(CAT_LABELS[k]||k)+':<span>'+c[k]+'</span></div>';}).join('');
}

function renderCatFilter() {
  var cats=[]; state.resources.forEach(function(r){if(cats.indexOf(r.cat)===-1)cats.push(r.cat);});
  var el=document.getElementById('catFilter'); if(!el) return;
  el.innerHTML='<option value="">Всі</option>'+cats.map(function(c){return '<option value="'+c+'">'+(CAT_LABELS[c]||c)+'</option>';}).join('');
}

function filterAndRender() {
  var sEl=document.getElementById('searchInput');
  var cEl=document.getElementById('catFilter');
  var q=sEl?sEl.value.toLowerCase():'';
  var cat=cEl?cEl.value:'';
  var filtered=state.resources.filter(function(r){
    var mt=r.name.toLowerCase().indexOf(q)!==-1||r.url.toLowerCase().indexOf(q)!==-1||(r.desc&&r.desc.toLowerCase().indexOf(q)!==-1);
    return mt&&(cat===''||r.cat===cat);
  });
  renderCards(filtered,'cardsGrid');
}

function renderCards(data,id) {
  var g=document.getElementById(id); if(!g) return;
  var isMgr=state.currentUser&&(state.currentUser.role==='admin'||state.currentUser.role==='manager');
  if(!data.length){g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:12px">📂</div><div style="font-size:16px;font-weight:600">Ресурсів немає</div></div>';return;}
  g.innerHTML=data.map(function(r){
    var ab=(r.access&&r.access.toString()!=='ALL')?'<span class="access-badge">🔒 '+esc(r.access)+'</span>':'';
    var desc=r.desc?'<p class="card-desc">'+esc(r.desc)+'</p>':'<p class="card-desc" style="color:#94a3b8;font-style:italic">Без опису</p>';
    var ed=isMgr?'<button class="btn-icon" onclick="openEditRes(\''+r._id+'\')">✏️</button>':'';
    var dl=isMgr?'<button class="btn-icon danger" onclick="deleteResource(\''+r._id+'\')">🗑️</button>':'';
    return '<div class="card"><div class="card-header"><div><span class="card-title">'+esc(r.name)+'</span>'+ab+'</div>'+
      '<span class="badge">'+(CAT_LABELS[r.cat]||r.cat)+'</span></div>'+
      '<a class="card-url" href="'+esc(r.url)+'" target="_blank">'+esc(r.url)+'</a>'+desc+
      '<div class="card-actions">'+ed+dl+'</div></div>';
  }).join('');
}

function renderMyResources() {
  renderCards(state.resources.filter(function(r){return r.mine;}),'myGrid');
}

function openResModal() {
  state.editResId=null;
  document.getElementById('resModalTitle').textContent='Новий ресурс';
  document.getElementById('rName').value='';
  document.getElementById('rUrl').value='';
  document.getElementById('rDesc').value='';
  document.getElementById('resOverlay').classList.add('open');
}

function openEditRes(mongoId) {
  var r=state.resources.filter(function(x){return x._id===mongoId;})[0];
  if(!r) return;
  state.editResId=mongoId;
  document.getElementById('resModalTitle').textContent='Редагувати';
  document.getElementById('rName').value=r.name;
  document.getElementById('rUrl').value=r.url;
  document.getElementById('rCat').value=r.cat;
  document.getElementById('rDesc').value=r.desc||'';
  document.getElementById('resOverlay').classList.add('open');
}

function saveResource() {
  var name=document.getElementById('rName').value.trim();
  var url=document.getElementById('rUrl').value.trim();
  var cat=document.getElementById('rCat').value;
  var desc=document.getElementById('rDesc').value.trim();
  if(!name){showToast('Введіть назву',true);return;}
  if(!url){showToast('Введіть URL',true);return;}
  var body={name:name,url:url,cat:cat,desc:desc,userName:state.currentUser.name};
  var promise=state.editResId?api('PUT','/resources/'+state.editResId,body):api('POST','/resources',body);
  promise.then(function(){
    showToast(state.editResId?'✅ Оновлено':'✅ Додано');
    closeModal('resOverlay'); loadResources();
  }).catch(function(e){showToast('❌ '+e.message,true);});
}

function deleteResource(mongoId) {
  if(!confirm('Видалити ресурс?')) return;
  api('DELETE','/resources/'+mongoId).then(function(){showToast('🗑️ Видалено');loadResources();})
  .catch(function(e){showToast('❌ '+e.message,true);});
}

// =====================================================
// IT-ЗАЯВКИ
// =====================================================
function loadTickets() {
  return api('GET','/tickets').then(function(data){state.tickets=data;});
}

function submitTicket() {
  var title=document.getElementById('ticketTitle').value.trim();
  var cat=document.getElementById('ticketCat').value;
  var priority=document.getElementById('ticketPriority').value;
  var desc=document.getElementById('ticketDesc').value.trim();
  if(!title){showToast('Введіть тему',true);return;}
  api('POST','/tickets',{title:title,cat:cat,priority:priority,desc:desc,author:state.currentUser.name,authorId:state.currentUser.id,dept:state.currentUser.dept})
  .then(function(){
    document.getElementById('ticketTitle').value='';
    document.getElementById('ticketDesc').value='';
    document.getElementById('ticketFormBlock').style.display='none';
    showToast('📨 Заявку надіслано');
    return loadTickets();
  }).then(function(){renderTickets();})
  .catch(function(e){showToast('❌ '+e.message,true);});
}

function renderTickets() {
  var fEl=document.getElementById('ticketFilter');
  var filter=fEl?fEl.value:'';
  var list=state.tickets;
  if(filter) list=list.filter(function(t){return t.status===filter;});
  var el=document.getElementById('ticketsList'); if(!el) return;
  if(!list.length){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:36px;margin-bottom:10px">🎉</div><div style="font-size:15px;font-weight:600">Заявок немає</div></div>';return;}

  el.innerHTML=list.slice().reverse().map(function(t){
    var pr=TICKET_PRIORITY[t.priority]||{label:t.priority,color:'#666'};
    var st=TICKET_STATUS[t.status]||{label:t.status,color:'#666'};
    var isIT=state.currentUser.dept==='IT'||state.currentUser.role==='admin';
    var btns='';
    if(isIT){
      if(t.status!=='inprogress') btns+='<button class="btn-icon" onclick="changeTicketStatus(\''+t._id+'\',\'inprogress\')">⚙️ В роботі</button>';
      if(t.status!=='done') btns+='<button class="btn-icon" onclick="changeTicketStatus(\''+t._id+'\',\'done\')">✅ Виконано</button>';
      btns+='<button class="btn-icon danger" onclick="deleteTicket(\''+t._id+'\')">🗑️</button>';
    }
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px;margin-bottom:12px;">'+
      '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap;">'+
      '<div><div style="font-weight:600;font-size:14px;color:var(--text-main)">'+esc(t.title)+'</div>'+
      '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">'+(TICKET_CAT[t.cat]||t.cat)+' · '+esc(t.author)+' · '+esc(t.createdAt)+'</div></div>'+
      '<div style="display:flex;gap:6px;flex-shrink:0">'+
      '<span style="font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600;background:'+pr.color+'22;color:'+pr.color+'">'+pr.label+'</span>'+
      '<span style="font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600;background:'+st.color+'22;color:'+st.color+'">'+st.label+'</span>'+
      '</div></div>'+
      (t.desc?'<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">'+esc(t.desc)+'</div>':'')+
      (btns?'<div style="display:flex;gap:6px;flex-wrap:wrap">'+btns+'</div>':'')+
      '</div>';
  }).join('');
}

function changeTicketStatus(mongoId,status) {
  api('PUT','/tickets/'+mongoId+'/status',{status:status}).then(function(){
    showToast('✅ Статус оновлено');
    return loadTickets();
  }).then(function(){renderTickets();renderAllTickets();})
  .catch(function(e){showToast('❌ '+e.message,true);});
}

function deleteTicket(mongoId) {
  if(!confirm('Видалити заявку?')) return;
  api('DELETE','/tickets/'+mongoId).then(function(){
    showToast('🗑️ Видалено');
    return loadTickets();
  }).then(function(){renderTickets();renderAllTickets();})
  .catch(function(e){showToast('❌ '+e.message,true);});
}

function renderAllTickets() {
  var el=document.getElementById('allTicketsList'); if(!el) return;
  if(!state.tickets.length){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)">Заявок немає</div>';return;}
  var rows=state.tickets.slice().reverse().map(function(t){
    var pr=TICKET_PRIORITY[t.priority]||{label:t.priority,color:'#666'};
    var st=TICKET_STATUS[t.status]||{label:t.status,color:'#666'};
    return '<tr><td><b>'+esc(t.title)+'</b><br><span style="font-size:11px;color:var(--text-muted)">'+esc(t.createdAt||'')+'</span></td>'+
      '<td>'+esc(t.author)+'</td>'+
      '<td><span style="font-size:11px;padding:2px 7px;border-radius:4px;background:'+pr.color+'22;color:'+pr.color+';font-weight:600">'+pr.label+'</span></td>'+
      '<td><select onchange="changeTicketStatus(\''+t._id+'\',this.value)" style="font-size:11px;padding:4px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text-main)">'+
      '<option value="new"'+(t.status==='new'?' selected':'')+'>🆕 Нова</option>'+
      '<option value="inprogress"'+(t.status==='inprogress'?' selected':'')+'>⚙️ В роботі</option>'+
      '<option value="done"'+(t.status==='done'?' selected':'')+'>✅ Виконано</option></select>'+
      ' <button class="btn-icon danger" onclick="deleteTicket(\''+t._id+'\')">🗑️</button></td></tr>';
  }).join('');
  el.innerHTML='<div class="table-wrap"><table class="data-table"><thead><tr><th>Тема</th><th>Від кого</th><th>Пріоритет</th><th>Статус</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

// =====================================================
// БУХГАЛТЕРІЯ
// =====================================================
function loadAccounting() {
  return api('GET','/accounting').then(function(data){state.accounting=data;renderAccounting();})
  .catch(function(){showToast('Помилка завантаження',true);});
}

function renderAccounting() {
  var g = document.getElementById('financeGrid'); if (!g) return;
  if (!state.accounting.length) {
    g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)"><div style="font-size:36px;margin-bottom:10px">📎</div><div>Записів немає</div></div>';
    return;
  }
  g.innerHTML = state.accounting.map(function(item) {
    var val = item.amount || '';
    // Проверяем, ссылка ли это
    var isLink = val.trim().toLowerCase().indexOf('http') === 0 || val.trim().toLowerCase().indexOf('www') === 0;
    
    var contentHtml = isLink 
      ? '<a class="card-url" href="' + esc(val) + '" target="_blank">' + esc(val) + '</a>'
      : '<div style="font-size:18px; font-weight:bold; margin:8px 0;">💰 ' + esc(val) + ' грн</div>';

    var descHtml = item.description 
      ? '<p class="card-desc">' + esc(item.description) + '</p>' 
      : '<p class="card-desc" style="color:#94a3b8;font-style:italic">Без опису</p>';

    return '<div class="card" style="border-left:4px solid #059669">' +
      '<div class="card-header"><span class="card-title">' + esc(item.title) + '</span></div>' +
      contentHtml +
      descHtml +
      '<div class="card-actions"><button class="btn-icon danger" onclick="deleteAccounting(\'' + item._id + '\')">🗑️</button></div></div>';
  }).join('');
}

function submitDeptRes(access,prefix) {
  var name=document.getElementById(prefix+'ResName').value.trim();
  var url=document.getElementById(prefix+'ResUrl').value.trim();
  var desc=document.getElementById(prefix+'ResDesc').value.trim();

  if(access==='Finance') {
    api('POST','/accounting',{title:name,amount:url,description:desc}).then(function(){
      document.getElementById(prefix+'ResName').value='';
      document.getElementById(prefix+'ResUrl').value='';
      document.getElementById(prefix+'ResDesc').value='';
      document.getElementById('financeFormBlock').style.display='none';
      showToast('✅ Додано'); loadAccounting();
    }).catch(function(e){showToast('❌ '+e.message,true);});
  }

  if(access==='Sales') {
    api('POST','/contractors',{company:name,phone:url,service:desc}).then(function(){
      document.getElementById(prefix+'ResName').value='';
      document.getElementById(prefix+'ResUrl').value='';
      document.getElementById(prefix+'ResDesc').value='';
      document.getElementById('salesFormBlock').style.display='none';
      showToast('✅ Додано'); loadContractors();
    }).catch(function(e){showToast('❌ '+e.message,true);});
  }
}

// =====================================================
// КОНТРАГЕНТИ
// =====================================================
function loadContractors() {
  return api('GET','/contractors').then(function(data){state.contractors=data;renderContractors();})
  .catch(function(){showToast('Помилка завантаження',true);});
}

function renderContractors() {
  var g = document.getElementById('salesGrid'); if (!g) return;
  if (!state.contractors.length) {
    g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)"><div style="font-size:36px;margin-bottom:10px">📎</div><div>Контрагентів немає</div></div>';
    return;
  }
  g.innerHTML = state.contractors.map(function(c) {
    // Если в поле phone введена ссылка, делаем её красивой
    var isLink = (c.phone && c.phone.trim().indexOf('http') === 0);
    var phoneHtml = isLink 
      ? '<a class="card-url" href="' + esc(c.phone) + '" target="_blank">' + esc(c.phone) + '</a>'
      : '<div style="font-size:13px; margin:5px 0">📞 ' + esc(c.phone) + '</div>';

    return '<div class="card">' +
      '<div class="card-header"><span class="card-title">' + esc(c.company) + '</span></div>' +
      phoneHtml +
      (c.service ? '<div style="font-size:12px; color:var(--text-muted); margin-top:8px; line-height:1.4;">' + esc(c.service) + '</div>' : '') +
      '<div class="card-actions"><button class="btn-icon danger" onclick="deleteContractor(\'' + c._id + '\')">🗑️</button></div></div>';
  }).join('');
}

function deleteAccounting(mongoId) {
  if(!confirm('Видалити?')) return;
  api('DELETE','/accounting/'+mongoId).then(function(){showToast('🗑️ Видалено');loadAccounting();});
}

function deleteContractor(mongoId) {
  if(!confirm('Видалити?')) return;
  api('DELETE','/contractors/'+mongoId).then(function(){showToast('🗑️ Видалено');loadContractors();});
}

// =====================================================
// КОРИСТУВАЧІ
// =====================================================
function loadUsers() { return api('GET','/users').then(function(d){state.users=d;}); }

function renderUsers() {
  var tb=document.getElementById('usersBody'); if(!tb) return;
  if(!state.users.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">Порожньо</td></tr>';return;}
  tb.innerHTML=state.users.map(function(u){
    var p=(ROLE_COLORS[u.role]||'#e2e8f0:#555').split(':');
    return '<tr><td><div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="width:34px;height:34px;font-size:11px;flex-shrink:0">'+getInitials(u.name)+'</div>'+
      '<div><div style="font-weight:600;font-size:13px">'+esc(u.name)+'</div><div style="font-size:11px;color:var(--text-muted)">'+esc(u.email)+'</div></div></div></td>'+
      '<td style="color:var(--text-muted)">'+esc(u.email)+'</td>'+
      '<td><span style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600">'+esc(u.dept)+'</span></td>'+
      '<td><span class="role-badge" style="background:'+p[0]+';color:'+p[1]+'">'+( ROLE_LABELS[u.role]||u.role)+'</span></td>'+
      '<td><button class="btn-icon" onclick="openEditUser(\''+u._id+'\')">✏️</button> '+
      '<button class="btn-icon danger" onclick="deleteUser(\''+u._id+'\')">🗑️</button></td></tr>';
  }).join('');
}

function openUserModal() {
  state.editUserId=null;
  document.getElementById('userModalTitle').textContent='Новий працівник';
  document.getElementById('uName').value='';
  document.getElementById('uEmail').value='';
  document.getElementById('uDept').value='IT';
  document.getElementById('uRole').value='user';
  document.getElementById('uPassword').value='';
  document.getElementById('userOverlay').classList.add('open');
}

function openEditUser(mongoId) {
  var u=state.users.filter(function(x){return x._id===mongoId;})[0]; if(!u) return;
  state.editUserId=mongoId;
  document.getElementById('userModalTitle').textContent='Редагувати';
  document.getElementById('uName').value=u.name;
  document.getElementById('uEmail').value=u.email;
  document.getElementById('uDept').value=u.dept;
  document.getElementById('uRole').value=u.role;
  document.getElementById('uPassword').value='';
  document.getElementById('userOverlay').classList.add('open');
}

function saveUser() {
  var name=document.getElementById('uName').value.trim();
  var email=document.getElementById('uEmail').value.trim();
  var dept=document.getElementById('uDept').value;
  var role=document.getElementById('uRole').value;
  var password=document.getElementById('uPassword').value;
  if(!name){showToast('Введіть ПІБ',true);return;}
  if(!email){showToast('Введіть email',true);return;}
  if(!state.editUserId&&(!password||password.length<4)){showToast('Пароль мінімум 4 символи',true);return;}
  var body={name:name,email:email,dept:dept,role:role,password:password};
  var promise=state.editUserId?api('PUT','/users/'+state.editUserId,body):api('POST','/users',body);
  promise.then(function(){
    showToast(state.editUserId?'✅ Оновлено':'✅ Зареєстровано');
    closeModal('userOverlay');
    return loadUsers();
  }).then(function(){renderUsers();loadStats();})
  .catch(function(e){showToast('❌ '+e.message,true);});
}

function deleteUser(mongoId) {
  if(!confirm('Видалити?')) return;
  api('DELETE','/users/'+mongoId).then(function(){showToast('🗑️ Видалено');return loadUsers();})
  .then(function(){renderUsers();loadStats();})
  .catch(function(e){showToast('❌ '+e.message,true);});
}

// =====================================================
// СТАТИСТИКА ТА ЖУРНАЛ
// =====================================================
function loadStats() {
  return api('GET','/stats').then(function(s){
    var el=document.getElementById('statsCards'); if(!el) return;
    el.innerHTML=[
      ['Ресурсів',s.totalResources,'#0284c7'],
      ['Працівників',s.totalUsers,'#059669'],
      ['Адмінів',s.adminCount||0,'#7c3aed'],
      ['Заявок IT',s.totalTickets||0,'#dc2626']
    ].map(function(i){
      return '<div class="stat-card" style="border-left-color:'+i[2]+'"><div class="num">'+i[1]+'</div>'+
        '<div style="font-size:13px;color:var(--text-muted);margin-top:6px">'+i[0]+'</div></div>';
    }).join('');
  }).catch(function(){});
}

function loadLogs() {
  api('GET','/logs').then(function(data){
    state.logs=data;
    var el=document.getElementById('logsBody'); if(!el) return;
    el.innerHTML=data.map(function(l){
      return '<tr><td style="color:var(--text-muted);font-family:monospace;white-space:nowrap">'+esc(l.created_at)+'</td>'+
        '<td>'+esc(l.action)+'</td><td style="color:var(--text-muted)">'+esc(l.user_name)+'</td></tr>';
    }).join('');
  }).catch(function(){});
}

// =====================================================
// СТАРТ
// =====================================================
document.addEventListener('DOMContentLoaded',function(){
  applyTheme();
  var saved=localStorage.getItem('wl_saved_email');
  if(saved&&localStorage.getItem('wl_remember')==='1'){
    var e=document.getElementById('loginEmail'); if(e) e.value=saved;
    var r=document.getElementById('rememberMe'); if(r) r.checked=true;
  }
  var session=sessionStorage.getItem('wl_session');
  if(session){
    try{
      state.currentUser=JSON.parse(session);
      document.getElementById('loginOverlay').style.display='none';
      document.getElementById('appContainer').style.display='flex';
      setupUI(); showPage('resources');
    }catch(e){sessionStorage.removeItem('wl_session');}
  }
});