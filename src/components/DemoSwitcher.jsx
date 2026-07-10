import styles from "./DemoSwitcher.module.css";

export default function DemoSwitcher({ userId, onSwitch }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Demo:</span>
      {["demo-new", "demo-returning"].map((id) => (
        <button key={id} onClick={() => onSwitch(id)} className={`${styles.tab} ${userId === id ? styles.tabActive : ""}`}>
          {id === "demo-new" ? "New Buyer" : "Returning Buyer"}
        </button>
      ))}
    </div>
  );
}
