/**
 * WebRTC Peer Manager
 * ====================
 * Manages multiple RTCPeerConnections — one per remote peer.
 *
 * Flow (as initiator / teacher connecting to a student):
 *   1. createPeer(targetId, localStream, socket, isInitiator=true)
 *   2. RTCPeerConnection fires onnegotiationneeded → createOffer → sendOffer via socket
 *   3. Remote peer receives offer → createAnswer → sendAnswer via socket
 *   4. ICE candidates are exchanged via socket
 *   5. onTrack fires on both sides → remote stream appears
 *
 * Flow (as receiver / student):
 *   1. createPeer(teacherId, localStream, socket, isInitiator=false)
 *   2. Wait for offer via socket → setRemoteDescription → createAnswer → send answer
 *   3. ICE candidates exchanged
 *   4. onTrack fires → teacher stream appears
 */

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export class PeerManager {
  constructor(socket) {
    this.socket = socket;
    // Map<socketId, RTCPeerConnection>
    this.peers = new Map();
    // Map<socketId, MediaStream> — remote streams from each peer
    this.remoteStreams = new Map();
    // Callback: (socketId, stream) => void
    this.onStreamAdded = null;
    // Callback: (socketId) => void
    this.onStreamRemoved = null;
  }

  /**
   * Create a peer connection to a remote peer.
   * @param {string} targetId  — remote socket ID
   * @param {MediaStream|null} localStream — our local cam/mic stream
   * @param {boolean} isInitiator — true = we send the offer
   */
  createPeer(targetId, localStream, isInitiator) {
    if (this.peers.has(targetId)) return this.peers.get(targetId);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(targetId, pc);

    // ── Add local tracks to the connection ──────────────────────────────────
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // ── ICE candidate handler ────────────────────────────────────────────────
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("ice-candidate", {
          targetId,
          candidate: event.candidate,
        });
      }
    };

    // ── Remote track handler (remote stream arrives here) ───────────────────
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteStreams.set(targetId, remoteStream);
      if (this.onStreamAdded) this.onStreamAdded(targetId, remoteStream);
    };

    // ── Connection state logging ─────────────────────────────────────────────
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] ${targetId} state: ${pc.connectionState}`);
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        this.removePeer(targetId);
      }
    };

    // ── If initiator, create and send an offer ───────────────────────────────
    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          this.socket.emit("webrtc-offer", {
            targetId,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error("[WebRTC] createOffer error:", err);
        }
      };
    }

    return pc;
  }

  /** Handle an incoming SDP offer (called on receiver side) */
  async handleOffer(fromId, sdp, localStream) {
    let pc = this.peers.get(fromId);
    if (!pc) {
      pc = this.createPeer(fromId, localStream, false);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit("webrtc-answer", {
        targetId: fromId,
        sdp: pc.localDescription,
      });
    } catch (err) {
      console.error("[WebRTC] handleOffer error:", err);
    }
  }

  /** Handle an incoming SDP answer */
  async handleAnswer(fromId, sdp) {
    const pc = this.peers.get(fromId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
      console.error("[WebRTC] handleAnswer error:", err);
    }
  }

  /** Handle an incoming ICE candidate */
  async handleIceCandidate(fromId, candidate) {
    const pc = this.peers.get(fromId);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("[WebRTC] addIceCandidate error:", err);
    }
  }

  /** Replace tracks on all peer connections (used when switching streams) */
  replaceTrack(oldTrack, newTrack) {
    this.peers.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track === oldTrack);
      if (sender && newTrack) sender.replaceTrack(newTrack);
    });
  }

  /** Add a new track to all existing peer connections */
  addTrackToAll(track, stream) {
    this.peers.forEach((pc) => {
      const alreadyAdded = pc.getSenders().find((s) => s.track === track);
      if (!alreadyAdded) pc.addTrack(track, stream);
    });
  }

  /** Close and remove a single peer */
  removePeer(targetId) {
    const pc = this.peers.get(targetId);
    if (pc) {
      pc.close();
      this.peers.delete(targetId);
    }
    this.remoteStreams.delete(targetId);
    if (this.onStreamRemoved) this.onStreamRemoved(targetId);
  }

  /** Close all peer connections */
  closeAll() {
    this.peers.forEach((pc, id) => this.removePeer(id));
  }
}
