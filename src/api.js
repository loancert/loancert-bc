// src/api.js — the app's data / backend layer.
// loadUserSession / saveMessage / saveIntakeRecord are stubs for a future database.
// sendChat posts the conversation to the serverless /api/chat proxy.

// Demo user ids (removed with the DemoSwitcher in production). Single source of truth.
export const DEMO_NEW = "demo-new";
export const DEMO_RETURNING = "demo-returning";

export async function loadUserSession(userId) {
  if (userId === DEMO_RETURNING) {
    return {
      priorIntake: {
        timeline: "3–6 months",
        priceRange: "$450,000–$520,000 in Sacramento area",
        firstTimeBuyer: true,
        incomeType: "W-2 employee",
        creditRange: "Good 680–739",
        downPayment: "~$25,000 saved, exploring DPA options",
        summary: "You're a first-time buyer with stable W-2 income targeting the Sacramento market in a 3–6 month window. Your down payment is a work in progress but you're aware of assistance programs.",
      },
      messageHistory: [],
      sessionCount: 1,
      lastSeen: "2025-12-10T14:32:00Z",
    };
  }
  return null;
}

export async function saveMessage(userId, sessionId, role, content) {
  console.log("[LoanCert DB] SAVE MESSAGE", { userId, sessionId, role, preview: String(content).slice(0, 60) });
}

export async function saveIntakeRecord(userId, sessionId, intakeJson) {
  console.log("[LoanCert DB] SAVE INTAKE", { userId, sessionId, intakeJson });
}

export async function sendChat(priorIntake, messages) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priorIntake,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!response.ok) throw new Error(`Chat request failed (${response.status})`);
  return response.json();
}
