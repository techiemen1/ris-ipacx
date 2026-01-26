// src/pages/Auth/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRBAC } from "../../context/RoleContext";
import axiosInstance from "../../services/axiosInstance";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setUser } = useRBAC();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await axiosInstance.post("/auth/login", { username, password });

      // Save JWT and user
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);

      console.log("[LOGIN SUCCESS]", res.data.user);

      // Redirect to home/dashboard
      navigate("/");
    } catch (err: any) {
      console.error("[LOGIN ERROR]", err.response?.data || err.message);
      let errorMessage = err.response?.data?.error || err.message || "Login failed";

      if (err.message === "Network Error") {
        errorMessage = "Network Error: Please check if the server is running or accept the SSL certificate if prompted.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-96 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">iPacx RIS - Login</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <button
          type="submit"
          className={`w-full py-2 text-white rounded ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Network Debug */}
      <div className="fixed bottom-4 right-4 text-xs text-slate-400">
        <button
          onClick={() => {
            alert(`Base URL: ${axiosInstance.defaults.baseURL}`);
            axiosInstance.get('/').then(() => alert('Connection OK')).catch(e => alert(`Error: ${e.message}`));
          }}
          className="underline hover:text-slate-600"
        >
          Test Connection
        </button>
      </div>
    </div >
  );
};

export default Login;
