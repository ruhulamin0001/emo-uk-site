import { useEffect, useState } from 'react';
import { api } from '../api.js';

const ROLES = ['', 'customer', 'restaurant', 'driver', 'admin'];

export default function Users() {
  const [rows, setRows] = useState([]);
  const [role, setRole] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/api/admin/users${role ? `?role=${role}` : ''}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [role]);

  return (
    <div>
      <h2>Users</h2>
      <p>
        Role:{' '}
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r || 'all'}
            </option>
          ))}
        </select>
      </p>
      {error && <div className="error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone || '—'}</td>
                <td>{u.role}</td>
                <td>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
