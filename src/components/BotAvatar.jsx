import { gradients, palette } from "../constants";

export default function BotAvatar({ style }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: gradients.brand, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, fontSize: 14, color: palette.white, fontWeight: 700, ...style }}>BC</div>
  );
}
