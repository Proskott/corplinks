const API = window.location.origin + '/api';

var state = {
  currentUser: null, resources: [], users: [], logs: [],
  tickets: [], accounting: [], contractors: [], hr: [], contacts: [],
  editResId: null, editUserId: null
};

var CAT_LABELS = { development: 'Розробка', design: 'Дизайн', management: 'Менеджмент', hr: 'HR', finance: 'Фінанси' };
var ROLE_LABELS = { admin: 'Адміністратор', manager: 'Менеджер', user: 'Співробітник', viewer: 'Стажер' };
var ROLE_COLORS = { admin: '#fce4ec:#880e4f', manager: '#fff3e0:#e65100', user: '#e8f0fe:#1557b0', viewer: '#e8f5e9:#1b5e20' };
var TICKET_CAT = { hardware: 'Обладнання', software: 'ПЗ', network: 'Мережа', access: 'Доступи', other: 'Інше' };
var TICKET_PRIORITY = { low: {label:'Низький',color:'#16a34a'}, medium: {label:'Середній',color:'#ca8a04'}, high: {label:'Високий',color:'#dc2626'} };
var TICKET_STATUS = { new: {label:'Нова',color:'#2563eb'}, inprogress: {label:'В роботі',color:'#ca8a04'}, done: {label:'Виконано',color:'#16a34a'} };

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

function refreshIcons() {
  setTimeout(function(){ if(window.lucide) lucide.createIcons(); }, 100);
}

// =====================================================
// ТЕМА
// =====================================================
function toggleTheme() {
  var isDark=document.body.classList.toggle('dark');
  localStorage.setItem('wl_theme',isDark?'dark':'light');
  document.getElementById('themeBtn').textContent=isDark?'Світла тема':'Темна тема';
}
function applyTheme() {
  if(localStorage.getItem('wl_theme')==='dark') {
    document.body.classList.add('dark');
    var b=document.getElementById('themeBtn'); if(b) b.textContent='Світла тема';
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
    '<div style="font-size:11px;color:#94a3b8">'+(ROLE_LABELS[u.role]||u.role)+' / '+u.dept+'</div></div>';

  document.querySelectorAll('.admin-only').forEach(function(el){el.style.display=isAdmin?'':'none';});
  document.querySelectorAll('.manager-only').forEach(function(el){el.style.display=isManager?'':'none';});

  var dm=document.getElementById('deptModules'); if(dm) dm.style.display='block';
  var it=document.getElementById('nb-it'); if(it) it.style.display='flex';

  ['nb-finance','nb-sales','nb-hr'].forEach(function(id){
    var e=document.getElementById(id); if(e) e.style.display='none';
  });

  if(isAdmin){
    ['nb-finance','nb-sales','nb-hr'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='flex';});
  } else {
    if(u.dept==='Finance'){var f=document.getElementById('nb-finance');if(f)f.style.display='flex';}
    if(u.dept==='HR'){var h=document.getElementById('nb-hr');if(h)h.style.display='flex';}
    if(['Sales','Finance','Legal'].indexOf(u.dept)!==-1){var s=document.getElementById('nb-sales');if(s)s.style.display='flex';}
  }
  applyTheme();
  refreshIcons();
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
 if(page==='it') { loadTickets().then(function(){renderTickets();loadITStaff();}); }
  if(page==='finance') loadAccounting();
  if(page==='sales') loadContractors();
  if(page==='hr') loadHR();
  if(page==='contacts') loadContacts();
  if(page==='admin') { loadUsers().then(function(){renderUsers();loadTickets().then(function(){renderAllTickets();});loadStats();loadLogs();}); }
  refreshIcons();
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
  var userId=state.currentUser?state.currentUser._id:'';
  return api('GET','/resources?userId='+userId).then(function(data){
    state.resources=data;
   renderStatBar();
    renderCatFilter();
    filterAndRender();
    loadRecommendations();
  }).catch(function(){showToast('Помилка завантаження',true);});
}

