import { useState, useEffect } from "react";
import { palette, gradients, botBubble } from "../constants";
import { parseOptions } from "../parseOptions";
import BotAvatar from "./BotAvatar";
import QuickReplies from "./QuickReplies";

export default function MessageBubble({ msg, isLatest, onOptionSelect, optionsDisabled }) {
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

  const renderBold = (line) => line.split(/\*\*(.*?)\*\*/g).map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part);
  const fmt = (t) => t.split("\n").map((line, i) => <p key={i} style={{ margin: "2px 0" }}>{renderBold(line)}</p>);

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
