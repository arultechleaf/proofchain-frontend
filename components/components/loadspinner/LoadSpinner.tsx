"use client";

import styles from "./LoadSpinner.module.css";

type LoadSpinnerProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
};

export default function LoadSpinner({ size = "md", label = "Loading..." }: LoadSpinnerProps) {
  return (
    <div className={styles.spinnerContainer} role="status" aria-label={label}>
      <span aria-hidden="true" className={`${styles.loader} ${styles[size]}`} />
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
