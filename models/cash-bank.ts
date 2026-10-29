/** MODEL — cash & bank accounts and their transactions. */
import { cashBankApi, type Id } from '@/lib/api';

export type AccountType = 'cash' | 'bank';
export type BankTxType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';

export interface BankAccount {
  id: number;
  name: string;
  accountType: AccountType;
  accountNumber?: string | null;
  openingBalance: number;
  isActive: boolean;
  balance: number;
}

export interface AccountsResult {
  rows: BankAccount[];
  totals: { all: number; cash: number; bank: number };
}

export interface BankTransaction {
  id: number;
  accountId: number;
  accountName: string;
  counterAccountName?: string | null;
  type: BankTxType;
  amount: number;
  transactionDate: string;
  description?: string | null;
  reference?: string | null;
}

export interface TransactionList {
  rows: BankTransaction[];
  total: number;
}

export interface AccountFormValues {
  name: string;
  accountType: AccountType;
  accountNumber: string;
  openingBalance: string;
}

export interface MovementFormValues {
  /** Select values are text; the API converts them to numbers. */
  accountId: string;
  type: 'deposit' | 'withdrawal';
  amount: string;
  transactionDate: string;
  description: string;
}

export interface TransferFormValues {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transactionDate: string;
  description: string;
}

export const TX_LABEL: Record<BankTxType, { label: string; sign: 1 | -1; color: string }> = {
  deposit: { label: 'Deposit', sign: 1, color: '#34d399' },
  withdrawal: { label: 'Withdrawal', sign: -1, color: '#f87171' },
  transfer_in: { label: 'Transfer in', sign: 1, color: '#60a5fa' },
  transfer_out: { label: 'Transfer out', sign: -1, color: '#fbbf24' },
};

export const cashBankService = {
  async accounts(): Promise<AccountsResult> {
    return (await cashBankApi.accounts()).data.data;
  },
  async transactions(q: { accountId?: Id; type?: string; page: number; limit: number }): Promise<TransactionList> {
    const res = await cashBankApi.transactions({ accountId: q.accountId || undefined, type: q.type || undefined, page: q.page, limit: q.limit });
    return { rows: res.data.data ?? [], total: res.data.total ?? 0 };
  },
  createAccount: (v: AccountFormValues) =>
    cashBankApi.createAccount({
      name: v.name.trim(),
      accountType: v.accountType,
      accountNumber: v.accountNumber.trim() || undefined,
      openingBalance: Number(v.openingBalance) || 0,
    }),
  setActive: (id: Id, isActive: boolean) => cashBankApi.updateAccount(id, { isActive }),
  updateAccount: (id: Id, v: AccountFormValues) =>
    cashBankApi.updateAccount(id, { name: v.name.trim(), accountNumber: v.accountNumber.trim() }),
  removeAccount: (id: Id) => cashBankApi.removeAccount(id),
  removeTransaction: (id: Id) => cashBankApi.removeTransaction(id),
  createMovement: (v: MovementFormValues) =>
    cashBankApi.createTransaction({
      accountId: v.accountId,
      type: v.type,
      amount: Number(v.amount),
      transactionDate: v.transactionDate || undefined,
      description: v.description.trim() || undefined,
    }),
  transfer: (v: TransferFormValues) =>
    cashBankApi.transfer({
      fromAccountId: v.fromAccountId,
      toAccountId: v.toAccountId,
      amount: Number(v.amount),
      transactionDate: v.transactionDate || undefined,
      description: v.description.trim() || undefined,
    }),
};
