"use client";

import { useEffect, useRef } from "react";

export default function VideoTile({
  stream,
  name,
  role,
  isMuted = false,
  isLocal = false,
  isTeacher = false,
  raisedHand = false,
  noVideo = false,
  onMute,
  small = false,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const tileSize = small
    ? { width: "140px", height: "90px" }
    : { width: "100%", paddingBottom: "56.25%", position: "relative" };

  return (
    <div
      className="video-tile"
      style={{
        position: "relative",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#0d111a",
        border: `1px solid ${isTeacher ? "var(--accent)" : "var(--border)"}`,
        boxShadow: isTeacher ? "0 0 20px var(--accent-glow)" : "none",
        ...(small
          ? { width: "140px", height: "90px", flexShrink: 0 }
          : { width: "100%", aspectRatio: "16/9" }),
      }}
    >
      {/* Video element */}
      {stream && !noVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isMuted}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            display: "block",
            borderRadius: "10px",
            transform: isLocal ? "scaleX(-1)" : "none",
          }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #0f1520 0%, #0a0d12 100%)",
          minHeight: small ? "90px" : "140px",
        }}>
          <div style={{
            width: small ? "36px" : "52px",
            height: small ? "36px" : "52px",
            borderRadius: "50%",
            background: `hsl(${name?.charCodeAt(0) * 15 % 360}, 50%, 25%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: small ? "14px" : "20px",
            fontWeight: "700",
            color: "#fff",
            border: `2px solid hsl(${name?.charCodeAt(0) * 15 % 360}, 50%, 40%)`,
          }}>
            {name?.[0]?.toUpperCase() || "?"}
          </div>
        </div>
      )}

      {/* Raised hand indicator */}
      {raisedHand && (
        <div
          className="hand-pulse"
          style={{
            position: "absolute", top: "8px", right: "8px",
            zIndex: 10,
            background: "var(--yellow)",
            borderRadius: "50%",
            width: "28px", height: "28px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px",
          }}
        >
          ✋
        </div>
      )}

      {/* Name tag */}
      <div style={{
        position: "absolute", bottom: "0", left: "0", right: "0",
        padding: small ? "16px 6px 4px" : "28px 10px 6px",
        background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{
            color: "#fff",
            fontSize: small ? "10px" : "12px",
            fontWeight: "600",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            maxWidth: small ? "80px" : "140px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {name || "Unknown"}{isLocal ? " (You)" : ""}
          </span>
          {isTeacher && !small && (
            <span style={{
              background: "var(--accent)", color: "#fff",
              fontSize: "9px", padding: "1px 5px", borderRadius: "4px",
              fontWeight: "700", letterSpacing: "0.05em",
            }}>
              HOST
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "4px" }}>
          {isMuted && (
            <span style={{ fontSize: "11px" }}>🔇</span>
          )}
          {onMute && !small && (
            <button
              onClick={onMute}
              className="btn"
              style={{ padding: "2px 6px", fontSize: "10px", background: "rgba(0,0,0,0.5)" }}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
