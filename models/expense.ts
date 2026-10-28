/** MODEL — expenses. */
import { expensesApi } from '@/lib/api';

export const EXPENSE_METHODS = ['cash', 'bank', 'upi', 'card', 'cheque'];

export interface Expense {
  id: string;
  category: string;
  description?: string | null;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  reference?: string | null;
}

export interface ExpenseSummary {
  total: number;
  byCategory: Array<{ category: string; total: number; count: number }>;
}

export interface ExpenseList {
  rows: Expense[];
  total: number;
}

export interface ExpenseFormValues {
  category: string;
  amount: string;
  expenseDate: string;
  paymentMethod: string;
  description: string;
  reference: string;
}

export interface ExpenseQuery {
  category?: string;
  from?: string;
  to?: string;
  search?: string;
}

const clean = (q: ExpenseQuery) => ({
  category: q.category || undefined, from: q.from || undefined, to: q.to || undefined, search: q.search || undefined,
});

export const expenseService = {
  async list(q: ExpenseQuery & { page: number; limit: number }): Promise<ExpenseList> {
    const res = await expensesApi.list({ ...clean(q), page: q.page, limit: q.limit });
    return { rows: res.data.data ?? [], total: res.data.total ?? 0 };
  },
  async summary(q: ExpenseQuery): Promise<ExpenseSummary> {
    return (await expensesApi.summary(clean(q))).data.data;
  },
  async categories(): Promise<string[]> {
    return (await expensesApi.categories()).data.data;
  },
  create: (v: ExpenseFormValues) =>
    expensesApi.create({
      category: v.category.trim(),
      amount: Number(v.amount),
      expenseDate: v.expenseDate || undefined,
      paymentMethod: v.paymentMethod,
      description: v.description.trim() || undefined,
      reference: v.reference.trim() || undefined,
    }),
  update: (id: string, v: ExpenseFormValues) =>
    expensesApi.update(id, {
      category: v.category.trim(),
      amount: Number(v.amount),
      expenseDate: v.expenseDate || undefined,
      paymentMethod: v.paymentMethod,
      description: v.description.trim(),
      reference: v.reference.trim(),
    }),
  remove: (id: string) => expensesApi.remove(id),
};
