import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      setUser(storedUser ? JSON.parse(storedUser) : null);
    } catch (err) {
      console.error('❌ Failed to parse user:', err.message);
      setUser(null);
    }
  }, []);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(user)
      });
      setLoading(false);
      if (res.ok) {
        alert('✅ Profile updated');
        const updated = await res.json();
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
      } else {
        alert('❌ Update failed');
      }
    } catch (err) {
      console.error('❌ Update error:', err.message);
      setLoading(false);
    }
  };

  const handlePicUpload = async e => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('profilePic', file);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}/profile-pic`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const updated = { ...user, profile_picture: `/uploads/${file.name}` };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
      } else {
        alert('❌ Failed to upload picture');
      }
    } catch (err) {
      console.error('❌ Picture upload error:', err.message);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword) return alert('❌ Enter a new password');
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) {
        alert('✅ Password updated');
        setNewPassword('');
      } else {
        alert('❌ Failed to update password');
      }
    } catch (err) {
      console.error('❌ Password update error:', err.message);
    }
  };

  return (
    <Layout>
      <h4>👤 My Profile</h4>
      {user ? (
        <div className="row g-3">
          <div className="col-md-4 text-center">
            {user.profile_picture && (
              <img
                src={`http://localhost:5000${user.profile_picture}`}
                alt="Profile"
                className="img-fluid rounded mb-2"
              />
            )}
            <input type="file" onChange={handlePicUpload} className="form-control" />
          </div>

          <div className="col-md-8">
            {['full_name', 'email', 'phone_number'].map(field => (
              <div className="mb-3" key={field}>
                <label className="form-label">{field.replace('_', ' ')}</label>
                <input
                  className="form-control"
                  value={user[field] || ''}
                  onChange={e => setUser({ ...user, [field]: e.target.value })}
                />
              </div>
            ))}

            {/* Role-based fields */}
            {user.role === 'doctor' && (
              <>
                {['specialty', 'department'].map(field => (
                  <div className="mb-3" key={field}>
                    <label className="form-label">{field.replace('_', ' ')}</label>
                    <input
                      className="form-control"
                      value={user[field] || ''}
                      onChange={e => setUser({ ...user, [field]: e.target.value })}
                    />
                  </div>
                ))}
              </>
            )}

            {/* Password change */}
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-warning mb-3" onClick={handlePasswordChange}>
              Change Password
            </button>

            {/* Save profile */}
            <button className="btn btn-primary" onClick={handleUpdate} disabled={loading}>
              {loading ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
    </Layout>
  );
}

export default Profile;
