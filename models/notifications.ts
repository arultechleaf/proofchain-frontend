export type NotificationType = 'delivery' | 'approval' | 'invoice' | 'payment' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export type TransactionKind = 'sale' | 'purchase' | 'payment_in' | 'payment_out';

export interface TransactionRow {
  id: string;
  kind: TransactionKind;
  date: string;
  reference: string;
  partyName: string;
  amount: number;
  status: string;
  link: string;
}

export interface TransactionsReport {
  from: string;
  to: string;
  page: number;
  limit: number;
  total: number;
  rows: TransactionRow[];
  totals: { sale: number; purchase: number; paymentIn: number; paymentOut: number };
}
