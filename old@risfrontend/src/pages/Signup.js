import React, { useState } from 'react';

function Signup() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: '',
    full_name: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);

  const roles = ['admin', 'radiologist', 'technologist', 'doctor', 'staff'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        alert(`User ${data.username} created successfully`);
        setForm({ username: '', password: '', role: '', full_name: '', email: '' });
      } else {
        alert(data.error || 'User creation failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setLoading(false);
      alert('Server error. Please try again later.');
    }
  };

  return (
    <div className="container mt-5">
      <h3 className="mb-4">Create New User</h3>
      <form className="row g-3" onSubmit={handleSubmit}>
        <div className="col-md-4">
          <input className="form-control" placeholder="Username" value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div className="col-md-4">
          <input className="form-control" type="password" placeholder="Password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div className="col-md-4">
          <input className="form-control" placeholder="Full Name" value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="col-md-6">
          <input className="form-control" type="email" placeholder="Email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="col-md-4">
          <select className="form-select" value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })} required>
            <option value="">Select Role</option>
            {roles.map(role => <option key={role}>{role}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <button className="btn btn-primary w-100" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Signup;
