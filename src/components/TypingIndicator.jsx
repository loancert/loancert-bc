import { palette } from "../constants";

export default function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 18px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: palette.accent, animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />)}
    </div>
  );
}
