"use client";

import React from "react";
import styles from "./CustomPagination.module.css";

type PaginationProps = {
  /** Current page, starting at 1 */
  page: number;
  /** Rows shown per page */
  pageSize: number;
  /** Total rows (after any search filters) */
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

/* ---------- Icons ---------- */
const ChevronLeft = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 3L5 8l5 5" />
  </svg>
);
const ChevronRight = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3l5 5-5 5" />
  </svg>
);
const ChevronDown = () => (
  <svg className={`${styles.custom_pagination_select_icon}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6l5 5 5-5" />
  </svg>
);

/* ---------- Which page buttons to show ----------
   7 slots at most, so the bar never jumps in width:
   - 7 pages or fewer      -> 1 2 3 4 5 6 7
   - near the start        -> 1 2 3 4 5 … 20
   - near the end          -> 1 … 16 17 18 19 20
   - somewhere in between  -> 1 … 9 10 11 … 20
*/
type PageItem = number | "ellipsis-left" | "ellipsis-right";

const getPageItems = (current: number, total: number): PageItem[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis-right", total];
  if (current >= total - 3)
    return [1, "ellipsis-left", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis-left", current - 1, current, current + 1, "ellipsis-right", total];
};

/* ---------- Component ---------- */
const CustomPagination = ({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = "",
}: PaginationProps) => {
  /* Conditions */
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages); // never out of range
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // keep the current size in the dropdown even if it isn't in the options list
  const sizes = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  const goTo = (target: number) => {
    if (target < 1 || target > totalPages || target === currentPage) return;
    onPageChange(target);
  };

  const changeSize = (size: number) => {
    onPageSizeChange(size);
    onPageChange(1); // a new page size always starts again from page 1
  };

  return (
    <div className={[`${styles.custom_pagination}`, className].filter(Boolean).join(" ")}>
      {/* Rows per page */}
      <div className={`${styles.custom_pagination_rows}`}>
        <label htmlFor="custom-pagination-size">Rows per page:</label>
        <div className={`${styles.custom_pagination_select_wrap}`}>
          <select
            id="custom-pagination-size"
            className={`${styles.custom_pagination_select}`}
            value={pageSize}
            onChange={(e) => changeSize(Number(e.target.value))}
          >
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown />
        </div>
      </div>

      {/* Showing 1–10 of 100 */}
      <span className={`${styles.custom_pagination_summary}`} aria-live="polite">
        {totalItems === 0 ? "No results" : `Showing ${start}–${end} of ${totalItems}`}
      </span>

      {/* Prev, numbers, Next */}
      <nav className={`${styles.custom_pagination_pages}`} aria-label="Pagination">
        <button
          type="button"
          className={`${styles.custom_pagination_btn}`}
          aria-label="Previous page"
          disabled={isFirst}
          onClick={() => goTo(currentPage - 1)}
        >
          <ChevronLeft />
        </button>

        {getPageItems(currentPage, totalPages).map((item) =>
          typeof item === "string" ? (
            <span key={item} className={`${styles.custom_pagination_ellipsis}`} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`${styles.custom_pagination_btn} ${item === currentPage ? styles.custom_pagination_btn_active : ""}`}
              aria-label={`Page ${item}`}
              aria-current={item === currentPage ? "page" : undefined}
              onClick={() => goTo(item)}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          className={`${styles.custom_pagination_btn}`}
          aria-label="Next page"
          disabled={isLast}
          onClick={() => goTo(currentPage + 1)}
        >
          <ChevronRight />
        </button>
      </nav>
    </div>
  );
};

export default CustomPagination;