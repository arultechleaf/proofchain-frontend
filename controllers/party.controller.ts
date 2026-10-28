'use client';

/**
 * CONTROLLER — customers & suppliers.
 * Hooks that hold screen state, call the model's service and handle navigation.
 * Views get everything they need from here and render it; they never call the API.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAsync } from '@/controllers/useAsync';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import { canWrite } from '@/lib/roles';
import { partyService, type PartyFormValues, type PartyList, type PartyLedger } from '@/models/party';

export const PARTY_PAGE_SIZE = 15;
export const PARTY_TABS = [
  { key: '', label: 'All' },
  { key: 'customer', label: 'Customers' },
  { key: 'supplier', label: 'Suppliers' },
];

/** Parties list: type tab, search box and paging. */
export function usePartyListController() {
  const { user } = useAuth();
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data, loading, error, reload } = useAsync<PartyList>(
    () => partyService.list({ type, search: query, page, limit: PARTY_PAGE_SIZE }),
    [type, query, page],
  );

  const remove = async (id: string, name: string) => {
    setMessage(null);
    try {
      await partyService.remove(id);
      setMessage({ kind: 'success', text: `"${name}" deleted` });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not delete') });
    }
  };

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    loading,
    error: !!error,
    page,
    limit: PARTY_PAGE_SIZE,
    canCreate: canWrite(user?.role),
    message,
    remove,
    type,
    search,
    setSearch,
    setPage,
    selectType: (key: string) => { setType(key); setPage(1); },
    submitSearch: () => { setQuery(search); setPage(1); },
  };
}

/** "New party" form. */
export function useCreatePartyController() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (values: PartyFormValues) => {
    setLoading(true);
    setError('');
    try {
      const party = await partyService.create(values);
      router.push(`/parties/${party.id}`);
    } catch (err) {
      setError(apiError(err, 'Could not create party'));
      setLoading(false);
    }
  };

  return { loading, error, submit };
}

export type PartyTab = 'Invoices' | 'Payments' | 'Details';
export const PARTY_DETAIL_TABS: PartyTab[] = ['Invoices', 'Payments', 'Details'];

/** One party: ledger data, active tab and the edit form. */
export function usePartyDetailController(id: string) {
  const { user } = useAuth();
  const [tab, setTab] = useState<PartyTab>('Invoices');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data, loading, error, reload } = useAsync<PartyLedger>(() => partyService.get(id), [id]);

  // The edit icon in the list opens this page on its Details tab (?tab=Details).
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('tab');
    if (wanted && (PARTY_DETAIL_TABS as string[]).includes(wanted)) setTab(wanted as PartyTab);
  }, []);

  const save = async (values: PartyFormValues) => {
    setSaving(true);
    setMessage(null);
    try {
      await partyService.update(id, values);
      setMessage({ kind: 'success', text: 'Party updated' });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not update party') });
    } finally {
      setSaving(false);
    }
  };

  return {
    ledger: data,
    loading: loading && !data,
    notFound: !loading && (!!error || !data),
    writable: canWrite(user?.role),
    tab,
    setTab,
    saving,
    message,
    save,
  };
}
