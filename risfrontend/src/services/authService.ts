// src/services/authService.ts
import axiosInstance from "./axiosInstance"

export interface User {
  id: number
  username: string
  full_name?: string
  email?: string
  role: string
  profile_picture?: string | null
  role_id?: number
}

export interface LoginResponse {
  token: string
  user: User
}

/**
 * Login user via backend (default: /auth/login)
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const res = await axiosInstance.post("/auth/login", { username, password })
    const { token, user } = res.data

    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))

    return { token, user }
  } catch (err: any) {
    console.error("[AUTH SERVICE] Login error:", err.response?.data || err.message)
    throw new Error(err.response?.data?.error || "Login failed")
  }
}

/**
 * Optional: login via /api/login (fallback or alternate route)
 */
export async function loginViaApi(credentials: { username: string; password: string }) {
  try {
    const res = await axiosInstance.post("/api/login", credentials)
    const { token, user } = res.data

    localStorage.setItem("token", token)
    localStorage.setItem("user", JSON.stringify(user))

    return { token, user }
  } catch (err: any) {
    console.error("[AUTH SERVICE] API login error:", err.response?.data || err.message)
    throw new Error(err.response?.data?.error || "API login failed")
  }
}

/**
 * Logout user (frontend only)
 */
export function logout(): void {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

/**
 * Optional: logout via backend
 */
export async function logoutViaApi(): Promise<void> {
  try {
    await axiosInstance.post("/api/logout")
  } catch (err) {
    console.warn("[AUTH SERVICE] Backend logout failed:", err)
  } finally {
    logout()
  }
}

/**
 * Get currently logged-in user from localStorage
 */
export function getUser(): User | null {
  const stored = localStorage.getItem("user")
  return stored ? JSON.parse(stored) : null
}

/**
 * Fetch profile from /auth/profile and update localStorage
 */
export async function fetchProfile(): Promise<User> {
  try {
    const res = await axiosInstance.get("/auth/profile")
    const user: User = res.data
    localStorage.setItem("user", JSON.stringify(user))
    return user
  } catch (err: any) {
    console.error("[AUTH SERVICE] Fetch profile error:", err.response?.data || err.message)
    throw new Error(err.response?.data?.error || "Failed to fetch profile")
  }
}

/**
 * Lightweight profile fetch from /api/profile (fallback)
 */
export async function getUserProfile(): Promise<User | null> {
  try {
    const res = await axiosInstance.get("/api/profile")
    return res.data
  } catch (err) {
    console.error("[AUTH SERVICE] Failed to load user profile", err)
    return null
  }
}
