import React from 'react';
import { Link } from 'react-router-dom';

function Sidebar() {
  return (
    <nav className="p-3">
      <ul className="nav flex-column">
        <li className="nav-item"><Link className="nav-link text-white" to="/dashboard">📊 Dashboard</Link></li>
        <li className="nav-item"><Link className="nav-link text-white" to="/worklist">🗂️ Worklist</Link></li>
        <li className="nav-item"><Link className="nav-link text-white" to="/manage-users">👥 Manage Users</Link></li>
        <li className="nav-item"><Link className="nav-link text-white" to="/reports">📝 Reports</Link></li>
      </ul>
    </nav>
  );
}

export default Sidebar;
