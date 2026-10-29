'use client';

/** CONTROLLER — expenses: date range, category filter, list, summary and the add form. */
import { useState } from 'react';
import { useAsync } from '@/controllers/useAsync';
import { useAuth } from '@/lib/auth';
import { canWrite } from '@/lib/roles';
import { apiError, todayIso } from '@/lib/utils';
import {
  expenseService, type Expense, type ExpenseFormValues, type ExpenseList, type ExpenseSummary,
} from '@/models/expense';

export const EXPENSE_PAGE_SIZE = 15;

const isoDaysAgo = (n: number) => {
  const d = new Date(todayIso() + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const blankForm = (): ExpenseFormValues => ({
  category: '', amount: '', expenseDate: todayIso(), paymentMethod: 'cash', description: '', reference: '',
});

export function useExpenseController() {
  const { user } = useAuth();
  const [from, setFrom] = useState(isoDaysAgo(29));
  const [to, setTo] = useState(todayIso());
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExpenseFormValues>(blankForm());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const filters = { from, to, category, search: query };
  const list = useAsync<ExpenseList>(() => expenseService.list({ ...filters, page, limit: EXPENSE_PAGE_SIZE }), [from, to, category, query, page]);
  const summary = useAsync<ExpenseSummary>(() => expenseService.summary(filters), [from, to, category, query]);
  const categories = useAsync<string[]>(() => expenseService.categories(), []);

  const reloadAll = () => Promise.all([list.reload(), summary.reload(), categories.reload()]);

  const submit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (editingId) await expenseService.update(editingId, form);
      else await expenseService.create(form);
      setMessage({ kind: 'success', text: editingId ? 'Expense updated' : 'Expense recorded' });
      setForm(blankForm());
      setEditingId(null);
      setShowForm(false);
      setPage(1);
      await reloadAll();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not save the expense') });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setMessage(null);
    try {
      await expenseService.remove(id);
      setMessage({ kind: 'success', text: 'Expense deleted' });
      await reloadAll();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not delete the expense') });
    }
  };

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return {
    rows: list.data?.rows ?? [], total: list.data?.total ?? 0, loading: list.loading, error: !!list.error,
    summary: summary.data, summaryLoading: summary.loading,
    categories: categories.data ?? [],
    page, setPage, limit: EXPENSE_PAGE_SIZE,
    from, to, category, search,
    setFrom: reset(setFrom), setTo: reset(setTo), setCategory: reset(setCategory), setSearch,
    submitSearch: () => { setQuery(search); setPage(1); },
    setRange: (days: number) => { setFrom(isoDaysAgo(days - 1)); setTo(todayIso()); setPage(1); },
    canWrite: canWrite(user?.role),
    showForm, editingId,
    toggleForm: () => {
      setMessage(null);
      if (showForm || editingId) { setShowForm(false); setEditingId(null); setForm(blankForm()); } else setShowForm(true);
    },
    startEdit: (e: Expense) => {
      setMessage(null);
      setEditingId(e.id);
      setForm({
        category: e.category, amount: String(e.amount), expenseDate: e.expenseDate, paymentMethod: e.paymentMethod,
        description: e.description ?? '', reference: e.reference ?? '',
      });
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    form, setForm, saving, message, submit, remove,
  };
}
