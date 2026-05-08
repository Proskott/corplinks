const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://kott:24861980qwerty@cluster0.dowxxbi.mongodb.net/corplinks?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ Connection Error:', err));

// --- СХЕМИ ---

var userSchema = new mongoose.Schema({
  name: String, email: String, dept: String, role: String,
  password: String, created_at: String
});
var ticketSchema = new mongoose.Schema({
  title: String, cat: String, priority: String, desc: String,
  status: String, author: String, authorId: String, dept: String, createdAt: String
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

// Оновлена схема контрагентів для менеджерів (додано тип документа та суму)
var contractorSchema = new mongoose.Schema({
  company: String, 
  phone: String, 
  service: String, 
  docType: String, // 'general', 'salary', 'sales'
  amount: String, 
  created_at: String
});

// Нова схема для HR-відділу
var hrSchema = new mongoose.Schema({
  title: String, url: String, description: String, created_at: String
});

// Нова схема для контактів компанії
var contactSchema = new mongoose.Schema({
  name: String, position: String, phone: String, email: String, created_at: String
});

// --- МОДЕЛІ ---

var User = mongoose.model('User', userSchema);
var Ticket = mongoose.model('Ticket', ticketSchema);
var Log = mongoose.model('Log', logSchema);
var Resource = mongoose.model('Resource', resourceSchema);
var Accounting = mongoose.model('Accounting', accountingSchema);
var Contractor = mongoose.model('Contractor', contractorSchema);
var HR = mongoose.model('HR', hrSchema);
var Contact = mongoose.model('Contact', contactSchema);

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
    return user;
  },

  // --- РЕСУРСИ ---
  async getResources() { return await Resource.find().sort({ _id: -1 }); },

  async createResource(data) {
    return await new Resource({
      name: data.name, url: data.url, cat: data.cat, desc: data.desc,
      access: data.access || 'ALL', created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },

  async updateResource(mongoId, data) {
    var res = await Resource.findByIdAndUpdate(mongoId, {
      name: data.name, url: data.url, cat: data.cat, desc: data.desc
    }, { new: true });
    if (!res) throw new Error('Ресурс не знайдено');
    return res;
  },

  async deleteResource(mongoId) {
    return await Resource.findByIdAndDelete(mongoId);
  },

  // --- ЗАЯВКИ ---
  async getTickets() { return await Ticket.find().sort({ _id: -1 }); },

  async createTicket(data) {
    return await new Ticket({
      title: data.title, cat: data.cat, priority: data.priority,
      desc: data.desc, status: 'new', author: data.author,
      authorId: data.authorId, dept: data.dept,
      createdAt: new Date().toLocaleString('uk-UA')
    }).save();
  },

  async updateTicketStatus(mongoId, status) {
    return await Ticket.findByIdAndUpdate(mongoId, { status: status }, { new: true });
  },

  async deleteTicket(mongoId) {
    return await Ticket.findByIdAndDelete(mongoId);
  },

  // --- БУХГАЛТЕРІЯ ---
  async getAccounting() { return await Accounting.find().sort({ _id: -1 }); },

  async createAccounting(data) {
    return await new Accounting({
      title: data.title, amount: data.amount,
      description: data.description || '',
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },

  async deleteAccounting(mongoId) {
    return await Accounting.findByIdAndDelete(mongoId);
  },

  // --- КОНТРАГЕНТИ (Оновлено) ---
  async getContractors() { return await Contractor.find().sort({ company: 1 }); },

  async createContractor(data) {
    return await new Contractor({
      company: data.company, 
      phone: data.phone,
      service: data.service || '',
      docType: data.docType || 'general',
      amount: data.amount || '',
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },

  async deleteContractor(mongoId) {
    return await Contractor.findByIdAndDelete(mongoId);
  },

  // --- HR ВІДДІЛ (Нове) ---
  async getHR() { return await HR.find().sort({ _id: -1 }); },

  async createHR(data) {
    return await new HR({
      title: data.title, url: data.url,
      description: data.description || '',
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },

  async deleteHR(mongoId) { return await HR.findByIdAndDelete(mongoId); },

  // --- КОНТАКТИ КОМПАНІЇ (Нове) ---
  async getContacts() { return await Contact.find().sort({ name: 1 }); },

  async createContact(data) {
    return await new Contact({
      name: data.name, position: data.position,
      phone: data.phone, email: data.email,
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },

  async deleteContact(mongoId) { return await Contact.findByIdAndDelete(mongoId); },

  // --- ЖУРНАЛ ---
  async getLogs() { return await Log.find().sort({ _id: -1 }).limit(100); },

  async addLog(action, userName) {
    await new Log({
      action: action, user_name: userName || 'Система',
      created_at: new Date().toLocaleString('uk-UA')
    }).save();
  },

  // --- СТАТИСТИКА ---
  async getStats() {
    var results = await Promise.all([
      User.countDocuments(),
      Resource.countDocuments(),
      Ticket.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'manager' })
    ]);
    return {
      totalUsers: results[0], totalResources: results[1],
      totalTickets: results[2], adminCount: results[3],
      managerCount: results[4]
    };
  }
};

module.exports = db;