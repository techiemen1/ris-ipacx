import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';

function UserProfileIcon() {
  const navigate = useNavigate();
  let user = null;
  try {
    const storedUser = localStorage.getItem('user');
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (err) {
    console.error('❌ Failed to parse user:', err.message);
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="light" className="d-flex align-items-center gap-2 border">
        {user?.profile_picture ? (
          <img
            src={`http://localhost:5000${user.profile_picture}`}
            alt="Profile"
            className="rounded-circle"
            style={{ width: '32px', height: '32px' }}
          />
        ) : (
          <div className="rounded-circle bg-secondary text-white d-flex justify-content-center align-items-center" style={{ width: '32px', height: '32px' }}>
            {user?.username?.charAt(0)?.toUpperCase() || 'G'}
          </div>
        )}
        <span>{user?.full_name || user?.username || 'Guest'}</span>
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={() => navigate('/profile')}>Profile</Dropdown.Item>
        <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default UserProfileIcon;
