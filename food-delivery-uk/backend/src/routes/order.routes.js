const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { emitOrderUpdate } = require('../sockets');

const router = express.Router();

const DELIVERY_FEE_PENCE = 299;
const SERVICE_FEE_PENCE = 50;

// Which role may move an order into which status
const TRANSITIONS = {
  restaurant: {
    pending: ['accepted', 'rejected'],
    accepted: ['preparing'],
    preparing: ['ready_for_pickup'],
  },
  driver: {
    ready_for_pickup: ['picked_up'],
    picked_up: ['delivered'],
  },
  customer: {
    pending: ['cancelled'],
  },
};

async function logEvent(orderId, status) {
  await pool.query('INSERT INTO order_events (order_id, status) VALUES ($1, $2)', [
    orderId,
    status,
  ]);
}

// POST /api/orders  (customer places an order)
// { restaurant_id, items: [{menu_item_id, qty}], delivery_address, delivery_postcode, notes?, payment_method? }
router.post('/', authenticate, authorize('customer'), async (req, res) => {
  const { restaurant_id, items, delivery_address, delivery_postcode, notes, payment_method } =
    req.body || {};
  if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'restaurant_id and items are required' });
  }
  if (!delivery_address || !delivery_postcode) {
    return res.status(400).json({ error: 'delivery_address and delivery_postcode are required' });
  }

  const rest = await pool.query(
    'SELECT id, is_open FROM restaurants WHERE id = $1 AND is_approved = TRUE',
    [restaurant_id]
  );
  if (rest.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found' });
  if (!rest.rows[0].is_open) return res.status(409).json({ error: 'Restaurant is currently closed' });

  // Re-price server-side from the menu — never trust client prices.
  const ids = items.map((i) => i.menu_item_id);
  const menu = await pool.query(
    `SELECT id, name, price_pence, is_available FROM menu_items
     WHERE restaurant_id = $1 AND id = ANY($2::int[])`,
    [restaurant_id, ids]
  );
  const byId = new Map(menu.rows.map((m) => [m.id, m]));

  let subtotal = 0;
  const lineItems = [];
  for (const item of items) {
    const m = byId.get(item.menu_item_id);
    const qty = Number(item.qty);
    if (!m || !m.is_available) {
      return res.status(409).json({ error: `Item ${item.menu_item_id} is unavailable` });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
      return res.status(400).json({ error: 'Each item qty must be an integer from 1 to 50' });
    }
    subtotal += m.price_pence * qty;
    lineItems.push({ menu_item_id: m.id, name: m.name, price_pence: m.price_pence, qty });
  }

  const total = subtotal + DELIVERY_FEE_PENCE + SERVICE_FEE_PENCE;
  const result = await pool.query(
    `INSERT INTO orders (customer_id, restaurant_id, items, subtotal_pence, delivery_fee_pence,
                         service_fee_pence, total_pence, delivery_address, delivery_postcode,
                         payment_method, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      req.user.id,
      restaurant_id,
      JSON.stringify(lineItems),
      subtotal,
      DELIVERY_FEE_PENCE,
      SERVICE_FEE_PENCE,
      total,
      delivery_address,
      delivery_postcode,
      payment_method || 'card_on_delivery',
      notes || null,
    ]
  );
  const order = result.rows[0];
  await logEvent(order.id, 'pending');
  emitOrderUpdate(order);
  res.status(201).json(order);
});

// GET /api/orders/mine  (role-aware list)
router.get('/mine', authenticate, async (req, res) => {
  let result;
  if (req.user.role === 'customer') {
    result = await pool.query(
      `SELECT o.*, r.name AS restaurant_name FROM orders o
       JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.customer_id = $1 ORDER BY o.created_at DESC LIMIT 50`,
      [req.user.id]
    );
  } else if (req.user.role === 'restaurant') {
    result = await pool.query(
      `SELECT o.*, u.name AS customer_name FROM orders o
       JOIN users u ON u.id = o.customer_id
       WHERE o.restaurant_id = (SELECT id FROM restaurants WHERE owner_id = $1)
       ORDER BY o.created_at DESC LIMIT 100`,
      [req.user.id]
    );
  } else if (req.user.role === 'driver') {
    result = await pool.query(
      `SELECT o.*, r.name AS restaurant_name, r.address_line1 AS restaurant_address, r.postcode AS restaurant_postcode
       FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.driver_id = (SELECT id FROM drivers WHERE user_id = $1)
       ORDER BY o.created_at DESC LIMIT 50`,
      [req.user.id]
    );
  } else {
    return res.status(403).json({ error: 'Use the admin endpoints' });
  }
  res.json(result.rows);
});

// GET /api/orders/available  (driver: unclaimed orders being prepared or ready)
router.get('/available', authenticate, authorize('driver'), async (req, res) => {
  const driver = await pool.query(
    'SELECT * FROM drivers WHERE user_id = $1',
    [req.user.id]
  );
  if (!driver.rows[0]?.is_approved) {
    return res.status(403).json({ error: 'Driver account awaiting admin approval' });
  }
  const result = await pool.query(
    `SELECT o.id, o.status, o.total_pence, o.delivery_postcode, o.created_at,
            r.name AS restaurant_name, r.address_line1 AS restaurant_address,
            r.city AS restaurant_city, r.postcode AS restaurant_postcode
     FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
     WHERE o.driver_id IS NULL AND o.status IN ('accepted', 'preparing', 'ready_for_pickup')
     ORDER BY o.created_at ASC LIMIT 50`
  );
  res.json(result.rows);
});

// POST /api/orders/:id/claim  (driver takes the delivery)
router.post('/:id(\\d+)/claim', authenticate, authorize('driver'), async (req, res) => {
  const driver = await pool.query('SELECT * FROM drivers WHERE user_id = $1', [req.user.id]);
  if (!driver.rows[0]?.is_approved) {
    return res.status(403).json({ error: 'Driver account awaiting admin approval' });
  }
  const result = await pool.query(
    `UPDATE orders SET driver_id = $1, updated_at = now()
     WHERE id = $2 AND driver_id IS NULL
       AND status IN ('accepted', 'preparing', 'ready_for_pickup')
     RETURNING *`,
    [driver.rows[0].id, req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(409).json({ error: 'Order already claimed or not claimable' });
  }
  emitOrderUpdate(result.rows[0]);
  res.json(result.rows[0]);
});

// GET /api/orders/:id  (participants only)
router.get('/:id(\\d+)', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT o.*, r.name AS restaurant_name, r.owner_id, d.user_id AS driver_user_id,
            du.name AS driver_name
     FROM orders o
     JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN drivers d ON d.id = o.driver_id
     LEFT JOIN users du ON du.id = d.user_id
     WHERE o.id = $1`,
    [req.params.id]
  );
  const order = result.rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const isParticipant =
    req.user.role === 'admin' ||
    order.customer_id === req.user.id ||
    order.owner_id === req.user.id ||
    order.driver_user_id === req.user.id;
  if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
  const events = await pool.query(
    'SELECT status, created_at FROM order_events WHERE order_id = $1 ORDER BY created_at',
    [req.params.id]
  );
  delete order.owner_id;
  res.json({ ...order, events: events.rows });
});

