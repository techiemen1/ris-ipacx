import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function ResetPassword() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:5000/api/reset-password/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });

    const data = await res.json();
    if (res.ok) {
      toast.success('Password reset successful');
      navigate('/login');
    } else {
      toast.error(data.error || 'Reset failed');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <h2>Reset Password</h2>
        <form onSubmit={handleReset}>
          <input
            type="password"
            className="form-control mb-3"
            placeholder="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <button type="submit" className="btn btn-success w-100">Reset</button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
