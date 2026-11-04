'use client';

import { InvoiceList } from '@/components/invoices/InvoiceList';

export default function NonGstSalesPage() {
  return <InvoiceList type="non_gst_sale" />;
}
