import { useState, useEffect, useRef } from "react";
import { palette, white, green, black, gradients, font, botBubble, eyebrow } from "./constants";

async function loadUserSession(userId) {
  if (userId === "demo-returning") {
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

async function saveMessage(userId, sessionId, role, content) {
  console.log("[LoanCert DB] SAVE MESSAGE", { userId, sessionId, role });
}

async function saveIntakeRecord(userId, sessionId, intakeJson) {
  console.log("[LoanCert DB] SAVE INTAKE", { userId, sessionId, intakeJson });
}

function parseOptions(content) {
  const lines = content.split("\n");
  const optionLines = [];
  const textLines = [];
  const optionPattern = /^\s*(\d+)[.)]\s+(.+)$/;
  let inOptions = false;
  for (const line of lines) {
    if (optionPattern.test(line)) {
      inOptions = true;
      optionLines.push(line.match(optionPattern)[2].trim());
    } else {
      if (inOptions && line.trim() === "") continue;
      if (inOptions) { inOptions = false; }
      textLines.push(line);
    }
  }
  return { text: textLines.join("\n").trim(), options: optionLines };
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
- When a question has discrete choices, ALWAYS list them as a numbered list on separate lines
- NEVER use bullet points for choices
- Free-form questions need no numbered list
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

function buildWelcomeMessage(priorIntake, lastSeen) {
  if (priorIntake) {
    const date = lastSeen ? new Date(lastSeen).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "recently";
    return { role: "assistant", content: `Welcome back - good to see you again.\n\nWhen we last spoke on ${date}, you were targeting ${priorIntake.priceRange} with a ${priorIntake.timeline} timeline. Has anything changed?\n\n1. Nothing changed - let's pick up where we left off\n2. A few things have changed` };
  }
  return { role: "assistant", content: `Hi there - welcome to Buyer Companion by LoanCert.\n\nI'm here to help you understand where you stand as a buyer before you ever talk to a lender. No sales pitch, no credit pull, no pressure.\n\nWhen are you hoping to buy a home?\n\n1. Right away / ASAP\n2. 1-3 months\n3. 3-6 months\n4. 6-12 months\n5. Just exploring for now` };
}

function BotAvatar({ style }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: gradients.brand, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, fontSize: 14, color: palette.white, fontWeight: 700, ...style }}>BC</div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 18px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: palette.accent, animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />)}
    </div>
  );
}

