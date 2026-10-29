
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import CustomPagination from "../custompagination/CustomPagination";
import styles from "./CustomTable.module.css";

export type SortDirection = "asc" | "desc";

export type TableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  fixed?: "left" | "right";
  align?: "left" | "center" | "right";
  width?: string;
  minWidth?: string;
  bold?: boolean;
  render?: (row: T, rowIndex: number) => React.ReactNode;
};

export type TableQuery = {
  search: string;
  columnSearch: Record<string, string>;
  valueFilters: Record<string, string[]>;
  sortBy: string;
  sortOrder: SortDirection;
  page: number;
  limit: number;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
  rowKey?: string | ((row: T, index: number) => string | number);
  maxHeight?: string;
  emptyText?: string;
  className?: string;
  pagination?: boolean;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  serverSide?: boolean;
  totalItems?: number;
  loading?: boolean;
  onQueryChange?: (query: TableQuery) => void;
  globalSearchKeys?: string[];
  globalSearchPlaceholder?: string;
  searchOnEnter?: boolean;
};

type FilterPopupPosition = {
  top: number;
  left: number;
};

const getValue = (row: unknown, key: string) =>
  (row as Record<string, unknown>)[key];

const compareValues = (a: unknown, b: unknown) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const SortIcon = ({ direction }: { direction: SortDirection | null }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path
      className={`${styles.custom_table_sort_up} ${
        direction === "asc" ? styles.custom_table_sort_up_active : ""
      }`}
      d="M8 2L12 7H4z"
    />
    <path
      className={`${styles.custom_table_sort_down} ${
        direction === "desc" ? styles.custom_table_sort_down_active : ""
      }`}
      d="M8 14L4 9h8z"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="7" cy="7" r="4.5" />
    <path d="m10.5 10.5 3 3" />
  </svg>
);

const ClearIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 4l8 8M12 4L4 12" />
  </svg>
);

const FilterIcon = () => (
  <svg
    viewBox="0 0 20 20"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 5h14M6 10h8M8 15h4" />
  </svg>
);

const statusClass: Record<string, string> = {
  pending: styles.custom_table_status_pending,
  approve: styles.custom_table_status_approve,
  reject: styles.custom_table_status_reject,
};

export const TableStatus = ({ status }: { status: string }) => (
  <span className={statusClass[status.toLowerCase()] ?? ""}>
    {status}
  </span>
);

const cellAlignClass: Record<
  "th" | "td",
  Record<"left" | "right", string>
> = {
  th: {
    left: styles.custom_table_th_left,
    right: styles.custom_table_th_right,
  },
  td: {
    left: styles.custom_table_td_left,
    right: styles.custom_table_td_right,
  },
};

const cellFixedClass: Record<
  "th" | "td",
  Record<"left" | "right", string>
> = {
  th: {
    left: styles.custom_table_th_fixed_left,
    right: styles.custom_table_th_fixed_right,
  },
  td: {
    left: styles.custom_table_td_fixed_left,
    right: styles.custom_table_td_fixed_right,
  },
};

