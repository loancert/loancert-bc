import { useEffect, useRef, useState } from "react";
import styles from "./CompletionCard.module.css";

export default function CompletionCard({ data, onStartVerification }) {
  const ctaRef = useRef(null);
  const [started, setStarted] = useState(false);
  // Move keyboard focus to the actionable CTA once the intake completes.
  useEffect(() => { ctaRef.current?.focus(); }, []);

  const yesNo = (v) => {
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (v == null) return "-";
    return /\b(yes|true|first)/i.test(String(v)) ? "Yes" : "No";
  };
  // Coerce to text — a model-emitted field that's an object/array would otherwise crash React.
  const asText = (v) => (v == null || v === "" ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
  const fields = [{ label: "Timeline", value: data.timeline }, { label: "Price Range", value: data.priceRange }, { label: "First-Time Buyer", value: yesNo(data.firstTimeBuyer) }, { label: "Income Type", value: data.incomeType }, { label: "Credit Range", value: data.creditRange }, { label: "Down Payment", value: data.downPayment }];

  const handleStart = () => { if (started) return; setStarted(true); onStartVerification(); };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.check} aria-hidden="true">✓</div>
        <div><div className={styles.title}>INTAKE COMPLETE</div><div className={styles.sub}>Buyer Companion Step 1 - Saved to your record</div></div>
      </div>
      <div className={styles.grid}>
        {fields.map((f) => <div key={f.label}><div className={styles.label}>{f.label}</div><div className={styles.value}>{asText(f.value) || "-"}</div></div>)}
      </div>
      <div className={styles.summary}>{asText(data.summary)}</div>
      <button ref={ctaRef} onClick={handleStart} disabled={started} className={styles.cta}>
        START MY LOANCERT VERIFICATION
      </button>
    </div>
  );
}
