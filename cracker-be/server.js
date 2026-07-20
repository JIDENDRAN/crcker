import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { initDatabase, getDb } from './db.js';
import {
  connectToWhatsApp,
  sendWhatsAppNotification,
  getWhatsAppStatus,
  disconnectWhatsApp
} from './whatsapp.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Image Upload API
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.status(200).json({ filePath: `/uploads/${req.file.filename}` });
});

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));

// Boot Database & WhatsApp
initDatabase()
  .then((db) => {
    console.log('SQLite database initialized.');
    connectToWhatsApp(db);
  })
  .catch((err) => console.error('Database init failed:', err));

// ─────────────────────────────────────────────
// HELPER: Build WhatsApp alert for new order
// ─────────────────────────────────────────────
async function dispatchOrderWhatsAppAlert(order) {
  try {
    const db = getDb();
    const admin = await db.get('SELECT * FROM admin_settings LIMIT 1');
    const targetPhone = admin?.whatsapp;
    if (!targetPhone) {
      console.log('⚠️  No admin WhatsApp number configured. Skipping notification.');
      return;
    }

    let cartItems = [];
    try { cartItems = JSON.parse(order.cart_items); } catch (e) { cartItems = []; }

    const itemLines = cartItems.map(item =>
      `   • ${item.name} × ${item.qty} = ₹${item.total}`
    ).join('\n');

    const message =
      `🧨 *New Order — Sivakasi Sparkle Co.* 🧨\n\n` +
      `👤 *Customer:* ${order.customer_name}\n` +
      `📞 *Phone:* ${order.customer_phone}\n` +
      `💬 *WhatsApp:* ${order.customer_whatsapp || 'Same as phone'}\n` +
      `📧 *Email:* ${order.customer_email || 'Not provided'}\n` +
      `📍 *Address:* ${order.delivery_address}, ${order.city} - ${order.pincode}\n\n` +
      `🛒 *Order Items:*\n${itemLines}\n\n` +
      `💰 *Original Total:* ₹${order.original_total}\n` +
      `🎉 *Savings:* -₹${order.total_savings}\n` +
      `✅ *Net Payable:* ₹${order.final_total}\n\n` +
      `📝 *Instructions:* ${order.special_instructions || 'None'}\n` +
      `🕐 *Placed at:* ${new Date().toLocaleString('en-IN')}`;

    await sendWhatsAppNotification(targetPhone, message);
  } catch (err) {
    console.error('Failed to dispatch order WhatsApp alert:', err);
  }
}

// ─────────────────────────────────────────────
// ORDERS API
// ─────────────────────────────────────────────
let cachedOrders = null;

