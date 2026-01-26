import axios from "axios";

/**
 * Central Axios instance for RIS frontend
 * Uses same-origin /api by default (Docker / Nginx friendly)
 */

const axiosInstance = axios.create({
  // Use relative path so Vite proxy (dev) or Nginx (prod) handles it correctly
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: false, // Disabled to avoid CORS credential issues on LAN (we use Bearer token)
  headers: {
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Expires: "0",
  },
});

console.warn("🚀 Axios Base URL:", axiosInstance.defaults.baseURL);

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

    console.error("❌ AXIOS ERROR:", {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullUrl: (error.config?.baseURL || '') + (error.config?.url || '')
    });

    return Promise.reject(error);
  }
);

export default axiosInstance;

