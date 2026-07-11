import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
});

// Helper: convert SQLite-style ? placeholders to PostgreSQL $1, $2, ...
function convertQuery(sql, params = []) {
  let index = 1;
  const formattedSql = sql.replace(/\?/g, () => `$${index++}`);
  return { formattedSql, pgParams: params };
}

export const db = {
  query: (text, params) => pool.query(text, params),

  get: async (text, params) => {
    const { formattedSql, pgParams } = convertQuery(text, params);
    const res = await pool.query(formattedSql, pgParams);
    return res.rows[0] || null;
  },

  all: async (text, params) => {
    const { formattedSql, pgParams } = convertQuery(text, params);
    const res = await pool.query(formattedSql, pgParams);
    return res.rows;
  },

  run: async (text, params) => {
    const { formattedSql, pgParams } = convertQuery(text, params);
    let sqlToRun = formattedSql;
    const isInsert = sqlToRun.trim().toUpperCase().startsWith('INSERT');
    if (isInsert && !sqlToRun.toUpperCase().includes('RETURNING')) {
      sqlToRun += ' RETURNING id';
    }
    const res = await pool.query(sqlToRun, pgParams);
    return {
      lastID: isInsert && res.rows[0] ? res.rows[0].id : null,
      changes: res.rowCount
    };
  },

  exec: async (text) => pool.query(text)
};

export async function initDatabase() {
  // Verify connection
  await pool.query('SELECT NOW()');
  console.log('✅ Connected to Neon PostgreSQL.');

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tamil_name TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      original_price NUMERIC NOT NULL,
      discounted_price NUMERIC NOT NULL,
      image_url TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_whatsapp TEXT DEFAULT '',
      customer_email TEXT DEFAULT '',
      delivery_address TEXT NOT NULL,
      city TEXT DEFAULT '',
      pincode TEXT DEFAULT '',
      special_instructions TEXT DEFAULT '',
      cart_items TEXT NOT NULL,
      original_total NUMERIC NOT NULL,
      final_total NUMERIC NOT NULL,
      total_savings NUMERIC NOT NULL,
      status TEXT DEFAULT 'Pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Seed default admin if none exists
  const adminRes = await pool.query('SELECT id FROM admin_settings LIMIT 1');
  if (adminRes.rows.length === 0) {
    await pool.query(
      "INSERT INTO admin_settings (name, password, whatsapp) VALUES ($1, $2, $3)",
      ['admin', 'admin123', '']
    );
    console.log('Seeded default admin: admin / admin123');
  }

  // Seed sample products if none exist
  const countRes = await pool.query('SELECT COUNT(*) AS count FROM products');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    const samples = [
      ['7cm Electric Sparkler', 'மின் தீப்பொறி 7செமீ', 'Sparklers', 150, 8],
      ['7cm Color Sparkler', 'வண்ண தீப்பொறி 7செமீ', 'Sparklers', 200, 10],
      ['30cm Electric Sparkler', 'மின் தீப்பொறி 30செமீ', 'Sparklers', 350, 18],
      ['Chakkar Big', 'பெரிய சக்கரம்', 'Ground Chakkars', 450, 35],
      ['Chakkar Special', 'சிறப்பு சக்கரம்', 'Ground Chakkars', 350, 28],
      ['Flower Pot Small', 'சிறிய பூப்பாத்திரம்', 'Flower Pots', 200, 12],
      ['Flower Pot Big', 'பெரிய பூப்பாத்திரம்', 'Flower Pots', 450, 30],
    ];
    for (const p of samples) {
      await pool.query(
        'INSERT INTO products (name, tamil_name, category, original_price, discounted_price) VALUES ($1, $2, $3, $4, $5)',
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
