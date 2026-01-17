import React from 'react';
import { useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <header className="d-flex justify-content-between align-items-center p-3 bg-light border-bottom">
      <h5 className="mb-0">🩺 RIS Dashboard</h5>
      <div className="d-flex align-items-center gap-3">
        {user?.profile_picture && (
          <img src={`http://localhost:5000${user.profile_picture}`} alt="Profile" className="rounded-circle" style={{ width: '40px', height: '40px' }} />
        )}
        <span>{user?.full_name || user?.username}</span>
        <button className="btn btn-sm btn-outline-danger" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}

export default Header;
