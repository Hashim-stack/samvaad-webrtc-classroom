"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";

export default function Whiteboard({ roomId, emitDraw, emitClear, socket }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [tool, setTool] = useState("pen"); // pen | eraser
  const [color, setColor] = useState("#60a5fa");
  const [lineWidth, setLineWidth] = useState(3);

  // ── Draw locally ─────────────────────────────────────────────────────────
  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function drawLine(ctx, from, to, drawColor, width, isEraser) {
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = isEraser ? width * 4 : width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function onMouseDown(e) {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
  }

  function onMouseMove(e) {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    const from = lastPos.current;

    drawLine(ctx, from, pos, color, lineWidth, tool === "eraser");

    const drawData = { from, to: pos, color, lineWidth, isEraser: tool === "eraser" };
    emitDraw(drawData);
    lastPos.current = pos;
  }

  function onMouseUp(e) {
    isDrawing.current = false;
    lastPos.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    emitClear();
  }

  // ── Listen for remote draw events ─────────────────────────────────────────
  useEffect(() => {
    const s = socket || getSocket();

    function onRemoteDraw({ drawData }) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      drawLine(ctx, drawData.from, drawData.to, drawData.color, drawData.lineWidth, drawData.isEraser);
    }

    function onRemoteClear() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    s.on("whiteboard-draw", onRemoteDraw);
    s.on("whiteboard-clear", onRemoteClear);

    return () => {
      s.off("whiteboard-draw", onRemoteDraw);
      s.off("whiteboard-clear", onRemoteClear);
    };
  }, [socket]);

  const colors = ["#60a5fa", "#34d399", "#f87171", "#fbbf24", "#a78bfa", "#fb923c", "#ffffff", "#1e293b"];

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--surface)", borderLeft: "1px solid var(--border)",
    }}>
      {/* Toolbar */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: "13px", fontWeight: "600", marginRight: "4px" }}>✏️ Board</span>

        <button
          className={`btn ${tool === "pen" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTool("pen")}
          style={{ padding: "5px 10px", fontSize: "12px" }}
        >
          Pen
        </button>
        <button
          className={`btn ${tool === "eraser" ? "btn-warning" : "btn-ghost"}`}
          onClick={() => setTool("eraser")}
          style={{ padding: "5px 10px", fontSize: "12px" }}
        >
          Eraser
        </button>

        {/* Color swatches */}
        <div style={{ display: "flex", gap: "4px", alignItems: "center", marginLeft: "4px" }}>
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              style={{
                width: "20px", height: "20px", borderRadius: "50%",
                background: c, border: `2px solid ${color === c ? "#fff" : "transparent"}`,
                cursor: "pointer", padding: 0,
                boxShadow: color === c ? "0 0 0 1px var(--accent)" : "none",
              }}
            />
          ))}
        </div>

        {/* Line width */}
        <select
          value={lineWidth}
          onChange={e => setLineWidth(Number(e.target.value))}
          style={{
            background: "var(--surface2)", color: "var(--text)",
            border: "1px solid var(--border)", borderRadius: "6px",
            padding: "4px 6px", fontSize: "12px",
          }}
        >
          <option value={2}>Thin</option>
          <option value={4}>Medium</option>
          <option value={8}>Thick</option>
          <option value={16}>Bold</option>
        </select>

        <button
          className="btn btn-danger"
          onClick={clearCanvas}
          style={{ padding: "5px 10px", fontSize: "12px", marginLeft: "auto" }}
        >
          Clear
        </button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, padding: "12px", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
          style={{
            width: "100%", height: "100%",
            background: "#0f1520",
            borderRadius: "8px",
            cursor: tool === "eraser" ? "cell" : "crosshair",
            border: "1px solid var(--border)",
            display: "block",
            touchAction: "none",
          }}
        />
      </div>
    </div>
  );
}
