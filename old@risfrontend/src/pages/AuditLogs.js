import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ role: '', action: '' });
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/audit/logs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError('❌ Failed to load audit logs');
      }
    };
    fetchLogs();
  }, [token]); // ✅ ESLint-compliant

  const filteredLogs = logs.filter(log =>
    (!filter.role || log.role === filter.role) &&
    (!filter.action || log.action.toLowerCase().includes(filter.action.toLowerCase()))
  );

  return (
    <Layout>
      <div className="container mt-4">
        <h4 className="mb-4">📝 Audit Logs</h4>

        <div className="row mb-3">
          <div className="col-md-3">
            <select className="form-select" value={filter.role}
              onChange={e => setFilter({ ...filter, role: e.target.value })}>
              <option value="">Filter by Role</option>
              {['admin', 'radiologist', 'technologist', 'doctor', 'staff'].map(role => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <input className="form-control" placeholder="Filter by Action"
              value={filter.action}
              onChange={e => setFilter({ ...filter, action: e.target.value })} />
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <table className="table table-bordered table-striped">
            <thead className="table-light">
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={idx}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.username}</td>
                  <td>{log.role}</td>
                  <td>{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

export default AuditLogs;
