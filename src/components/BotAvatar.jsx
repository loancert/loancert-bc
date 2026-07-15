import styles from "./BotAvatar.module.css";

// `style` prop stays for the one-off marginTop override used in MessageBubble.
export default function BotAvatar({ style }) {
  return (
    <div className={styles.avatar} style={style} aria-hidden="true">BC</div>
  );
}
