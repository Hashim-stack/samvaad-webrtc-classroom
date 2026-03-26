/**
 * P2P Classroom Signaling Server
 * ================================
 * This server ONLY handles signaling — it never touches media streams.
 * All audio/video flows directly between browsers via WebRTC.
 *
 * Responsibilities:
 *  1. Room creation & joining
 *  2. SDP offer/answer relay
 *  3. ICE candidate relay
 *  4. Chat, raise-hand, whiteboard, and control events
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// ─── In-memory store ──────────────────────────────────────────────────────────
// rooms: Map<roomId, { teacher: socketId|null, students: Map<socketId, {name}>, raisedHands: Set<socketId> }>
const rooms = new Map();

// Helper: get or create a room
function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      teacher: null,
      students: new Map(), // socketId → { name, role }
      raisedHands: new Set(),
      chatHistory: [],
    });
  }
  return rooms.get(roomId);
}

// Helper: build participant list for broadcasting
function buildParticipantList(room) {
  const list = [];
  for (const [sid, info] of room.students.entries()) {
    list.push({ socketId: sid, ...info });
  }
  return list;
}

// ─── HTTP Endpoints ───────────────────────────────────────────────────────────

// Generate a new room ID (teacher calls this)
app.get("/api/create-room", (req, res) => {
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  res.json({ roomId });
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ─── Socket.io Events ─────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[+] Client connected: ${socket.id}`);

  // ── JOIN ROOM ──────────────────────────────────────────────────────────────
  // Payload: { roomId, name, role: "teacher" | "student" }
  socket.on("join-room", ({ roomId, name, role }) => {
    const room = getRoom(roomId);

    // Validate teacher slot
    if (role === "teacher" && room.teacher && room.teacher !== socket.id) {
      socket.emit("error", { message: "Room already has a teacher." });
      return;
    }

    socket.join(roomId);
    socket.data = { roomId, name, role };

    if (role === "teacher") {
      room.teacher = socket.id;
    }

    // Register participant
    room.students.set(socket.id, { name, role });

    // Tell this socket about existing participants
    socket.emit("room-joined", {
      roomId,
      participants: buildParticipantList(room),
      teacherSocketId: room.teacher,
      chatHistory: room.chatHistory,
    });

    // Tell everyone else a new peer arrived
    socket.to(roomId).emit("peer-joined", {
      socketId: socket.id,
      name,
      role,
    });

    console.log(`[room:${roomId}] ${name} (${role}) joined`);
  });

  // ── WebRTC SIGNALING: OFFER ────────────────────────────────────────────────
  // Relay SDP offer from one peer to a specific target
  socket.on("webrtc-offer", ({ targetId, sdp }) => {
    io.to(targetId).emit("webrtc-offer", {
      fromId: socket.id,
      sdp,
    });
  });

  // ── WebRTC SIGNALING: ANSWER ───────────────────────────────────────────────
  socket.on("webrtc-answer", ({ targetId, sdp }) => {
    io.to(targetId).emit("webrtc-answer", {
      fromId: socket.id,
      sdp,
    });
  });

  // ── WebRTC SIGNALING: ICE CANDIDATE ───────────────────────────────────────
  // Relay ICE candidates so peers can establish the best network path
  socket.on("ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("ice-candidate", {
      fromId: socket.id,
      candidate,
    });
  });

  // ── CHAT ──────────────────────────────────────────────────────────────────
  socket.on("chat-message", ({ roomId, message }) => {
    const { name, role } = socket.data || {};
    const msg = {
      id: uuidv4(),
      senderId: socket.id,
      senderName: name,
      role,
      message,
      timestamp: Date.now(),
    };

    const room = rooms.get(roomId);
    if (room) {
      room.chatHistory.push(msg);
      // Keep last 200 messages
      if (room.chatHistory.length > 200) room.chatHistory.shift();
    }

    io.to(roomId).emit("chat-message", msg);
  });

  // ── RAISE HAND ────────────────────────────────────────────────────────────
  socket.on("raise-hand", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.raisedHands.add(socket.id);

    io.to(roomId).emit("hand-raised", {
      socketId: socket.id,
      name: socket.data?.name,
      raisedHands: [...room.raisedHands],
    });
  });

  socket.on("lower-hand", ({ roomId, targetId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const sid = targetId || socket.id;
    room.raisedHands.delete(sid);

    io.to(roomId).emit("hand-lowered", {
      socketId: sid,
      raisedHands: [...room.raisedHands],
    });
  });

  // ── TEACHER CONTROLS ──────────────────────────────────────────────────────
  // Teacher can mute/unmute a specific student
  socket.on("mute-student", ({ targetId, muted }) => {
    io.to(targetId).emit("muted-by-teacher", { muted });
  });

  // Teacher toggles screen share (notify all students)
  socket.on("screen-share-started", ({ roomId }) => {
    socket.to(roomId).emit("screen-share-started", { teacherId: socket.id });
  });

  socket.on("screen-share-stopped", ({ roomId }) => {
    socket.to(roomId).emit("screen-share-stopped", { teacherId: socket.id });
  });

  // ── WHITEBOARD ────────────────────────────────────────────────────────────
  // Relay drawing events to all peers in the room
  socket.on("whiteboard-draw", ({ roomId, drawData }) => {
    socket.to(roomId).emit("whiteboard-draw", {
      fromId: socket.id,
      drawData,
    });
  });

  socket.on("whiteboard-clear", ({ roomId }) => {
    socket.to(roomId).emit("whiteboard-clear");
  });

  // ── MEDIA STATE UPDATES ───────────────────────────────────────────────────
  socket.on("media-state", ({ roomId, video, audio }) => {
    socket.to(roomId).emit("peer-media-state", {
      socketId: socket.id,
      video,
      audio,
    });
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const { roomId, name, role } = socket.data || {};
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.students.delete(socket.id);
    room.raisedHands.delete(socket.id);

    if (role === "teacher") {
      room.teacher = null;
      // Notify students teacher left
      io.to(roomId).emit("teacher-left");
    }

    io.to(roomId).emit("peer-left", {
      socketId: socket.id,
      name,
      participants: buildParticipantList(room),
    });

    // Clean up empty rooms
    if (room.students.size === 0) {
      rooms.delete(roomId);
      console.log(`[room:${roomId}] deleted (empty)`);
    }

    console.log(`[-] ${name} disconnected from room ${roomId}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
