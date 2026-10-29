"use client";

import React, { useRef, useState } from "react";

type OtpProps = {
  label: string;
  name: string;
  length?: number;
  value?: string;
  required?: boolean;
  error?: string;
  onChange?: (value: string) => void;
};

const BLOCKED_KEYS = ["e", "E", "+", "-", ".", "ArrowUp", "ArrowDown"];

export default function Otp({
  label,
  name,
  length = 4,
  value = "",
  required = false,
  error,
  onChange,
}: OtpProps) {
  const [digits, setDigits] = useState<string[]>(
    Array.from({ length }, (_, i) => value[i] ?? "")
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function update(next: string[]) {
    setDigits(next);
    onChange?.(next.join(""));
  }

  function focusInput(index: number) {
    inputRefs.current[index]?.focus();
  }

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    // keep only the last digit typed
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    update(next);

    if (digit && index < length - 1) focusInput(index + 1);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (BLOCKED_KEYS.includes(e.key)) {
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length - index);

    if (!pasted) return;
    e.preventDefault();

    const next = [...digits];
    pasted.split("").forEach((digit, offset) => {
      next[index + offset] = digit;
    });
    update(next);

    focusInput(Math.min(index + pasted.length, length - 1));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="form-label whitespace-nowrap" htmlFor={`${name}-1`}>
        {label}
        {required && <span className="required"> *</span>}
      </label>

      <div className="flex gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            className={`input text-center no-arrows ${error ? "is-invalid" : ""}`}
            id={`${name}-${index + 1}`}
            name={`${name}-${index + 1}`}
            type="number"
            inputMode="numeric"
            value={digit}
            autoComplete="one-time-code"
            aria-invalid={!!error}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onWheel={(e) => e.currentTarget.blur()}
            onPaste={(e) => handlePaste(index, e)}
          />
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}