const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://kott:24861980qwerty@cluster0.dowxxbi.mongodb.net/corplinks?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Connection Error:', err));

var userSchema = new mongoose.Schema({
  name: String, email: String, dept: String, role: String,
  password: String, created_at: String
});
var ticketSchema = new mongoose.Schema({
  title: String, cat: String, priority: String, desc: String,
  status: String, author: String, authorId: String, dept: String,
  assignedTo: String, assignedToName: String,
  createdAt: String
});
var logSchema = new mongoose.Schema({
  action: String, user_name: String, created_at: String
});
var resourceSchema = new mongoose.Schema({
  name: String, url: String, cat: String, desc: String,
  access: String, created_at: String
});
var accountingSchema = new mongoose.Schema({
  title: String, amount: String, description: String, created_at: String
});
var contractorSchema = new mongoose.Schema({
  company: String, phone: String, service: String,
  docType: String, amount: String, created_at: String
});
var hrSchema = new mongoose.Schema({
  title: String, url: String, description: String, created_at: String
});
var contactSchema = new mongoose.Schema({
  name: String, position: String, phone: String, email: String, created_at: String
});
var clickSchema = new mongoose.Schema({
  userId: String, resourceId: String, userDept: String,
  timestamp: { type: Date, default: Date.now }
});
var favoriteSchema = new mongoose.Schema({
  userId: String, resourceId: String
});

var User = mongoose.model('User', userSchema);
var Ticket = mongoose.model('Ticket', ticketSchema);
var Log = mongoose.model('Log', logSchema);
var Resource = mongoose.model('Resource', resourceSchema);
var Accounting = mongoose.model('Accounting', accountingSchema);
var Contractor = mongoose.model('Contractor', contractorSchema);
var HR = mongoose.model('HR', hrSchema);
var Contact = mongoose.model('Contact', contactSchema);
var Click = mongoose.model('Click', clickSchema);
var Favorite = mongoose.model('Favorite', favoriteSchema);

