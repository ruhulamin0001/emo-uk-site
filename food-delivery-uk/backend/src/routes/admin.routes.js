const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  const [users, restaurants, drivers, orders, revenue] = await Promise.all([
    pool.query(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_approved)::int AS approved,
              COUNT(*) FILTER (WHERE NOT is_approved)::int AS pending
       FROM restaurants`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_approved)::int AS approved,
              COUNT(*) FILTER (WHERE is_online)::int AS online
       FROM drivers`
    ),
    pool.query(`SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`),
    pool.query(
      `SELECT COALESCE(SUM(total_pence), 0)::bigint AS total_pence,
              COALESCE(SUM(total_pence) FILTER (WHERE created_at > now() - interval '7 days'), 0)::bigint AS last7d_pence
       FROM orders WHERE status = 'delivered'`
    ),
  ]);
  res.json({
    users: users.rows,
    restaurants: restaurants.rows[0],
    drivers: drivers.rows[0],
    orders: orders.rows,
    revenue: revenue.rows[0],
  });
});

// GET /api/admin/users?role=
router.get('/users', async (req, res) => {
  const { role } = req.query;
  const params = [];
  let where = '';
  if (role) {
    params.push(role);
    where = 'WHERE role = $1';
  }
  const result = await pool.query(
    `SELECT id, name, email, phone, role, created_at FROM users ${where}
     ORDER BY created_at DESC LIMIT 200`,
    params
  );
  res.json(result.rows);
});

// GET /api/admin/restaurants?pending=true
router.get('/restaurants', async (req, res) => {
  const pendingOnly = req.query.pending === 'true';
  const result = await pool.query(
    `SELECT r.*, u.name AS owner_name, u.email AS owner_email
     FROM restaurants r JOIN users u ON u.id = r.owner_id
     ${pendingOnly ? 'WHERE r.is_approved = FALSE' : ''}
     ORDER BY r.created_at DESC LIMIT 200`
  );
  res.json(result.rows);
});

// PATCH /api/admin/restaurants/:id/approval  { is_approved }
router.patch('/restaurants/:id(\\d+)/approval', async (req, res) => {
  const { is_approved } = req.body || {};
  if (typeof is_approved !== 'boolean') {
    return res.status(400).json({ error: 'is_approved (boolean) is required' });
  }
  const result = await pool.query(
    'UPDATE restaurants SET is_approved = $1 WHERE id = $2 RETURNING *',
    [is_approved, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found' });
  res.json(result.rows[0]);
});

// GET /api/admin/drivers?pending=true
router.get('/drivers', async (req, res) => {
  const pendingOnly = req.query.pending === 'true';
  const result = await pool.query(
    `SELECT d.*, u.name, u.email, u.phone
     FROM drivers d JOIN users u ON u.id = d.user_id
     ${pendingOnly ? 'WHERE d.is_approved = FALSE' : ''}
     ORDER BY d.id DESC LIMIT 200`
  );
  res.json(result.rows);
});

// PATCH /api/admin/drivers/:id/approval  { is_approved }
router.patch('/drivers/:id(\\d+)/approval', async (req, res) => {
  const { is_approved } = req.body || {};
  if (typeof is_approved !== 'boolean') {
    return res.status(400).json({ error: 'is_approved (boolean) is required' });
  }
  const result = await pool.query(
    'UPDATE drivers SET is_approved = $1 WHERE id = $2 RETURNING *',
    [is_approved, req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
  res.json(result.rows[0]);
});

// GET /api/admin/orders?status=
router.get('/orders', async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE o.status = $1';
  }
  const result = await pool.query(
    `SELECT o.*, r.name AS restaurant_name, u.name AS customer_name
     FROM orders o
     JOIN restaurants r ON r.id = o.restaurant_id
     JOIN users u ON u.id = o.customer_id
     ${where}
     ORDER BY o.created_at DESC LIMIT 200`,
    params
  );
  res.json(result.rows);
});

module.exports = router;
