"use client";

export default function ParticipantsSidebar({
  participants,
  raisedHands,
  mySocketId,
  isTeacher,
  onMuteStudent,
  onLowerHand,
}) {
  const teacher = participants.find((p) => p.role === "teacher");
  const students = participants.filter((p) => p.role === "student");

  return (
    <div style={{
      width: "220px", flexShrink: 0,
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        fontWeight: "600", fontSize: "13px",
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <span>👥</span> Participants
        <span style={{
          marginLeft: "auto",
          background: "var(--accent)",
          color: "#fff",
          borderRadius: "12px",
          padding: "1px 7px",
          fontSize: "11px",
        }}>
          {participants.length}
        </span>
      </div>

      {/* Raised hands queue */}
      {raisedHands.length > 0 && (
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--yellow)", marginBottom: "6px", letterSpacing: "0.05em" }}>
            ✋ RAISED HANDS ({raisedHands.length})
          </div>
          {raisedHands.map((sid) => {
            const p = participants.find((x) => x.socketId === sid);
            return (
              <div
                key={sid}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "4px 0",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--text)" }}>
                  {p?.name || "Unknown"}
                </span>
                {isTeacher && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => onLowerHand(sid)}
                    style={{ padding: "2px 6px", fontSize: "10px" }}
                    title="Lower hand"
                  >
                    ↓
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Teacher */}
      {teacher && (
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)", marginBottom: "6px", letterSpacing: "0.05em" }}>
            HOST
          </div>
          <ParticipantRow
            participant={teacher}
            isMe={teacher.socketId === mySocketId}
            raisedHand={raisedHands.includes(teacher.socketId)}
          />
        </div>
      )}

      {/* Students */}
      <div style={{ padding: "10px 12px", flex: 1 }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)", marginBottom: "6px", letterSpacing: "0.05em" }}>
          STUDENTS ({students.length})
        </div>
        {students.length === 0 && (
          <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
            No students yet
          </div>
        )}
        {students.map((p) => (
          <ParticipantRow
            key={p.socketId}
            participant={p}
            isMe={p.socketId === mySocketId}
            raisedHand={raisedHands.includes(p.socketId)}
            isTeacherView={isTeacher}
            onMute={(muted) => onMuteStudent(p.socketId, muted)}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipantRow({ participant, isMe, raisedHand, isTeacherView, onMute }) {
  const initials = participant.name?.[0]?.toUpperCase() || "?";
  const hue = (participant.name?.charCodeAt(0) * 15) % 360;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "5px 0",
    }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%",
        background: `hsl(${hue}, 50%, 25%)`,
        border: `1px solid hsl(${hue}, 50%, 40%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "11px", fontWeight: "700", color: "#fff",
        flexShrink: 0,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "12px", fontWeight: "500",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: "var(--text)",
        }}>
          {participant.name}{isMe ? " (You)" : ""}
        </div>
      </div>

      {raisedHand && <span style={{ fontSize: "13px" }}>✋</span>}

      {isTeacherView && onMute && (
        <button
          className="btn btn-ghost"
          onClick={() => onMute(true)}
          style={{ padding: "2px 4px", fontSize: "10px", opacity: 0.7 }}
          title="Mute student"
        >
          🔇
        </button>
      )}
    </div>
  );
}
