"use client";

import { useState, useRef, useEffect } from "react";

export default function ChatPanel({ messages, onSend, mySocketId, participants }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const msg = input.trim();
    if (!msg) return;
    onSend(msg);
    setInput("");
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--surface)", borderLeft: "1px solid var(--border)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        fontWeight: "600",
        fontSize: "13px",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <span>💬</span> Chat
        <span style={{
          marginLeft: "auto",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "2px 8px",
          fontSize: "11px",
          color: "var(--text-dim)",
        }}>
          {messages.length}
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px",
        display: "flex", flexDirection: "column", gap: "8px",
      }}>
        {messages.length === 0 && (
          <div style={{ color: "var(--text-dim)", fontSize: "12px", textAlign: "center", marginTop: "20px" }}>
            No messages yet. Say hello! 👋
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === mySocketId;
          return (
            <div
              key={msg.id}
              className="fade-in"
              style={{
                display: "flex", flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
              }}
            >
              {!isMe && (
                <span style={{ fontSize: "10px", color: "var(--text-dim)", marginBottom: "2px" }}>
                  {msg.senderName}
                  {msg.role === "teacher" && (
                    <span style={{ color: "var(--accent)", marginLeft: "4px" }}>· Host</span>
                  )}
                </span>
              )}
              <div style={{
                maxWidth: "85%",
                padding: "7px 12px",
                borderRadius: isMe ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                background: isMe ? "var(--accent)" : "var(--surface2)",
                color: isMe ? "#fff" : "var(--text)",
                fontSize: "13px",
                lineHeight: "1.4",
                border: isMe ? "none" : "1px solid var(--border)",
                wordBreak: "break-word",
              }}>
                {msg.message}
              </div>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px",
        borderTop: "1px solid var(--border)",
        display: "flex", gap: "8px",
      }}>
        <input
          className="input"
          placeholder="Type a message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          style={{ fontSize: "13px" }}
        />
        <button
          className="btn btn-primary"
          onClick={send}
          disabled={!input.trim()}
          style={{ padding: "8px 12px", flexShrink: 0 }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
