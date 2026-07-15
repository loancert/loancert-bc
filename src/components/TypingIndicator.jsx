import styles from "./TypingIndicator.module.css";

export default function TypingIndicator() {
  return (
    <div className={styles.wrap}>
      {[0, 1, 2].map((i) => <div key={i} className={styles.dot} />)}
    </div>
  );
}
