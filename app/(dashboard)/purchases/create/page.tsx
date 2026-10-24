'use client';

import { Suspense } from 'react';
import { InvoiceCreate } from '@/components/invoices/InvoiceCreate';

// useSearchParams (prefilled party) requires a Suspense boundary.
export default function CreatePurchasesPage() {
  return (
    <Suspense>
      <InvoiceCreate type="purchase" />
    </Suspense>
  );
}
