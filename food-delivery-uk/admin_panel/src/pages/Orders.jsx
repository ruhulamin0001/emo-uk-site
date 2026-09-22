import { useEffect, useState } from 'react';
import { api, gbp } from '../api.js';

const STATUSES = [
  '',
  'pending',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'picked_up',
  'delivered',
  'rejected',
  'cancelled',
];

export default function Orders() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/api/admin/orders${status ? `?status=${status}` : ''}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [status]);

  return (
    <div>
      <h2>Orders</h2>
      <p>
        Filter:{' '}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || 'all'}
            </option>
          ))}
        </select>
      </p>
      {error && <div className="error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Restaurant</th>
              <th>Total</th>
              <th>Status</th>
              <th>Postcode</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.customer_name}</td>
                <td>{o.restaurant_name}</td>
                <td>{gbp(o.total_pence)}</td>
                <td>{o.status}</td>
                <td>{o.delivery_postcode}</td>
                <td>{new Date(o.created_at).toLocaleString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
