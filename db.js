const mongoose = require('mongoose');

// ВСТАВ СВІЙ ПАРОЛЬ НИЖЧЕ
const MONGO_URI = "mongodb+srv://kott:<db_password>@cluster0.dowxxbi.mongodb.net/corplinks?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    seedDatabase(); // Запуск авто-заповнення
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
  id: Number, name: String, url: String, cat: String, desc: String, access: String, created_at: String
});

const User = mongoose.model('User', userSchema);
const Ticket = mongoose.model('Ticket', ticketSchema);
const Log = mongoose.model('Log', logSchema);
const Resource = mongoose.model('Resource', resourceSchema);

// --- ФУНКЦІЯ АВТО-ЗАПОВНЕННЯ ---
async function seedDatabase() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('🌱 База порожня. Створюю початкових користувачів...');
    await User.insertMany([
      { id: 1, name: 'Ходаківський Ігор Євгенійович', email: 'khodakivskyi@enterprise.com', dept: 'IT', role: 'admin', password: 'admin123', created_at: '2024-01-01 09:00:00' },
      { id: 2, name: 'Петренко Олена Василівна', email: 'petrenko@enterprise.com', dept: 'Finance', role: 'manager', password: '1234', created_at: '2024-01-01 09:01:00' }
    ]);
    await Resource.create({ id: 1, name: 'GitHub організації', url: 'https://github.com/company', cat: 'development', desc: 'Репозиторій коду', access: 'IT', created_at: '2024-01-01 09:10:00' });
    console.log('✅ Дані успішно додано!');
  }
}

const db = {
  async loginUser(email, password) {
    const user = await User.findOne({ email: email.toLowerCase().trim(), password: password });
    if (!user) throw new Error('Невірний пароль або email');
    return user;
  },
  async getUsers() { return await User.find().sort({ name: 1 }); },
  async createUser(data) {
    const count = await User.countDocuments();
    const user = new User({ ...data, id: count + 1, created_at: new Date().toLocaleString() });
    return await user.save();
  },
  async getTickets() { return await Ticket.find(); },
  async createTicket(data) {
    const count = await Ticket.countDocuments();
    const ticket = new Ticket({ ...data, id: count + 1, status: 'new', createdAt: new Date().toLocaleString() });
    return await ticket.save();
  },
  async updateTicketStatus(id, status) {
    return await Ticket.findOneAndUpdate({ id: Number(id) }, { status });
  },
  async deleteTicket(id) {
    return await Ticket.findOneAndDelete({ id: Number(id) });
  },
  async getLogs() { return await Log.find().sort({ _id: -1 }).limit(50); },
  async addLog(action, userName) {
    const log = new Log({ action, user_name: userName, created_at: new Date().toLocaleString() });
    await log.save();
  },
  async getResources() { return await Resource.find().sort({ id: -1 }); },
  async getStats() {
    const [u, r, t] = await Promise.all([User.countDocuments(), Resource.countDocuments(), Ticket.countDocuments()]);
    return { totalUsers: u, totalResources: r, totalTickets: t, adminCount: await User.countDocuments({role:'admin'}), managerCount: await User.countDocuments({role:'manager'}) };
  }
};

module.exports = db;