"use client";

export default function ControlBar({
  isTeacher,
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  handRaised,
  onToggleVideo,
  onToggleAudio,
  onScreenShare,
  onStopScreenShare,
  onRaiseHand,
  onLowerHand,
  onLeave,
  roomId,
}) {
  function copyRoomId() {
    navigator.clipboard.writeText(roomId).catch(() => {});
  }

  return (
    <div style={{
      height: "60px",
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      gap: "8px",
      flexShrink: 0,
    }}>
      {/* Left: Room ID */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "160px" }}>
        <button
          onClick={copyRoomId}
          className="btn btn-ghost"
          style={{ padding: "5px 10px", fontSize: "11px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
          title="Click to copy room ID"
        >
          📋 {roomId}
        </button>
      </div>

      {/* Center: Media controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Mic */}
        <ControlButton
          active={audioEnabled}
          onClick={onToggleAudio}
          activeIcon="🎙️"
          inactiveIcon="🔇"
          activeLabel="Mic On"
          inactiveLabel="Mic Off"
          inactiveDanger
        />

        {/* Camera */}
        <ControlButton
          active={videoEnabled}
          onClick={onToggleVideo}
          activeIcon="📷"
          inactiveIcon="📷"
          activeLabel="Cam On"
          inactiveLabel="Cam Off"
          inactiveDanger
        />

        {/* Screen share (teacher only) */}
        {isTeacher && (
          isScreenSharing ? (
            <button
              className="btn btn-danger"
              onClick={onStopScreenShare}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              🖥️ Stop Share
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={onScreenShare}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              🖥️ Share Screen
            </button>
          )
        )}

        {/* Raise hand (students only) */}
        {!isTeacher && (
          handRaised ? (
            <button
              className="btn btn-warning"
              onClick={onLowerHand}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              ✋ Lower Hand
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={onRaiseHand}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              ✋ Raise Hand
            </button>
          )
        )}
      </div>

      {/* Right: Leave */}
      <div style={{ minWidth: "160px", display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn btn-danger"
          onClick={onLeave}
          style={{ padding: "6px 14px" }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}

function ControlButton({ active, onClick, activeIcon, inactiveIcon, activeLabel, inactiveLabel, inactiveDanger }) {
  return (
    <button
      className={`btn ${active ? "btn-ghost" : inactiveDanger ? "btn-danger" : "btn-ghost"}`}
      onClick={onClick}
      style={{ padding: "6px 12px", fontSize: "12px", minWidth: "90px" }}
    >
      {active ? activeIcon : inactiveIcon}
      {" "}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
