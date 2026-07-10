import { palette, white, eyebrow } from "../constants";

export default function DemoSwitcher({ userId, onSwitch }) {
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
