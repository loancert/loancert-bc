import { white, green, palette } from "../constants";

export default function QuickReplies({ options, onSelect, disabled }) {
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