function QuickReplies({ options, onSelect, disabled }) {
  if (!options || options.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginLeft: 44, marginBottom: 16, marginTop: -4 }}>
      {options.map((opt, i) => (
        <button key={i} onClick={() => !disabled && onSelect(`${i + 1}. ${opt}`)} disabled={disabled}
          style={{ display: "flex", alignItems: "center", gap: 7, background: white(0.04), border: `1px solid ${white(0.12)}`, borderRadius: 20, padding: "7px 14px", cursor: disabled ? "not-allowed" : "pointer", color: palette.white, fontSize: 13, opacity: disabled ? 0.35 : 1 }}
          onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = green(0.15); e.currentTarget.style.borderColor = green(0.5); } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = white(0.04); e.currentTarget.style.borderColor = white(0.12); }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: green(0.2), border: `1px solid ${green(0.4)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: palette.brand, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
          {opt}
        </button>
      ))}
    </div>
  );
}

function MessageBubble({ msg, isLatest, onOptionSelect, optionsDisabled }) {
  const isBot = msg.role === "assistant";
  const { text, options } = isBot ? parseOptions(msg.content) : { text: msg.content, options: [] };
  const [displayed, setDisplayed] = useState(isLatest && isBot ? "" : text);
  const [showOptions, setShowOptions] = useState(!isLatest && isBot && options.length > 0);

  useEffect(() => {
    if (!isLatest || !isBot) return;
    setDisplayed(""); setShowOptions(false);
    let i = 0;
    const iv = setInterval(() => { i++; setDisplayed(text.slice(0, i)); if (i >= text.length) { clearInterval(iv); if (options.length > 0) setShowOptions(true); } }, 12);
    return () => clearInterval(iv);
  }, [msg.content, isLatest, isBot]);

  const fmt = (t) => t.split("\n").map((line, i) => <p key={i} style={{ margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />);

  return (
    <>
      <div style={{ display: "flex", justifyContent: isBot ? "flex-start" : "flex-end", marginBottom: isBot && showOptions ? 8 : 16 }}>
        {isBot && <BotAvatar style={{ marginTop: 2 }} />}
        <div style={{ maxWidth: "75%", background: isBot ? botBubble.background : gradients.brand, border: isBot ? botBubble.border : "none", borderRadius: isBot ? "4px 18px 18px 18px" : "18px 4px 18px 18px", padding: "12px 16px", color: palette.white, fontSize: 14, lineHeight: 1.65 }}>
          {fmt(displayed)}
        </div>
      </div>
      {isBot && showOptions && <QuickReplies options={options} onSelect={onOptionSelect} disabled={optionsDisabled} />}
    </>
  );
}

function CompletionCard({ data, onStartVerification }) {
  const fields = [{ label: "Timeline", value: data.timeline }, { label: "Price Range", value: data.priceRange }, { label: "First-Time Buyer", value: data.firstTimeBuyer ? "Yes" : "No" }, { label: "Income Type", value: data.incomeType }, { label: "Credit Range", value: data.creditRange }, { label: "Down Payment", value: data.downPayment }];
  return (
    <div style={{ margin: "24px 0", background: green(0.08), border: `1px solid ${green(0.3)}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: palette.brand, display: "flex", alignItems: "center", justifyContent: "center", color: palette.white }}>✓</div>
        <div><div style={{ fontSize: 16, fontWeight: 700, color: palette.brand }}>INTAKE COMPLETE</div><div style={{ fontSize: 12, color: white(0.5) }}>Buyer Companion Step 1 - Saved to your record</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginBottom: 16 }}>
        {fields.map((f) => <div key={f.label}><div style={{ ...eyebrow, color: white(0.4), marginBottom: 2 }}>{f.label}</div><div style={{ fontSize: 13, color: palette.white }}>{f.value || "-"}</div></div>)}
      </div>
      <div style={{ fontSize: 13, color: white(0.6), marginBottom: 16, lineHeight: 1.6 }}>{data.summary}</div>
      <button onClick={onStartVerification} style={{ width: "100%", padding: "14px 0", background: gradients.brand, border: "none", borderRadius: 10, color: palette.white, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
        START MY LOANCERT VERIFICATION
      </button>
    </div>
  );
}

function DemoSwitcher({ userId, onSwitch }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "10px 14px", background: white(0.03), border: `1px solid ${white(0.06)}`, borderRadius: 10 }}>
      <span style={{ ...eyebrow, color: white(0.3), marginRight: 4, alignSelf: "center" }}>Demo:</span>
      {["demo-new", "demo-returning"].map((id) => (
        <button key={id} onClick={() => onSwitch(id)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, background: userId === id ? palette.brand : white(0.07), color: userId === id ? palette.white : white(0.4) }}>
          {id === "demo-new" ? "New Buyer" : "Returning Buyer"}
        </button>
      ))}
    </div>
  );
}

