import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';

function AuditViewer() {
  const [logs, setLogs] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const token = localStorage.getItem('token');

  const fetchLogs = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (userFilter) query.append('user', userFilter);
      if (actionFilter) query.append('action', actionFilter);

      const res = await fetch(`http://localhost:5000/api/audit-logs?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch logs');

      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching logs:', err.message);
      setLogs([]);
    }
  }, [userFilter, actionFilter, token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const exportCSV = () => {
    const csv = logs.map(log =>
      `${log.username},${log.role},"${log.action}",${new Date(log.timestamp).toLocaleString()}`
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit_logs.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Layout>
      <h4>📜 Audit Logs</h4>

      {/* Filters */}
      <div className="row mb-3">
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Filter by username"
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Filter by action"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          />
        </div>
        <div className="col-md-4 d-flex gap-2">
          <button className="btn btn-primary flex-grow-1" onClick={fetchLogs}>
            Apply Filters
          </button>
          <button className="btn btn-outline-secondary flex-grow-1" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Log Table */}
      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Action</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <tr key={index}>
                <td>{log.username}</td>
                <td>{log.role}</td>
                <td>{log.action}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="4">No logs found</td></tr>
          )}
        </tbody>
      </table>
    </Layout>
  );
}

export default AuditViewer;
