/**
 * useClassroom — Central hook for the classroom session
 *
 * Manages:
 *  - Local media stream (camera + mic)
 *  - Socket.io connection and all signaling events
 *  - RTCPeerConnection lifecycle via PeerManager
 *  - Remote streams map
 *  - Participants list
 *  - Chat messages
 *  - Raised hands queue
 *  - Screen sharing
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { PeerManager } from "@/lib/webrtc";

export function useClassroom({ roomId, name, role }) {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const socketRef = useRef(null);
  const peerManagerRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId → MediaStream
  const [chatMessages, setChatMessages] = useState([]);
  const [raisedHands, setRaisedHands] = useState([]); // array of socketIds
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [teacherSocketId, setTeacherSocketId] = useState(null);
  const [mutedByTeacher, setMutedByTeacher] = useState(false);
  const [error, setError] = useState(null);

  // Whiteboard: store remote draw events so Whiteboard component can consume them
  // We use a ref-based callback pattern so we never need to re-register the socket listener
  const onRemoteDrawRef = useRef(null);   // set by Whiteboard via registerDrawHandler
  const onRemoteClearRef = useRef(null);

  const isTeacher = role === "teacher";

  // ── Get local camera/mic ──────────────────────────────────────────────────
  const getLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn("[media] camera/mic denied:", err);
      // Allow joining without media
      return null;
    }
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addRemoteStream = useCallback((socketId, stream) => {
    setRemoteStreams((prev) => ({ ...prev, [socketId]: stream }));
  }, []);

  const removeRemoteStream = useCallback((socketId) => {
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  }, []);

  // ── Main setup effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !name) return;

    let mounted = true;

    async function init() {
      // 1. Get local media
      const stream = await getLocalMedia();

      // 2. Connect socket
      const socket = connectSocket();
      socketRef.current = socket;

      // 3. Create peer manager
      const pm = new PeerManager(socket);
      pm.onStreamAdded = addRemoteStream;
      pm.onStreamRemoved = removeRemoteStream;
      peerManagerRef.current = pm;

      // ── Socket events ────────────────────────────────────────────────────

      socket.on("connect", () => {
        if (!mounted) return;
        setIsConnected(true);
        // Join the room
        socket.emit("join-room", { roomId, name, role });
      });

      socket.on("disconnect", () => {
        if (!mounted) return;
        setIsConnected(false);
      });

      // Room joined: we receive existing participants
      socket.on("room-joined", ({ participants, teacherSocketId, chatHistory }) => {
        if (!mounted) return;
        setParticipants(participants);
        setTeacherSocketId(teacherSocketId);
        setChatMessages(chatHistory || []);

        // Connect to each existing peer
        participants.forEach(({ socketId }) => {
          if (socketId === socket.id) return;
          // Teacher initiates; students wait for teacher's offer
          const shouldInitiate = isTeacher || socketId !== teacherSocketId;
          pm.createPeer(socketId, stream, shouldInitiate);
        });
      });

      // New peer joined the room
      socket.on("peer-joined", ({ socketId, name: peerName, role: peerRole }) => {
        if (!mounted) return;
        setParticipants((prev) => {
          if (prev.find((p) => p.socketId === socketId)) return prev;
          return [...prev, { socketId, name: peerName, role: peerRole }];
        });

        if (peerRole === "teacher") setTeacherSocketId(socketId);

        // Connect to the new peer
        // Teacher always initiates to students; students initiate to each other
        const shouldInitiate = isTeacher || peerRole !== "teacher";
        pm.createPeer(socketId, stream, shouldInitiate);
      });

      // Peer disconnected
      socket.on("peer-left", ({ socketId, participants: updatedList }) => {
        if (!mounted) return;
        setParticipants(updatedList);
        pm.removePeer(socketId);
        setRaisedHands((prev) => prev.filter((id) => id !== socketId));
      });

      socket.on("teacher-left", () => {
        if (!mounted) return;
        setTeacherSocketId(null);
      });

      // ── WebRTC signaling relay ───────────────────────────────────────────
      socket.on("webrtc-offer", async ({ fromId, sdp }) => {
        await pm.handleOffer(fromId, sdp, stream);
      });

      socket.on("webrtc-answer", async ({ fromId, sdp }) => {
        await pm.handleAnswer(fromId, sdp);
      });

      socket.on("ice-candidate", async ({ fromId, candidate }) => {
        await pm.handleIceCandidate(fromId, candidate);
      });

      // ── Chat ─────────────────────────────────────────────────────────────
      socket.on("chat-message", (msg) => {
        if (!mounted) return;
        setChatMessages((prev) => [...prev, msg]);
      });

      // ── Raised hands ─────────────────────────────────────────────────────
      socket.on("hand-raised", ({ socketId, raisedHands: list }) => {
        if (!mounted) return;
        setRaisedHands(list);
      });

      socket.on("hand-lowered", ({ raisedHands: list }) => {
        if (!mounted) return;
        setRaisedHands(list);
      });

      // ── Teacher controls ──────────────────────────────────────────────────
      socket.on("muted-by-teacher", ({ muted }) => {
        if (!mounted) return;
        setMutedByTeacher(muted);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => {
            t.enabled = !muted;
          });
        }
      });

      // ── Screen sharing ────────────────────────────────────────────────────
      socket.on("screen-share-started", ({ teacherId }) => {
        // Students will get the screen track via the existing peer connection
        // because teacher calls replaceTrack on their connections
      });

      socket.on("screen-share-stopped", () => {
        // Screen track replaced with camera track — handled by peer connection
      });

      // ── Whiteboard ────────────────────────────────────────────────────────
      // Listeners are registered here on the live socket.
      // The actual canvas drawing is delegated to Whiteboard via ref callbacks.
      socket.on("whiteboard-draw", ({ drawData }) => {
        if (!mounted) return;
        onRemoteDrawRef.current?.(drawData);
      });

      socket.on("whiteboard-clear", () => {
        if (!mounted) return;
        onRemoteClearRef.current?.();
      });

      // Connect the socket
      if (!socket.connected) socket.connect();
    }

    init();

    return () => {
      mounted = false;
      // Cleanup on unmount
      peerManagerRef.current?.closeAll();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, name, role]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Toggle local camera */
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const tracks = localStreamRef.current.getVideoTracks();
    const newState = !videoEnabled;
    tracks.forEach((t) => (t.enabled = newState));
    setVideoEnabled(newState);
    socketRef.current?.emit("media-state", {
      roomId,
      video: newState,
      audio: audioEnabled,
    });
  }, [videoEnabled, audioEnabled, roomId]);

  /** Toggle local microphone */
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    const tracks = localStreamRef.current.getAudioTracks();
    const newState = !audioEnabled;
    tracks.forEach((t) => (t.enabled = newState));
    setAudioEnabled(newState);
    socketRef.current?.emit("media-state", {
      roomId,
      video: videoEnabled,
      audio: newState,
    });
  }, [videoEnabled, audioEnabled, roomId]);

  /** Teacher: start screen share */
  const startScreenShare = useCallback(async () => {
    try {
      const screenStr = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      });
      screenStreamRef.current = screenStr;
      setScreenStream(screenStr);
      setIsScreenSharing(true);

      const screenVideoTrack = screenStr.getVideoTracks()[0];
      const pm = peerManagerRef.current;
      const camVideoTrack = localStreamRef.current?.getVideoTracks()[0];

      // Replace camera track with screen track on all peer connections
      if (camVideoTrack) {
        pm?.replaceTrack(camVideoTrack, screenVideoTrack);
      } else {
        pm?.addTrackToAll(screenVideoTrack, screenStr);
      }

      socketRef.current?.emit("screen-share-started", { roomId });

      // Auto-stop when user clicks "Stop sharing" in browser UI
      screenVideoTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error("[screen] share error:", err);
    }
  }, [roomId]);

  /** Teacher: stop screen share */
  const stopScreenShare = useCallback(() => {
    const screenStr = screenStreamRef.current;
    if (!screenStr) return;

    const screenVideoTrack = screenStr.getVideoTracks()[0];
    const camVideoTrack = localStreamRef.current?.getVideoTracks()[0];
    const pm = peerManagerRef.current;

    // Replace back to camera
    if (screenVideoTrack && camVideoTrack) {
      pm?.replaceTrack(screenVideoTrack, camVideoTrack);
    }

    screenStr.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
    socketRef.current?.emit("screen-share-stopped", { roomId });
  }, [roomId]);

  /** Send a chat message */
  const sendChatMessage = useCallback((message) => {
    socketRef.current?.emit("chat-message", { roomId, message });
  }, [roomId]);

  /** Student: raise/lower own hand */
  const raiseHand = useCallback(() => {
    socketRef.current?.emit("raise-hand", { roomId });
  }, [roomId]);

  const lowerHand = useCallback((targetId) => {
    socketRef.current?.emit("lower-hand", { roomId, targetId });
  }, [roomId]);

  /** Teacher: mute a student */
  const muteStudent = useCallback((targetId, muted) => {
    socketRef.current?.emit("mute-student", { targetId, muted });
  }, []);

  /** Whiteboard: emit draw data */
  const emitDraw = useCallback((drawData) => {
    socketRef.current?.emit("whiteboard-draw", { roomId, drawData });
  }, [roomId]);

  const emitClear = useCallback(() => {
    socketRef.current?.emit("whiteboard-clear", { roomId });
  }, [roomId]);

  /**
   * Whiteboard component calls this once on mount to register its canvas draw functions.
   * We store them in refs so the socket listener (registered once) always has the
   * latest version without needing to re-subscribe.
   */
  const registerDrawHandlers = useCallback((onDraw, onClear) => {
    onRemoteDrawRef.current = onDraw;
    onRemoteClearRef.current = onClear;
  }, []);

  const mySocketId = socketRef.current?.id;

  return {
    // State
    participants,
    remoteStreams,
    chatMessages,
    raisedHands,
    localStream,
    screenStream,
    isScreenSharing,
    videoEnabled,
    audioEnabled,
    isConnected,
    teacherSocketId,
    mutedByTeacher,
    error,
    mySocketId,
    isTeacher,
    socket: socketRef.current,

    // Actions
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    raiseHand,
    lowerHand,
    muteStudent,
    emitDraw,
    emitClear,
    registerDrawHandlers,
  };
}
