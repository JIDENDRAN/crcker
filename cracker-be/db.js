import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

let db = null;

export async function initDatabase() {
  db = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'admin',
      password TEXT NOT NULL DEFAULT 'admin123',
      whatsapp TEXT NOT NULL DEFAULT '',
      qr_code TEXT
    );

    CREATE TABLE IF NOT EXISTS whatsapp_auth_state (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tamil_name TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      original_price REAL NOT NULL,
      discounted_price REAL NOT NULL,
      image_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_whatsapp TEXT DEFAULT '',
      customer_email TEXT DEFAULT '',
      delivery_address TEXT NOT NULL,
      city TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      special_instructions TEXT DEFAULT '',
      cart_items TEXT NOT NULL,
      original_total REAL NOT NULL,
      final_total REAL NOT NULL,
      total_savings REAL NOT NULL,
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin if none exists
  const admin = await db.get('SELECT id FROM admin_settings LIMIT 1');
  if (!admin) {
    await db.run(
      "INSERT INTO admin_settings (name, password, whatsapp) VALUES (?, ?, ?)",
      ['admin', 'admin123', '']
    );
    console.log('Seeded default admin: admin / admin123');
  }

  // Seed sample products if none exist
  const productCount = await db.get('SELECT COUNT(*) as count FROM products');
  if (productCount.count === 0) {
    const sampleProducts = [
      ['7cm Electric Sparkler', 'மின் தீப்பொறி 7செமீ', 'Sparklers', 150, 8],
      ['7cm Color Sparkler', 'வண்ண தீப்பொறி 7செமீ', 'Sparklers', 200, 10],
      ['30cm Electric Sparkler', 'மின் தீப்பொறி 30செமீ', 'Sparklers', 350, 18],
      ['Chakkar Big', 'பெரிய சக்கரம்', 'Ground Chakkars', 450, 35],
      ['Chakkar Special', 'சிறப்பு சக்கரம்', 'Ground Chakkars', 350, 28],
      ['Flower Pot Small', 'சிறிய பூப்பாத்திரம்', 'Flower Pots', 200, 12],
      ['Flower Pot Big', 'பெரிய பூப்பாத்திரம்', 'Flower Pots', 450, 30],
    ];
    for (const p of sampleProducts) {
      await db.run(
        'INSERT INTO products (name, tamil_name, category, original_price, discounted_price) VALUES (?, ?, ?, ?, ?)',
        p
      );
    }
    console.log('Seeded sample products.');
  }

  return db;
}

export function getDb() {
  return db;
}
