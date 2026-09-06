import { useState } from 'react';
import { api, getToken, setToken } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import Restaurants from './pages/Restaurants.jsx';
import Drivers from './pages/Drivers.jsx';
import Orders from './pages/Orders.jsx';
import Users from './pages/Users.jsx';

const TABS = {
  Dashboard: Dashboard,
  Restaurants: Restaurants,
  Drivers: Drivers,
  Orders: Orders,
  Users: Users,
};

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      if (data.user.role !== 'admin') {
        throw new Error('This panel is for admin accounts only');
      }
      setToken(data.token);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-box" onSubmit={submit}>
      <h2>QuickBite UK — Admin</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <div className="error">{error}</div>}
      <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [tab, setTab] = useState('Dashboard');

  if (!loggedIn) return <Login onLoggedIn={() => setLoggedIn(true)} />;

  const Page = TABS[tab];
  return (
    <div>
      <div className="topbar">
        <h1>QuickBite UK — Admin Panel</h1>
        <button
          className="action"
          onClick={() => {
            setToken(null);
            setLoggedIn(false);
          }}
        >
          Log out
        </button>
      </div>
      <div className="tabs">
        {Object.keys(TABS).map((name) => (
          <button
            key={name}
            className={tab === name ? 'active' : ''}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="page">
        <Page />
      </div>
    </div>
  );
}
