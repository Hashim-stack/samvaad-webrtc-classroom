"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme, THEMES } from "@/lib/ThemeContext";

export default function ThemePicker({ trigger = "icon" }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (open && dialogRef.current && !dialogRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        className="btn btn-ghost"
        onClick={() => setOpen(!open)}
        style={{
          padding: trigger === "icon" ? "6px 10px" : "6px 12px",
          fontSize: "12px",
          gap: "6px",
        }}
        title="Change theme"
      >
        {/* Mini swatch strip */}
        <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
          {current.preview.map((color, i) => (
            <div
              key={i}
              style={{
                width: i === 2 ? "10px" : "7px",
                height: "14px",
                borderRadius: "3px",
                background: color,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>
        {trigger !== "icon" && (
          <span style={{ color: "var(--text-dim)" }}>{current.name}</span>
        )}
        <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>▾</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div style={{
            position: "fixed", inset: 0, zIndex: 99,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
          }} />

          <div
            ref={dialogRef}
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              background: "var(--surface)",
              border: "1px solid var(--border2)",
              borderRadius: "16px",
              padding: "24px",
              width: "380px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
            className="fade-in"
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "20px",
            }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>
                  🎨 Choose Theme
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
                  Saved automatically for future sessions
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  borderRadius: "8px", width: "28px", height: "28px",
                  cursor: "pointer", color: "var(--text-dim)", fontSize: "14px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Theme grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}>
              {THEMES.map((t) => {
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id); setOpen(false); }}
                    style={{
                      background: isActive ? "var(--accent-glow)" : "var(--surface2)",
                      border: `2px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "12px",
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      transition: "all 0.15s ease",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.borderColor = "var(--border2)";
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.borderColor = "var(--border)";
                    }}
                  >
                    {/* Color swatch */}
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "8px",
                      overflow: "hidden", flexShrink: 0,
                      display: "flex", flexDirection: "column",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      <div style={{ flex: 1, background: t.preview[0] }} />
                      <div style={{ flex: 1, background: t.preview[1] }} />
                      <div style={{
                        height: "8px", background: t.preview[2],
                        boxShadow: `0 0 8px ${t.preview[2]}80`,
                      }} />
                    </div>

                    <div>
                      <div style={{
                        fontSize: "12px", fontWeight: "600",
                        color: isActive ? "var(--accent)" : "var(--text)",
                        display: "flex", alignItems: "center", gap: "4px",
                      }}>
                        {t.emoji} {t.name}
                        {isActive && (
                          <span style={{
                            fontSize: "9px", background: "var(--accent)",
                            color: "#fff", padding: "1px 5px", borderRadius: "4px",
                            fontWeight: "700",
                          }}>ON</span>
                        )}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                        {t.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
