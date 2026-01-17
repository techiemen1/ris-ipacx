import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';

function UserProfileViewer() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch(`http://localhost:5000/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUser(data);
    };
    fetchUser();
  }, [id, token]);

  return (
    <Layout>
      <h4>👤 Viewing Profile</h4>
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
          </div>
          <div className="col-md-8">
            {['username','full_name','email','phone_number','role','specialty','department'].map(field => (
              <div className="mb-2" key={field}>
                <strong>{field.replace('_',' ')}:</strong> {user[field] || '—'}
              </div>
            ))}
            <div className="mt-3">
              <strong>Status:</strong> {user.is_active ? '✅ Active' : '❌ Inactive'}
            </div>
          </div>
        </div>
      ) : (
        <p>Loading user profile...</p>
      )}
    </Layout>
  );
}

export default UserProfileViewer;
