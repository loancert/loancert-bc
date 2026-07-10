import styles from "./CompletionCard.module.css";

export default function CompletionCard({ data, onStartVerification }) {
  // Normalize instead of trusting JS truthiness — the model could emit "No"/"false" as a string.
  const yesNo = (v) => (v === true || /^(yes|true)$/i.test(String(v)) ? "Yes" : "No");
  const fields = [{ label: "Timeline", value: data.timeline }, { label: "Price Range", value: data.priceRange }, { label: "First-Time Buyer", value: yesNo(data.firstTimeBuyer) }, { label: "Income Type", value: data.incomeType }, { label: "Credit Range", value: data.creditRange }, { label: "Down Payment", value: data.downPayment }];
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.check} aria-hidden="true">✓</div>
        <div><div className={styles.title}>INTAKE COMPLETE</div><div className={styles.sub}>Buyer Companion Step 1 - Saved to your record</div></div>
      </div>
      <div className={styles.grid}>
        {fields.map((f) => <div key={f.label}><div className={styles.label}>{f.label}</div><div className={styles.value}>{f.value || "-"}</div></div>)}
      </div>
      <div className={styles.summary}>{data.summary}</div>
      <button onClick={onStartVerification} className={styles.cta}>
        START MY LOANCERT VERIFICATION
      </button>
    </div>
  );
}
