const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://kott:24861980qwerty@cluster0.dowxxbi.mongodb.net/corplinks?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ Connection Error:', err));

// --- СХЕМИ ---
const userSchema = new mongoose.Schema({ id: Number, name: String, email: String, dept: String, role: String, password: { type: String, select: true }, created_at: String });
const ticketSchema = new mongoose.Schema({ id: Number, title: String, cat: String, priority: String, desc: String, status: String, author: String, authorId: Number, dept: String, createdAt: String });
const logSchema = new mongoose.Schema({ id: Number, action: String, user_name: String, created_at: String });
const resourceSchema = new mongoose.Schema({ id: Number, name: String, url: String, cat: String, desc: String, access: [String], created_at: String });

// НОВІ СХЕМИ
const accountingSchema = new mongoose.Schema({
  id: Number, title: String, amount: Number, type: String, date: String, category: String, description: String
});

const contractorSchema = new mongoose.Schema({
  id: Number, company: String, contact: String, phone: String, email: String, service: String, status: String
});

const User = mongoose.model('User', userSchema);
const Ticket = mongoose.model('Ticket', ticketSchema);
const Log = mongoose.model('Log', logSchema);
const Resource = mongoose.model('Resource', resourceSchema);
const Accounting = mongoose.model('Accounting', accountingSchema);
const Contractor = mongoose.model('Contractor', contractorSchema);

const db = {
  // Користувачі
  async loginUser(email, password) {
    const user = await User.findOne({ email: email.toLowerCase().trim(), password });
    if (!user) throw new Error('Невірний пароль або email');
    return user;
  },
  async getUsers() { return await User.find().sort({ name: 1 }); },
  async createUser(data) {
    const count = await User.countDocuments();
    return await new User({ ...data, id: count + 1, created_at: new Date().toLocaleString() }).save();
  },
  async deleteUser(id) { return await User.findOneAndDelete({ id: Number(id) }); },

  // Бухгалтерія (Accounting)
  async getAccounting() { return await Accounting.find().sort({ _id: -1 }); },
  async createAccounting(data) {
    const count = await Accounting.countDocuments();
    return await new Accounting({ ...data, id: count + 1 }).save();
  },
  async deleteAccounting(id) { return await Accounting.findOneAndDelete({ id: Number(id) }); },

  // Контрагенти (Contractors)
  async getContractors() { return await Contractor.find().sort({ company: 1 }); },
  async createContractor(data) {
    const count = await Contractor.countDocuments();
    return await new Contractor({ ...data, id: count + 1 }).save();
  },
  async deleteContractor(id) { return await Contractor.findOneAndDelete({ id: Number(id) }); },

  // Інше
  async getTickets() { return await Ticket.find().sort({ _id: -1 }); },
  async createTicket(data) {
    const count = await Ticket.countDocuments();
    return await new Ticket({ ...data, id: count + 1, status: 'new', createdAt: new Date().toLocaleString() }).save();
  },
  async updateTicketStatus(id, status) { return await Ticket.findOneAndUpdate({ id: Number(id) }, { status }); },
  async deleteTicket(id) { return await Ticket.findOneAndDelete({ id: Number(id) }); },

  async getResources() { return await Resource.find().sort({ _id: -1 }); },
  async createResource(data) {
    const count = await Resource.countDocuments();
    return await new Resource({ ...data, id: count + 1, created_at: new Date().toLocaleString() }).save();
  },
  async deleteResource(id) { return await Resource.findOneAndDelete({ id: Number(id) }); },

  async getLogs() { return await Log.find().sort({ _id: -1 }).limit(50); },
  async addLog(action, userName) {
    await new Log({ action, user_name: userName, created_at: new Date().toLocaleString() }).save();
  },
  async getStats() {
    const [u, r, t] = await Promise.all([User.countDocuments(), Resource.countDocuments(), Ticket.countDocuments()]);
    return { totalUsers: u, totalResources: r, totalTickets: t, adminCount: await User.countDocuments({role:'admin'}) };
  }
};

module.exports = db;