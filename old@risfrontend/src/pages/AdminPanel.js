import React from 'react';
import { useNavigate } from 'react-router-dom';

function AdminPanel() {
  const fullName = localStorage.getItem('full_name');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Welcome, {fullName}</h2>
        <button className="btn btn-outline-danger" onClick={handleLogout}>Logout</button>
      </div>

      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Manage Users</h5>
              <p className="card-text">Create, edit, and deactivate clinical users.</p>
              <button className="btn btn-primary" onClick={() => navigate('/manage-users')}>Go</button>
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Scheduling</h5>
              <p className="card-text">Manage patient appointments and modality slots.</p>
              <button className="btn btn-primary" onClick={() => navigate('/schedule')}>Go</button>
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Reporting</h5>
              <p className="card-text">Access diagnostic reports and DICOM SR/PDF exports.</p>
              <button className="btn btn-primary" onClick={() => navigate('/reporting')}>Go</button>
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Audit Logs</h5>
              <p className="card-text">Track user activity and system changes.</p>
              <button className="btn btn-primary" onClick={() => navigate('/audit')}>Go</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
