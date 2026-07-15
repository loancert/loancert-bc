import styles from "./QuickReplies.module.css";

export default function QuickReplies({ options, onSelect, disabled }) {
  if (!options || options.length === 0) return null;
  return (
    <div className={styles.wrap}>
      {options.map((opt, i) => (
        <button key={i} onClick={() => !disabled && onSelect(`${i + 1}. ${opt}`)} disabled={disabled} className={styles.button}>
          <span className={styles.num}>{i + 1}</span>
          {opt}
        </button>
      ))}
    </div>
  );
}