function CustomTable<T extends object>({
  columns,
  data,
  rowKey,
  maxHeight,
  emptyText = "No results found",
  className = "",
  pagination = false,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  serverSide = false,
  totalItems,
  loading = false,
  onQueryChange,
  globalSearchKeys = [],
  globalSearchPlaceholder = "Search...",
  searchOnEnter = false,
}: TableProps<T>) {
  const [sort, setSort] = useState<{
    key: string;
    direction: SortDirection;
  } | null>(null);

  const [globalSearch, setGlobalSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openSearch, setOpenSearch] = useState<string | null>(null);

  const [openValueFilter, setOpenValueFilter] = useState<string | null>(null);
  const [draftValueFilters, setDraftValueFilters] = useState<
    Record<string, string[]>
  >({});
  const [appliedValueFilters, setAppliedValueFilters] = useState<
    Record<string, string[]>
  >({});

  const [filterPopupPosition, setFilterPopupPosition] =
    useState<FilterPopupPosition>({ top: 0, left: 0 });

  const filterAnchorRef = useRef<HTMLButtonElement | null>(null);
  const filterPopupRef = useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const getUniqueValues = useCallback(
    (key: string) => {
      const values = data
        .map((row) => String(getValue(row, key) ?? "").trim())
        .filter(Boolean);

      const selected = appliedValueFilters[key] ?? [];

      return Array.from(new Set([...values, ...selected])).sort((a, b) =>
        a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    },
    [data, appliedValueFilters]
  );

  const toggleSort = (key: string) => {
    setPage(1);

    setSort((previous) => {
      if (!previous || previous.key !== key) {
        return { key, direction: "asc" };
      }

      if (previous.direction === "asc") {
        return { key, direction: "desc" };
      }

      return null;
    });
  };

  const setFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const toggleValueFilter = (
    key: string,
    button: HTMLButtonElement
  ) => {
    if (openValueFilter === key) {
      setOpenValueFilter(null);
      return;
    }

    const rect = button.getBoundingClientRect();

    filterAnchorRef.current = button;

    setFilterPopupPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)),
    });

    setDraftValueFilters((previous) => ({
      ...previous,
      [key]: [...(appliedValueFilters[key] ?? [])],
    }));

    setOpenSearch(null);
    setOpenValueFilter(key);
  };

  const toggleDraftValue = (key: string, value: string) => {
    setDraftValueFilters((previous) => {
      const selected = previous[key] ?? [];
      const updated = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];

      return { ...previous, [key]: updated };
    });
  };

  const applyValueFilter = (key: string) => {
    const selected = draftValueFilters[key] ?? [];

    setAppliedValueFilters((previous) => {
      const updated = { ...previous };

      if (selected.length) {
        updated[key] = [...selected];
      } else {
        delete updated[key];
      }

      return updated;
    });

    setPage(1);
    setOpenValueFilter(null);
  };

  const clearValueFilter = (key: string) => {
    setDraftValueFilters((previous) => ({ ...previous, [key]: [] }));
  };

  const removeAppliedValueFilter = (key: string) => {
    setAppliedValueFilters((previous) => {
      const updated = { ...previous };
      delete updated[key];
      return updated;
    });
    setDraftValueFilters((previous) => ({ ...previous, [key]: [] }));
    setPage(1);
  };

  const clearAll = () => {
    setGlobalSearch("");
    if (searchOnEnter) setSubmittedSearch("");
    setFilters({});
    setAppliedValueFilters({});
    setDraftValueFilters({});
    setSort(null);
    setPage(1);
    setOpenSearch(null);
    setOpenValueFilter(null);
  };

  const activeFilterCount =
    ((searchOnEnter ? submittedSearch : globalSearch).trim() ? 1 : 0) +
    Object.values(filters).filter((value) => value.trim()).length +
    Object.values(appliedValueFilters).filter(
      (values) => values.length > 0
    ).length;

  // Send query changes to the parent for server-side data fetching.
  const serverSearch = searchOnEnter ? submittedSearch : globalSearch;
  useEffect(() => {
    if (!serverSide || !onQueryChange) return;

    const timer = window.setTimeout(() => {
      onQueryChange({
        search: serverSearch.trim(),
        columnSearch: Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value.trim())
        ),
        valueFilters: Object.fromEntries(
          Object.entries(appliedValueFilters).filter(
            ([, values]) => values.length > 0
          )
        ),
        sortBy: sort?.key ?? "",
        sortOrder: sort?.direction ?? "asc",
        page,
        limit: pageSize,
      });
    }, !searchOnEnter && serverSearch.trim() ? 300 : 0);

    return () => window.clearTimeout(timer);
  }, [
    serverSide,
    onQueryChange,
    serverSearch,
    searchOnEnter,
    filters,
    appliedValueFilters,
    sort,
    page,
    pageSize,
  ]);

  useEffect(() => {
    if (!openValueFilter) return;

    const updatePosition = () => {
      const anchor = filterAnchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();

      setFilterPopupPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)),
      });
    };

    const outsideClick = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        filterPopupRef.current?.contains(target) ||
        filterAnchorRef.current?.contains(target)
      ) {
        return;
      }

      setOpenValueFilter(null);
    };

    const escapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenValueFilter(null);
    };

    updatePosition();
    document.addEventListener("pointerdown", outsideClick);
    document.addEventListener("keydown", escapeKey);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", outsideClick);
      document.removeEventListener("keydown", escapeKey);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openValueFilter]);

  const rows = useMemo(() => {
    if (serverSide) return data;

    const activeSearchFilters = Object.entries(filters).filter(
      ([, value]) => value.trim()
    );

    let result = data.filter((row) => {
      const globalValue = globalSearchKeys
        .map((key) => String(getValue(row, key) ?? ""))
        .join(" ")
        .toLowerCase();

      const matchesGlobal =
        !globalSearch.trim() ||
        globalValue.includes(globalSearch.trim().toLowerCase());

      const matchesColumnSearch = activeSearchFilters.every(
        ([key, term]) =>
          String(getValue(row, key) ?? "")
            .toLowerCase()
            .includes(term.trim().toLowerCase())
      );

      const matchesSelections = Object.entries(appliedValueFilters).every(
        ([key, selected]) => {
          if (!selected.length) return true;

          return selected.includes(
            String(getValue(row, key) ?? "").trim()
          );
        }
      );

      return matchesGlobal && matchesColumnSearch && matchesSelections;
    });

    if (sort) {
      const factor = sort.direction === "asc" ? 1 : -1;

      result = [...result].sort(
        (a, b) =>
          factor * compareValues(getValue(a, sort.key), getValue(b, sort.key))
      );
    }

    return result;
  }, [
    serverSide,
    data,
    filters,
    appliedValueFilters,
    globalSearch,
    globalSearchKeys,
    sort,
  ]);

  const resultCount = serverSide ? (totalItems ?? data.length) : rows.length;
  const totalPages = Math.max(1, Math.ceil(resultCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const visibleRows = serverSide
    ? rows
    : pagination
      ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : rows;

  const getRowKey = (row: T, index: number) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    if (typeof rowKey === "string") return String(getValue(row, rowKey));
    return index;
  };

  const cellClasses = (base: "th" | "td", col: TableColumn<T>) =>
    [
      base === "th" ? styles.custom_table_th : styles.custom_table_td,
      col.align && col.align !== "center"
        ? cellAlignClass[base][col.align]
        : "",
      col.fixed ? cellFixedClass[base][col.fixed] : "",
      base === "td" && col.bold ? styles.custom_table_td_bold : "",
    ]
      .filter(Boolean)
      .join(" ");

  const sizeStyle = (col: TableColumn<T>): React.CSSProperties => ({
    width: col.width,
    minWidth: col.minWidth ?? col.width,
  });

  const filterPopup =
    openValueFilter && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={filterPopupRef}
            className={styles.custom_table_filter_popup}
            style={{
              position: "fixed",
              top: filterPopupPosition.top,
              left: filterPopupPosition.left,
            }}
            role="dialog"
            aria-label={`Filter ${
              columns.find((col) => col.key === openValueFilter)?.header ??
              openValueFilter
            }`}
          >
            <div className={styles.custom_table_filter_options}>
              {getUniqueValues(openValueFilter).length ? (
                getUniqueValues(openValueFilter).map((value) => (
                  <label
                    key={value}
                    className={styles.custom_table_filter_option}
                  >
                    <input
                      type="checkbox"
                      checked={
                        draftValueFilters[openValueFilter]?.includes(value) ??
                        false
                      }
                      onChange={() =>
                        toggleDraftValue(openValueFilter, value)
                      }
                    />
                    <span>{value}</span>
                  </label>
                ))
              ) : (
                <p className={styles.custom_table_filter_empty}>
                  No options available
                </p>
              )}
            </div>

            <div className={styles.custom_table_filter_footer}>
              <button
                type="button"
                className={styles.custom_table_filter_clear}
                onClick={() => clearValueFilter(openValueFilter)}
              >
                Clear
              </button>

              <button
                type="button"
                className={styles.custom_table_filter_apply}
                onClick={() => applyValueFilter(openValueFilter)}
              >
                Apply
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={[styles.custom_table_container, className]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Global Search */}
      {globalSearchKeys.length > 0 && (
        <div className={styles.globalSearchSection}>
          <div className={styles.globalSearchRow}>
            <div className={styles.globalSearchInputWrapper}>
              <span className={styles.globalSearchIcon}>
                <SearchIcon />
              </span>

              <input
                type="search"
                className={styles.globalSearchInput}
                value={globalSearch}
                placeholder={globalSearchPlaceholder}
                aria-label="Search customers"
                onChange={(event) => {
                  setGlobalSearch(event.target.value);
                  if (!searchOnEnter) setPage(1);
                }}
                onKeyDown={(event) => {
                  if (searchOnEnter && event.key === "Enter") {
                    event.preventDefault();
                    setSubmittedSearch(globalSearch.trim());
                    setPage(1);
                  }
                }}
              />

              {globalSearch && (
                <button
                  type="button"
                  className={styles.globalSearchClearIcon}
                  aria-label="Clear search"
                  onClick={() => {
                    setGlobalSearch("");
                    if (searchOnEnter) setSubmittedSearch("");
                    setPage(1);
                  }}
                >
                  <ClearIcon />
                </button>
              )}
            </div>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className={styles.activeFilters}>
              <div className={styles.activeFiltersHeader}>
                <span className={styles.activeFiltersLabel}>
                  Active Filters
                </span>

                {activeFilterCount >= 2 && (
                  <button
                    type="button"
                    className={styles.clearAllChip}
                    onClick={clearAll}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className={styles.activeFiltersList}>
                {(searchOnEnter ? submittedSearch : globalSearch).trim() && (
                  <span className={styles.activeFilterChip}>
                    Search: {(searchOnEnter ? submittedSearch : globalSearch).trim()}
                    <button
                      type="button"
                      aria-label="Remove search filter"
                      onClick={() => {
                        setGlobalSearch("");
                        if (searchOnEnter) setSubmittedSearch("");
                        setPage(1);
                      }}
                    >
                      <ClearIcon />
                    </button>
                  </span>
                )}

                {Object.entries(filters)
                  .filter(([, value]) => value.trim())
                  .map(([key, value]) => (
                    <span
                      key={key}
                      className={styles.activeFilterChip}
                    >
                      {columns.find((col) => col.key === key)?.header ?? key}:{" "}
                      {value.trim()}
                      <button
                        type="button"
                        aria-label={`Remove ${columns.find((col) => col.key === key)?.header ?? key} search filter`}
                        onClick={() => setFilter(key, "")}
                      >
                        <ClearIcon />
                      </button>
                    </span>
                  ))}

                {Object.entries(appliedValueFilters)
                  .filter(([, values]) => values.length > 0)
                  .map(([key, values]) => (
                    <span
                      key={key}
                      className={styles.activeFilterChip}
                    >
                      {columns.find((col) => col.key === key)?.header ?? key}:{" "}
                      {values.join(", ")}
                      <button
                        type="button"
                        aria-label={`Remove ${columns.find((col) => col.key === key)?.header ?? key} filter`}
                        onClick={() => removeAppliedValueFilter(key)}
                      >
                        <ClearIcon />
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div
        className={styles.custom_table_wrapper}
        style={{ maxHeight }}
      >
        <table className={styles.custom_table}>
          <thead>
            <tr>
              {columns.map((col) => {
                const isSorted =
                  sort?.key === col.key ? sort.direction : null;
                const filterValue = filters[col.key] ?? "";
                const isSearching = openSearch === col.key;
                const selections = appliedValueFilters[col.key] ?? [];

                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cellClasses("th", col)}
                    style={sizeStyle(col)}
                    aria-sort={
                      isSorted === "asc"
                        ? "ascending"
                        : isSorted === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    <div className={styles.custom_table_th_content}>
                      {isSearching ? (
                        <div className={styles.custom_table_search}>
                          <input
                            autoFocus
                            type="text"
                            value={filterValue}
                            placeholder={`Search ${col.header}`}
                            aria-label={`Search ${col.header}`}
                            className={styles.custom_table_search_input}
                            onChange={(event) =>
                              setFilter(col.key, event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                setOpenSearch(null);
                              }
                            }}
                          />

                          <button
                            type="button"
                            className={styles.custom_table_icon_btn}
                            aria-label={`Clear ${col.header} search`}
                            onClick={() => {
                              setFilter(col.key, "");
                              setOpenSearch(null);
                            }}
                          >
                            <ClearIcon />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={styles.custom_table_th_title}>
                            {col.header}
                          </span>

                          {col.sortable && (
                            <button
                              type="button"
                              className={[
                                styles.custom_table_icon_btn,
                                isSorted
                                  ? styles.custom_table_icon_btn_active
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              aria-label={`Sort by ${col.header}`}
                              onClick={() => toggleSort(col.key)}
                            >
                              <SortIcon direction={isSorted} />
                            </button>
                          )}

                          {col.searchable && (
                            <button
                              type="button"
                              className={[
                                styles.custom_table_icon_btn,
                                filterValue
                                  ? styles.custom_table_icon_btn_active
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              aria-label={`Search in ${col.header}`}
                              onClick={() => setOpenSearch(col.key)}
                            >
                              <SearchIcon />
                            </button>
                          )}

                          {col.filterable && (
                            <button
                              type="button"
                              ref={
                                openValueFilter === col.key
                                  ? filterAnchorRef
                                  : undefined
                              }
                              className={[
                                styles.custom_table_icon_btn,
                                selections.length ||
                                openValueFilter === col.key
                                  ? styles.custom_table_icon_btn_active
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              aria-label={`Filter ${col.header}`}
                              aria-expanded={openValueFilter === col.key}
                              onClick={(event) =>
                                toggleValueFilter(
                                  col.key,
                                  event.currentTarget
                                )
                              }
                            >
                              <FilterIcon />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={styles.custom_table_empty}
                >
                  Loading customers...
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={styles.custom_table_empty}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={styles.custom_table_tr}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cellClasses("td", col)}
                      style={sizeStyle(col)}
                    >
                      {col.render
                        ? col.render(row, rowIndex)
                        : String(getValue(row, col.key) ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <CustomPagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={resultCount}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {filterPopup}
    </div>
  );
}

export default CustomTable;
