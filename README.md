# 🎓 SAMVAAD — Connect, learn, and collaborate instantly with real-time video classrooms

A fully peer-to-peer video classroom built with WebRTC, Next.js, and Socket.io.  
**Media never touches the server.** Only signaling (SDP + ICE) goes through the backend.

---------

## 🏗 Architecture Overview

```
Browser A (Teacher)                 Browser B (Student)
      │                                     │
      │──── Socket.io (SDP offer) ──────────▶│
      │◀─── Socket.io (SDP answer) ──────────│
      │──── Socket.io (ICE candidates) ─────▶│
      │◀─── Socket.io (ICE candidates) ──────│
      │                                     │
      │◀════════ WebRTC P2P (audio/video) ══▶│
      │          (direct, no server)         │
```

### Components

| Layer | Technology | Role |
|---|---|---|
| Signaling | Node.js + Socket.io | SDP/ICE exchange, room management |
| Video/Audio | WebRTC RTCPeerConnection | Direct P2P media |
| Frontend | Next.js 14 (App Router) | UI, hooks, WebRTC logic |
| Chat | Socket.io events | Real-time messages via server relay |
| Whiteboard | HTML5 Canvas + Socket.io | Collaborative drawing |
| Screen Share | `getDisplayMedia()` + WebRTC `replaceTrack` | Teacher's screen to students |

---

## 📁 Project Structure

```
p2p-classroom/
├── backend/
│   ├── server.js          # Signaling server (Express + Socket.io)
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.js       # Root layout
    │   │   ├── globals.css     # Design system + CSS variables
    │   │   ├── page.js         # Landing / lobby page
    │   │   └── room/
    │   │       └── [roomId]/
    │   │           └── page.js # Main classroom page
    │   ├── components/
    │   │   ├── VideoTile.js         # Single video stream tile
    │   │   ├── VideoGrid.js         # Grid of all video tiles
    │   │   ├── ChatPanel.js         # Real-time chat
    │   │   ├── Whiteboard.js        # Collaborative canvas
    │   │   ├── ParticipantsSidebar.js # Participants + raised hands
    │   │   └── ControlBar.js        # Bottom controls
    │   ├── hooks/
    │   │   └── useClassroom.js  # Central WebRTC + Socket.io hook
    │   └── lib/
    │       ├── socket.js        # Socket.io singleton
    │       └── webrtc.js        # PeerManager (RTCPeerConnection wrapper)
    ├── next.config.js
    ├── tailwind.config.js
    ├── package.json
    └── .env.local.example
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Clone / Download the project

```bash
# If downloaded as zip, extract it, then:
cd p2p-classroom
```

### 2. Start the Backend (Signaling Server)

```bash
cd backend
npm install
npm run dev       # Uses nodemon for auto-restart
# Server starts on http://localhost:4000
```

### 3. Start the Frontend

```bash
cd frontend
npm install

# Copy env file
cp .env.local.example .env.local

npm run dev       # Starts on http://localhost:3000
```

### 4. Test It

1. Open **http://localhost:3000** in Browser Tab 1
2. Enter your name → Click **"✦ Create Room"** → you become the Teacher
3. Copy the Room ID (e.g., `A3F7B2C1`)
4. Open **http://localhost:3000** in Browser Tab 2 (or another device on LAN)
5. Enter your name → paste Room ID → click **"Join as Student"**
6. Allow camera/mic permissions when prompted

---

## 🧩 Feature Guide

### 🎥 Video System
- Teacher's video is displayed prominently at the top
- Students appear in a responsive grid below
- Each tile shows the participant's name, role badge, and mute status
- If camera is off, an avatar with the first letter of the name is shown

### ✋ Raise Hand
- Students click **"✋ Raise Hand"** in the control bar
- The button pulses yellow while the hand is up
- Teacher sees the queue in the **Participants sidebar** and in each student's video tile
- Teacher can click ↓ next to a name to lower their hand

### 🖥 Screen Sharing
- Teacher clicks **"🖥️ Share Screen"** → browser prompts to pick a screen/window
- The screen track replaces the camera track on all WebRTC connections via `replaceTrack()`
- Students automatically see the screen stream
- Clicking **"Stop sharing"** in the browser UI (or the button) reverts to camera

### 🎨 Whiteboard
- Click **"✏️ Board"** tab in the top bar
- Draw with mouse or touch; choose pen/eraser, color, and line width
- All strokes broadcast via Socket.io and render on all participants' canvases in real-time
- **Clear** button clears the canvas for everyone

### 💬 Chat
- Click **"💬 Chat"** tab
- Messages are relayed via Socket.io and persist in the session
- Press **Enter** or click ↑ to send

### 🔐 Role Controls
- **Teacher**: can mute individual students (🔇 icon next to their tile or in sidebar)
- **Teacher**: manages raised hands queue
- **Students**: can raise/lower their own hand, toggle own camera/mic

---

## 🌐 WebRTC Flow (Detailed)

```
1. Teacher creates room → GET /api/create-room → gets roomId

