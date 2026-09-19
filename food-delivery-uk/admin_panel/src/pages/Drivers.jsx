import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Drivers() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const load = () =>
    api.get('/api/admin/drivers').then(setRows).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function setApproval(id, approved) {
    try {
      await api.patch(`/api/admin/drivers/${id}/approval`, { is_approved: approved });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>Drivers</h2>
      {error && <div className="error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.email}</td>
                <td>{d.vehicle_type}</td>
                <td>
                  {d.is_approved ? (
                    <span className="badge ok">approved</span>
                  ) : (
                    <span className="badge warn">pending</span>
                  )}{' '}
                  {d.is_online ? (
                    <span className="badge ok">online</span>
                  ) : (
                    <span className="badge bad">offline</span>
                  )}
                </td>
                <td>
                  {d.is_approved ? (
                    <button className="action" onClick={() => setApproval(d.id, false)}>
                      Suspend
                    </button>
                  ) : (
                    <button
                      className="action primary"
                      onClick={() => setApproval(d.id, true)}
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
