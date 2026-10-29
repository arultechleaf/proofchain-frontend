'use client';

/** VIEW — cash & bank accounts, balances and transactions. */
import { ArrowLeftRight, Banknote, Landmark, Plus, Wallet } from 'lucide-react';
import { formatDay, formatMoney } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Field, Grid, Notice, Page, PageHeader, Pager, RowActions, StatCard, Form, actionsColumn,
} from '@/components/ui';
import { useCashBankController } from '@/controllers/cash-bank.controller';
import { TX_LABEL, type BankTransaction } from '@/models/cash-bank';

function buildColumns(writable: boolean, remove: (t: BankTransaction) => void): Column<BankTransaction>[] {
  return [
  { header: 'Date', cell: (t) => formatDay(t.transactionDate) },
  { header: 'Account', cell: (t) => t.accountName },
  { header: 'Type', cell: (t) => <span style={{ color: TX_LABEL[t.type].color, fontWeight: 600 }}>{TX_LABEL[t.type].label}</span> },
  {
    header: 'Details',
    nowrap: false,
    cell: (t) => (
      <span className="text-muted">
        {t.description || '—'}{t.counterAccountName ? ` (${TX_LABEL[t.type].sign > 0 ? 'from' : 'to'} ${t.counterAccountName})` : ''}
      </span>
    ),
  },
  {
    header: 'Amount', align: 'right',
    cell: (t) => <span className={TX_LABEL[t.type].sign > 0 ? 'amount-in' : 'amount-out'}>{TX_LABEL[t.type].sign > 0 ? '+' : '−'}{formatMoney(t.amount)}</span>,
  },
  actionsColumn<BankTransaction>((t) => (
    <RowActions
      remove={writable ? {
        confirm: t.type.startsWith('transfer')
          ? `Delete this transfer of ${formatMoney(t.amount)}? Both accounts are corrected.`
          : `Delete this ${TX_LABEL[t.type].label.toLowerCase()} of ${formatMoney(t.amount)}?`,
        onConfirm: () => remove(t),
      } : undefined}
    />
  ), 80),
  ];
}