function renderStatBar() {
  var c={}; state.resources.forEach(function(r){c[r.cat]=(c[r.cat]||0)+1;});
  var el=document.getElementById('statsBar'); if(!el) return;
  var accessNote=state.currentUser.role==='admin'
    ?'<div class="stat-chip" style="background:#dcfce7;color:#166534;border-color:#86efac;">Повний доступ</div>'
    :'<div class="stat-chip" style="background:#fef9c3;color:#854d0e;border-color:#fde047;">Фільтр: '+esc(state.currentUser.dept)+'</div>';
  el.innerHTML='<div class="stat-chip">Доступно:<span>'+state.resources.length+'</span></div>'+
    Object.keys(c).map(function(k){return '<div class="stat-chip">'+(CAT_LABELS[k]||k)+':<span>'+c[k]+'</span></div>';}).join('')+
    accessNote;
}


function renderCatFilter() {
  var cats=[]; state.resources.forEach(function(r){if(cats.indexOf(r.cat)===-1)cats.push(r.cat);});
  var el=document.getElementById('catFilter'); if(!el) return;
  el.innerHTML='<option value="">Всі категорії</option>'+cats.map(function(c){return '<option value="'+c+'">'+(CAT_LABELS[c]||c)+'</option>';}).join('');
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
  if(!data.length){
    g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">'+
      '<div style="font-size:16px;font-weight:600;margin-bottom:6px;">Ресурсів не знайдено</div>'+
      '<div style="font-size:13px;">Спробуйте змінити фільтр або додайте новий ресурс</div></div>';
    return;
  }
  g.innerHTML=data.map(function(r){
    var ab=(r.access&&r.access.toString()!=='ALL')?'<span class="access-badge">'+esc(r.access)+'</span>':'';
    var desc=r.desc?'<p class="card-desc">'+esc(r.desc)+'</p>':'<p class="card-desc" style="color:#94a3b8;font-style:italic">Без опису</p>';
    var ed=isMgr?'<button class="btn-icon" onclick="openEditRes(\''+r._id+'\')">Змінити</button>':'';
    var dl=isMgr?'<button class="btn-icon danger" onclick="deleteResource(\''+r._id+'\')">Видалити</button>':'';
    return '<div class="card"><div class="card-header"><div><span class="card-title">'+esc(r.name)+'</span>'+ab+'</div>'+
      '<span class="badge">'+(CAT_LABELS[r.cat]||r.cat)+'</span></div>'+
     '<a class="card-url" href="'+esc(r.url)+'" target="_blank" onclick="trackClick(\''+r._id+'\')">'+esc(r.url)+'</a>'+desc+
      '<div class="card-actions">'+ed+dl+'</div></div>';
  }).join('');
}

function renderMyResources() {
  if(!state.currentUser) return;
  api('GET','/resources/recommendations/'+state.currentUser._id).then(function(data){
    var g=document.getElementById('myGrid'); if(!g) return;
    var personal=data.personal||[];
    if(personal.length>0){
      var mine=personal.map(function(p){return p.resource;});
      renderCards(mine,'myGrid');
    } else {
      g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">'+
        '<div style="font-size:15px;font-weight:600;">Натискайте на ресурси — вони з\'являться тут автоматично</div>'+
        '<div style="font-size:13px;margin-top:6px;">Система формує персональний набір на основі вашої активності</div></div>';
    }
  }).catch(function(){});
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
  document.getElementById('resModalTitle').textContent='Редагувати ресурс';
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
    showToast(state.editResId?'Ресурс оновлено':'Ресурс додано');
    closeModal('resOverlay'); loadResources();
  }).catch(function(e){showToast(e.message,true);});
}

function deleteResource(mongoId) {
  if(!confirm('Видалити ресурс?')) return;
  api('DELETE','/resources/'+mongoId).then(function(){showToast('Ресурс видалено');loadResources();})
  .catch(function(e){showToast(e.message,true);});
}

