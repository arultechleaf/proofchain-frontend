"use client";

import React from "react";
import styles from "./CustomButtons.module.css";
import LoadSpinner from "../loadspinner/LoadSpinner";

type ButtonVariant = "primary" | "danger" | "secondary" | "tertiary" | "quaternary" | "close" | "backbtn";

type IconPosition = "left" | "right";

type ButtonProps = {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: IconPosition;
  width?: string;
  height?: string;
  className?: string;
  fullWidth?: boolean;
  ariaLabel?: string;
};

// Map each variant to its CSS class (dot notation, so no string-built keys)
const variantClass: Record<ButtonVariant, string> = {
  primary: styles.custom_button_primary,
  danger: styles.custom_button_danger,
  secondary: styles.custom_button_secondary,
  tertiary: styles.custom_button_tertiary,
  quaternary: styles.custom_button_quaternary,
  close: styles.custom_button_close,
  backbtn: styles.custom_button_back
};

const CustomButton = ({
  children,
  variant = "primary",
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  loadingText = "Loading..",
  icon,
  iconPosition = "left",
  width,
  height,
  className = "",
  fullWidth = false,
  ariaLabel,
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const isIconOnly = !!icon && !children && !loading; // square button when there's no text

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={loading || undefined} // tells screen readers the button is busy when loading
      style={{ width: fullWidth ? "100%" : width, height: height }}
      className={[
        `${styles.custom_button}`,
        variantClass[variant],
        isIconOnly ? `${styles.custom_button_icon_only}` : "",
        loading ? `${styles.custom_button_loading}` : "",
        isDisabled && !loading ? `${styles.custom_button_disabled}` : "",
        className,
      ]
        // remove empty classes and combine remaining classes into a single string
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <>
          <span className={styles.custom_button_loading_content}>
          <LoadSpinner />
          <span>{loadingText}</span> {/* when loading, show the loading text instead of children */}
          </span>
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className={`${styles.custom_button_icon}`}>{icon}</span>
          )}

          {children && <span>{children}</span>} {/* when not loading, show the children (button text) if provided */}

          {icon && iconPosition === "right" && (
            <span className={`${styles.custom_button_icon}`}>{icon}</span>
          )}
        </>
      )}
    </button>
  );
};

export default CustomButton;