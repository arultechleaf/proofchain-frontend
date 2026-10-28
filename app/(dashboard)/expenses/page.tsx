'use client';

/** VIEW — expenses: totals by category, the list, and the add form. */
import { Plus, Receipt, TrendingDown } from 'lucide-react';
import { formatDay, formatMoney } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Field, Grid, Notice, Page, PageHeader, Pager, RowActions, SearchInput, StatCard, SubmitButton, actionsColumn,
} from '@/components/ui';
import { useExpenseController } from '@/controllers/expense.controller';
import { EXPENSE_METHODS, type Expense } from '@/models/expense';

const RANGES = [['7 days', 7], ['30 days', 30], ['90 days', 90]] as const;

export default function ExpensesPage() {
  const c = useExpenseController();

  const columns: Column<Expense>[] = [
    { header: 'Date', cell: (e) => formatDay(e.expenseDate) },
    { header: 'Category', cell: (e) => <strong>{e.category}</strong> },
    { header: 'Details', nowrap: false, cell: (e) => <span className="text-muted">{e.description || '—'}{e.reference ? ` · ${e.reference}` : ''}</span> },
    { header: 'Method', cell: (e) => e.paymentMethod },
    { header: 'Amount', align: 'right', cell: (e) => <span className="amount-out">{formatMoney(e.amount)}</span> },
    actionsColumn<Expense>((e) => (
      <RowActions
        edit={c.canWrite ? () => c.startEdit(e) : undefined}
        remove={c.canWrite ? { confirm: `Delete this ${formatMoney(e.amount)} ${e.category} expense?`, onConfirm: () => c.remove(e.id) } : undefined}
      />
    ), 100),
  ];

  const top = c.summary?.byCategory ?? [];

  return (
    <Page>
      <PageHeader
        title="Expenses"
        subtitle="Rent, salaries, fuel and every other cost that is not a supplier bill"
        actions={c.canWrite && (
          <button className="btn btn-primary" onClick={c.toggleForm}><Plus size={15} /> New Expense</button>
        )}
      />

      {c.error ? <Notice kind="error">Could not load expenses.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}

      {c.showForm && (
        <Card title={c.editingId ? 'Edit expense' : 'New expense'} icon={Receipt} style={{ marginBottom: 20 }}>
          <form className="form-stack" onSubmit={(e) => { e.preventDefault(); c.submit(); }}>
            <Grid cols={4}>
              <Field label="Category" required hint="Pick an existing one or type a new one">
                <input className="form-input" list="expense-categories" value={c.form.category}
                  onChange={(e) => c.setForm({ ...c.form, category: e.target.value })} placeholder="Rent" required />
              </Field>
              <Field label="Amount" required>
                <input type="number" step="0.01" min="0.01" className="form-input" value={c.form.amount}
                  onChange={(e) => c.setForm({ ...c.form, amount: e.target.value })} required />
              </Field>
              <Field label="Date">
                <input type="date" className="form-input" value={c.form.expenseDate}
                  onChange={(e) => c.setForm({ ...c.form, expenseDate: e.target.value })} />
              </Field>
              <Field label="Paid by">
                <select className="form-input" value={c.form.paymentMethod} onChange={(e) => c.setForm({ ...c.form, paymentMethod: e.target.value })}>
                  {EXPENSE_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </Grid>
            <datalist id="expense-categories">{c.categories.map((x) => <option key={x} value={x} />)}</datalist>
            <Grid cols={2}>
              <Field label="Description">
                <input className="form-input" value={c.form.description} onChange={(e) => c.setForm({ ...c.form, description: e.target.value })} />
              </Field>
              <Field label="Reference / bill no.">
                <input className="form-input" value={c.form.reference} onChange={(e) => c.setForm({ ...c.form, reference: e.target.value })} />
              </Field>
            </Grid>
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <SubmitButton loading={c.saving}>{c.editingId ? 'Save changes' : 'Save expense'}</SubmitButton>
              <button type="button" className="btn btn-ghost" onClick={c.toggleForm}>Cancel</button>
            </div>
          </form>
        </Card>
      )}

      <div className="toolbar">
        <div className="seg">
          {RANGES.map(([label, days]) => <button key={label} onClick={() => c.setRange(days)}>Last {label}</button>)}
        </div>
        <input type="date" className="form-input" style={{ width: 160 }} value={c.from} max={c.to} onChange={(e) => c.setFrom(e.target.value)} aria-label="From" />
        <input type="date" className="form-input" style={{ width: 160 }} value={c.to} min={c.from} onChange={(e) => c.setTo(e.target.value)} aria-label="To" />
        <select className="form-input" style={{ width: 180 }} value={c.category} onChange={(e) => c.setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {c.categories.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <form className="toolbar-grow" onSubmit={(e) => { e.preventDefault(); c.submitSearch(); }}>
          <SearchInput placeholder="Search description or reference…" value={c.search} onChange={(e) => c.setSearch(e.target.value)} />
        </form>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Total spent" value={formatMoney(c.summary?.total)} color="#f87171" icon={TrendingDown} loading={c.summaryLoading}
          hint={`${c.total} entries in range`} />
        {top.slice(0, 4).map((x) => (
          <StatCard key={x.category} label={x.category} value={formatMoney(x.total)} color="#fbbf24" loading={c.summaryLoading}
            hint={`${x.count} ${x.count === 1 ? 'entry' : 'entries'}`} />
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={c.rows}
        loading={c.loading}
        rowKey={(e) => e.id}
        empty={<EmptyState icon={Receipt} title="No expenses in this range" />}
        startIndex={(c.page - 1) * c.limit}
        footer={<Pager page={c.page} total={c.total} limit={c.limit} onPage={c.setPage} />}
      />
    </Page>
  );
}
