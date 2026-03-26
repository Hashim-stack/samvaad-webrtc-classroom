"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useClassroom } from "@/hooks/useClassroom";
import VideoGrid from "@/components/VideoGrid";
import ChatPanel from "@/components/ChatPanel";
import Whiteboard from "@/components/Whiteboard";
import ParticipantsSidebar from "@/components/ParticipantsSidebar";
import ControlBar from "@/components/ControlBar";
import ThemePicker from "@/components/ThemePicker";

// Tab IDs for the right panel
const TABS = { CHAT: "chat", WHITEBOARD: "whiteboard" };

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId;
  const name = searchParams.get("name") || "Anonymous";
  const role = searchParams.get("role") || "student";

  const [activeTab, setActiveTab] = useState(TABS.CHAT);
  const [showSidebar, setShowSidebar] = useState(true);
  const [handRaised, setHandRaised] = useState(false);

  const classroom = useClassroom({ roomId, name, role });

  const {
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
    mySocketId,
    isTeacher,
    socket,
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
  } = classroom;

  // Sync handRaised state with raisedHands list
  useEffect(() => {
    if (mySocketId) {
      setHandRaised(raisedHands.includes(mySocketId));
    }
  }, [raisedHands, mySocketId]);

  function handleLeave() {
    router.push("/");
  }

  function handleRaiseHand() {
    raiseHand();
    setHandRaised(true);
  }

  function handleLowerHand(targetId) {
    lowerHand(targetId || mySocketId);
    if (!targetId || targetId === mySocketId) setHandRaised(false);
  }

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "var(--bg)",
    }}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        height: "48px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: "12px",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px",
            background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px",
          }}>🎓</div>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", fontSize: "14px" }}>
            Samvaad
          </span>
        </div>

        {/* Room info */}
        <div style={{
          height: "28px", width: "1px", background: "var(--border)", margin: "0 4px"
        }} />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "12px",
          color: "var(--text-dim)", letterSpacing: "0.1em",
        }}>
          {roomId}
        </span>

        {/* Role badge */}
        <span className={`badge ${isTeacher ? "badge-teacher" : "badge-student"}`}>
          {isTeacher ? "Teacher" : "Student"}
        </span>

        {/* Connection status */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "4px" }}>
          <div style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: isConnected ? "var(--green)" : "var(--red)",
            boxShadow: isConnected ? "0 0 6px var(--green)" : "none",
          }} />
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            {isConnected ? "Live" : "Connecting…"}
          </span>
        </div>

        {/* Right side: tab switcher + sidebar toggle */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Theme picker */}
          <ThemePicker trigger="icon" />
          {/* Tab buttons */}
          <div style={{
            display: "flex", background: "var(--surface2)",
            borderRadius: "8px", padding: "2px",
            border: "1px solid var(--border)",
          }}>
            {[TABS.CHAT, TABS.WHITEBOARD].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "4px 12px", borderRadius: "6px", border: "none",
                  cursor: "pointer", fontSize: "12px", fontWeight: "500",
                  background: activeTab === tab ? "var(--accent)" : "transparent",
                  color: activeTab === tab ? "#fff" : "var(--text-dim)",
                  transition: "all 0.15s",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {tab === TABS.CHAT ? "💬 Chat" : "✏️ Board"}
              </button>
            ))}
          </div>

          <button
            className="btn btn-ghost"
            onClick={() => setShowSidebar(!showSidebar)}
            style={{ padding: "4px 10px", fontSize: "12px" }}
          >
            👥 {participants.length}
          </button>
        </div>
      </div>

      {/* ── Main body ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Participants sidebar */}
        {showSidebar && (
          <ParticipantsSidebar
            participants={participants}
            raisedHands={raisedHands}
            mySocketId={mySocketId}
            isTeacher={isTeacher}
            onMuteStudent={muteStudent}
            onLowerHand={handleLowerHand}
          />
        )}

        {/* Video area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <VideoGrid
            participants={participants}
            remoteStreams={remoteStreams}
            localStream={localStream}
            mySocketId={mySocketId}
            teacherSocketId={teacherSocketId}
            raisedHands={raisedHands}
            isTeacher={isTeacher}
            onMuteStudent={muteStudent}
            isScreenSharing={isScreenSharing}
            screenStream={screenStream}
          />
        </div>

        {/* Right panel: Chat or Whiteboard */}
        <div style={{
          width: "320px", flexShrink: 0,
          display: "flex", flexDirection: "column",
          borderLeft: "1px solid var(--border)",
          overflow: "hidden",
        }}>
          {activeTab === TABS.CHAT ? (
            <ChatPanel
              messages={chatMessages}
              onSend={sendChatMessage}
              mySocketId={mySocketId}
              participants={participants}
            />
          ) : (
            <Whiteboard
              roomId={roomId}
              emitDraw={emitDraw}
              emitClear={emitClear}
              socket={socket}
            />
          )}
        </div>
      </div>

      {/* ── Control bar ─────────────────────────────────────────────────── */}
      <ControlBar
        isTeacher={isTeacher}
        videoEnabled={videoEnabled}
        audioEnabled={audioEnabled}
        isScreenSharing={isScreenSharing}
        handRaised={handRaised}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        onRaiseHand={handleRaiseHand}
        onLowerHand={() => handleLowerHand(mySocketId)}
        onLeave={handleLeave}
        roomId={roomId}
      />
    </div>
  );
}