// PATCH /api/orders/:id/status  { status }
router.patch('/:id(\\d+)/status', authenticate, async (req, res) => {
  const { status } = req.body || {};
  const allowedForRole = TRANSITIONS[req.user.role];
  if (!allowedForRole) return res.status(403).json({ error: 'Forbidden' });

  const result = await pool.query(
    `SELECT o.*, r.owner_id, d.user_id AS driver_user_id
     FROM orders o
     JOIN restaurants r ON r.id = o.restaurant_id
     LEFT JOIN drivers d ON d.id = o.driver_id
     WHERE o.id = $1`,
    [req.params.id]
  );
  const order = result.rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const owns =
    (req.user.role === 'restaurant' && order.owner_id === req.user.id) ||
    (req.user.role === 'driver' && order.driver_user_id === req.user.id) ||
    (req.user.role === 'customer' && order.customer_id === req.user.id);
  if (!owns) return res.status(403).json({ error: 'Not your order' });

  const validNext = allowedForRole[order.status] || [];
  if (!validNext.includes(status)) {
    return res.status(409).json({
      error: `Cannot move order from '${order.status}' to '${status}' as ${req.user.role}`,
    });
  }

  const updated = await pool.query(
    'UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  await logEvent(order.id, status);
  emitOrderUpdate(updated.rows[0]);
  res.json(updated.rows[0]);
});

module.exports = router;
