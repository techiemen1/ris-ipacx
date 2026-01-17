import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';

function AdminUserDashboard() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const token = localStorage.getItem('token');

  const fetchUsers = async () => {
    const res = await fetch(`http://localhost:5000/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(data.users || []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    (!roleFilter || u.role === roleFilter) &&
    (!search || u.username.includes(search) || u.full_name?.includes(search))
  );

  return (
    <Layout>
      <h4>👥 Admin: User Management</h4>
      <div className="row mb-3">
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Search by name or username"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <select className="form-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="technician">Technician</option>
          </select>
        </div>
      </div>

      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            <th>Username</th>
            <th>Full Name</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(user => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.full_name}</td>
              <td>{user.role}</td>
              <td>{user.is_active ? '✅ Active' : '❌ Inactive'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}

export default AdminUserDashboard;
