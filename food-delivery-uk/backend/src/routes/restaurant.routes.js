const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// ---------- Public (customer-facing) ----------

// GET /api/restaurants?city=&cuisine=&q=
router.get('/', async (req, res) => {
  const { city, cuisine, q } = req.query;
  const clauses = ['is_approved = TRUE'];
  const params = [];
  if (city) {
    params.push(city);
    clauses.push(`LOWER(city) = LOWER($${params.length})`);
  }
  if (cuisine) {
    params.push(cuisine);
    clauses.push(`LOWER(cuisine) = LOWER($${params.length})`);
  }
  if (q) {
    params.push(`%${q}%`);
    clauses.push(`name ILIKE $${params.length}`);
  }
  const result = await pool.query(
    `SELECT id, name, description, cuisine, city, postcode, image_url, is_open, rating
     FROM restaurants WHERE ${clauses.join(' AND ')} ORDER BY rating DESC, name`,
    params
  );
  res.json(result.rows);
});

// GET /api/restaurants/:id  (details + menu)
router.get('/:id(\\d+)', async (req, res) => {
  const rest = await pool.query(
    `SELECT id, name, description, cuisine, address_line1, city, postcode, phone,
            image_url, is_open, rating
     FROM restaurants WHERE id = $1 AND is_approved = TRUE`,
    [req.params.id]
  );
  if (rest.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found' });
  const menu = await pool.query(
    `SELECT id, name, description, category, price_pence, image_url, is_available
     FROM menu_items WHERE restaurant_id = $1 ORDER BY category, name`,
    [req.params.id]
  );
  res.json({ ...rest.rows[0], menu: menu.rows });
});

// ---------- Restaurant owner ----------

async function getOwnRestaurant(userId) {
  const r = await pool.query('SELECT * FROM restaurants WHERE owner_id = $1', [userId]);
  return r.rows[0] || null;
}

// GET /api/restaurants/mine
router.get('/mine', authenticate, authorize('restaurant'), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: 'No restaurant yet — create one first' });
  const menu = await pool.query(
    'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY category, name',
    [restaurant.id]
  );
  res.json({ ...restaurant, menu: menu.rows });
});

// POST /api/restaurants/mine  (create profile; awaits admin approval)
router.post('/mine', authenticate, authorize('restaurant'), async (req, res) => {
  const existing = await getOwnRestaurant(req.user.id);
  if (existing) return res.status(409).json({ error: 'You already have a restaurant' });
  const { name, description, cuisine, address_line1, city, postcode, phone, image_url } =
    req.body || {};
  if (!name || !address_line1 || !city || !postcode) {
    return res.status(400).json({ error: 'name, address_line1, city and postcode are required' });
  }
  const result = await pool.query(
    `INSERT INTO restaurants (owner_id, name, description, cuisine, address_line1, city, postcode, phone, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [req.user.id, name, description, cuisine, address_line1, city, postcode, phone, image_url]
  );
  res.status(201).json(result.rows[0]);
});

// PATCH /api/restaurants/mine  (update profile / open-closed toggle)
router.patch('/mine', authenticate, authorize('restaurant'), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: 'No restaurant yet' });
  const allowed = ['name', 'description', 'cuisine', 'address_line1', 'city', 'postcode', 'phone', 'image_url', 'is_open'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (key in (req.body || {})) {
      params.push(req.body[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(restaurant.id);
  const result = await pool.query(
    `UPDATE restaurants SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  res.json(result.rows[0]);
});

// POST /api/restaurants/mine/menu
router.post('/mine/menu', authenticate, authorize('restaurant'), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: 'No restaurant yet' });
  const { name, description, category, price_pence, image_url } = req.body || {};
  if (!name || !Number.isInteger(price_pence) || price_pence < 0) {
    return res.status(400).json({ error: 'name and a non-negative integer price_pence are required' });
  }
  const result = await pool.query(
    `INSERT INTO menu_items (restaurant_id, name, description, category, price_pence, image_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [restaurant.id, name, description, category || 'Mains', price_pence, image_url]
  );
  res.status(201).json(result.rows[0]);
});

// PATCH /api/restaurants/mine/menu/:itemId
router.patch('/mine/menu/:itemId(\\d+)', authenticate, authorize('restaurant'), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: 'No restaurant yet' });
  const allowed = ['name', 'description', 'category', 'price_pence', 'image_url', 'is_available'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (key in (req.body || {})) {
      params.push(req.body[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.itemId, restaurant.id);
  const result = await pool.query(
    `UPDATE menu_items SET ${sets.join(', ')}
     WHERE id = $${params.length - 1} AND restaurant_id = $${params.length} RETURNING *`,
    params
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Menu item not found' });
  res.json(result.rows[0]);
});

// DELETE /api/restaurants/mine/menu/:itemId
router.delete('/mine/menu/:itemId(\\d+)', authenticate, authorize('restaurant'), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: 'No restaurant yet' });
  const result = await pool.query(
    'DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING id',
    [req.params.itemId, restaurant.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Menu item not found' });
  res.json({ deleted: true });
});

module.exports = router;
