// Loader and types for Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number; // paise
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; escape?: boolean };
}

export interface RazorpayFailure {
  error: { code?: string; description: string; reason?: string; metadata?: { payment_id?: string } };
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (response: RazorpayFailure) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<void> | null = null;

/** Load checkout.js once. Resolves immediately if it is already on the page. */
export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Checkout needs a browser'));
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const fail = (script: HTMLScriptElement) => {
      loading = null; // allow a retry after a network failure
      script.remove(); // a failed tag would never load again, so the retry adds a fresh one
      reject(new Error('Could not load Razorpay. Check your internet connection.'));
    };
    const done = () => (window.Razorpay ? resolve() : reject(new Error('Razorpay failed to initialise')));

    // reuse a tag that is already on the page (hot reload, another screen) instead of adding a second one
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', () => fail(script), { once: true });
    if (!existing) {
      script.src = RAZORPAY_SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  });
  return loading;
}
