import { useState, useEffect } from "react";
import { parseOptions } from "../parseOptions";
import BotAvatar from "./BotAvatar";
import QuickReplies from "./QuickReplies";
import styles from "./MessageBubble.module.css";

export default function MessageBubble({ msg, isLatest, onOptionSelect, optionsDisabled }) {
  const isBot = msg.role === "assistant";
  const { text, options } = isBot ? parseOptions(msg.content) : { text: msg.content, options: [] };
  const [displayed, setDisplayed] = useState(isLatest && isBot ? "" : text);
  const [showOptions, setShowOptions] = useState(!isLatest && isBot && options.length > 0);

  useEffect(() => {
    if (!isLatest || !isBot || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed(text);
      if (options.length > 0) setShowOptions(true);
      return;
    }
    setDisplayed(""); setShowOptions(false);
    let i = 0;
    const iv = setInterval(() => { i++; setDisplayed(text.slice(0, i)); if (i >= text.length) { clearInterval(iv); if (options.length > 0) setShowOptions(true); } }, 12);
    return () => clearInterval(iv);
  }, [msg.content, isLatest, isBot]);

  const renderBold = (line) => line.split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part);
  const fmt = (t) => t.split("\n").map((line, i) => <p key={i} className={styles.line}>{renderBold(line)}</p>);

  const rowClass = `${styles.row} ${isBot ? styles.rowBot : styles.rowUser} ${isBot && showOptions ? styles.rowTight : ""}`;
  const bubbleClass = `${styles.bubble} ${isBot ? styles.bubbleBot : styles.bubbleUser}`;

  return (
    <>
      <div className={rowClass}>
        {isBot && <BotAvatar style={{ marginTop: 2 }} />}
        <div className={bubbleClass}>
          {isBot ? (
            <>
              {/* Animating text is hidden from assistive tech; the full text is exposed once
                  so the aria-live log announces the reply as a whole, not letter-by-letter. */}
              <div aria-hidden="true">{fmt(displayed)}</div>
              <span className="sr-only">{text}</span>
            </>
          ) : (
            fmt(displayed)
          )}
        </div>
      </div>
      {isBot && showOptions && <QuickReplies options={options} onSelect={onOptionSelect} disabled={optionsDisabled} />}
    </>
  );
}
