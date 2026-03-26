"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemePicker from "@/components/ThemePicker";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Enter your name first."); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/create-room`
      );
      const { roomId } = await res.json();
      router.push(`/room/${roomId}?name=${encodeURIComponent(name.trim())}&role=teacher`);
    } catch {
      setError("Failed to create room. Is the backend running?");
      setLoading(false);
    }
  }

  function handleJoin() {
    if (!name.trim()) { setError("Enter your name first."); return; }
    if (!roomId.trim()) { setError("Enter a room ID."); return; }
    router.push(`/room/${roomId.trim().toUpperCase()}?name=${encodeURIComponent(name.trim())}&role=student`);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px),
                          linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        opacity: 0.4,
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: "420px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "64px", height: "64px",
            background: "var(--accent)",
            borderRadius: "16px",
            marginBottom: "16px",
            boxShadow: "0 0 40px var(--accent-glow)",
          }}>
            <span style={{ fontSize: "28px" }}>🎓</span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-mono)",
            fontSize: "28px",
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}>Samvaad</h1>
          <p style={{ color: "var(--text-dim)", marginTop: "6px", fontSize: "13px" }}>
            Peer-to-peer video learning — no servers in the middle.
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: "16px", padding: "32px", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5", borderRadius: "8px", padding: "10px 14px",
              marginBottom: "16px", fontSize: "13px",
            }}>{error}</div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-dim)", marginBottom: "6px", fontWeight: 600 }}>
              YOUR NAME
            </label>
            <input
              className="input"
              placeholder="e.g. Ms. Rivera"
              value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
            <button
              className="btn"
              onClick={handleCreate}
              disabled={loading}
              style={{
                flex: 1, justifyContent: "center",
                background: "var(--accent)", color: "#fff",
                padding: "12px",
              }}
            >
              {loading ? "Creating…" : "✦ Create Room"}
            </button>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            marginBottom: "20px", color: "var(--text-dim)", fontSize: "12px",
          }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            or join existing
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-dim)", marginBottom: "6px", fontWeight: 600 }}>
              ROOM ID
            </label>
            <input
              className="input"
              placeholder="e.g. A3F7B2C1"
              value={roomId}
              onChange={e => { setRoomId(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
            />
          </div>

          <button
            className="btn btn-ghost"
            onClick={handleJoin}
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
          >
            Join as Student
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", color: "var(--text-muted)", fontSize: "12px" }}>
          WebRTC · Socket.io · No media servers
        </p>

        {/* Theme picker at the bottom of the card */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
          <ThemePicker trigger="full" />
        </div>
      </div>

      {/* Fixed top-right theme picker shortcut */}
      <div style={{ position: "fixed", top: "16px", right: "16px", zIndex: 50 }}>
        <ThemePicker trigger="icon" />
      </div>
    </div>
  );
}
