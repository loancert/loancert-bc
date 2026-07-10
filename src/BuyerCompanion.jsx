import { useState, useEffect, useRef } from "react";
import { loadUserSession, saveMessage, saveIntakeRecord, sendChat } from "./api";
import BotAvatar from "./components/BotAvatar";
import TypingIndicator from "./components/TypingIndicator";
import MessageBubble from "./components/MessageBubble";
import CompletionCard from "./components/CompletionCard";
import DemoSwitcher from "./components/DemoSwitcher";
import styles from "./BuyerCompanion.module.css";

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

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }, [messages, thinking, completed]);

  // Auto-grow the input: one line when empty, grows as you type, scrolls past the max.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 120;
    el.style.height = Math.min(el.scrollHeight, max) + "px";
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [input]);

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
  const canSend = !!input.trim() && !thinking && !completed && !pageLoading;
  const inputDim = !!completed || pageLoading;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DemoSwitcher userId={userId} onSwitch={setUserId} />
        <div className={styles.header}>
          <img src="/loancert-logo.png" alt="LoanCert" className={styles.logo} />
          <div className={styles.divider} aria-hidden="true" />
          <div className={styles.brandLabel}>Buyer Companion</div>
          <div className={styles.step}>
            <div className={styles.stepLabel}>Step 1 of 3</div>
            <div className={styles.track} aria-hidden="true">
              {[1, 2, 3].map((s) => <div key={s} className={`${styles.bar} ${s === 1 ? styles.barOn : styles.barOff}`} />)}
            </div>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.trust}>
            {["No hard credit pull", "No lender affiliation", "Bank-grade encryption"].map((t) => (
              <div key={t} className={styles.badge}>
                <span className={styles.badgeCheck} aria-hidden="true">✓</span>
                <span className={styles.badgeText}>{t}</span>
              </div>
            ))}
          </div>
          <div className={styles.messages} role="log" aria-live="polite" aria-atomic="false" aria-label="Conversation" tabIndex={0}>
            {pageLoading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <span className={styles.loadingText}>Loading...</span>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble key={`${userId}-${i}`} msg={msg} isLatest={i === messages.length - 1} onOptionSelect={submitMessage} optionsDisabled={thinking || !!completed || i !== lastBotIndex} />
                ))}
                {thinking && (
                  <div className={styles.thinkingRow}>
                    <BotAvatar />
                    <div className={styles.thinkingBubble}><TypingIndicator /></div>
                  </div>
                )}
                {completed && <CompletionCard data={completed} onStartVerification={handleStartVerify} />}
              </>
            )}
            <div ref={bottomRef} />
          </div>
          <form className={styles.inputBar} onSubmit={(e) => { e.preventDefault(); submitMessage(input); }}>
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} disabled={thinking || !!completed || pageLoading}
              placeholder={completed ? "Intake complete" : "Type your answer, or tap a choice"}
              aria-label="Type your answer"
              rows={1} className={`${styles.textarea} ${inputDim ? styles.dim : ""}`} />
            <button type="submit" disabled={!canSend} aria-label="Send message"
              className={`${styles.send} ${canSend ? styles.sendActive : ""}`}><span aria-hidden="true">↑</span></button>
          </form>
        </div>
        <div className={styles.footer}>
          LoanCert Inc. 2025 · Independent Buyer Verification · Not a lender · No credit decisions made here
        </div>
      </div>
    </main>
  );
}
