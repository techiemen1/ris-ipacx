import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    username: '', password: '', role: '', full_name: '', email: '',
    phone_number: '', specialty: '', department: '',
    can_order: false, can_report: false, can_schedule: false
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePic, setProfilePic] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  const roles = ['admin', 'radiologist', 'technologist', 'doctor', 'staff'];

  // Fetch users on mount
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (Array.isArray(data)) {
        setUsers(data);
      } else if (Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        console.error('❌ Unexpected user format:', data);
        setUsers([]);
      }
    } catch (err) {
      console.error('❌ Failed to fetch users:', err.message);
      setUsers([]);
    }
  };
  fetchUsers();
}, [token]);



  const handleCreate = async e => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('http://localhost:5000/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      alert(`✅ Created: ${data.username}`);
      setForm({
        username: '', password: '', role: '', full_name: '', email: '',
        phone_number: '', specialty: '', department: '',
        can_order: false, can_report: false, can_schedule: false
      });
      setUsers(prev => [...prev, data]);
    } else alert(`❌ ${data.error || 'Creation failed'}`);
  };

  const handleEdit = user => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    const res = await fetch(`http://localhost:5000/api/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editingUser)
    });
    if (res.ok) {
      alert('✅ Updated');
      setShowEditModal(false);
      setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
    } else alert('❌ Update failed');
  };

  const toggleStatus = async (id, active) => {
    await fetch(`http://localhost:5000/api/users/${id}/${active ? 'deactivate' : 'activate'}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    setUsers(users.map(u => u.id === id ? { ...u, is_active: !active } : u));
  };

  const deleteUser = async id => {
    if (window.confirm('Delete this user?')) {
      await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handlePicUpload = async (e, id) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('profilePic', file);
    await fetch(`http://localhost:5000/api/users/${id}/profile-pic`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    setUsers(users.map(u => u.id === id ? { ...u, profile_picture: `/uploads/${file.name}` } : u));
  };

  const openProfile = src => {
    setProfilePic(src);
    setShowProfileModal(true);
  };

  return (
    <Layout>
      <h4>👥 User Management</h4>

      {/* Create User Form */}
      <form className="row g-2 mb-4" onSubmit={handleCreate}>
        {['username','password','full_name','email','phone_number','specialty','department'].map(field => (
          <div className="col-md-3" key={field}>
            <input
              className="form-control"
              placeholder={field.replace('_',' ')}
              type={field === 'password' ? 'password' : 'text'}
              value={form[field]}
              onChange={e => setForm({ ...form, [field]: e.target.value })}
              required={['username','password'].includes(field)}
            />
          </div>
        ))}
        <div className="col-md-3">
          <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} required>
            <option value="">Role</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="col-md-3 d-flex gap-2 align-items-center">
          {['can_order','can_report','can_schedule'].map(perm => (
            <label key={perm}>
              <input type="checkbox" checked={form[perm]} onChange={e => setForm({ ...form, [perm]: e.target.checked })} /> {perm}
            </label>
          ))}
        </div>
        <div className="col-md-3">
          <button className="btn btn-primary w-100" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Create User'}
          </button>
        </div>
      </form>

      {/* User Cards */}
      <div className="row">
        {users.map(u => (
          <div className="col-md-4 mb-4" key={u.id}>
            <div className="card shadow-sm">
              <div className="card-body">
                <h5>{u.full_name || u.username}</h5>
                <p><strong>Role:</strong> {u.role}<br/><strong>Email:</strong> {u.email}<br/><strong>Status:</strong> {u.is_active ? 'Active' : 'Inactive'}</p>
                {u.profile_picture && <img src={`http://localhost:5000${u.profile_picture}`} alt="Profile" className="img-thumbnail mb-2" style={{cursor:'pointer'}} onClick={() => openProfile(`http://localhost:5000${u.profile_picture}`)} />}
                <input type="file" onChange={e => handlePicUpload(e, u.id)} className="form-control mb-2"/>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(u)}>Edit</button>
                  <button className={`btn btn-sm ${u.is_active ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(u.id, u.is_active)}>
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(u.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit User Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton><Modal.Title>Edit User</Modal.Title></Modal.Header>
        <Modal.Body>
          {editingUser && (
            <form className="row g-3">
              {['full_name','email','phone_number','specialty','department'].map(field => (
                <div className="col-md-6" key={field}>
                  <input className="form-control" placeholder={field.replace('_',' ')} value={editingUser[field] || ''} onChange={e => setEditingUser({ ...editingUser, [field]: e.target.value })} />
                </div>
              ))}
              <div className="col-md-6">
                <select className="form-select" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-md-12 d-flex gap-3">
                {['can_order','can_report','can_schedule'].map(perm => (
                  <label key={perm}>
                    <input type="checkbox" checked={editingUser[perm]} onChange={e => setEditingUser({ ...editingUser, [perm]: e.target.checked })} /> {perm}
                  </label>
                ))}
              </div>
            </form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveEdit}>Save Changes</Button>
        </Modal.Footer>
      </Modal>

      {/* Profile Modal */}
      <Modal show={showProfileModal} onHide={() => setShowProfileModal(false)} centered>
        <Modal.Body className="text-center">
          <img src={profilePic} alt="Profile" className="img-fluid rounded" />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProfileModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
}

export default ManageUsers;
