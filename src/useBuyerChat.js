import { useState, useEffect, useRef } from "react";
import { loadUserSession, saveMessage, saveIntakeRecord, sendChat, DEMO_NEW } from "./api";

function buildWelcomeMessage(priorIntake, lastSeen) {
  if (priorIntake) {
    const date = lastSeen ? new Date(lastSeen).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "recently";
    return { role: "assistant", content: `Welcome back - good to see you again.\n\nWhen we last spoke on ${date}, you were targeting ${priorIntake.priceRange} with a ${priorIntake.timeline} timeline. Has anything changed?\n[[OPTIONS]] ["Nothing changed - let's pick up where we left off","A few things have changed"]` };
  }
  return { role: "assistant", content: `Hi there - welcome to Buyer Companion by LoanCert.\n\nI'm here to help you understand where you stand as a buyer before you ever talk to a lender. No sales pitch, no credit pull, no pressure.\n\nWhen are you hoping to buy a home?\n[[OPTIONS]] ["Right away / ASAP","1-3 months","3-6 months","6-12 months","Just exploring for now"]` };
}

// Extract the first balanced {...} object, string-aware so braces inside string values
// don't confuse it. Robust to stray prose braces around the completion JSON.
const newSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const INTAKE_KEYS = ["timeline", "priceRange", "firstTimeBuyer", "incomeType", "creditRange", "downPayment", "summary"];

// Find the completion intake object: scan TOP-LEVEL balanced {...} objects and pick the one
// carrying the most expected intake keys. Skips nested sub-objects and any stray/empty {}, and
// returns null unless a real intake-shaped object is present — so we never falsely "complete".
function extractIntake(s) {
  let best = null, bestScore = 0;
  for (let start = s.indexOf("{"); start !== -1; ) {
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) { end = i; break; }
    }
    if (end === -1) break; // unbalanced tail
    try {
      const obj = JSON.parse(s.slice(start, end + 1));
      if (obj && typeof obj === "object") {
        const score = INTAKE_KEYS.filter((k) => k in obj).length;
        if (score > bestScore) { best = obj; bestScore = score; }
      }
    } catch { /* not JSON — skip */ }
    start = s.indexOf("{", end + 1); // jump past this object so nested braces aren't rescanned
  }
  return best;
}

// All chat state, effects, and the send/receive flow. The component that uses this is
// left as pure layout — it just renders what the hook returns.
export function useBuyerChat({ userId: propUserId, onComplete, onStartVerify } = {}) {
  const [userId, setUserId] = useState(propUserId || DEMO_NEW);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [sessionData, setSessionData] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [completed, setCompleted] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const userIdRef = useRef(userId);
  const sessionIdRef = useRef(sessionId); // in-flight replies compare against this so an A->B->A switch can't leak a stale reply

  useEffect(() => {
    userIdRef.current = userId;
    const sid = newSessionId(); // fresh session per user switch so records/refs don't collide
    setSessionId(sid);
    sessionIdRef.current = sid;
    setInput("");
    let cancelled = false;
    async function init() {
      setPageLoading(true); setCompleted(null); setThinking(false);
      let data = null;
      try { data = await loadUserSession(userId); } catch { /* fall through to a new-user session */ }
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

  // clearDraft=false is passed by quick-reply chips so they don't wipe an unsent draft.
  const submitMessage = async (text, clearDraft = true) => {
    if (!text.trim() || thinking || completed) return;
    if (clearDraft) setInput("");
    const submittedUserId = userId;
    const submittedSessionId = sessionId;
    let didComplete = false;
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setThinking(true);
    saveMessage(userId, sessionId, "user", text);
    try {
      const data = await sendChat(sessionData?.priorIntake, newMessages);
      if (sessionIdRef.current !== submittedSessionId) return; // session changed (switch/ABA) — drop stale reply
      const replyText = data.content?.find((b) => b.type === "text")?.text || "";
      if (replyText.includes("CONVERSATION_COMPLETE")) {
        const parsed = extractIntake(replyText);
        if (parsed) {
          await saveIntakeRecord(submittedUserId, sessionId, parsed);
          onComplete?.(submittedUserId, sessionId, parsed);
          setCompleted(parsed);
          didComplete = true;
        } else {
          // Malformed/absent JSON: render the reply (minus the sentinel) so we never dead-end.
          const fallback = replyText.replaceAll("CONVERSATION_COMPLETE", "").trim();
          setMessages((prev) => [...prev, { role: "assistant", content: fallback || "All set — let's continue." }]);
        }
      } else if (replyText.trim()) {
        setMessages((prev) => [...prev, { role: "assistant", content: replyText }]);
        saveMessage(submittedUserId, sessionId, "assistant", replyText);
      } else {
        // Empty reply: show the fallback rather than a blank bubble.
        setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong - please try again." }]);
      }
    } catch {
      if (sessionIdRef.current !== submittedSessionId) return;
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong - please try again." }]);
    }
    setThinking(false);
    // Don't refocus the textarea once completed — it's disabled, so focus would fall to <body>.
    if (!didComplete) setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submitMessage(input); } };
  const handleStartVerify = () => {
    onStartVerify?.(userId, sessionId, completed);
    window.open(`https://loancert.floify.com?ref=${sessionId}`, "_blank", "noopener,noreferrer");
  };

  // Manual reverse scan instead of Array.findLastIndex (ES2023) — that method isn't in
  // Vite's default browser targets and would crash the whole app on older browsers.
  let lastBotIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") { lastBotIndex = i; break; }
  }
  const canSend = !!input.trim() && !thinking && !completed && !pageLoading;
  const inputDim = !!completed || pageLoading;

  return {
    userId, setUserId,
    messages, thinking, completed, pageLoading,
    input, setInput,
    bottomRef, inputRef,
    submitMessage, handleKey, handleStartVerify,
    lastBotIndex, canSend, inputDim,
  };
}
