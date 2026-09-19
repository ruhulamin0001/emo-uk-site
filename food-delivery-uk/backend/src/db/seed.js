require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@quickbite.uk';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const hash = await bcrypt.hash(adminPassword, 10);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    ['Admin', adminEmail, hash]
  );
  console.log(`Admin user ready: ${adminEmail}`);

  // Demo restaurant owner + restaurant + menu (safe to re-run)
  const demoHash = await bcrypt.hash('Demo1234!', 10);
  const owner = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Demo Owner', 'owner@demo.quickbite.uk', $1, 'restaurant')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [demoHash]
  );
  const ownerId = owner.rows[0].id;

  const existing = await pool.query('SELECT id FROM restaurants WHERE owner_id = $1', [ownerId]);
  if (existing.rows.length === 0) {
    const rest = await pool.query(
      `INSERT INTO restaurants (owner_id, name, description, cuisine, address_line1, city, postcode, phone, is_approved, is_open)
       VALUES ($1, 'Spice Garden', 'Authentic Bangladeshi & Indian cuisine', 'Indian',
               '12 Brick Lane', 'London', 'E1 6RF', '+44 20 7946 0000', TRUE, TRUE)
       RETURNING id`,
      [ownerId]
    );
    const rid = rest.rows[0].id;
    await pool.query(
      `INSERT INTO menu_items (restaurant_id, name, description, category, price_pence) VALUES
       ($1, 'Chicken Tikka Masala', 'Classic creamy curry', 'Mains', 1095),
       ($1, 'Lamb Biryani', 'Fragrant basmati rice with lamb', 'Mains', 1250),
       ($1, 'Vegetable Samosa (2pc)', 'Crispy pastry, spiced potato', 'Starters', 450),
       ($1, 'Garlic Naan', 'Fresh from the tandoor', 'Sides', 350),
       ($1, 'Mango Lassi', 'Sweet yoghurt drink', 'Drinks', 395)`,
      [rid]
    );
    console.log('Demo restaurant "Spice Garden" created with menu.');
  }

  await pool.end();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
