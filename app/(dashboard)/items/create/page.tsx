'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { itemsApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { Card, Notice, Page, PageHeader } from '@/components/ui';
import { ItemForm, formToItemPayload, itemToForm } from '@/components/items/ItemForm';

export default function CreateItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <Page narrow>
      <PageHeader title="New Item" subtitle="Add a product or service to your catalogue" backHref="/items" />
      <Card>
        {error && <Notice kind="error">{error}</Notice>}
        <ItemForm
          isNew
          defaultValues={itemToForm()}
          loading={loading}
          submitLabel="Create Item"
          onSubmit={async (v) => {
            setLoading(true);
            setError('');
            try {
              const res = await itemsApi.create(formToItemPayload(v, true));
              router.push(`/items/${res.data.data.id}`);
            } catch (err) {
              setError(apiError(err, 'Could not create item'));
              setLoading(false);
            }
          }}
        />
      </Card>
    </Page>
  );
}
