"use client";

import { useRef, useEffect, useState } from "react";

/**
 * Whiteboard component
 *
 * Receives:
 *  - emitDraw(drawData)   — sends a stroke to the server (from useClassroom)
 *  - emitClear()          — sends a clear event to the server
 *  - registerDrawHandlers(onDraw, onClear) — registers canvas callbacks
 *    with the parent hook so the socket listener (already alive) can call
 *    them directly. This avoids the "socket is null at render time" problem.
 */
export default function Whiteboard({ emitDraw, emitClear, registerDrawHandlers }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#60a5fa");
  const [lineWidth, setLineWidth] = useState(3);

  // ── Register canvas draw handlers with the hook on mount ─────────────────
  // The hook's socket listener will call these directly whenever a remote
  // whiteboard-draw or whiteboard-clear event arrives.
  useEffect(() => {
    if (!registerDrawHandlers) return;

    registerDrawHandlers(
      // onRemoteDraw
      (drawData) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        drawSegment(ctx, drawData.from, drawData.to, drawData.color, drawData.lineWidth, drawData.isEraser);
      },
      // onRemoteClear
      () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      }
    );

    return () => {
      registerDrawHandlers(null, null);
    };
  }, [registerDrawHandlers]);

  // ── Drawing helpers ───────────────────────────────────────────────────────
  function drawSegment(ctx, from, to, strokeColor, width, isEraser) {
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isEraser ? width * 4 : width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function getCanvasPos(e, canvas) {
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

  function onPointerDown(e) {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getCanvasPos(e, canvasRef.current);
  }

  function onPointerMove(e) {
    e.preventDefault();
    if (!isDrawing.current || !lastPos.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getCanvasPos(e, canvas);
    const from = lastPos.current;
    const isEraser = tool === "eraser";

    drawSegment(ctx, from, pos, color, lineWidth, isEraser);
    emitDraw?.({ from, to: pos, color, lineWidth, isEraser });
    lastPos.current = pos;
  }

  function onPointerUp() {
    isDrawing.current = false;
    lastPos.current = null;
  }

  function clearCanvas() {
    canvasRef.current?.getContext("2d").clearRect(0, 0, 1200, 900);
    emitClear?.();
  }

  const colors = [
    "#60a5fa","#34d399","#f87171","#fbbf24",
    "#a78bfa","#fb923c","#f472b6","#ffffff","#1e293b",
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--surface)",
    }}>
      {/* Toolbar */}
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap",
        background: "var(--surface2)",
      }}>
        <span style={{ fontSize: "13px", fontWeight: "700" }}>✏️</span>

        <button
          className={`btn ${tool === "pen" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTool("pen")}
          style={{ padding: "4px 10px", fontSize: "11px" }}
        >Pen</button>

        <button
          className={`btn ${tool === "eraser" ? "btn-warning" : "btn-ghost"}`}
          onClick={() => setTool("eraser")}
          style={{ padding: "4px 10px", fontSize: "11px" }}
        >Eraser</button>

        <div style={{ width: "1px", height: "18px", background: "var(--border)" }} />

        {colors.map((c) => (
          <button
            key={c}
            onClick={() => { setColor(c); setTool("pen"); }}
            style={{
              width: "18px", height: "18px", borderRadius: "50%",
              background: c, padding: 0, cursor: "pointer",
              border: `2px solid ${color === c && tool === "pen" ? "var(--text)" : "rgba(255,255,255,0.15)"}`,
              transform: color === c && tool === "pen" ? "scale(1.25)" : "scale(1)",
              transition: "transform 0.1s",
              boxShadow: color === c && tool === "pen" ? "0 0 0 1px var(--accent)" : "none",
            }}
          />
        ))}

        <div style={{ width: "1px", height: "18px", background: "var(--border)" }} />

        <select
          value={lineWidth}
          onChange={e => setLineWidth(Number(e.target.value))}
          style={{
            background: "var(--surface)", color: "var(--text)",
            border: "1px solid var(--border)", borderRadius: "6px",
            padding: "3px 6px", fontSize: "11px",
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
          style={{ padding: "4px 10px", fontSize: "11px", marginLeft: "auto" }}
        >Clear All</button>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: "hidden", padding: "10px" }}>
        <canvas
          ref={canvasRef}
          width={1200}
          height={900}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
          style={{
            width: "100%", height: "100%", display: "block",
            background: "#0d1117",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            cursor: tool === "eraser" ? "cell" : "crosshair",
            touchAction: "none",
          }}
        />
      </div>
    </div>
  );
}
