import styles from "./CompletionCard.module.css";

export default function CompletionCard({ data, onStartVerification }) {
  const fields = [{ label: "Timeline", value: data.timeline }, { label: "Price Range", value: data.priceRange }, { label: "First-Time Buyer", value: data.firstTimeBuyer ? "Yes" : "No" }, { label: "Income Type", value: data.incomeType }, { label: "Credit Range", value: data.creditRange }, { label: "Down Payment", value: data.downPayment }];
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.check}>✓</div>
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