// =====================================================
// IT-ЗАЯВКИ
// =====================================================
function loadITStaff() {
  return api('GET','/users').then(function(users){
    var sel=document.getElementById('ticketAssignee');
    var filterSel=document.getElementById('ticketFilterAssignee');
    if(!sel) return;
    
    // В селект форми — тільки IT та адміни
    var itUsers=users.filter(function(u){
      return u.dept==='IT'||u.role==='admin';
    });
    
    sel.innerHTML='<option value="">-- Автоматично (будь-хто з IT) --</option>'+
      itUsers.map(function(u){
        return '<option value="'+u._id+'" data-name="'+esc(u.name)+'">'+esc(u.name)+' ('+esc(u.dept)+')</option>';
      }).join('');
    
    // В фільтр — всі унікальні виконавці з існуючих тікетів
    if(filterSel){
      var assignees={};
      state.tickets.forEach(function(t){
        if(t.assignedToName&&t.assignedToName!=='Не призначено'){
          assignees[t.assignedTo]=t.assignedToName;
        }
      });
      filterSel.innerHTML='<option value="">Всі виконавці</option>'+
        Object.keys(assignees).map(function(id){
          return '<option value="'+id+'">'+esc(assignees[id])+'</option>';
        }).join('');
    }
  }).catch(function(){});
}
function loadTickets() {
  return api('GET','/tickets').then(function(data){state.tickets=data;});
}

function submitTicket() {
  var title=document.getElementById('ticketTitle').value.trim();
  var cat=document.getElementById('ticketCat').value;
  var priority=document.getElementById('ticketPriority').value;
  var desc=document.getElementById('ticketDesc').value.trim();
  var assigneeSel=document.getElementById('ticketAssignee');
  var assignedTo=assigneeSel?assigneeSel.value:'';
  var assignedToName='Не призначено';
  if(assigneeSel&&assigneeSel.selectedIndex>0){
    assignedToName=assigneeSel.options[assigneeSel.selectedIndex].getAttribute('data-name')||'Не призначено';
  }
  if(!title){showToast('Введіть тему заявки',true);return;}
  api('POST','/tickets',{
    title:title,cat:cat,priority:priority,desc:desc,
    author:state.currentUser.name,authorId:state.currentUser._id||state.currentUser.id,
    dept:state.currentUser.dept,
    assignedTo:assignedTo,assignedToName:assignedToName
  }).then(function(){
    document.getElementById('ticketTitle').value='';
    document.getElementById('ticketDesc').value='';
    if(assigneeSel) assigneeSel.selectedIndex=0;
    document.getElementById('ticketFormBlock').style.display='none';
    showToast('Заявку надіслано');
    return loadTickets();
  }).then(function(){renderTickets();})
  .catch(function(e){showToast(e.message,true);});
}


function renderTickets() {
  var fEl=document.getElementById('ticketFilter');
  var pEl=document.getElementById('ticketFilterPriority');
  var aEl=document.getElementById('ticketFilterAssignee');
  var filterStatus=fEl?fEl.value:'';
  var filterPriority=pEl?pEl.value:'';
  var filterAssignee=aEl?aEl.value:'';
  var list=state.tickets;
  if(filterStatus) list=list.filter(function(t){return t.status===filterStatus;});
  if(filterPriority) list=list.filter(function(t){return t.priority===filterPriority;});
  if(filterAssignee) list=list.filter(function(t){return t.assignedTo===filterAssignee;});
  
  var el=document.getElementById('ticketsList'); if(!el) return;
  if(!list.length){
    el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)">'+
      '<div style="font-size:15px;font-weight:600;">Заявок немає</div>'+
      '<div style="font-size:13px;margin-top:6px;">За обраними фільтрами заявок не знайдено</div></div>';
    return;
  }

  var isIT=state.currentUser.dept==='IT'||state.currentUser.role==='admin';
  el.innerHTML=list.slice().reverse().map(function(t){
    var pr=TICKET_PRIORITY[t.priority]||{label:t.priority,color:'#666'};
    var st=TICKET_STATUS[t.status]||{label:t.status,color:'#666'};
    var assignee=t.assignedToName||'Не призначено';
    var assigneeColor=assignee==='Не призначено'?'#94a3b8':'var(--primary)';
    
    var btns='';
    if(isIT){
      if(t.status!=='inprogress') btns+='<button class="btn-icon" onclick="changeTicketStatus(\''+t._id+'\',\'inprogress\')">В роботу</button>';
      if(t.status!=='done') btns+='<button class="btn-icon" onclick="changeTicketStatus(\''+t._id+'\',\'done\')">Виконано</button>';
      btns+='<button class="btn-icon" onclick="openAssignModal(\''+t._id+'\')">Призначити</button>';
      btns+='<button class="btn-icon danger" onclick="deleteTicket(\''+t._id+'\')">Видалити</button>';
    }
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px;margin-bottom:12px;">'+
      '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap;">'+
      '<div style="flex:1;min-width:200px;">'+
      '<div style="font-weight:600;font-size:14px;color:var(--text-main)">'+esc(t.title)+'</div>'+
      '<div style="font-size:11px;color:var(--text-muted);margin-top:3px">'+(TICKET_CAT[t.cat]||t.cat)+' — '+esc(t.author)+' — '+esc(t.createdAt)+'</div>'+
      '<div style="font-size:12px;margin-top:5px;color:'+assigneeColor+';font-weight:500;">Виконавець: '+esc(assignee)+'</div>'+
      '</div>'+
      '<div style="display:flex;gap:6px;flex-shrink:0;align-items:flex-start;">'+
      '<span style="font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600;background:'+pr.color+'18;color:'+pr.color+';border:1px solid '+pr.color+'33;">'+pr.label+'</span>'+
      '<span style="font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600;background:'+st.color+'18;color:'+st.color+';border:1px solid '+st.color+'33;">'+st.label+'</span>'+
      '</div></div>'+
      (t.desc?'<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">'+esc(t.desc)+'</div>':'')+
      (btns?'<div style="display:flex;gap:6px;flex-wrap:wrap">'+btns+'</div>':'')+
      '</div>';
  }).join('');
}

