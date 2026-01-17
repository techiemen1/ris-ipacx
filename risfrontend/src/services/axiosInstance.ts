import axios from "axios";

/**
 * Central Axios instance for RIS frontend
 * Uses same-origin /api by default (Docker / Nginx friendly)
 */

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Expires: "0",
  },
});

/* ================= REQUEST INTERCEPTOR ================= */

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE INTERCEPTOR ================= */

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Prevent infinite loops
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token");

        // Attempt refresh
        const refreshRes = await axios.post("/api/auth/refresh", { token }); // Use clean axios
        const newToken = refreshRes.data.token;

        if (newToken) {
          console.log("🔄 Session refreshed automatically");
          localStorage.setItem("token", newToken);
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshErr) {
        console.warn("Session expired, directing to login.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }

    if (status === 404) {
      // soft-fail for optional endpoints
      return Promise.resolve({ data: { success: false } });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

