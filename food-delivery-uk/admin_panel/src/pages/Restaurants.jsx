import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Restaurants() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const load = () =>
    api.get('/api/admin/restaurants').then(setRows).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function setApproval(id, approved) {
    try {
      await api.patch(`/api/admin/restaurants/${id}/approval`, { is_approved: approved });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Restaurants</h2>
      {error && <div className="error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>City</th>
              <th>Postcode</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>
                  {r.owner_name} ({r.owner_email})
                </td>
                <td>{r.city}</td>
                <td>{r.postcode}</td>
                <td>
                  {r.is_approved ? (
                    <span className="badge ok">approved</span>
                  ) : (
                    <span className="badge warn">pending</span>
                  )}{' '}
                  {r.is_open ? (
                    <span className="badge ok">open</span>
                  ) : (
                    <span className="badge bad">closed</span>
                  )}
                </td>
                <td>
                  {r.is_approved ? (
                    <button className="action" onClick={() => setApproval(r.id, false)}>
                      Suspend
                    </button>
                  ) : (
                    <button
                      className="action primary"
                      onClick={() => setApproval(r.id, true)}
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