export default function BuyerCompanion({ userId: propUserId, onComplete, onStartVerify }) {
  const [userId, setUserId] = useState(propUserId || "demo-new");
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const [sessionData, setSessionData] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [completed, setCompleted] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setPageLoading(true); setCompleted(null);
      const data = await loadUserSession(userId);
      if (cancelled) return;
      setSessionData(data);
      setMessages([buildWelcomeMessage(data?.priorIntake, data?.lastSeen)]);
      setPageLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking, completed]);

  const submitMessage = async (text) => {
    if (!text.trim() || thinking || completed) return;
    setInput("");
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setThinking(true);
    saveMessage(userId, sessionId, "user", text);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(sessionData?.priorIntake),
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const replyText = data.content?.find((b) => b.type === "text")?.text || "";
      if (replyText.includes("CONVERSATION_COMPLETE")) {
        const jsonMatch = replyText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            await saveIntakeRecord(userId, sessionId, parsed);
            onComplete?.(userId, sessionId, parsed);
            setCompleted(parsed);
          } catch {}
        }
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: replyText }]);
        saveMessage(userId, sessionId, "assistant", replyText);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong - please try again." }]);
    }
    setThinking(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage(input); } };
  const handleStartVerify = () => {
    onStartVerify?.(userId, sessionId, completed);
    window.open(`https://loancert.floify.com?ref=${sessionId}`, "_blank");
  };
  const lastBotIndex = [...messages].map((m, i) => m.role === "assistant" ? i : -1).filter(i => i >= 0).pop();

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${palette.navy}; font-family: ${font.family}; }
        button, textarea, input { font-family: inherit; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:${white(0.1)};border-radius:4px}
        textarea{resize:none} textarea:focus{outline:none}
      `}</style>
      <div style={{ minHeight: "100vh", background: palette.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 680 }}>
          <DemoSwitcher userId={userId} onSwitch={setUserId} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, background: palette.white, borderRadius: 12, padding: "10px 16px" }}>
            <img src="/loancert-logo.png" alt="LoanCert" style={{ height: 26, display: "block" }} />
            <div style={{ width: 1, height: 28, background: black(0.1) }} />
            <div style={{ fontSize: 13, color: palette.accent, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Buyer Companion</div>
            <div style={{ marginLeft: "auto" }}>
              <div style={{ ...eyebrow, color: black(0.4), textAlign: "right" }}>Step 1 of 3</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {[1,2,3].map((s) => <div key={s} style={{ width: s===1?24:8, height: 4, borderRadius: 4, background: s===1?palette.brand:black(0.1) }} />)}
              </div>
            </div>
          </div>
          <div style={{ background: white(0.02), border: `1px solid ${white(0.06)}`, borderRadius: 20, overflow: "hidden", boxShadow: `0 24px 60px ${black(0.4)}` }}>
            <div style={{ display: "flex", gap: 20, padding: "10px 20px", borderBottom: `1px solid ${white(0.05)}`, background: black(0.2) }}>
              {["No hard credit pull","No lender affiliation","Bank-grade encryption"].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: palette.brand, fontSize: 10 }}>✓</span>
                  <span style={{ fontSize: 10, color: white(0.4) }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 460, overflowY: "auto", padding: "24px 20px 8px" }}>
              {pageLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                  <div style={{ width: 20, height: 20, border: `2px solid ${green(0.3)}`, borderTop: `2px solid ${palette.brand}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ color: white(0.3), fontSize: 13 }}>Loading...</span>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <MessageBubble key={`${userId}-${i}`} msg={msg} isLatest={i === messages.length - 1} onOptionSelect={submitMessage} optionsDisabled={thinking || !!completed || i !== lastBotIndex} />
                  ))}
                  {thinking && (
                    <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
                      <BotAvatar />
                      <div style={{ ...botBubble, borderRadius: "4px 18px 18px 18px" }}><TypingIndicator /></div>
                    </div>
                  )}
                  {completed && <CompletionCard data={completed} onStartVerification={handleStartVerify} />}
                </>
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${white(0.06)}`, background: black(0.15), display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} disabled={thinking || !!completed || pageLoading}
                placeholder={completed ? "Intake complete" : "Tap a choice above or type your answer..."}
                rows={1} style={{ flex: 1, background: white(0.05), border: `1px solid ${white(0.1)}`, borderRadius: 12, padding: "12px 16px", color: palette.white, fontSize: 14, lineHeight: 1.5, opacity: (completed||pageLoading)?0.4:1 }}
                onFocus={(e) => e.target.style.borderColor=green(0.5)} onBlur={(e) => e.target.style.borderColor=white(0.1)} />
              <button onClick={() => submitMessage(input)} disabled={thinking||!input.trim()||!!completed||pageLoading}
                style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: input.trim()&&!thinking&&!completed?gradients.brand:white(0.08), color: palette.white, cursor: input.trim()&&!thinking&&!completed?"pointer":"not-allowed", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: white(0.2) }}>
            LoanCert Inc. 2025 · Independent Buyer Verification · Not a lender · No credit decisions made here
          </div>
        </div>
      </div>
    </>
  );
}
