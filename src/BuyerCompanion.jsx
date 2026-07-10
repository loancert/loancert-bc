import BotAvatar from "./components/BotAvatar";
import TypingIndicator from "./components/TypingIndicator";
import MessageBubble from "./components/MessageBubble";
import CompletionCard from "./components/CompletionCard";
import DemoSwitcher from "./components/DemoSwitcher";
import { useBuyerChat } from "./useBuyerChat";
import styles from "./BuyerCompanion.module.css";

export default function BuyerCompanion({ userId: propUserId, onComplete, onStartVerify }) {
  const {
    userId, setUserId,
    messages, thinking, completed, pageLoading,
    input, setInput,
    bottomRef, inputRef,
    submitMessage, handleKey, handleStartVerify,
    lastBotIndex, canSend, inputDim,
  } = useBuyerChat({ userId: propUserId, onComplete, onStartVerify });

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
                  <MessageBubble key={`${userId}-${i}`} msg={msg} isLatest={i === messages.length - 1} onOptionSelect={(t) => submitMessage(t, false)} optionsDisabled={thinking || !!completed || i !== lastBotIndex} />
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
