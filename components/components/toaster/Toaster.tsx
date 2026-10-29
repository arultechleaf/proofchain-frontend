"use client";

import React, { useEffect, useRef } from "react";
import styles from "./Toaster.module.css";

type ToastVariant = "info" | "success" | "error" | "warning";

type ToasterProps = {
  message: string;
  title?: string;
  variant?: ToastVariant;
  /** Milliseconds before it closes itself. Use 0 to keep it open. */
  duration?: number;
  onClose: () => void;
};

/* ---------- One icon per variant ---------- */
const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.8 2.8L16 9.5" />
    </svg>
  ),
  error: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  ),
  warning: (
    <svg {...svgProps}>
      <path d="M12 3.5L2.8 19.5h18.4L12 3.5z" />
      <path d="M12 10v4.5M12 17.2h.01" />
    </svg>
  ),
  info: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  ),
};

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const variantClass: Record<ToastVariant, string> = {
  info: styles.toast_info,
  success: styles.toast_success,
  error: styles.toast_error,
  warning: styles.toast_warning,
};

const Toaster = ({ title, message, variant = "info", duration = 4000, onClose }: ToasterProps) => {
  // keeps the timer from restarting when the parent re-renders
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => closeRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className={`${styles.toast_container}`}>
      <div
        className={[
          `${styles.toast}`,
          variantClass[variant],
        ]
          .filter(Boolean)
          .join(" ")}
        role="alert"
      >
        <span className={`${styles.toast_icon}`}>{ICONS[variant]}</span>

        <div className={`${styles.toast_body}`}>
          {title && <p className={`${styles.toast_title}`}>{title}</p>}
          <p className={`${styles.toast_text}`}>{message}</p>
        </div>

        <button type="button" className={`${styles.toast_close}`} aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
};

export default Toaster;