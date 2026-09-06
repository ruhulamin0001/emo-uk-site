const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/drivers/me
router.get('/me', authenticate, authorize('driver'), async (req, res) => {
  const result = await pool.query('SELECT * FROM drivers WHERE user_id = $1', [req.user.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Driver profile not found' });
  res.json(result.rows[0]);
});

// PATCH /api/drivers/me  { vehicle_type?, license_plate?, is_online? }
router.patch('/me', authenticate, authorize('driver'), async (req, res) => {
  const allowed = ['vehicle_type', 'license_plate', 'is_online'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (key in (req.body || {})) {
      params.push(req.body[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.user.id);
  const result = await pool.query(
    `UPDATE drivers SET ${sets.join(', ')}, updated_at = now()
     WHERE user_id = $${params.length} RETURNING *`,
    params
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Driver profile not found' });
  res.json(result.rows[0]);
});

// POST /api/drivers/me/location  { lat, lng }
router.post('/me/location', authenticate, authorize('driver'), async (req, res) => {
  const { lat, lng } = req.body || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng (numbers) are required' });
  }
  await pool.query(
    `UPDATE drivers SET current_lat = $1, current_lng = $2, updated_at = now()
     WHERE user_id = $3`,
    [lat, lng, req.user.id]
  );
  res.json({ ok: true });
});

// GET /api/drivers/me/earnings  (simple summary: £2.50 flat per delivered order)
router.get('/me/earnings', authenticate, authorize('driver'), async (req, res) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS delivered_count
     FROM orders o JOIN drivers d ON d.id = o.driver_id
     WHERE d.user_id = $1 AND o.status = 'delivered'`,
    [req.user.id]
  );
  const deliveredCount = result.rows[0].delivered_count;
  res.json({
    delivered_count: deliveredCount,
    earnings_pence: deliveredCount * 250,
  });
});

module.exports = router;
