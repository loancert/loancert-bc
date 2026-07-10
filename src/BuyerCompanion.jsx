import { useState, useEffect, useRef } from "react";
import { palette, white, green, black, gradients, font, botBubble, eyebrow } from "./constants";
import { loadUserSession, saveMessage, saveIntakeRecord, sendChat } from "./api";
import BotAvatar from "./components/BotAvatar";
import TypingIndicator from "./components/TypingIndicator";
import MessageBubble from "./components/MessageBubble";
import CompletionCard from "./components/CompletionCard";
import DemoSwitcher from "./components/DemoSwitcher";

const GLOBAL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${palette.navy}; font-family: ${font.family}; }
  button, textarea, input { font-family: inherit; }
  @keyframes bounce { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:${white(0.1)};border-radius:4px}
  textarea{resize:none} textarea:focus{outline:none}
`;

function buildWelcomeMessage(priorIntake, lastSeen) {
  if (priorIntake) {
    const date = lastSeen ? new Date(lastSeen).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "recently";
    return { role: "assistant", content: `Welcome back - good to see you again.\n\nWhen we last spoke on ${date}, you were targeting ${priorIntake.priceRange} with a ${priorIntake.timeline} timeline. Has anything changed?\n[[OPTIONS]] ["Nothing changed - let's pick up where we left off","A few things have changed"]` };
  }
  return { role: "assistant", content: `Hi there - welcome to Buyer Companion by LoanCert.\n\nI'm here to help you understand where you stand as a buyer before you ever talk to a lender. No sales pitch, no credit pull, no pressure.\n\nWhen are you hoping to buy a home?\n[[OPTIONS]] ["Right away / ASAP","1-3 months","3-6 months","6-12 months","Just exploring for now"]` };
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
      const data = await sendChat(sessionData?.priorIntake, newMessages);
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
    window.open(`https://loancert.floify.com?ref=${sessionId}`, "_blank", "noopener,noreferrer");
  };
  const lastBotIndex = messages.findLastIndex((m) => m.role === "assistant");

  return (
    <>
      <style>{GLOBAL_CSS}</style>
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