function changeTicketStatus(mongoId,status) {
  api('PUT','/tickets/'+mongoId+'/status',{status:status}).then(function(){
    showToast('Статус оновлено');
    return loadTickets();
  }).then(function(){renderTickets();renderAllTickets();})
  .catch(function(e){showToast(e.message,true);});
}

function deleteTicket(mongoId) {
  if(!confirm('Видалити заявку?')) return;
  api('DELETE','/tickets/'+mongoId).then(function(){
    showToast('Заявку видалено');
    return loadTickets();
  }).then(function(){renderTickets();renderAllTickets();})
  .catch(function(e){showToast(e.message,true);});
}
function openAssignModal(ticketId) {
  api('GET','/users').then(function(users){
    var itUsers=users.filter(function(u){ return u.dept==='IT'||u.role==='admin'; });
    var opts=itUsers.map(function(u){
      return '<option value="'+u._id+'" data-name="'+esc(u.name)+'">'+esc(u.name)+' ('+esc(u.dept)+')</option>';
    }).join('');
    
    var html='<div style="background:var(--surface);border:2px solid var(--primary);border-radius:8px;padding:20px;margin-bottom:16px;">'+
      '<div style="font-weight:600;font-size:14px;margin-bottom:12px;color:var(--text-main);">Призначити виконавця</div>'+
      '<select id="assignSelect" style="width:100%;padding:9px 14px;border:1px solid var(--border);border-radius:6px;font-size:14px;background:var(--surface);color:var(--text-main);margin-bottom:12px;">'+
      '<option value="">-- Оберіть працівника --</option>'+opts+'</select>'+
      '<div style="display:flex;gap:8px;justify-content:flex-end;">'+
      '<button class="btn-cancel" onclick="closeAssignPanel()">Скасувати</button>'+
      '<button class="btn-primary" onclick="confirmAssign(\''+ticketId+'\')">Призначити</button>'+
      '</div></div>';
    
    // Вставляємо панель зверху списку заявок
    var container=document.getElementById('ticketsList');
    var existing=document.getElementById('assignPanel');
    if(existing) existing.remove();
    container.insertAdjacentHTML('beforebegin','<div id="assignPanel">'+html+'</div>');
  });
}

function closeAssignPanel() {
  var panel=document.getElementById('assignPanel');
  if(panel) panel.remove();
}

function confirmAssign(ticketId) {
  var sel=document.getElementById('assignSelect');
  if(!sel||!sel.value){showToast('Оберіть працівника',true);return;}
  var name=sel.options[sel.selectedIndex].getAttribute('data-name')||'';
  api('PUT','/tickets/'+ticketId+'/assign',{
    assignedTo:sel.value,
    assignedToName:name,
    adminName:state.currentUser.name
  }).then(function(){
    closeAssignPanel();
    showToast('Виконавця призначено: '+name);
    return loadTickets();
  }).then(function(){renderTickets();renderAllTickets();})
  .catch(function(e){showToast(e.message,true);});
}

