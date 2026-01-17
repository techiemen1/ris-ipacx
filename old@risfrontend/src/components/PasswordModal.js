import React, { useState } from 'react';
import axios from 'axios';

function PasswordModal({ user, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const token = localStorage.getItem('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.put(`/api/users/${user.id}/password`, {
      currentPassword,
      newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    onClose();
  };

  return (
    <div className="modal show d-block" tabIndex="-1">
      <div className="modal-dialog">
        <form onSubmit={handleSubmit} className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Change Password for {user.username}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <input type="password" className="form-control mb-2" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
            <input type="password" className="form-control" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">Update</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasswordModal;
