'use client';

import { Suspense } from 'react';
import { InvoiceCreate } from '@/components/invoices/InvoiceCreate';

// useSearchParams (prefilled party) requires a Suspense boundary.
export default function CreateNonGstSalePage() {
  return (
    <Suspense>
      <InvoiceCreate type="non_gst_sale" />
    </Suspense>
  );
}
