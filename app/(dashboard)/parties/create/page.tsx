'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { partiesApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { Card, Notice, Page, PageHeader } from '@/components/ui';
import { PartyForm, formToPartyPayload, partyToForm } from '@/components/parties/PartyForm';

export default function CreatePartyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <Page narrow>
      <PageHeader title="New Party" subtitle="Add a customer or supplier" backHref="/parties" />
      <Card>
        {error && <Notice kind="error">{error}</Notice>}
        <PartyForm
          defaultValues={partyToForm()}
          loading={loading}
          submitLabel="Create Party"
          onSubmit={async (v) => {
            setLoading(true);
            setError('');
            try {
              const res = await partiesApi.create(formToPartyPayload(v));
              router.push(`/parties/${res.data.data.id}`);
            } catch (err) {
              setError(apiError(err, 'Could not create party'));
              setLoading(false);
            }
          }}
        />
      </Card>
    </Page>
  );
}
