-- QuickBite UK database schema
-- Money is stored in pence (integer) to avoid floating point issues.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('customer', 'restaurant', 'driver', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurants (
  id            SERIAL PRIMARY KEY,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  cuisine       TEXT,
  address_line1 TEXT NOT NULL,
  city          TEXT NOT NULL,
  postcode      TEXT NOT NULL,
  phone         TEXT,
  image_url     TEXT,
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  is_open       BOOLEAN NOT NULL DEFAULT FALSE,
  rating        NUMERIC(2,1) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'Mains',
  price_pence   INTEGER NOT NULL CHECK (price_pence >= 0),
  image_url     TEXT,
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drivers (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type  TEXT NOT NULL DEFAULT 'bicycle' CHECK (vehicle_type IN ('bicycle', 'motorbike', 'car')),
  license_plate TEXT,
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  is_online     BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat   DOUBLE PRECISION,
  current_lng   DOUBLE PRECISION,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id                 SERIAL PRIMARY KEY,
  customer_id        INTEGER NOT NULL REFERENCES users(id),
  restaurant_id      INTEGER NOT NULL REFERENCES restaurants(id),
  driver_id          INTEGER REFERENCES drivers(id),
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                       'pending', 'accepted', 'preparing', 'ready_for_pickup',
                       'picked_up', 'delivered', 'rejected', 'cancelled')),
  items              JSONB NOT NULL,                -- [{menu_item_id, name, price_pence, qty}]
  subtotal_pence     INTEGER NOT NULL,
  delivery_fee_pence INTEGER NOT NULL DEFAULT 299,
  service_fee_pence  INTEGER NOT NULL DEFAULT 50,
  total_pence        INTEGER NOT NULL,
  delivery_address   TEXT NOT NULL,
  delivery_postcode  TEXT NOT NULL,
  payment_method     TEXT NOT NULL DEFAULT 'card_on_delivery',
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_events (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer   ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver     ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_menu_restaurant   ON menu_items(restaurant_id);
