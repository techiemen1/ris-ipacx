import React from 'react';
import Sidebar from './Sidebar';
import UserProfileIcon from './UserProfileIcon';
import './Layout.css'; // ✅ Optional: for layout-specific styling

function Layout({ children }) {
  return (
    <div className="container-fluid px-0 layout-wrapper">
      {/* Header */}
      <header className="bg-light border-bottom shadow-sm">
        <div className="d-flex justify-content-between align-items-center p-3">
          <h5 className="mb-0 text-primary fw-bold">🩺 Radiology Information System</h5>
          <UserProfileIcon />
        </div>
      </header>

      {/* Sidebar + Main Content */}
      <div className="row g-0">
        <aside className="col-md-2 bg-dark text-white min-vh-100">
          <Sidebar />
        </aside>
        <main className="col-md-10 p-4 bg-light">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
