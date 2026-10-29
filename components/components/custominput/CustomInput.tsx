
"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./CustomerInput.module.css";

type CustomInputProps = {
  label: string;
  name: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "tel"
    | "select"
    | "custom-select"
    | "file"
    | "textarea";
  placeholder?: string;
  value?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  options?: string[];
  accept?: string;
  multiple?: boolean;
  rows?: number;
  helperText?: string;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onFilesChange?: (files: FileList | null) => void;
};

export default function CustomInput({
  label,
  name,
  type = "text",
  placeholder = "",
  value = "",
  required = false,
  optional = false,
  error,
  options = [],
  accept,
  multiple = false,
  rows = 3,
  helperText,
  minLength,
  maxLength,
  disabled = false,
  onChange,
  onFilesChange,
}: CustomInputProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasError = Boolean(error?.trim());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  function getInputClass(baseClass: string) {
    return `${baseClass} ${hasError ? styles.inputError : ""}`.trim();
  }

  function toggleDropdown() {
    setOpen((previous) => {
      setSearch("");
      return !previous;
    });
  }

  function selectOption(option: string) {
    onChange?.(option);
    setSearch("");
    setOpen(false);
  }

  function renderArrow() {
    return (
      <span className={styles.dropdownArrow}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    );
  }

  function renderEye() {
    return showPassword ? (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.3 4.1 9.5 6-.5.9-1.5 2.2-3.1 3.4" />
        <path d="M6.2 6.2C3.9 7.7 2.7 9.5 2.5 11c1.2 1.9 4.5 6 9.5 6 1.1 0 2.1-.2 3-.6" />
      </svg>
    ) : (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 12s3.3-7 9.5-7 9.5 7 9.5 7-3.3 7-9.5 7-9.5-7-9.5-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>
        {label}
        {required && <span className={styles.required}> *</span>}
        {optional && (
          <span className={styles.optional}> (Optional)</span>
        )}
      </label>

      {/* Searchable dropdown */}
      {type === "select" && (
        <div ref={dropdownRef} className={styles.dropdown}>
          <input
            className={getInputClass(
              `${styles.input} ${styles.selectInput}`
            )}
            id={name}
            name={name}
            type="text"
            placeholder={placeholder || "Select an option"}
            value={open ? search : value}
            autoComplete="off"
            aria-invalid={hasError}
            aria-describedby={hasError ? `${name}-error` : undefined}
            onFocus={() => {
              setSearch("");
              setOpen(true);
            }}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setSearch("");
              }

              if (event.key === "Enter" && open) {
                event.preventDefault();

                if (filteredOptions.length > 0) {
                  selectOption(filteredOptions[0]);
                }
              }
            }}
          />

          <button
            type="button"
            className={styles.dropdownArrowButton}
            onMouseDown={(event) => event.preventDefault()}
            onClick={toggleDropdown}
            aria-label={`Toggle ${label} options`}
          >
            {renderArrow()}
          </button>

          {open && (
            <div
              className={styles.dropdownMenu}
              id={`${name}-options`}
            >
              {filteredOptions.map((option, index) => (
                <button
                  className={styles.optionButton}
                  key={`${option}-${index}`}
                  type="button"
                  onClick={() => selectOption(option)}
                >
                  {option}
                </button>
              ))}

              {filteredOptions.length === 0 && (
                <p className={styles.emptyMessage}>
                  {search.trim()
                    ? `No ${label.toLowerCase()} found.`
                    : `No ${label.toLowerCase()} available.`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Searchable custom dropdown */}
      {type === "custom-select" && (
        <div ref={dropdownRef} className={styles.dropdown}>
          <input
            className={getInputClass(styles.input)}
            id={name}
            name={name}
            type="text"
            placeholder={placeholder}
            value={open ? search : value}
            autoComplete="off"
            aria-invalid={hasError}
            aria-describedby={hasError ? `${name}-error` : undefined}
            onFocus={() => {
              setSearch("");
              setOpen(true);
            }}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setSearch("");
              }

              if (event.key === "Enter" && open && search.trim()) {
                const exactOption = options.find(
                  (option) =>
                    option.toLowerCase() ===
                    search.trim().toLowerCase()
                );

                if (exactOption) {
                  event.preventDefault();
                  selectOption(exactOption);
                }
              }
            }}
          />

          <button
            type="button"
            className={styles.dropdownArrowButton}
            onMouseDown={(event) => event.preventDefault()}
            onClick={toggleDropdown}
            aria-label={`Toggle ${label} options`}
          >
            {renderArrow()}
          </button>

          {open && (
            <div
              className={styles.dropdownMenu}
              id={`${name}-options`}
            >
              {filteredOptions.map((option, index) => (
                <button
                  className={styles.optionButton}
                  key={`${option}-${index}`}
                  type="button"
                  onClick={() => selectOption(option)}
                >
                  {option}
                </button>
              ))}

              {search.trim() &&
                !options.some(
                  (option) =>
                    option.toLowerCase() ===
                    search.trim().toLowerCase()
                ) && (
                  <button
                    className={styles.addOption}
                    type="button"
                    onClick={() => selectOption(search.trim())}
                  >
                    + Add {search.trim()}
                  </button>
                )}

              {filteredOptions.length === 0 && !search.trim() && (
                <p className={styles.emptyMessage}>
                  No options available.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Text, email, password and telephone */}
      {(type === "text" ||
        type === "email" ||
        type === "password" ||
        type === "tel") && (
        <div
          className={
            type === "password" ? styles.passwordWrapper : undefined
          }
        >
          <input
            className={getInputClass(
              `${styles.input} ${
                type === "password" ? styles.passwordInput : ""
              }`
            )}
            id={name}
            name={name}
            type={
              type === "password"
                ? showPassword
                  ? "text"
                  : "password"
                : type
            }
            placeholder={placeholder}
            value={value}
            required={required}
            minLength={minLength}
            maxLength={maxLength}
            disabled={disabled}
            onChange={(event) => onChange?.(event.target.value)}
          />

          {type === "password" && (
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() =>
                setShowPassword((previous) => !previous)
              }
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
            >
              {renderEye()}
            </button>
          )}
        </div>
      )}

      {/* File upload */}
      {type === "file" && (
        <div className={styles.fileInputWrapper}>
          <input
            className={styles.hiddenFileInput}
            id={name}
            name={name}
            type="file"
            accept={accept}
            multiple={multiple}
            required={required}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${name}-error` : undefined}
            placeholder={placeholder}
            onChange={(event) => {
              const files = event.currentTarget.files;

              onFilesChange?.(files);

              onChange?.(
                files && files.length > 0
                  ? Array.from(files)
                      .map((file) => file.name)
                      .join(", ")
                  : ""
              );
            }}
          />

          <label
            htmlFor={name}
            className={`${styles.fileUploadButton} ${
              hasError ? styles.inputError : ""
            }`}
          >
<span className={styles.fileNameText}>
  {value && value !== "photo" ? value : placeholder || "Upload"}
</span>

            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
            </svg>
          </label>

          {helperText && (
            <p className={styles.helperText}>{helperText}</p>
          )}
        </div>
      )}

      {/* Textarea */}
      {type === "textarea" && (
        <textarea
          className={getInputClass(styles.textarea)}
          id={name}
          name={name}
          rows={rows}
          placeholder={placeholder}
          value={value}
          required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
          onChange={(event) => onChange?.(event.target.value)}
        />
      )}

      {/* Validation error */}
      {hasError && (
        <p id={`${name}-error`} className={styles.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