function renderAllTickets() {
  var el=document.getElementById('allTicketsList'); if(!el) return;
  if(!state.tickets.length){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)">Заявок поки немає</div>';return;}
  var rows=state.tickets.slice().reverse().map(function(t){
    var pr=TICKET_PRIORITY[t.priority]||{label:t.priority,color:'#666'};
    var st=TICKET_STATUS[t.status]||{label:t.status,color:'#666'};
    var assignee=t.assignedToName||'Не призначено';
    var assigneeStyle=assignee==='Не призначено'?'color:#94a3b8;font-style:italic;':'color:var(--text-main);font-weight:600;';
    return '<tr>'+
      '<td><b>'+esc(t.title)+'</b><br><span style="font-size:11px;color:var(--text-muted)">'+esc(t.createdAt||'')+'</span></td>'+
      '<td>'+esc(t.author)+'<br><span style="font-size:11px;color:var(--text-muted)">'+esc(t.dept||'')+'</span></td>'+
      '<td><span style="'+assigneeStyle+'font-size:12px;">'+esc(assignee)+'</span></td>'+
      '<td><span style="font-size:11px;padding:2px 7px;border-radius:4px;background:'+pr.color+'18;color:'+pr.color+';font-weight:600;border:1px solid '+pr.color+'33;">'+pr.label+'</span></td>'+
      '<td><select onchange="changeTicketStatus(\''+t._id+'\',this.value)" style="font-size:12px;padding:5px 8px;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:var(--text-main)">'+
      '<option value="new"'+(t.status==='new'?' selected':'')+'>Нова</option>'+
      '<option value="inprogress"'+(t.status==='inprogress'?' selected':'')+'>В роботі</option>'+
      '<option value="done"'+(t.status==='done'?' selected':'')+'>Виконано</option></select>'+
      ' <button class="btn-icon" onclick="openAssignModal(\''+t._id+'\')">Призначити</button>'+
      ' <button class="btn-icon danger" onclick="deleteTicket(\''+t._id+'\')">Видалити</button></td></tr>';
  }).join('');
  el.innerHTML='<div class="table-wrap"><table class="data-table"><thead><tr><th>Тема</th><th>Від кого</th><th>Виконавець</th><th>Пріоритет</th><th>Статус / Дії</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
// =====================================================
// ВАРІАНТ 1: ТРЕКІНГ КЛІКІВ ТА РЕКОМЕНДАЦІЇ
// =====================================================
function trackClick(resourceId) {
  if(!state.currentUser) return;
  api('POST','/resources/'+resourceId+'/click',{
    userId: state.currentUser._id,
    userDept: state.currentUser.dept
  }).catch(function(){});
}

function loadRecommendations() {
  if(!state.currentUser) return;
  api('GET','/resources/recommendations/'+state.currentUser._id).then(function(data){
    renderRecommendations(data);
  }).catch(function(){});
}

function renderRecommendations(data) {
  var el=document.getElementById('recommendationsBlock');
  if(!el) return;

  var personal=data.personal||[];
  var department=data.department||[];

  if(personal.length===0&&department.length===0){
    el.innerHTML='<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:20px;">'+
      '<div style="font-size:13px;color:var(--text-muted);">Натискайте на посилання ресурсів — система запам\'ятає ваші вподобання та покаже персональні рекомендації тут.</div></div>';
    return;
  }

  var html='';

  if(personal.length>0){
    html+='<div style="margin-bottom:16px;"><div style="font-size:13px;font-weight:600;color:var(--text-main);margin-bottom:8px;">Часто використовувані вами</div>';
    html+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    personal.forEach(function(item){
      var r=item.resource;
      html+='<a href="'+esc(r.url)+'" target="_blank" onclick="trackClick(\''+r._id+'\')" '+
        'style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;text-decoration:none;color:var(--text-main);font-size:13px;transition:.15s;" '+
        'onmouseover="this.style.borderColor=\'#2563eb\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
        '<div><div style="font-weight:600;">'+esc(r.name)+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted);">Використано '+item.clicks+' раз</div></div></a>';
    });
    html+='</div></div>';
  }

  if(department.length>0){
    var deptName=data.userDept||'відділу';
    html+='<div style="margin-bottom:16px;"><div style="font-size:13px;font-weight:600;color:var(--text-main);margin-bottom:8px;">Популярне у відділі '+esc(deptName)+'</div>';
    html+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    department.forEach(function(item){
      var r=item.resource;
      html+='<a href="'+esc(r.url)+'" target="_blank" onclick="trackClick(\''+r._id+'\')" '+
        'style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;text-decoration:none;color:var(--text-main);font-size:13px;transition:.15s;" '+
        'onmouseover="this.style.borderColor=\'#059669\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
        '<div><div style="font-weight:600;">'+esc(r.name)+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted);">Колеги використали '+item.clicks+' раз</div></div></a>';
    });
    html+='</div></div>';
  }

  el.innerHTML=html;
}

