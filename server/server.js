const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const QRCode = require('qrcode');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Sequelize with SQLite (simple dev DB)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'db.sqlite'),
  logging: false,
});

// Models
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true },
  passwordHash: DataTypes.STRING,
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const Product = sequelize.define('Product', {
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  filename: DataTypes.STRING,
  mime: DataTypes.STRING,
  size: DataTypes.INTEGER,
  priceCents: { type: DataTypes.INTEGER, defaultValue: 0 },
  isApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
  isRejected: { type: DataTypes.BOOLEAN, defaultValue: false },
  rejectedReason: { type: DataTypes.STRING, allowNull: true },
  uploaderId: DataTypes.INTEGER,
});

const Ad = sequelize.define('Ad', {
  title: DataTypes.STRING,
  imageUrl: DataTypes.STRING,
  link: DataTypes.STRING,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
});

User.hasMany(Product, { foreignKey: 'uploaderId' });
Product.belongsTo(User, { foreignKey: 'uploaderId' });

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB limit

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, UPLOAD_DIR)));

// Serve React build if present
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    // API routes start with /api, so skip those
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Helper: auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing auth' });
  const token = auth.replace(/^Bearer\s+/, '');
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'not authenticated' });
  if (!req.user.isAdmin) return res.status(403).json({ error: 'admin only' });
  next();
}

// Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'missing fields' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ username, passwordHash: hash });
    return res.json({ id: user.id, username: user.username });
  } catch (e) {
    return res.status(400).json({ error: 'username exists' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user) return res.status(400).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'invalid' });
  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Upload product (uploader must be authenticated). Admins can approve later.
app.post('/api/products', authMiddleware, upload.single('file'), async (req, res) => {
  // Security: ensure we do not accept illegal content. This is only a scaffold; actual moderation must be implemented by you.
  const { title, description, priceCents } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'file required' });
  const product = await Product.create({
    title: title || file.originalname,
    description: description || '',
    filename: file.filename,
    mime: file.mimetype,
    size: file.size,
    priceCents: Number(priceCents) || 0,
    uploaderId: req.user.id,
    isApproved: false,
    isRejected: false,
  });
  res.json({ product });
});

// List approved products and active ads
app.get('/api/products', async (req, res) => {
  const products = await Product.findAll({ where: { isApproved: true, isRejected: false }, include: [{ model: User, attributes: ['id','username'] }], order: [['createdAt','DESC']] });
  const ads = await Ad.findAll({ where: { isActive: true }, order: [['createdAt','DESC']] });
  res.json({ products, ads });
});

// Admin: list pending
app.get('/api/admin/products/pending', authMiddleware, adminOnly, async (req, res) => {
  const products = await Product.findAll({ where: { isApproved: false, isRejected: false }, include: [{ model: User, attributes: ['id','username'] }], order: [['createdAt','DESC']] });
  res.json({ products });
});

// Admin: approve product
app.post('/api/admin/products/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  const p = await Product.findByPk(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  p.isApproved = true;
  p.isRejected = false;
  p.rejectedReason = null;
  await p.save();
  res.json({ ok: true, product: p });
});

// Admin: reject product (optionally delete file)
app.post('/api/admin/products/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  const { reason, deleteFile } = req.body || {};
  const p = await Product.findByPk(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  p.isApproved = false;
  p.isRejected = true;
  p.rejectedReason = reason || null;
  await p.save();
  if (deleteFile) {
    try {
      const filePath = path.join(__dirname, UPLOAD_DIR, p.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) { /* ignore */ }
  }
  res.json({ ok: true, product: p });
});

// Admin: list users
app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
  const users = await User.findAll({ attributes: ['id','username','isAdmin','createdAt'] });
  res.json({ users });
});

// Admin: create ad
app.post('/api/admin/ads', authMiddleware, adminOnly, async (req, res) => {
  const { title, imageUrl, link, isActive } = req.body;
  const ad = await Ad.create({ title, imageUrl, link, isActive: isActive !== false });
  res.json({ ad });
});

// Admin: list ads
app.get('/api/admin/ads', authMiddleware, adminOnly, async (req, res) => {
  const ads = await Ad.findAll({ order: [['createdAt','DESC']] });
  res.json({ ads });
});

// Admin: update/delete ad
app.delete('/api/admin/ads/:id', authMiddleware, adminOnly, async (req, res) => {
  const ad = await Ad.findByPk(req.params.id);
  if (!ad) return res.status(404).json({ error: 'not found' });
  await ad.destroy();
  res.json({ ok: true });
});

app.patch('/api/admin/ads/:id', authMiddleware, adminOnly, async (req, res) => {
  const ad = await Ad.findByPk(req.params.id);
  if (!ad) return res.status(404).json({ error: 'not found' });
  const { title, imageUrl, link, isActive } = req.body;
  if (title !== undefined) ad.title = title;
  if (imageUrl !== undefined) ad.imageUrl = imageUrl;
  if (link !== undefined) ad.link = link;
  if (isActive !== undefined) ad.isActive = isActive;
  await ad.save();
  res.json({ ad });
});

// Download product (only if approved)
app.get('/api/products/:id/download', async (req, res) => {
  const p = await Product.findByPk(req.params.id);
  if (!p || !p.isApproved || p.isRejected) return res.status(404).json({ error: 'not available' });
  const filePath = path.join(__dirname, UPLOAD_DIR, p.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file missing' });
  res.download(filePath, p.title + path.extname(p.filename));
});

// Share info for product (returns direct url and sms URI for mobile sharing)
app.get('/api/products/:id/share', async (req, res) => {
  const p = await Product.findByPk(req.params.id);
  if (!p || !p.isApproved || p.isRejected) return res.status(404).json({ error: 'not available' });
  const host = req.get('origin') || (req.protocol + '://' + req.get('host'));
  const url = `${host}/api/products/${p.id}/download`;
  const smsBody = `Download ${p.title}: ${url}`;
  const smsUri = `sms:?body=${encodeURIComponent(smsBody)}`;
  res.json({ url, smsUri });
});

// QR code linking to the download URL (returns data URL)
app.get('/api/products/:id/qrcode', async (req, res) => {
  const p = await Product.findByPk(req.params.id);
  if (!p || !p.isApproved || p.isRejected) return res.status(404).json({ error: 'not available' });
  const host = req.get('origin') || (req.protocol + '://' + req.get('host'));
  const url = `${host}/api/products/${p.id}/download`;
  try {
    const dataUrl = await QRCode.toDataURL(url);
    res.json({ qrcode: dataUrl, url });
  } catch (e) {
    res.status(500).json({ error: 'qrcode error' });
  }
});

// Simple admin creation helper if ADMIN_PASSWORD matches env var
app.post('/api/setup/admin', async (req, res) => {
  const { username, password, adminSecret } = req.body;
  if (adminSecret !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'bad secret' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ username, passwordHash: hash, isAdmin: true });
    res.json({ ok: true, id: user.id });
  } catch (e) {
    res.status(400).json({ error: 'could not create' });
  }
});

// User endpoints
app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: ['id','username','isAdmin','createdAt'] });
  res.json({ user });
});

app.patch('/api/me', authMiddleware, async (req, res) => {
  const user = await User.findByPk(req.user.id);
  const { username, password } = req.body;
  if (username) user.username = username;
  if (password) user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  res.json({ ok: true });
});

// Initialize DB & start
async function init() {
  await sequelize.sync();
  app.listen(PORT, () => console.log('Server listening on', PORT));
}
init();
