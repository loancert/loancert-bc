import { DEMO_NEW, DEMO_RETURNING } from "../api";
import styles from "./DemoSwitcher.module.css";

export default function DemoSwitcher({ userId, onSwitch }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Demo:</span>
      {[DEMO_NEW, DEMO_RETURNING].map((id) => (
        <button key={id} onClick={() => onSwitch(id)} className={`${styles.tab} ${userId === id ? styles.tabActive : ""}`}>
          {id === DEMO_NEW ? "New Buyer" : "Returning Buyer"}
        </button>
      ))}
    </div>
  );
}
