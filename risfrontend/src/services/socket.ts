// src/services/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function initSocket(token?: string) {
  if (socket) return socket;
  socket = io(process.env.REACT_APP_API_BASE || '/', {
    path: process.env.REACT_APP_SOCKET_PATH || '/socket.io',
    autoConnect: true,
    auth: token ? { token } : undefined,
  });
  return socket;
}

export function getSocket() { return socket; }
export function disconnectSocket() { socket?.disconnect(); socket = null; }
