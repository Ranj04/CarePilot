// PHASE A0 PLACEHOLDER — owned by Track B (frontend).
// Track A only created this so the app boots. Track B replaces it with the chat UI.
export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 40, maxWidth: 640 }}>
      <h1>CarePilot</h1>
      <p>Backend scaffold is live. Chat UI is owned by Track B.</p>
      <p style={{ color: "#666", fontSize: 14 }}>
        Mock API: <code>POST /api/chat</code>, <code>POST /api/seed</code>
      </p>
      <p style={{ color: "#999", fontSize: 12 }}>
        Not medical advice. Call 911 in an emergency.
      </p>
    </main>
  );
}
