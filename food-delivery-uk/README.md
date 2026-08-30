# QuickBite UK — Food Delivery Platform

A UK food delivery platform with four parts: a customer app, a restaurant app, a driver
app, and a web admin panel, all backed by one Node.js + PostgreSQL API.

All money is stored and transmitted in **pence** (integers), formatted as £ in the UI.

## What's in the repo

| Folder | What it is | Stack |
| --- | --- | --- |
| `backend/` | REST API + realtime order events | Node.js, Express, PostgreSQL, Socket.IO |
| `apps/customer_app/` | Browse restaurants, order, track delivery | Flutter |
| `apps/restaurant_app/` | Accept orders, manage menu, open/close | Flutter |
| `apps/driver_app/` | Go online, claim jobs, deliver, see earnings | Flutter |
| `admin_panel/` | Approvals, orders, users, revenue stats | React + Vite |

## Order lifecycle

```
pending → accepted → preparing → ready_for_pickup → picked_up → delivered
   ↓          (restaurant)              (driver claims)   (driver)
rejected / cancelled
```

Each role may only make the transitions it owns; the API rejects anything else:

- **Restaurant**: `pending → accepted | rejected`, `accepted → preparing`, `preparing → ready_for_pickup`
- **Driver**: `ready_for_pickup → picked_up`, `picked_up → delivered`
- **Customer**: `pending → cancelled`

## Running it locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit DATABASE_URL and JWT_SECRET
npm run db:migrate          # creates the tables
npm run db:seed             # creates the admin user + a demo restaurant
npm start                   # http://localhost:4000
```

The seed prints the admin email it created. The default password comes from
`SEED_ADMIN_PASSWORD` in `.env` — change it before deploying anywhere public.

The seed also creates a demo restaurant partner (`owner@demo.quickbite.uk` / `Demo1234!`)
with a small menu, so the customer app has something to show immediately.

### 2. Admin panel

```bash
cd admin_panel
npm install
npm run dev                 # http://localhost:5173, proxies /api to :4000
```

Log in with the seeded admin account. New restaurants and drivers sign up in their own
apps and stay invisible/inactive until an admin approves them here.

### 3. Flutter apps

```bash
cd apps/customer_app        # or driver_app / restaurant_app
flutter create .            # generates the android/ and ios/ platform folders once
flutter pub get
flutter run
```

Each app reads the API URL from `lib/config.dart`. The default `http://10.0.2.2:4000`
is the host machine as seen from an Android emulator; use `http://localhost:4000` on an
iOS simulator, or your machine's LAN IP / deployed URL on a real device.

## API overview

Auth is a Bearer JWT from `/api/auth/login` or `/api/auth/register`.

**Auth**
- `POST /api/auth/register` — `{ name, email, password, role }` (customer | restaurant | driver)
- `POST /api/auth/login` — `{ email, password }`

**Restaurants**
- `GET /api/restaurants` — public list, filters: `?city= &cuisine= &q=`
- `GET /api/restaurants/:id` — details + menu
- `GET|POST|PATCH /api/restaurants/mine` — owner's own restaurant
- `POST|PATCH|DELETE /api/restaurants/mine/menu[/:itemId]` — menu management

**Orders**
- `POST /api/orders` — customer places an order (server re-prices from the menu)
- `GET /api/orders/mine` — role-aware list
- `GET /api/orders/:id` — participants only (customer, that restaurant, that driver, admin)
- `PATCH /api/orders/:id/status` — role-gated transition
- `GET /api/orders/available` — approved, online drivers only
- `POST /api/orders/:id/claim` — first driver to claim wins

**Drivers**
- `GET|PATCH /api/drivers/me` — profile, vehicle, online toggle
- `POST /api/drivers/me/location` — `{ lat, lng }`
- `GET /api/drivers/me/earnings`

**Admin** (all under `/api/admin`, admin role required)
- `GET /stats` · `GET /users` · `GET /restaurants` · `GET /drivers` · `GET /orders`
- `PATCH /restaurants/:id/approval` · `PATCH /drivers/:id/approval`

## Realtime

Socket.IO authenticates with the same JWT (`auth: { token }`) and pushes `order_update`
to `order:{id}` and `restaurant:{id}` rooms, plus `order_available` to online drivers.

## Security notes

- Prices are always recalculated on the server from the stored menu — client prices are ignored.
- Restaurants and drivers cannot trade until an admin approves them.
- Order reads are restricted to the order's participants.
- Admin accounts can only be created by the seed script, never through registration.

## Not built yet

These are deliberate gaps, not oversights — they need real accounts and decisions:

- **Payments.** Orders currently record `payment_method` only. A Stripe (or similar)
  payment intent belongs in `POST /api/orders` before the order is persisted.
- **Maps and live driver tracking on a map.** Driver coordinates are stored; drawing them
  needs a Google Maps / Mapbox key in the apps.
- **Push notifications** (Firebase Cloud Messaging) for new orders and status changes.
- **Image uploads** for restaurant and menu photos — the schema holds URLs already.
- **UK compliance**: VAT handling on fees, FSA hygiene rating display, GDPR data export
  and deletion, driver right-to-work checks.