export default function CashBankPage() {
  const c = useCashBankController();
  const columns = buildColumns(c.canWrite, c.removeTransaction);
  const a = c.accounts;
  const needTwo = c.activeAccounts.length < 2;

  return (
    <Page>
      <PageHeader
        title="Cash & Bank"
        subtitle="Cash drawers and bank accounts, with every deposit, withdrawal and transfer"
        actions={c.canWrite && (
          <>
            <button className="btn btn-primary" onClick={() => c.openForm('movement')} disabled={!c.activeAccounts.length}>
              <Plus size={15} /> Deposit / Withdraw
            </button>
            <button className="btn btn-secondary" onClick={() => c.openForm('transfer')} disabled={needTwo}>
              <ArrowLeftRight size={15} /> Transfer
            </button>
            <button className="btn btn-secondary" onClick={() => c.openForm('account')}>
              <Landmark size={15} /> New Account
            </button>
          </>
        )}
      />

      {c.accountsError ? <Notice kind="error">Could not load accounts.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}

      <Grid cols={3} style={{ marginBottom: 20 }}>
        <StatCard label="Total balance" value={formatMoney(a?.totals.all)} color="#60a5fa" icon={Wallet} loading={c.accountsLoading} hint="Active accounts" />
        <StatCard label="Cash in hand" value={formatMoney(a?.totals.cash)} color="#34d399" icon={Banknote} loading={c.accountsLoading} />
        <StatCard label="In banks" value={formatMoney(a?.totals.bank)} color="#22d3ee" icon={Landmark} loading={c.accountsLoading} />
      </Grid>

      {c.form === 'account' && (
        <Card title={c.editingAccountId ? 'Edit account' : 'New account'} icon={Landmark} style={{ marginBottom: 20 }}>
          <Form onSubmit={() => c.submitAccount()} loading={c.saving} submitLabel={c.editingAccountId ? 'Save changes' : 'Create account'} onCancel={c.closeForm}>
            <Grid cols={4}>
              <Field label="Name" required>
                <input className="form-input" value={c.account.name} onChange={(e) => c.setAccount({ ...c.account, name: e.target.value })} placeholder="HDFC Current" required />
              </Field>
              <Field label="Type">
                <select className="form-input" disabled={!!c.editingAccountId} value={c.account.accountType} onChange={(e) => c.setAccount({ ...c.account, accountType: e.target.value as 'cash' | 'bank' })}>
                  <option value="bank">Bank account</option>
                  <option value="cash">Cash</option>
                </select>
              </Field>
              <Field label="Account number">
                <input className="form-input" value={c.account.accountNumber} onChange={(e) => c.setAccount({ ...c.account, accountNumber: e.target.value })} />
              </Field>
              <Field label="Opening balance">
                <input type="number" step="0.01" className="form-input" disabled={!!c.editingAccountId} value={c.account.openingBalance} onChange={(e) => c.setAccount({ ...c.account, openingBalance: e.target.value })} />
              </Field>
            </Grid>
          </Form>
        </Card>
      )}

      {c.form === 'movement' && (
        <Card title="Deposit / withdrawal" icon={Plus} style={{ marginBottom: 20 }}>
          <Form onSubmit={() => c.submitMovement()} loading={c.saving} submitLabel={"Save"} onCancel={c.closeForm}>
            <Grid cols={4}>
              <Field label="Account" required>
                <select className="form-input" value={c.movement.accountId} onChange={(e) => c.setMovement({ ...c.movement, accountId: e.target.value })} required>
                  <option value="">Select…</option>
                  {c.activeAccounts.map((x) => <option key={x.id} value={x.id}>{x.name} ({formatMoney(x.balance)})</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select className="form-input" value={c.movement.type} onChange={(e) => c.setMovement({ ...c.movement, type: e.target.value as 'deposit' | 'withdrawal' })}>
                  <option value="deposit">Deposit (money in)</option>
                  <option value="withdrawal">Withdrawal (money out)</option>
                </select>
              </Field>
              <Field label="Amount" required>
                <input type="number" step="0.01" min="0.01" className="form-input" value={c.movement.amount} onChange={(e) => c.setMovement({ ...c.movement, amount: e.target.value })} required />
              </Field>
              <Field label="Date">
                <input type="date" className="form-input" value={c.movement.transactionDate} onChange={(e) => c.setMovement({ ...c.movement, transactionDate: e.target.value })} />
              </Field>
            </Grid>
            <Field label="Description">
              <input className="form-input" value={c.movement.description} onChange={(e) => c.setMovement({ ...c.movement, description: e.target.value })} placeholder="Cheque deposit, petty cash…" />
            </Field>
          </Form>
        </Card>
      )}

      {c.form === 'transfer' && (
        <Card title="Transfer between accounts" icon={ArrowLeftRight} style={{ marginBottom: 20 }}>
          <Form onSubmit={() => c.submitTransfer()} loading={c.saving} submitLabel={"Transfer"} onCancel={c.closeForm}>
            <Grid cols={4}>
              <Field label="From" required>
                <select className="form-input" value={c.transfer.fromAccountId} onChange={(e) => c.setTransfer({ ...c.transfer, fromAccountId: e.target.value })} required>
                  <option value="">Select…</option>
                  {c.activeAccounts.map((x) => <option key={x.id} value={x.id}>{x.name} ({formatMoney(x.balance)})</option>)}
                </select>
              </Field>
              <Field label="To" required>
                <select className="form-input" value={c.transfer.toAccountId} onChange={(e) => c.setTransfer({ ...c.transfer, toAccountId: e.target.value })} required>
                  <option value="">Select…</option>
                  {c.activeAccounts.filter((x) => x.id !== c.transfer.fromAccountId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <Field label="Amount" required>
                <input type="number" step="0.01" min="0.01" className="form-input" value={c.transfer.amount} onChange={(e) => c.setTransfer({ ...c.transfer, amount: e.target.value })} required />
              </Field>
              <Field label="Date">
                <input type="date" className="form-input" value={c.transfer.transactionDate} onChange={(e) => c.setTransfer({ ...c.transfer, transactionDate: e.target.value })} />
              </Field>
            </Grid>
          </Form>
        </Card>
      )}

      <h2 className="card-title" style={{ marginBottom: 12 }}>Accounts</h2>
      {!c.accountsLoading && (a?.rows.length ?? 0) === 0 ? (
        <EmptyState icon={Landmark} title="No accounts yet — create your cash drawer or a bank account to begin" />
      ) : (
        <div className="stat-grid" style={{ marginBottom: 28 }}>
          {(a?.rows ?? []).map((x) => (
            <div key={x.id} className={`glass-card account-card${x.isActive ? '' : ' is-inactive'}`}>
              <div className="account-card-top">
                <p className="account-card-name">
                  {x.accountType === 'cash' ? <Banknote size={14} color="#34d399" /> : <Landmark size={14} color="#22d3ee" />} {x.name}
                </p>
                {c.canWrite && (
                  <RowActions
                    edit={() => c.startEditAccount(x)}
                    remove={{ confirm: `Delete the account "${x.name}"? It must have no transactions.`, onConfirm: () => c.removeAccount(x) }}
                  />
                )}
              </div>
              <p className="account-card-balance">{formatMoney(x.balance)}</p>
              <p className="account-card-meta">
                {x.accountType === 'cash' ? 'Cash' : 'Bank'}{x.accountNumber ? ` · ${x.accountNumber}` : ''}{x.isActive ? '' : ' · inactive'}
              </p>
              <div className="toolbar" style={{ marginBottom: 0, marginTop: 4 }}>
                <button className="btn btn-ghost" onClick={() => c.setAccountFilter(c.accountFilter === x.id ? '' : x.id)}>
                  {c.accountFilter === x.id ? 'Show all' : 'View transactions'}
                </button>
                {c.canWrite && (
                  <button className="btn btn-ghost" onClick={() => c.toggleActive(x.id, !x.isActive)}>
                    {x.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="card-title" style={{ marginBottom: 12 }}>
        Transactions{c.accountFilter ? ` · ${a?.rows.find((x) => x.id === c.accountFilter)?.name ?? ''}` : ''}
      </h2>
      <DataTable
        columns={columns}
        rows={c.transactions}
        loading={c.txLoading}
        rowKey={(t) => t.id}
        empty={<EmptyState icon={ArrowLeftRight} title="No transactions yet" />}
        startIndex={(c.txPage - 1) * c.txLimit}
        footer={<Pager page={c.txPage} total={c.txTotal} limit={c.txLimit} onPage={c.setTxPage} />}
      />
    </Page>
  );
}
