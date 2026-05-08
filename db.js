const mongoose = require('mongoose');

// КОНФІГУРАЦІЯ (Встав свій пароль!)
const MONGO_URI = "mongodb+srv://kott:24861980qwerty@cluster0.dowxxbi.mongodb.net/corplinks?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    seedDatabase(); 
  })
  .catch(err => console.error('❌ Connection Error:', err));

// --- СХЕМИ ---
const userSchema = new mongoose.Schema({
  id: Number, name: String, email: String, dept: String, role: String, password: { type: String, select: true }, created_at: String
});
const ticketSchema = new mongoose.Schema({
  id: Number, title: String, cat: String, priority: String, desc: String, status: String, author: String, authorId: Number, dept: String, createdAt: String
});
const logSchema = new mongoose.Schema({
  id: Number, action: String, user_name: String, created_at: String
});
const resourceSchema = new mongoose.Schema({
  id: Number, name: String, url: String, cat: String, desc: String, 
  access: [String], // Тепер точно масив
  created_at: String
});

const User = mongoose.model('User', userSchema);
const Ticket = mongoose.model('Ticket', ticketSchema);
const Log = mongoose.model('Log', logSchema);
const Resource = mongoose.model('Resource', resourceSchema);

// Авто-створення адміна при першому запуску
async function seedDatabase() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.insertMany([
      { id: 1, name: 'Ходаківський Ігор Євгенійович', email: 'khodakivskyi@enterprise.com', dept: 'IT', role: 'admin', password: 'admin123', created_at: '2026-01-01 09:00:00' }
    ]);
    console.log('🌱 База була порожня, адмін створений.');
  }
}

const db = {
  // АВТОРИЗАЦІЯ
  async loginUser(email, password) {
    const user = await User.findOne({ email: email.toLowerCase().trim(), password });
    if (!user) throw new Error('Невірний пароль або email');
    return user;
  },

  // КОРИСТУВАЧІ
  async getUsers() { return await User.find().sort({ name: 1 }); },
  async createUser(data) {
    const count = await User.countDocuments();
    const user = new User({ ...data, id: count + 1, created_at: new Date().toLocaleString() });
    return await user.save();
  },
  async deleteUser(id) { return await User.findOneAndDelete({ id: Number(id) }); },

  // ЗАЯВКИ (TICKETS)
  async getTickets() { return await Ticket.find().sort({ _id: -1 }); },
  async createTicket(data) {
    const count = await Ticket.countDocuments();
    const ticket = new Ticket({ ...data, id: count + 1, status: 'new', createdAt: new Date().toLocaleString() });
    return await ticket.save();
  },
  async updateTicketStatus(id, status) { return await Ticket.findOneAndUpdate({ id: Number(id) }, { status }); },
  async deleteTicket(id) { return await Ticket.findOneAndDelete({ id: Number(id) }); },

  // РЕСУРСИ (RESOURCES)
  async getResources() { return await Resource.find().sort({ _id: -1 }); },
  async createResource(data) {
    const count = await Resource.countDocuments();
    const res = new Resource({ ...data, id: count + 1, created_at: new Date().toLocaleString() });
    return await res.save();
  },
  async deleteResource(id) { return await Resource.findOneAndDelete({ id: Number(id) }); },

  // ЛОГИ ТА СТАТИСТИКА
  async getLogs() { return await Log.find().sort({ _id: -1 }).limit(50); },
  async addLog(action, userName) {
    const log = new Log({ action, user_name: userName, created_at: new Date().toLocaleString() });
    await log.save();
  },
  async getStats() {
    const [u, r, t] = await Promise.all([User.countDocuments(), Resource.countDocuments(), Ticket.countDocuments()]);
    return { totalUsers: u, totalResources: r, totalTickets: t, adminCount: await User.countDocuments({role:'admin'}) };
  }
};

module.exports = db;