var db = {

  // --- АВТОРИЗАЦІЯ ---
  async loginUser(email, password) {
    var user = await User.findOne({ email: email.toLowerCase().trim(), password: password });
    if (!user) throw new Error('Невірний email або пароль');
    return user;
  },

  // --- КОРИСТУВАЧІ ---
  async getUsers() { return await User.find().sort({ name: 1 }); },

  async createUser(data) {
    if (!data.password || data.password.length < 4) throw new Error('Пароль мінімум 4 символи');
    var exists = await User.findOne({ email: data.email.toLowerCase().trim() });
    if (exists) throw new Error('Цей email вже зайнятий');
    return await new User({
      name: data.name, email: data.email.toLowerCase().trim(),
      dept: data.dept, role: data.role, password: data.password,
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },

  async updateUser(mongoId, data) {
    var update = { name: data.name, email: data.email, dept: data.dept, role: data.role };
    if (data.password && data.password.length >= 4) update.password = data.password;
    var user = await User.findByIdAndUpdate(mongoId, update, { new: true });
    if (!user) throw new Error('Користувача не знайдено');
    return user;
  },

  async deleteUser(mongoId) {
    var user = await User.findByIdAndDelete(mongoId);
    if (!user) throw new Error('Не знайдено');
    await Click.deleteMany({ userId: mongoId });
    await Favorite.deleteMany({ userId: mongoId });
    return user;
  },

  // --- РЕСУРСИ З АДАПТИВНИМ ДОСТУПОМ ---
  async getResources() { return await Resource.find().sort({ _id: -1 }); },

  async getResourcesForUser(userId) {
    var user = await User.findById(userId);
    var allResources = await Resource.find().sort({ _id: -1 });
    if (!user) return allResources;
    if (user.role === 'admin') return allResources;
    return allResources.filter(function(r) {
      var access = (r.access || 'ALL').toString();
      if (access === 'ALL') return true;
      if (access.indexOf(user.dept) !== -1) return true;
      if (user.role === 'manager' && access.indexOf('Management') !== -1) return true;
      return false;
    });
  },

  async createResource(data) {
    return await new Resource({
      name: data.name, url: data.url, cat: data.cat, desc: data.desc,
      access: data.access || 'ALL', created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },

  async updateResource(mongoId, data) {
    var res = await Resource.findByIdAndUpdate(mongoId, {
      name: data.name, url: data.url, cat: data.cat, desc: data.desc, access: data.access
    }, { new: true });
    if (!res) throw new Error('Ресурс не знайдено');
    return res;
  },

  async deleteResource(mongoId) {
    await Click.deleteMany({ resourceId: mongoId });
    await Favorite.deleteMany({ resourceId: mongoId });
    return await Resource.findByIdAndDelete(mongoId);
  },

  // --- ОБРАНІ ---
  async getFavorites(userId) {
    var favs = await Favorite.find({ userId: userId });
    return favs.map(function(f) { return f.resourceId; });
  },

  async toggleFavorite(userId, resourceId) {
    var existing = await Favorite.findOne({ userId: userId, resourceId: resourceId });
    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      return false;
    } else {
      await new Favorite({ userId: userId, resourceId: resourceId }).save();
      return true;
    }
  },

  // --- ТРЕКІНГ КЛІКІВ ---
  async trackClick(userId, resourceId, userDept) {
    await new Click({ userId: userId, resourceId: resourceId, userDept: userDept }).save();
  },

  async getFrequentForUser(userId) {
    return await Click.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: '$resourceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
  },

  async getPopularInDept(dept) {
    return await Click.aggregate([
      { $match: { userDept: dept } },
      { $group: { _id: '$resourceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
  },

  async getRecommendations(userId) {
    var user = await User.findById(userId);
    if (!user) return { personal: [], department: [], userDept: '' };
    var personal = await this.getFrequentForUser(userId);
    var department = await this.getPopularInDept(user.dept);
    var allIds = [];
    personal.forEach(function(p) { allIds.push(p._id); });
    department.forEach(function(d) { allIds.push(d._id); });
    var resources = await Resource.find({ _id: { $in: allIds } });
    var resMap = {};
    resources.forEach(function(r) { resMap[r._id.toString()] = r; });
    var personalIds = personal.map(function(p) { return p._id; });
    var personalFull = personal.map(function(p) {
      var r = resMap[p._id]; return r ? { resource: r, clicks: p.count } : null;
    }).filter(Boolean);
    var departmentFull = department.filter(function(d) {
      return personalIds.indexOf(d._id) === -1;
    }).map(function(d) {
      var r = resMap[d._id]; return r ? { resource: r, clicks: d.count } : null;
    }).filter(Boolean);
    return { personal: personalFull, department: departmentFull, userDept: user.dept };
  },

  // --- ЗАЯВКИ ---
  async getTickets() { return await Ticket.find().sort({ _id: -1 }); },

  async createTicket(data) {
    return await new Ticket({
      title: data.title, cat: data.cat, priority: data.priority,
      desc: data.desc, status: 'new', author: data.author,
      authorId: data.authorId, dept: data.dept,
      assignedTo: data.assignedTo || '',
      assignedToName: data.assignedToName || 'Не призначено',
      createdAt: new Date().toLocaleString('uk-UA')
    }).save();
  },

  async updateTicketStatus(mongoId, status) {
    return await Ticket.findByIdAndUpdate(mongoId, { status: status }, { new: true });
  },

  async updateTicketAssignee(mongoId, assignedTo, assignedToName) {
    return await Ticket.findByIdAndUpdate(mongoId, { assignedTo: assignedTo, assignedToName: assignedToName }, { new: true });
  },

  async deleteTicket(mongoId) { return await Ticket.findByIdAndDelete(mongoId); },

  // --- БУХГАЛТЕРІЯ ---
  async getAccounting() { return await Accounting.find().sort({ _id: -1 }); },
  async createAccounting(data) {
    return await new Accounting({
      title: data.title, amount: data.amount, description: data.description || '',
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },
  async deleteAccounting(mongoId) { return await Accounting.findByIdAndDelete(mongoId); },

  // --- КОНТРАГЕНТИ ---
  async getContractors() { return await Contractor.find().sort({ company: 1 }); },
  async createContractor(data) {
    return await new Contractor({
      company: data.company, phone: data.phone, service: data.service || '',
      docType: data.docType || 'general', amount: data.amount || '',
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },
  async deleteContractor(mongoId) { return await Contractor.findByIdAndDelete(mongoId); },

  // --- HR ---
  async getHR() { return await HR.find().sort({ _id: -1 }); },
  async createHR(data) {
    return await new HR({
      title: data.title, url: data.url, description: data.description || '',
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },
  async deleteHR(mongoId) { return await HR.findByIdAndDelete(mongoId); },

  // --- КОНТАКТИ ---
  async getContacts() { return await Contact.find().sort({ name: 1 }); },
  async createContact(data) {
    return await new Contact({
      name: data.name, position: data.position, phone: data.phone, email: data.email,
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },
  async deleteContact(mongoId) { return await Contact.findByIdAndDelete(mongoId); },

  // --- ЖУРНАЛ ---
  async getLogs() { return await Log.find().sort({ _id: -1 }).limit(100); },
  async addLog(action, userName) {
    await new Log({ action: action, user_name: userName || 'Система', created_at: new Date().toLocaleString('uk-UA') }).save();
  },

  // --- СТАТИСТИКА ---
  async getStats() {
    var results = await Promise.all([
      User.countDocuments(), Resource.countDocuments(), Ticket.countDocuments(),
      User.countDocuments({ role: 'admin' }), User.countDocuments({ role: 'manager' }),
      Click.countDocuments()
    ]);
    return {
      totalUsers: results[0], totalResources: results[1], totalTickets: results[2],
      adminCount: results[3], managerCount: results[4], totalClicks: results[5]
    };
  }
};

module.exports = db;