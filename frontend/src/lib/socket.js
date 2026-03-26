/**
 * Socket.io singleton
 * We create one socket per browser session and reuse it.
 * This prevents duplicate connections on React re-renders.
 */

import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000",
      {
        autoConnect: false,
        transports: ["websocket", "polling"],
      }
    );
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
  }
}