2. Teacher connects socket → emit("join-room", { roomId, name, role: "teacher" })

3. Student connects socket → emit("join-room", { roomId, name, role: "student" })

4. Server emits "peer-joined" to teacher

5. Teacher's PeerManager.createPeer(studentId, localStream, isInitiator=true)
   → RTCPeerConnection created
   → local tracks added
   → onnegotiationneeded fires
   → createOffer()
   → setLocalDescription(offer)
   → emit("webrtc-offer", { targetId: studentId, sdp: offer })

6. Server relays offer to student

7. Student receives "webrtc-offer"
   → PeerManager.handleOffer(teacherId, sdp, localStream)
   → setRemoteDescription(offer)
   → createAnswer()
   → setLocalDescription(answer)
   → emit("webrtc-answer", { targetId: teacherId, sdp: answer })

8. Server relays answer to teacher

9. Teacher receives "webrtc-answer"
   → setRemoteDescription(answer)

10. ICE candidates exchanged bidirectionally via socket
    → addIceCandidate() on each side

11. ontrack fires → MediaStream available → renders in <video>
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

---

## 🌍 Deployment Guide

### Backend → Render (free tier)

1. Push your `backend/` folder to a GitHub repo
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**: `FRONTEND_URL=https://your-app.vercel.app`
5. Deploy → copy the URL (e.g. `https://classroom-backend.onrender.com`)

### Frontend → Vercel (free tier)

1. Push your `frontend/` folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → import repo
3. Set environment variable:
   - `NEXT_PUBLIC_BACKEND_URL=https://classroom-backend.onrender.com`
4. Deploy

### ⚠️ Important Notes for Production

- **TURN Server**: The free Google STUN server works for most network configurations. However, users behind symmetric NATs (some corporate networks) may fail to connect. For production, add a free TURN server (e.g., [Open Relay](https://www.metered.ca/tools/openrelay/)):
  ```js
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  ]
  ```
- **Render free tier** spins down after 15min of inactivity (cold start ~30s)
- **Scale**: This mesh topology works well for 10–15 users. For larger classes, consider an SFU (mediasoup, LiveKit).

---

## 🔧 Scaling Considerations

| Users | Architecture | Notes |
|---|---|---|
| 1–4 | Full mesh (current) | Every peer connects to every other peer |
| 5–15 | Full mesh (current) | Works, but teacher has N-1 upload streams |
| 15+ | SFU recommended | One server-side routing node (mediasoup, LiveKit) |

For the current full-mesh design, each user uploads one stream per peer. With 15 users, teacher uploads 14 streams. A modern connection handles this but bandwidth becomes the bottleneck.

---

## 📦 Dependencies

### Backend
| Package | Purpose |
|---|---|
| express | HTTP server |
| socket.io | WebSocket signaling |
| cors | Cross-origin requests |
| uuid | Room ID generation |

### Frontend
| Package | Purpose |
|---|---|
| next | React framework |
| socket.io-client | WebSocket client |
| tailwindcss | Utility CSS |

No paid services. No media servers. 100% free stack.
