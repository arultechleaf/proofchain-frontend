
"use client";

import React, { useEffect, useState } from "react";
import styles from "./DatePicker.module.css";

type DatePickerProps = {
  label: string;
  name: string;
  mode?: "single" | "range";
  pickerType?: "native" | "custom";
  value?: string;
  fromDate?: string;
  toDate?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  minDate?: string;
  maxDate?: string;
  onChange?: (value: string) => void;
  onRangeChange?: (range: {
    fromDate: string;
    toDate: string;
  }) => void;
};

export default function DatePicker({
  label,
  name,
  mode = "single",
  pickerType = "native",
  value = "",
  fromDate = "",
  toDate = "",
  required = false,
  disabled = false,
  error,
  minDate = "",
  maxDate = "",
  onChange,
  onRangeChange,
}: DatePickerProps) {
  const [singleDate, setSingleDate] = useState(value);
  const [startDate, setStartDate] = useState(fromDate);
  const [endDate, setEndDate] = useState(toDate);

  useEffect(() => setSingleDate(value), [value]);
  useEffect(() => setStartDate(fromDate), [fromDate]);
  useEffect(() => setEndDate(toDate), [toDate]);

  function handleSingleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedDate = event.target.value;

    setSingleDate(selectedDate);
    onChange?.(selectedDate);
  }

  function handleFromDateChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFromDate = event.target.value;

    setStartDate(selectedFromDate);

    const updatedEndDate =
      endDate && endDate < selectedFromDate ? "" : endDate;

    setEndDate(updatedEndDate);

    onRangeChange?.({
      fromDate: selectedFromDate,
      toDate: updatedEndDate,
    });
  }

  function handleToDateChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedToDate = event.target.value;

    setEndDate(selectedToDate);

    onRangeChange?.({
      fromDate: startDate,
      toDate: selectedToDate,
    });
  }

  const dateInputClass = [
    styles.dateInput,
    pickerType === "custom" ? styles.customDateInput : "",
    error ? styles.invalid : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.datePicker}>
      {mode === "single" ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={name}>
            {label}
            {required && (
              <span className={styles.required}> *</span>
            )}
          </label>

          <div className={styles.inputWrapper}>
            <input
              className={dateInputClass}
              id={name}
              name={name}
              type="date"
              value={singleDate}
              required={required}
              disabled={disabled}
              min={minDate || undefined}
              max={maxDate || undefined}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${name}-error` : undefined}
              onChange={handleSingleChange}
            />
          </div>

          {error && (
            <p id={`${name}-error`} className={styles.errorText}>
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className={styles.rangeGrid}>
          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor={`${name}-from`}
            >
              From Date
              {required && (
                <span className={styles.required}> *</span>
              )}
            </label>

            <div className={styles.inputWrapper}>
              <input
                className={dateInputClass}
                id={`${name}-from`}
                name={`${name}-from`}
                type="date"
                value={startDate}
                required={required}
                disabled={disabled}
                max={endDate || undefined}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${name}-error` : undefined}
                onChange={handleFromDateChange}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor={`${name}-to`}
            >
              To Date
              {required && (
                <span className={styles.required}> *</span>
              )}
            </label>

            <div className={styles.inputWrapper}>
              <input
                className={dateInputClass}
                id={`${name}-to`}
                name={`${name}-to`}
                type="date"
                value={endDate}
                required={required}
                disabled={disabled || !startDate}
                min={startDate || undefined}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${name}-error` : undefined}
                onChange={handleToDateChange}
              />
            </div>

            {!startDate && (
              <p className={styles.helperText}>
                Select the From Date first.
              </p>
            )}
          </div>

          {error && (
            <p id={`${name}-error`} className={styles.errorText}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
