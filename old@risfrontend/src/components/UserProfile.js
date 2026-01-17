import React, { useState } from 'react';

const UserProfile = ({ user, setUser }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      const res = await fetch(`/api/upload-profile/${user.id}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUser({ ...user, profile_picture: data.imagePath });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card shadow-sm p-4 mb-4">
      <div className="d-flex align-items-center">
        <img
          src={user.profile_picture || '/default-avatar.png'}
          alt="Profile"
          className="rounded-circle me-3"
          width="100"
          height="100"
        />
        <div>
          <h4 className="mb-1">{user.username}</h4>
          <p className="mb-0 text-muted">{user.role} – {user.department}</p>
        </div>
      </div>

      <div className="mt-3">
        <label className="form-label">Update Profile Picture</label>
        <input
          type="file"
          className="form-control"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading && <small className="text-muted">Uploading...</small>}
      </div>
    </div>
  );
};

export default UserProfile;
