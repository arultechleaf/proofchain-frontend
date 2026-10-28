'use client';

/** CONTROLLER — cash & bank: accounts, the transaction list and the three entry forms. */
import { useState } from 'react';
import { useAsync } from '@/controllers/useAsync';
import { useAuth } from '@/lib/auth';
import { canWrite } from '@/lib/roles';
import { apiError, todayIso } from '@/lib/utils';
import {
  cashBankService,
  type AccountFormValues, type AccountsResult, type BankAccount, type BankTransaction, type MovementFormValues, type TransactionList, type TransferFormValues,
} from '@/models/cash-bank';

export const TX_PAGE_SIZE = 15;
export type CashBankForm = 'account' | 'movement' | 'transfer' | null;

const blankAccount = (): AccountFormValues => ({ name: '', accountType: 'bank', accountNumber: '', openingBalance: '' });
const blankMovement = (accountId = ''): MovementFormValues => ({ accountId, type: 'deposit', amount: '', transactionDate: todayIso(), description: '' });
const blankTransfer = (): TransferFormValues => ({ fromAccountId: '', toAccountId: '', amount: '', transactionDate: todayIso(), description: '' });

export function useCashBankController() {
  const { user } = useAuth();
  const [accountFilter, setAccountFilter] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<CashBankForm>(null);
  const [saving, setSaving] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const [account, setAccount] = useState<AccountFormValues>(blankAccount());
  const [movement, setMovement] = useState<MovementFormValues>(blankMovement());
  const [transfer, setTransfer] = useState<TransferFormValues>(blankTransfer());

  const accounts = useAsync<AccountsResult>(() => cashBankService.accounts(), []);
  const transactions = useAsync<TransactionList>(
    () => cashBankService.transactions({ accountId: accountFilter, page, limit: TX_PAGE_SIZE }),
    [accountFilter, page],
  );

  const activeAccounts = (accounts.data?.rows ?? []).filter((a) => a.isActive);

  const refresh = async () => {
    await Promise.all([accounts.reload(), transactions.reload()]);
  };

  const run = async (action: () => Promise<unknown>, success: string, after: () => void) => {
    setSaving(true);
    setMessage(null);
    try {
      await action();
      setMessage({ kind: 'success', text: success });
      after();
      setForm(null);
      await refresh();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not save') });
    } finally {
      setSaving(false);
    }
  };

  return {
    accounts: accounts.data, accountsLoading: accounts.loading, accountsError: !!accounts.error,
    activeAccounts,
    transactions: transactions.data?.rows ?? [], txTotal: transactions.data?.total ?? 0, txLoading: transactions.loading,
    txPage: page, setTxPage: setPage, txLimit: TX_PAGE_SIZE,
    accountFilter, setAccountFilter: (id: string) => { setAccountFilter(id); setPage(1); },
    canWrite: canWrite(user?.role),
    form, editingAccountId,
    openForm: (f: CashBankForm) => {
      setMessage(null);
      setEditingAccountId(null);
      if (f === 'account') setAccount(blankAccount());
      if (f === 'movement') setMovement(blankMovement(accountFilter || activeAccounts[0]?.id));
      setForm(f);
    },
    closeForm: () => setForm(null),
    saving, message,
    account, setAccount, movement, setMovement, transfer, setTransfer,
    submitAccount: () => run(
      () => (editingAccountId ? cashBankService.updateAccount(editingAccountId, account) : cashBankService.createAccount(account)),
      editingAccountId ? `Account "${account.name}" updated` : `Account "${account.name}" created`,
      () => { setAccount(blankAccount()); setEditingAccountId(null); },
    ),
    startEditAccount: (a: BankAccount) => {
      setMessage(null);
      setEditingAccountId(a.id);
      setAccount({ name: a.name, accountType: a.accountType, accountNumber: a.accountNumber ?? '', openingBalance: String(a.openingBalance) });
      setForm('account');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    removeAccount: (a: BankAccount) => run(() => cashBankService.removeAccount(a.id), `Account "${a.name}" deleted`, () => undefined),
    removeTransaction: (t: BankTransaction) => run(() => cashBankService.removeTransaction(t.id), t.type.startsWith('transfer') ? 'Transfer deleted (both sides)' : 'Transaction deleted', () => undefined),
    submitMovement: () => run(() => cashBankService.createMovement(movement), movement.type === 'deposit' ? 'Deposit recorded' : 'Withdrawal recorded', () => setMovement(blankMovement())),
    submitTransfer: () => run(() => cashBankService.transfer(transfer), 'Transfer completed', () => setTransfer(blankTransfer())),
    toggleActive: (id: string, isActive: boolean) =>
      run(() => cashBankService.setActive(id, isActive), isActive ? 'Account activated' : 'Account deactivated', () => undefined),
  };
}
