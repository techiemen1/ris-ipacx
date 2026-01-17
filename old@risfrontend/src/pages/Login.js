import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import './Login.css';
import { toast } from 'react-toastify';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('✅ Login component mounted');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.warning('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok && data.token) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('full_name', data.full_name);
        toast.success(`Welcome, ${data.full_name}`);
        navigate('/dashboard');
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      toast.error('Server error. Please try again later.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
       {/* <img src="/hospital-logo.png" alt="Hospital Logo" className="logo" /> */}
        <h2 className="mb-4">Radiology Information System</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="form-control mb-3"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
         type="submit"
       className="btn btn-primary w-100"
           disabled={loading}
         >
           {loading ? 'Logging in...' : 'Login'}
         </button>
        </form>
        <p className="footer-text mt-4">© 2025 RIS Portal | Powered by techiemen</p>
      </div>
    </div>
  );
}

export default Login;
