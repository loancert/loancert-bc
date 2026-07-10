// api/chat.js — serverless proxy to Anthropic.
// The system prompt is built server-side and the client-supplied `system` is ignored,
// so this endpoint can only ever run the Buyer Companion intake — not an arbitrary prompt.

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1000;
const MAX_MESSAGES = 50;
const MAX_CONTENT_CHARS = 4000;

// Basic in-memory rate limit. NOTE: serverless instances don't share memory and a
// cold start resets this, so it's best-effort — it stops casual hammering of a warm
// instance but is not a substitute for a shared store (e.g. Upstash/Redis).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}

// Only these fields are accepted from the client's prior-intake record, each coerced to
// a short string — prevents prompt bloat / injection via an oversized `priorIntake`.
const INTAKE_FIELDS = ["timeline", "priceRange", "firstTimeBuyer", "incomeType", "creditRange", "downPayment", "summary"];

function sanitizeIntake(raw) {
  if (!raw || typeof raw !== "object") return null;
  const clean = {};
  for (const f of INTAKE_FIELDS) {
    if (raw[f] === undefined) continue;
    clean[f] = typeof raw[f] === "boolean" ? raw[f] : String(raw[f]).slice(0, 500);
  }
  return Object.keys(clean).length ? clean : null;
}

function buildSystemPrompt(priorIntake) {
  const base = `You are the Buyer Companion, the AI-powered readiness guide from LoanCert. Walk a homebuyer through a warm intake conversation to assess their readiness. You are NOT a lender. No credit decisions, no loan approvals, no rate quotes. Tone: warm, confident, encouraging.
MORTGAGE EDUCATION:
- If the buyer asks an off-script question about mortgages, home buying, loans, credit, insurance, or real estate, answer it clearly and helpfully in 3-5 sentences. Use plain language, no jargon.
- Examples: "What is an FHA loan?", "How does PMI work?", "What's a good credit score?", "What is DTI?"
- After answering, naturally bring them back to the intake with a phrase like "Now back to where we were..." or "Does that help clarify things? Let's continue..."
- Never refuse a genuine home buying question. Education builds trust.
- You can reference LoanCert's verification process when relevant — for example, if asked about income verification, mention that LoanCert verifies income independently before a lender ever sees it.
- Still never make rate quotes, loan approvals, or lender recommendations.
FORMATTING RULES:
- When a question has discrete choices, put the question in prose, then on the LAST line output the literal marker [[OPTIONS]] followed by a single-line JSON array of the choice labels. Example:
  What is your timeline?
  [[OPTIONS]] ["Right away / ASAP","1-3 months","Just exploring"]
- The numbered choices listed in the flow below are for your reference — always present them to the buyer using the [[OPTIONS]] format, never as a numbered or bulleted list in the prose.
- Free-form questions have no [[OPTIONS]] line.
- One question at a time. Always.
- Never say "Great!", "Awesome!", "Absolutely!"
- Keep messages under 120 words
- When buyer confirms ready, respond CONVERSATION_COMPLETE then immediately this exact JSON:
{"timeline":"...","priceRange":"...","firstTimeBuyer":true,"incomeType":"...","creditRange":"...","downPayment":"...","summary":"..."}`;

  if (priorIntake) {
    return `${base}

RETURNING USER PRIOR DATA:
${JSON.stringify(priorIntake, null, 2)}

Welcome them back referencing their prior data. Ask if anything changed. Skip already-answered questions unless they signal a change.`;
  }

  return `${base}

NEW USER FLOW:
Step 1 - Welcome shown in UI, skip it.
Step 2 - Purchase Timeline:
1. Right away / ASAP
2. 1-3 months
3. 3-6 months
4. 6-12 months
5. Just exploring

Step 3 - Price Range. Free-form.

Step 4 - First-Time Buyer:
1. First-time buyer
2. I have purchased before

Step 5 - Income Type:
1. W-2 employee
2. Self-employed / 1099
3. Retired / fixed income
4. Combination
5. Other

Step 6 - Credit Awareness:
1. Excellent 740 or above
2. Good 680 to 739
3. Fair 620 to 679
4. Not sure

Step 7 - Down Payment. Free-form.

Step 8 - Summary then ask:
1. Yes lets do it
2. I have a question first`;
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser callers send no Origin; other layers still apply
  const allow = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const o = new URL(origin);
    if (req.headers.host && o.host === req.headers.host) return true; // same-origin
    if (allow.includes(origin)) return true;
  } catch {}
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!originAllowed(req)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const { messages, priorIntake } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: "Invalid messages" });
  }
  const cleanMessages = [];
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return res.status(400).json({ error: "Invalid message shape" });
    }
    cleanMessages.push({ role: m.role, content: m.content.slice(0, MAX_CONTENT_CHARS) });
  }

  // Anthropic requires the first message to be a user turn. Drop any leading
  // assistant messages (the UI welcome, which the system prompt says to skip).
  while (cleanMessages.length && cleanMessages[0].role === "assistant") {
    cleanMessages.shift();
  }
  if (cleanMessages.length === 0) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  const system = buildSystemPrompt(sanitizeIntake(priorIntake));

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: cleanMessages,
      }),
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error("[LoanCert] Anthropic error:", rawText);
      return res.status(response.status).json({ error: "Upstream error" });
    }

    return res.status(200).json(JSON.parse(rawText));
  } catch (error) {
    console.error("[LoanCert] Handler error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
}
