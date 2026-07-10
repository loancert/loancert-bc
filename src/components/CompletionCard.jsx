import { palette, white, green, gradients, eyebrow } from "../constants";

export default function CompletionCard({ data, onStartVerification }) {
  const fields = [{ label: "Timeline", value: data.timeline }, { label: "Price Range", value: data.priceRange }, { label: "First-Time Buyer", value: data.firstTimeBuyer ? "Yes" : "No" }, { label: "Income Type", value: data.incomeType }, { label: "Credit Range", value: data.creditRange }, { label: "Down Payment", value: data.downPayment }];
  return (
    <div style={{ margin: "24px 0", background: green(0.08), border: `1px solid ${green(0.3)}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: palette.brand, display: "flex", alignItems: "center", justifyContent: "center", color: palette.white }}>✓</div>
        <div><div style={{ fontSize: 16, fontWeight: 700, color: palette.brand }}>INTAKE COMPLETE</div><div style={{ fontSize: 12, color: white(0.5) }}>Buyer Companion Step 1 - Saved to your record</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginBottom: 16 }}>
        {fields.map((f) => <div key={f.label}><div style={{ ...eyebrow, color: white(0.4), marginBottom: 2 }}>{f.label}</div><div style={{ fontSize: 13, color: palette.white }}>{f.value || "-"}</div></div>)}
      </div>
      <div style={{ fontSize: 13, color: white(0.6), marginBottom: 16, lineHeight: 1.6 }}>{data.summary}</div>
      <button onClick={onStartVerification} style={{ width: "100%", padding: "14px 0", background: gradients.brand, border: "none", borderRadius: 10, color: palette.white, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
        START MY LOANCERT VERIFICATION
      </button>
    </div>
  );
}
