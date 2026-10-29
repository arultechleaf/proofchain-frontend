"use client";

import React from "react";
import styles from "./CustomCard.module.css";
import CustomButton from "../custombuttons/CustomButtons";

type CardVariant = "confirm" | "success" | "failed" | "error";

type CardProps = {
  variant?: CardVariant;
  title: string;
  description?: React.ReactNode;
  /** Buttons (use <CustomButton />) rendered at the bottom, centered */
  actions?: React.ReactNode;
  /** Shows the grey ✕ button in the top-right corner when provided */
  onClose?: () => void;
  /** Replace the default check / cross icon. Pass `null` to hide the icon. */
  icon?: React.ReactNode | null;
  width?: string;
  height?: string;
  className?: string;
};

// Map each variant to its CSS class (dot notation, so no string-built keys)
const variantClass: Record<CardVariant, string> = {
  confirm: styles.custom_card_confirm,
  success: styles.custom_card_success,
  failed: styles.custom_card_failed,
  error: styles.custom_card_error,
};

/* ---------- Default icons ---------- */
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

const CrossIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M2 2l8 8M10 2L2 10" />
  </svg>
);

const CustomCard = ({
  variant = "confirm",
  title,
  description,
  actions,
  onClose,
  icon,
  width,
  height,
  className = "",
}: CardProps) => {
  // confirm has no icon by default; success/failed/error do
  const defaultIcon =
    variant === "success" ? <CheckIcon /> : variant === "confirm" ? null : <CrossIcon />;
  const iconContent = icon === undefined ? defaultIcon : icon;

  const isAlert = variant === "failed" || variant === "error";

  return (
<div
  role={isAlert ? "alert" : variant === "success" ? "status" : undefined}
  style={{ width, height }}
  className={[`${styles.custom_card}`, variantClass[variant], className]
    .filter(Boolean)
    .join(" ")}
>
      {onClose && (
        <CustomButton
          onClick={onClose}
          icon={<CloseIcon />}
          width="var(--close-btn-size)"
          height="var(--close-btn-size)"
          ariaLabel="Close"
          className={`${styles.custom_card_close}`}
          variant="close"
        />
      )}

      {iconContent && (
        <span className={`${styles.custom_card_status}`}>
          <span className={`${styles.custom_card_status_inner}`}>{iconContent}</span>
        </span>
      )}

      <h3 className={`${styles.custom_card_title}`}>{title}</h3>

      {description && <p className={`${styles.custom_card_description}`}>{description}</p>}

      {actions && <div className={`${styles.custom_card_actions}`}>{actions}</div>}
    </div>
  );
};

export default CustomCard;