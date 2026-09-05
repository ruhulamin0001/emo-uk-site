require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { initSockets } = require('./sockets');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}

const app = express();
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'quickbite-uk' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/restaurants', require('./routes/restaurant.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/drivers', require('./routes/driver.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
initSockets(server, corsOrigins.length ? corsOrigins : '*');

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`QuickBite UK backend listening on http://localhost:${port}`);
});
