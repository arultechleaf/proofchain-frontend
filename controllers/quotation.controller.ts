'use client';

/** CONTROLLER — quotations: list, create form and the detail actions (status, convert). */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAsync } from '@/controllers/useAsync';
import { useLineItems } from '@/controllers/useLineItems';
import { useAuth } from '@/lib/auth';
import { canWrite } from '@/lib/roles';
import { itemsApi, partiesApi } from '@/lib/api';
import { apiError, todayIso } from '@/lib/utils';
import type { Item, Party } from '@/models';
import { quotationService, type Quotation, type QuotationList, type QuotationStatus } from '@/models/quotation';

export const QUOTATION_PAGE_SIZE = 15;

export function useQuotationListController() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data, loading, error, reload } = useAsync<QuotationList>(
    () => quotationService.list({ status, search: query, page, limit: QUOTATION_PAGE_SIZE }),
    [status, query, page],
  );

  const remove = async (q: Quotation) => {
    setMessage(null);
    try {
      await quotationService.remove(q.id);
      setMessage({ kind: 'success', text: `${q.quotationNumber} deleted` });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not delete the quotation') });
    }
  };

  return {
    rows: data?.rows ?? [], total: data?.total ?? 0, loading, error: !!error,
    status, selectStatus: (s: string) => { setStatus(s); setPage(1); },
    search, setSearch, submitSearch: () => { setQuery(search); setPage(1); },
    page, setPage, limit: QUOTATION_PAGE_SIZE,
    canCreate: canWrite(user?.role),
    message,
    remove,
  };
}

export function useCreateQuotationController() {
  const router = useRouter();
  const params = useSearchParams();
  const [partyId, setPartyId] = useState(params.get('partyId') ?? '');
  const [quotationDate, setQuotationDate] = useState(todayIso());
  const [validUntil, setValidUntil] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parties = useAsync<Party[]>(async () => (await partiesApi.list({ type: 'customer', limit: 200 })).data.data, []);
  const items = useAsync<Item[]>(async () => (await itemsApi.list({ limit: 500 })).data.data, []);
  const lines = useLineItems(items.data ?? [], discount);

  const submit = async () => {
    setError('');
    if (!partyId) return setError('Select a customer');
    const problem = lines.validate();
    if (problem) return setError(problem);

    setSubmitting(true);
    try {
      const q = await quotationService.create({
        partyId,
        quotationDate,
        validUntil: validUntil || undefined,
        discount: Number(discount) || undefined,
        notes: notes.trim() || undefined,
        lines: lines.payload() as never,
      });
      router.push(`/quotations/${q.id}`);
    } catch (err) {
      setError(apiError(err, 'Could not create the quotation'));
      setSubmitting(false);
    }
  };

  return {
    loading: parties.loading || items.loading,
    parties: parties.data ?? [], items: items.data ?? [],
    partyId, setPartyId, quotationDate, setQuotationDate, validUntil, setValidUntil,
    discount, setDiscount, notes, setNotes,
    lines, submitting, error, submit,
  };
}

export function useQuotationDetailController(id: string) {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync<Quotation>(() => quotationService.get(id), [id]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const act = async (action: () => Promise<unknown>, success: string, after?: () => void) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ kind: 'success', text: success });
      await reload();
      after?.();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Action failed') });
    } finally {
      setBusy(false);
    }
  };

  return {
    quotation: data, loading: loading && !data, notFound: !loading && (!!error || !data),
    writable: canWrite(user?.role), busy, message,
    setStatus: (s: Exclude<QuotationStatus, 'converted'>) => act(() => quotationService.setStatus(id, s), `Marked as ${s}`),
    convert: async () => {
      setBusy(true);
      setMessage(null);
      try {
        const res = await quotationService.convert(id);
        router.push(`/sales/${res.invoice.id}`);
      } catch (err) {
        setMessage({ kind: 'error', text: apiError(err, 'Could not convert the quotation') });
        setBusy(false);
      }
    },
  };
}
