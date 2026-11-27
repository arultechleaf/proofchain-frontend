/** Subscription plans and user subscriptions (backend: src/subscriptions). Money is in rupees. */

export type DurationType = 'DAYS' | 'MONTHS' | 'YEARS';
export const DURATION_TYPES: Array<{ value: DurationType; label: string }> = [
  { value: 'DAYS', label: 'Days' },
  { value: 'MONTHS', label: 'Months' },
  { value: 'YEARS', label: 'Years' },
];

export interface SubscriptionPlan {
  id: number;
  planName: string;
  planCode: string;
  durationValue: number;
  durationType: DurationType;
  price: number;
  discountPercentage: number;
  finalPrice: number;
  currency: string;
  description: string | null;
  /** 1 = on sale, 0 = hidden. */
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPriceChange {
  id: number;
  planId: number;
  oldPrice: number | null;
  newPrice: number;
  oldDiscount: number | null;
  newDiscount: number;
  oldFinalPrice: number | null;
  newFinalPrice: number;
  changedBy: number | null;
  changedByName: string | null;
  changedAt: string;
}

export type UserSubscriptionStatus = 'active' | 'expired' | 'cancelled';

/** A bought subscription. Plan name, duration and prices are a copy taken at purchase time. */
export interface UserSubscription {
  id: number;
  userId: number;
  planId: number;
  planName: string;
  planCode: string;
  durationValue: number;
  durationType: DurationType;
  price: number;
  discountPercentage: number;
  finalPrice: number;
  currency: string;
  startAt: string;
  endAt: string;
  status: UserSubscriptionStatus;
  reminderSentAt: string | null;
  paymentId: number | null;
  assignedBy: number | null;
  note: string | null;
  createdAt: string;
  user?: { id: number; name: string; email: string; role: string } | null;
}

export interface MySubscription {
  status: 'none' | 'active' | 'expired';
  endAt: string | null;
  daysLeft: number;
  expiringSoon: boolean;
  current: UserSubscription | null;
  upcoming: UserSubscription[];
  history: UserSubscription[];
}

export interface SubscriptionOrder {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  plan: { id: number; planName: string; finalPrice: number; duration: string };
  customer: { name: string; email: string; contact: string };
}

export interface PlanForm {
  planName: string;
  planCode: string;
  durationValue: string;
  durationType: DurationType;
  price: string;
  discountPercentage: string;
  description: string;
  status: number;
}

export const EMPTY_PLAN_FORM: PlanForm = {
  planName: '', planCode: '', durationValue: '30', durationType: 'DAYS', price: '', discountPercentage: '0', description: '', status: 1,
};

export function durationLabel(value: number, type: DurationType): string {
  const unit = type === 'DAYS' ? 'day' : type === 'MONTHS' ? 'month' : 'year';
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

/** Same rule as the server: price minus the discount, rounded to paise. The server's value is what is saved. */
export function finalPriceOf(price: number, discount: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(discount)) return 0;
  return Math.round((price - (price * discount) / 100 + Number.EPSILON) * 100) / 100;
}