app.post('/api/orders', async (req, res) => {
  try {
    const db = getDb();
    const {
      customer_name, customer_phone, customer_whatsapp, customer_email,
      delivery_address, city, pincode, special_instructions,
      cart_items, original_total, final_total, total_savings
    } = req.body;

    const result = await db.run(
      `INSERT INTO orders 
        (customer_name, customer_phone, customer_whatsapp, customer_email,
         delivery_address, city, pincode, special_instructions,
         cart_items, original_total, final_total, total_savings, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        customer_name, customer_phone, customer_whatsapp || '', customer_email || '',
        delivery_address, city || '', pincode || '', special_instructions || '',
        JSON.stringify(cart_items), original_total, final_total, total_savings
      ]
    );

    const newOrder = await db.get('SELECT * FROM orders WHERE id = ?', [result.lastID]);

    cachedOrders = null; // invalidate cache

    // Fire WhatsApp notification in background
    dispatchOrderWhatsAppAlert(newOrder);

    res.status(201).json({ message: 'Order placed successfully', order: newOrder });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    if (cachedOrders) {
      return res.status(200).json(cachedOrders);
    }
    const db = getDb();
    const orders = await db.all('SELECT * FROM orders ORDER BY id DESC');
    cachedOrders = orders;
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    const updated = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    cachedOrders = null; // invalidate cache
    res.status(200).json({ message: 'Order updated', order: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM orders WHERE id = ?', [req.params.id]);
    cachedOrders = null; // invalidate cache
    res.status(200).json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ─────────────────────────────────────────────
// PRODUCTS API
// ─────────────────────────────────────────────
let cachedProducts = null;

app.get('/api/products', async (req, res) => {
  try {
    if (cachedProducts) {
      return res.status(200).json(cachedProducts);
    }
    const db = getDb();
    const products = await db.all('SELECT * FROM products ORDER BY id ASC');
    cachedProducts = products;
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const db = getDb();
    const { name, tamil_name, category, original_price, discounted_price, image_url } = req.body;
    const result = await db.run(
      'INSERT INTO products (name, tamil_name, category, original_price, discounted_price, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, tamil_name || '', category || 'General', original_price, discounted_price, image_url || '']
    );
    const newProduct = await db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
    cachedProducts = null; // invalidate cache
    res.status(201).json({ message: 'Product added', product: newProduct });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const db = getDb();
    const { name, tamil_name, category, original_price, discounted_price, image_url } = req.body;
    await db.run(
      'UPDATE products SET name = ?, tamil_name = ?, category = ?, original_price = ?, discounted_price = ?, image_url = ? WHERE id = ?',
      [name, tamil_name || '', category || 'General', original_price, discounted_price, image_url || '', req.params.id]
    );
    const updated = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    cachedProducts = null; // invalidate cache
    res.status(200).json({ message: 'Product updated', product: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    cachedProducts = null; // invalidate cache
    res.status(200).json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ─────────────────────────────────────────────
// ADMIN AUTH & SETTINGS API
// ─────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  try {
    const db = getDb();
    const { username, password } = req.body;
    const admin = await db.get(
      'SELECT * FROM admin_settings WHERE name = ? AND password = ?',
      [username, password]
    );
    if (admin) {
      res.status(200).json({ success: true, admin });
    } else {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/admin/settings', async (req, res) => {
  try {
    const db = getDb();
    const admin = await db.get('SELECT id, name, whatsapp FROM admin_settings LIMIT 1');
    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.put('/api/admin/settings', async (req, res) => {
  try {
    const db = getDb();
    const { name, whatsapp, password } = req.body;
    await db.run(
      'UPDATE admin_settings SET name = ?, whatsapp = ?, password = ? WHERE id = (SELECT MIN(id) FROM admin_settings)',
      [name, whatsapp, password]
    );
    const updated = await db.get('SELECT id, name, whatsapp FROM admin_settings LIMIT 1');
    res.status(200).json({ message: 'Settings updated', admin: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ─────────────────────────────────────────────
// WHATSAPP BOT CONTROL API
// ─────────────────────────────────────────────
app.get('/api/admin/whatsapp-status', async (req, res) => {
  try {
    const db = getDb();
    const admin = await db.get('SELECT qr_code FROM admin_settings LIMIT 1');
    const connected = getWhatsAppStatus();
    res.status(200).json({
      isConnected: connected,
      qrCode: connected ? null : (admin?.qr_code || null)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch WhatsApp status' });
  }
});

app.post('/api/admin/whatsapp-reconnect', async (req, res) => {
  try {
    const db = getDb();
    await db.run("DELETE FROM whatsapp_auth_state").catch(() => {});
    await db.run("UPDATE admin_settings SET qr_code = NULL").catch(() => {});
    connectToWhatsApp(db);
    res.status(200).json({ message: 'Reconnection triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reconnect' });
  }
});

app.post('/api/admin/whatsapp-disconnect', async (req, res) => {
  try {
    await disconnectWhatsApp();
    res.status(200).json({ message: 'WhatsApp disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

app.post('/api/admin/whatsapp-test', async (req, res) => {
  try {
    const db = getDb();
    const admin = await db.get('SELECT * FROM admin_settings LIMIT 1');
    const targetPhone = admin?.whatsapp;
    if (!targetPhone) return res.status(400).json({ error: 'No admin WhatsApp number configured in Settings.' });

    const message = `👋 *Test from Sivakasi Sparkle Co.*\n\nYour WhatsApp notification bot is connected and working correctly! 🎇✅`;
    const success = await sendWhatsAppNotification(targetPhone, message);

    if (success) {
      res.status(200).json({ message: 'Test message sent!' });
    } else {
      res.status(500).json({ error: 'Failed to send test message. Check if bot is connected.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error sending test message' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Sivakasi Sparkle Backend running on http://localhost:${PORT}`);
});
