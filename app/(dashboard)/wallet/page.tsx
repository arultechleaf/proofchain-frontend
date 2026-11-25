"use client";

import { FormEvent, useEffect, useState } from "react";
import { Landmark, Wallet as WalletIcon } from "lucide-react";
import {
  Button,
  Card,
  Column,
  DataTable,
  EmptyState,
  Notice,
  Page,
  PageHeader,
  Pager,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { claimsApi, usersApi, walletApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { apiError, formatDate, formatMoney } from "@/lib/utils";
import { usePageSize } from "@/lib/usePageSize";
import type { User, WalletClaim } from "@/models";

type ClaimForm = {
  amount: string;
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
};

const EMPTY_FORM: ClaimForm = {
  amount: "",
  accountHolderName: "",
  accountNumber: "",
  ifsc: "",
};

type WalletCreditDraft = {
  requestId: string;
  userId: number;
  amount: number;
  reason: string;
};

const CREDIT_DRAFT_KEY = "walletCreditDraft";
const CLAIM_STATUS_POLL_INTERVAL_MS = 60_000;

function readCreditDraft(): WalletCreditDraft | null {
  if (typeof window === "undefined") return null;
  const savedDraft = sessionStorage.getItem(CREDIT_DRAFT_KEY);
  if (!savedDraft) return null;

  try {
    const draft = JSON.parse(savedDraft) as WalletCreditDraft;
    if (
      typeof draft.requestId === "string" &&
      Number.isInteger(draft.userId) &&
      typeof draft.amount === "number" &&
      typeof draft.reason === "string"
    ) {
      return draft;
    }
  } catch {
    sessionStorage.removeItem(CREDIT_DRAFT_KEY);
    return null;
  }

  sessionStorage.removeItem(CREDIT_DRAFT_KEY);
  return null;
}

export default function WalletPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [restoredCreditDraft] = useState(readCreditDraft);
  const [balance, setBalance] = useState(0);
  const [minimum, setMinimum] = useState(0);
  const [claims, setClaims] = useState<WalletClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = usePageSize(20);
  const [walletRefresh, setWalletRefresh] = useState(0);
  const [claimsRefresh, setClaimsRefresh] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [refreshingClaimId, setRefreshingClaimId] = useState<number | null>(
    null,
  );
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [form, setForm] = useState<ClaimForm>(EMPTY_FORM);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(
    String(restoredCreditDraft?.userId ?? ""),
  );
  const [creditAmount, setCreditAmount] = useState(
    restoredCreditDraft ? String(restoredCreditDraft.amount) : "",
  );
  const [creditReason, setCreditReason] = useState(
    restoredCreditDraft?.reason ?? "",
  );
  const [creditRequestId, setCreditRequestId] = useState(
    restoredCreditDraft?.requestId ?? "",
  );
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditMessage, setCreditMessage] = useState("");
  const [creditConfirm, setCreditConfirm] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    usersApi
      .list()
      .then((response) => {
        if (!active) return;
        const activeUsers = (response.data.data as User[]).filter(
          (candidate) => candidate.isActive && candidate.id !== currentUser?.id,
        );
        setUsers(activeUsers);
        setSelectedUserId(
          (current) => current || String(activeUsers[0]?.id ?? ""),
        );
      })
      .catch((err) => {
        if (active) setError(apiError(err));
      });

    return () => {
      active = false;
    };
  }, [currentUser?.id, isAdmin]);

  useEffect(() => {
    let active = true;
    void claimsApi.wallet()
      .then((response) => {
        if (!active) return;
        const wallet = response.data.data;
        setBalance(wallet.balance);
        setMinimum(wallet.minimumClaimAmount);
      })
      .catch((err) => {
        if (active) setError(apiError(err));
      })
      .finally(() => {
        if (active) setWalletLoading(false);
      });

    return () => {
      active = false;
    };
  }, [walletRefresh]);

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let hasUnfinishedClaims = false;
    let fetching = false;
    const hasActiveClaims = (rows: WalletClaim[]) =>
      rows.some(
        (claim) =>
          claim.status === "PENDING" || claim.status === "PROCESSING",
      );

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      if (
        active &&
        hasUnfinishedClaims &&
        document.visibilityState === "visible"
      ) {
        refreshTimer = setTimeout(
          () => void fetchClaims(),
          CLAIM_STATUS_POLL_INTERVAL_MS,
        );
      }
    };

    const fetchClaims = async () => {
      if (!active || fetching) return;
      fetching = true;
      try {
        const response = await claimsApi.list({ page, limit });
        if (!active) return;
        const history = response.data.data;
        setClaims(history.rows);
        setTotal(history.total);
        hasUnfinishedClaims = hasActiveClaims(history.rows);
      } catch (err) {
        if (active) setError(apiError(err));
      } finally {
        fetching = false;
        if (active) {
          setClaimsLoading(false);
          scheduleRefresh();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && hasUnfinishedClaims) {
        void fetchClaims();
      } else if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void fetchClaims();
    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [limit, page, claimsRefresh]);

  const retryClaim = async (claimId: number) => {
    setRetryingId(claimId);
    setError("");
    try {
      const response = await claimsApi.retry(claimId);
      const updatedClaim = response.data.data as WalletClaim;
      setClaims((current) =>
        current.map((claim) =>
          claim.id === updatedClaim.id ? updatedClaim : claim,
        ),
      );
      if (updatedClaim.status === "FAILED") {
        setWalletLoading(true);
        setWalletRefresh((current) => current + 1);
      }
    } catch (err) {
      setError(apiError(err));
      setClaimsLoading(true);
      setClaimsRefresh((current) => current + 1);
    } finally {
      setRetryingId(null);
    }
  };

  const refreshClaimStatus = async (claimId: number) => {
    setRefreshingClaimId(claimId);
    setError("");
    try {
      const response = await claimsApi.refreshStatus(claimId);
      const updatedClaim = response.data.data as WalletClaim;
      setClaims((current) =>
        current.map((claim) =>
          claim.id === updatedClaim.id ? updatedClaim : claim,
        ),
      );
      if (
        updatedClaim.status === "COMPLETED" ||
        updatedClaim.status === "FAILED"
      ) {
        if (updatedClaim.status === "FAILED") {
          setWalletLoading(true);
          setWalletRefresh((current) => current + 1);
        }
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setRefreshingClaimId(null);
    }
  };

  const submitCredit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUserId || !creditReason.trim()) return;
    if (!creditRequestId && !creditConfirm) {
      setCreditConfirm(true);
      return;
    }

    const draft: WalletCreditDraft = {
      requestId: creditRequestId || crypto.randomUUID(),
      userId: Number(selectedUserId),
      amount: Number(creditAmount),
      reason: creditReason.trim(),
    };
    setCreditRequestId(draft.requestId);
    sessionStorage.setItem(CREDIT_DRAFT_KEY, JSON.stringify(draft));
    setCreditSaving(true);
    setCreditMessage("");

    try {
      const response = await walletApi.adminCredit(draft.userId, draft);
      const result = response.data.data;
      setCreditMessage(
        `Wallet credited. New balance: ${formatMoney(result.balance)}. Reference: ${result.transaction.referenceId}`,
      );
      sessionStorage.removeItem(CREDIT_DRAFT_KEY);
      setCreditRequestId("");
      setCreditAmount("");
      setCreditReason("");
      setCreditConfirm(false);
      if (draft.userId === currentUser?.id) {
        setBalance(result.balance);
      }
    } catch (err) {
      setError(apiError(err));
      if (isClientError(err)) {
        sessionStorage.removeItem(CREDIT_DRAFT_KEY);
        setCreditRequestId("");
      }
    } finally {
      setCreditSaving(false);
    }
  };

  const isClientError = (err: unknown) =>
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof err.response === "object" &&
    err.response !== null &&
    "status" in err.response &&
    typeof err.response.status === "number" &&
    err.response.status >= 400 &&
    err.response.status < 500;

  const columns: Column<WalletClaim>[] = [
    { header: "Requested on", cell: (claim) => formatDate(claim.createdAt) },
    { header: "Claim reference", cell: (claim) => claim.referenceId },
    {
      header: "Amount",
      align: "right",
      cell: (claim) => formatMoney(Number(claim.amount)),
    },
    {
      header: "Bank account",
      cell: (claim) => `Ending in ${claim.bankAccountLastFour}`,
    },
    {
      header: "Status",
      cell: (claim) => <StatusBadge status={claim.status.toLowerCase()} />,
    },
    {
      header: "Payout details",
      nowrap: false,
      cell: (claim) => (
        <div>
          {claim.status === "FAILED"
            ? (claim.failureReason ?? "Payout failed")
            : (claim.utr ?? "—")}
          {claim.status === "PROCESSING" && claim.razorpayPayoutId && (
            <Button
              variant="secondary"
              loading={refreshingClaimId === claim.id}
              disabled={
                refreshingClaimId !== null || retryingId !== null
              }
              onClick={() => void refreshClaimStatus(claim.id)}
            >
              Refresh status
            </Button>
          )}
          {claim.status === "PROCESSING" &&
            claim.razorpayFundAccountId &&
            !claim.razorpayPayoutId && (
              <Button
                variant="secondary"
                loading={retryingId === claim.id}
                disabled={
                  retryingId !== null || refreshingClaimId !== null
                }
                onClick={() => void retryClaim(claim.id)}
              >
                Retry safely
              </Button>
            )}
        </div>
      ),
    },
  ];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirm) {
      setConfirm(true);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const activeRequestId = requestId || crypto.randomUUID();
      sessionStorage.setItem("claimRequestId", activeRequestId);
      setRequestId(activeRequestId);
      await claimsApi.create({
        ...form,
        requestId: activeRequestId,
        amount: Number(form.amount),
      });
      setOpen(false);
      setConfirm(false);
      setForm(EMPTY_FORM);
      setRequestId("");
      sessionStorage.removeItem("claimRequestId");
      setWalletLoading(true);
      setClaimsLoading(true);
      setError("");
      setPage(1);
      setWalletRefresh((current) => current + 1);
      setClaimsRefresh((current) => current + 1);
    } catch (err) {
      setError(apiError(err));
      setWalletLoading(true);
      setClaimsLoading(true);
      setWalletRefresh((current) => current + 1);
      setClaimsRefresh((current) => current + 1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Wallet"
        subtitle="Claim your wallet balance to a bank account"
        actions={
          <Button
            onClick={() => {
              setForm(EMPTY_FORM);
              const pendingRequestId =
                sessionStorage.getItem("claimRequestId") ?? crypto.randomUUID();
              sessionStorage.setItem("claimRequestId", pendingRequestId);
              setRequestId(pendingRequestId);
              setOpen(true);
              setConfirm(false);
              setError("");
            }}
            icon={Landmark}
          >
            Claim amount
          </Button>
        }
      />

      {error && <Notice kind="error">{error}</Notice>}
      {claims.some((claim) => claim.status === "PROCESSING") && (
        <Notice kind="info">
          RazorpayX Test Mode does not complete payouts automatically. Open the
          payout in the RazorpayX Dashboard and move it to Processed. The claim
          status will update after RazorpayX confirms the change.
        </Notice>
      )}

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Available balance"
          value={formatMoney(balance)}
          color="#3ddc84"
          icon={WalletIcon}
          hint={`Minimum claim ${formatMoney(minimum)}`}
          loading={walletLoading}
        />
      </div>

      {isAdmin && (
        <Card title="Admin wallet credit" icon={WalletIcon}>
          <Notice kind="info">
            Credit only after confirming the approved business funding record.
            This amount becomes claimable for bank payout.
          </Notice>
          {creditMessage && <Notice kind="success">{creditMessage}</Notice>}
          <form onSubmit={submitCredit} className="claim-form">
            <label className="form-label">
              User
              <select
                className="form-input"
                required
                disabled={!!creditRequestId || creditSaving}
                value={selectedUserId}
                onChange={(event) => {
                  setSelectedUserId(event.target.value);
                  setCreditConfirm(false);
                }}
              >
                {users.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Amount
              <input
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                required
                disabled={!!creditRequestId || creditSaving}
                value={creditAmount}
                onChange={(event) => {
                  setCreditAmount(event.target.value);
                  setCreditConfirm(false);
                }}
              />
            </label>
            <label className="form-label">
              Approval reason or reference
              <input
                className="form-input"
                minLength={3}
                maxLength={200}
                required
                disabled={!!creditRequestId || creditSaving}
                value={creditReason}
                onChange={(event) => {
                  setCreditReason(event.target.value);
                  setCreditConfirm(false);
                }}
              />
            </label>
            {creditConfirm && !creditRequestId && (
              <Notice kind="info">
                Confirm {formatMoney(Number(creditAmount))} to{" "}
                {
                  users.find(
                    (candidate) => String(candidate.id) === selectedUserId,
                  )?.name
                }
                . The amount becomes available for bank payout.
              </Notice>
            )}
            <Button
              type="submit"
              loading={creditSaving}
              disabled={
                creditSaving || (users.length === 0 && !creditRequestId)
              }
            >
              {creditRequestId
                ? "Retry credit request"
                : creditConfirm
                  ? "Confirm wallet credit"
                  : "Review wallet credit"}
            </Button>
          </form>
        </Card>
      )}

      <Card title="Claim history" icon={Landmark}>
        <DataTable
          columns={columns}
          rows={claims}
          loading={claimsLoading}
          rowKey={(claim) => claim.id}
          empty={<EmptyState icon={WalletIcon} title="No claims yet" />}
          footer={
            <Pager
              page={page}
              total={total}
              limit={limit}
              onPage={(nextPage) => {
                setClaimsLoading(true);
                setError("");
                setPage(nextPage);
              }}
              onLimit={(nextLimit) => {
                setClaimsLoading(true);
                setError("");
                setLimit(nextLimit);
              }}
            />
          }
          startIndex={(page - 1) * limit}
        />
      </Card>

      {open && (
        <div className="modal-overlay">
          <div className="modal claim-modal" style={{ maxWidth: 500 }}>
            <h2 className="modal-title">Claim amount</h2>
            <p className="modal-text">
              Confirming starts a bank payout immediately. The status updates
              when RazorpayX confirms the transfer.
            </p>
            <form onSubmit={submit} className="claim-form" autoComplete="off">
              <label className="form-label">
                Amount
                <span className="claim-input-hint">
                  Available: {formatMoney(balance)}
                </span>
                <input
                  className="form-input"
                  type="number"
                  min={minimum}
                  max={balance}
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                />
              </label>
              <label className="form-label">
                Account holder name
                <input
                  className="form-input"
                  required
                  value={form.accountHolderName}
                  onChange={(event) =>
                    setForm({ ...form, accountHolderName: event.target.value })
                  }
                />
              </label>
              <label className="form-label">
                Account number
                <input
                  className="form-input"
                  inputMode="numeric"
                  required
                  value={form.accountNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      accountNumber: event.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </label>
              <label className="form-label">
                IFSC
                <input
                  className="form-input"
                  required
                  value={form.ifsc}
                  onChange={(event) =>
                    setForm({ ...form, ifsc: event.target.value.toUpperCase() })
                  }
                />
              </label>
              {confirm && (
                <Notice kind="info">
                  Confirm ₹{form.amount} to the account ending in{" "}
                  {form.accountNumber.slice(-4)}. This submits a payout request.
                </Notice>
              )}
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setOpen(false);
                    setConfirm(false);
                    setForm(EMPTY_FORM);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving} disabled={saving}>
                  {confirm ? "Confirm claim" : "Continue"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}
