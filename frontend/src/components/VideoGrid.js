"use client";

import VideoTile from "./VideoTile";

export default function VideoGrid({
  participants,
  remoteStreams,
  localStream,
  mySocketId,
  teacherSocketId,
  raisedHands,
  isTeacher,
  onMuteStudent,
  isScreenSharing,
  screenStream,
}) {
  // Teacher's video is always primary/large
  const teacher = participants.find((p) => p.role === "teacher");
  const students = participants.filter((p) => p.role === "student");

  // Determine what to show as the main stream
  const teacherStream =
    teacher?.socketId === mySocketId
      ? isScreenSharing && screenStream
        ? screenStream
        : localStream
      : remoteStreams[teacher?.socketId];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Main teacher video */}
      {teacher && (
        <div style={{ position: "relative" }}>
          <VideoTile
            stream={teacherStream}
            name={teacher.name}
            role="teacher"
            isLocal={teacher.socketId === mySocketId}
            isTeacher
            raisedHand={raisedHands.includes(teacher.socketId)}
          />
          {isScreenSharing && teacher.socketId === mySocketId && (
            <div style={{
              position: "absolute", top: "10px", left: "10px", zIndex: 10,
              background: "rgba(59,130,246,0.9)", color: "#fff",
              borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontWeight: "600",
            }}>
              🖥️ Sharing Screen
            </div>
          )}
        </div>
      )}

      {/* Students grid */}
      {students.length > 0 && (
        <div>
          <div style={{
            fontSize: "11px", fontWeight: "700", color: "var(--text-dim)",
            letterSpacing: "0.05em", marginBottom: "8px",
          }}>
            STUDENTS ({students.length})
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${students.length <= 4 ? "200px" : "160px"}, 1fr))`,
            gap: "8px",
          }}>
            {students.map((p) => {
              const stream = p.socketId === mySocketId
                ? localStream
                : remoteStreams[p.socketId];
              const isMe = p.socketId === mySocketId;
              return (
                <VideoTile
                  key={p.socketId}
                  stream={stream}
                  name={p.name}
                  role="student"
                  isLocal={isMe}
                  raisedHand={raisedHands.includes(p.socketId)}
                  onMute={
                    isTeacher && !isMe
                      ? () => onMuteStudent(p.socketId, true)
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {participants.length <= 1 && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: "var(--text-dim)", gap: "12px",
          padding: "40px",
        }}>
          <div style={{ fontSize: "40px" }}>🕐</div>
          <div style={{ fontWeight: "600", fontSize: "16px" }}>Waiting for others…</div>
          <div style={{ fontSize: "13px" }}>
            Share the room ID with participants to let them join.
          </div>
        </div>
      )}
    </div>
  );
}