// =====================================================

// =====================================================
// БУХГАЛТЕРІЯ
// =====================================================
function loadAccounting() {
  return api('GET','/accounting').then(function(data){state.accounting=data;renderAccounting();})
  .catch(function(){showToast('Помилка завантаження',true);});
}

function renderAccounting() {
  var g=document.getElementById('financeGrid'); if(!g) return;
  if(!state.accounting.length){
    g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">'+
      '<div style="font-size:15px;font-weight:600;">Записів поки немає</div></div>';
    return;
  }
  g.innerHTML=state.accounting.map(function(item){
    var val=item.amount||'';
    var isLink=val.trim().toLowerCase().indexOf('http')===0||val.trim().toLowerCase().indexOf('www')===0;
    var contentHtml=isLink
      ?'<a class="card-url" href="'+esc(val)+'" target="_blank">'+esc(val)+'</a>'
      :'<div style="font-size:18px;font-weight:bold;margin:8px 0;">'+esc(val)+' грн</div>';
    var descHtml=item.description
      ?'<p class="card-desc">'+esc(item.description)+'</p>'
      :'<p class="card-desc" style="color:#94a3b8;font-style:italic">Без опису</p>';
    return '<div class="card" style="border-left:4px solid #059669">'+
      '<div class="card-header"><span class="card-title">'+esc(item.title)+'</span></div>'+
      contentHtml+descHtml+
      '<div class="card-actions"><button class="btn-icon danger" onclick="deleteAccounting(\''+item._id+'\')">Видалити</button></div></div>';
  }).join('');
}

