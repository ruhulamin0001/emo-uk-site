import { useEffect, useState } from 'react';
import { api, gbp } from '../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/admin/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!stats) return <div>Loading…</div>;

  const usersByRole = Object.fromEntries(stats.users.map((u) => [u.role, u.count]));
  const ordersByStatus = Object.fromEntries(stats.orders.map((o) => [o.status, o.count]));

  return (
    <div>
      <div className="cards">
        <div className="card">
          <div className="big">{usersByRole.customer || 0}</div>
          <div className="label">Customers</div>
        </div>
        <div className="card">
          <div className="big">
            {stats.restaurants.approved}/{stats.restaurants.total}
          </div>
          <div className="label">Restaurants approved</div>
        </div>
        <div className="card">
          <div className="big">
            {stats.drivers.online}/{stats.drivers.approved}
          </div>
          <div className="label">Drivers online / approved</div>
        </div>
        <div className="card">
          <div className="big">{ordersByStatus.delivered || 0}</div>
          <div className="label">Orders delivered</div>
        </div>
        <div className="card">
          <div className="big">{gbp(Number(stats.revenue.last7d_pence))}</div>
          <div className="label">Revenue (last 7 days)</div>
        </div>
        <div className="card">
          <div className="big">{gbp(Number(stats.revenue.total_pence))}</div>
          <div className="label">Revenue (all time)</div>
        </div>
      </div>
      <h3>Orders by status</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {stats.orders.map((o) => (
              <tr key={o.status}>
                <td>{o.status}</td>
                <td>{o.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
