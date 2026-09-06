const jwt = require('jsonwebtoken');

let io = null;

// Rooms:
//   order:{id}       — customer/driver tracking one order
//   restaurant:{id}  — restaurant dashboard (new + updated orders)
//   drivers          — all online drivers (new available orders)
function initSockets(server, corsOrigins) {
  const { Server } = require('socket.io');
  io = new Server(server, { cors: { origin: corsOrigins } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user.role === 'driver') socket.join('drivers');

    socket.on('watch_order', (orderId) => {
      if (Number.isInteger(orderId)) socket.join(`order:${orderId}`);
    });
    socket.on('watch_restaurant', (restaurantId) => {
      // Restaurant dashboards join their own room; ownership is enforced by the
      // REST API — the socket stream only carries order status headlines.
      if (socket.user.role === 'restaurant' && Number.isInteger(restaurantId)) {
        socket.join(`restaurant:${restaurantId}`);
      }
    });
  });

  return io;
}

function emitOrderUpdate(order) {
  if (!io) return;
  const payload = {
    id: order.id,
    status: order.status,
    restaurant_id: order.restaurant_id,
    driver_id: order.driver_id,
    updated_at: order.updated_at,
  };
  io.to(`order:${order.id}`).emit('order_update', payload);
  io.to(`restaurant:${order.restaurant_id}`).emit('order_update', payload);
  if (!order.driver_id && ['accepted', 'preparing', 'ready_for_pickup'].includes(order.status)) {
    io.to('drivers').emit('order_available', payload);
  }
}

module.exports = { initSockets, emitOrderUpdate };