function submitDeptRes(access,prefix) {
  var name=document.getElementById(prefix+'ResName').value.trim();
  var url=document.getElementById(prefix+'ResUrl').value.trim();
  var desc=document.getElementById(prefix+'ResDesc').value.trim();

  if(access==='Finance') {
    if(!name){showToast('Введіть назву',true);return;}
    api('POST','/accounting',{title:name,amount:url,description:desc}).then(function(){
      document.getElementById(prefix+'ResName').value='';
      document.getElementById(prefix+'ResUrl').value='';
      document.getElementById(prefix+'ResDesc').value='';
      document.getElementById('financeFormBlock').style.display='none';
      showToast('Запис додано'); loadAccounting();
    }).catch(function(e){showToast(e.message,true);});
  }

  if(access==='Sales') {
    if(!name){showToast('Введіть назву компанії',true);return;}
    var docType=document.getElementById('salDocType')?document.getElementById('salDocType').value:'general';
    var amount=document.getElementById('salAmount')?document.getElementById('salAmount').value:'';
    api('POST','/contractors',{company:name,phone:url,service:desc,docType:docType,amount:amount}).then(function(){
      document.getElementById(prefix+'ResName').value='';
      document.getElementById(prefix+'ResUrl').value='';
      document.getElementById(prefix+'ResDesc').value='';
      if(document.getElementById('salAmount')) document.getElementById('salAmount').value='';
      document.getElementById('salesFormBlock').style.display='none';
      showToast('Контрагента додано'); loadContractors();
    }).catch(function(e){showToast(e.message,true);});
  }

  if(access==='HR') {
    if(!name){showToast('Введіть назву',true);return;}
    api('POST','/hr',{title:name,url:url,description:desc}).then(function(){
      document.getElementById(prefix+'ResName').value='';
      document.getElementById(prefix+'ResUrl').value='';
      document.getElementById(prefix+'ResDesc').value='';
      document.getElementById('hrFormBlock').style.display='none';
      showToast('HR-ресурс додано'); loadHR();
    }).catch(function(e){showToast(e.message,true);});
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
  var g=document.getElementById('salesGrid'); if(!g) return;
  if(!state.contractors.length){
    g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">'+
      '<div style="font-size:15px;font-weight:600;">Контрагентів поки немає</div></div>';
    return;
  }
  g.innerHTML=state.contractors.map(function(c){
    var isLink=(c.phone&&c.phone.trim().indexOf('http')===0);
    var phoneHtml=isLink
      ?'<a class="card-url" href="'+esc(c.phone)+'" target="_blank">'+esc(c.phone)+'</a>'
      :'<div style="font-size:13px;margin:5px 0">Тел: '+esc(c.phone)+'</div>';
    var typeLabels={salary:'Зарплата',sales:'Продажі',general:'Загальне'};
    var typeHtml=c.docType?'<div style="font-size:11px;color:var(--primary);margin-top:5px;font-weight:600;">'+(typeLabels[c.docType]||c.docType)+'</div>':'';
    var amountHtml=c.amount?'<div style="font-size:14px;font-weight:700;margin-top:5px;">'+esc(c.amount)+' грн</div>':'';
    return '<div class="card">'+
      '<div class="card-header"><span class="card-title">'+esc(c.company)+'</span></div>'+
      phoneHtml+typeHtml+amountHtml+
      (c.service?'<div style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.4;">'+esc(c.service)+'</div>':'')+
      '<div class="card-actions"><button class="btn-icon danger" onclick="deleteContractor(\''+c._id+'\')">Видалити</button></div></div>';
  }).join('');
}

function deleteAccounting(mongoId) {
  if(!confirm('Видалити запис?')) return;
  api('DELETE','/accounting/'+mongoId).then(function(){showToast('Запис видалено');loadAccounting();});
}

function deleteContractor(mongoId) {
  if(!confirm('Видалити контрагента?')) return;
  api('DELETE','/contractors/'+mongoId).then(function(){showToast('Контрагента видалено');loadContractors();});
}

// =====================================================
// HR ВІДДІЛ
// =====================================================
function loadHR() {
  return api('GET','/hr').then(function(data){
    state.hr=data; renderHR();
  }).catch(function(){showToast('Помилка завантаження HR',true);});
}

function renderHR() {
  var g=document.getElementById('hrGrid'); if(!g) return;
  if(!state.hr||!state.hr.length){
    g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">'+
      '<div style="font-size:15px;font-weight:600;">HR-ресурсів поки немає</div></div>';
    return;
  }
  g.innerHTML=state.hr.map(function(item){
    var val=item.url||'';
    var isLink=val.trim().toLowerCase().indexOf('http')===0||val.trim().toLowerCase().indexOf('www')===0;
    var contentHtml=isLink
      ?'<a class="card-url" href="'+esc(val)+'" target="_blank">'+esc(val)+'</a>'
      :'<div style="font-size:14px;font-weight:bold;margin:8px 0;">'+esc(val)+'</div>';
    var descHtml=item.description
      ?'<p class="card-desc">'+esc(item.description)+'</p>'
      :'<p class="card-desc" style="color:#94a3b8;font-style:italic">Без опису</p>';
    return '<div class="card" style="border-left:4px solid #db2777">'+
      '<div class="card-header"><span class="card-title">'+esc(item.title)+'</span></div>'+
      contentHtml+descHtml+
      '<div class="card-actions"><button class="btn-icon danger" onclick="deleteHR(\''+item._id+'\')">Видалити</button></div></div>';
  }).join('');
}

function deleteHR(mongoId) {
  if(!confirm('Видалити HR-ресурс?')) return;
  api('DELETE','/hr/'+mongoId).then(function(){showToast('HR-ресурс видалено');loadHR();});
}

// =====================================================
// КОНТАКТИ КОМПАНІЇ
// =====================================================
function loadContacts() {
  return api('GET','/contacts').then(function(data){
    state.contacts=data; renderContacts();
  }).catch(function(){showToast('Помилка завантаження контактів',true);});
}

function renderContacts() {
  var g=document.getElementById('contactsGrid'); if(!g) return;
  if(!state.contacts||!state.contacts.length){
    g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">'+
      '<div style="font-size:15px;font-weight:600;">Контактів поки немає</div></div>';
    return;
  }
  g.innerHTML=state.contacts.map(function(c){
    return '<div class="card" style="border-left:4px solid var(--primary)">'+
      '<div style="font-weight:700;font-size:15px;">'+esc(c.name)+'</div>'+
      '<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">'+esc(c.position)+'</div>'+
      '<div style="font-size:13px;">Тел: '+esc(c.phone)+'</div>'+
      '<div style="font-size:13px;">Email: '+esc(c.email)+'</div>'+
      '<div class="card-actions"><button class="btn-icon danger" onclick="deleteContact(\''+c._id+'\')">Видалити</button></div></div>';
  }).join('');
}

function submitContact() {
  var name=document.getElementById('conName').value.trim();
  var pos=document.getElementById('conPos').value.trim();
  var phone=document.getElementById('conPhone').value.trim();
  var email=document.getElementById('conEmail').value.trim();
  if(!name||!phone){showToast('ПІБ та телефон обов\'язкові',true);return;}
  api('POST','/contacts',{name:name,position:pos,phone:phone,email:email}).then(function(){
    document.getElementById('conName').value='';
    document.getElementById('conPos').value='';
    document.getElementById('conPhone').value='';
    document.getElementById('conEmail').value='';
    toggleBlock('contactFormBlock');
    showToast('Контакт додано');
    loadContacts();
  }).catch(function(e){showToast(e.message,true);});
}

function deleteContact(id) {
  if(!confirm('Видалити контакт?')) return;
  api('DELETE','/contacts/'+id).then(function(){showToast('Контакт видалено');loadContacts();});
}

// =====================================================
// КОРИСТУВАЧІ
// =====================================================
function loadUsers() { return api('GET','/users').then(function(d){state.users=d;}); }

function renderUsers() {
  var tb=document.getElementById('usersBody'); if(!tb) return;
  if(!state.users.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">Список порожній</td></tr>';return;}
  tb.innerHTML=state.users.map(function(u){
    var p=(ROLE_COLORS[u.role]||'#e2e8f0:#555').split(':');
    return '<tr><td><div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="width:34px;height:34px;font-size:11px;flex-shrink:0">'+getInitials(u.name)+'</div>'+
      '<div><div style="font-weight:600;font-size:13px">'+esc(u.name)+'</div><div style="font-size:11px;color:var(--text-muted)">'+esc(u.email)+'</div></div></div></td>'+
      '<td style="color:var(--text-muted)">'+esc(u.email)+'</td>'+
      '<td><span style="background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600">'+esc(u.dept)+'</span></td>'+
      '<td><span class="role-badge" style="background:'+p[0]+';color:'+p[1]+'">'+(ROLE_LABELS[u.role]||u.role)+'</span></td>'+
      '<td><button class="btn-icon" onclick="openEditUser(\''+u._id+'\')">Змінити</button> '+
      '<button class="btn-icon danger" onclick="deleteUser(\''+u._id+'\')">Видалити</button></td></tr>';
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
  document.getElementById('userModalTitle').textContent='Редагувати працівника';
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
    showToast(state.editUserId?'Дані оновлено':'Працівника зареєстровано');
    closeModal('userOverlay');
    return loadUsers();
  }).then(function(){renderUsers();loadStats();})
  .catch(function(e){showToast(e.message,true);});
}

function deleteUser(mongoId) {
  if(!confirm('Видалити працівника?')) return;
  api('DELETE','/users/'+mongoId).then(function(){showToast('Працівника видалено');return loadUsers();})
  .then(function(){renderUsers();loadStats();})
  .catch(function(e){showToast(e.message,true);});
}

// =====================================================
// СТАТИСТИКА ТА ЖУРНАЛ
// =====================================================
function loadStats() {
  return api('GET','/stats').then(function(s){
    var el=document.getElementById('statsCards'); if(!el) return;
    el.innerHTML=[
      ['Ресурсів у базі',s.totalResources,'#0284c7'],
      ['Зареєстрованих працівників',s.totalUsers,'#059669'],
      ['Адміністраторів',s.adminCount||0,'#7c3aed'],
      ['Заявок IT',s.totalTickets||0,'#dc2626']
      ['Переходів по ресурсах',s.totalClicks||0,'#8b5cf6']
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
    }catch(ex){sessionStorage.removeItem('wl_session');}
  }
  refreshIcons();
});