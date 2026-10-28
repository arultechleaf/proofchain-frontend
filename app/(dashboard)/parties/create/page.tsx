'use client';

/** VIEW — "New party" screen. */
import { Card, Notice, Page, PageHeader } from '@/components/ui';
import { PartyForm } from '@/components/parties/PartyForm';
import { useCreatePartyController } from '@/controllers/party.controller';
import { partyToForm } from '@/models/party';

export default function CreatePartyPage() {
  const c = useCreatePartyController();

  return (
    <Page narrow>
      <PageHeader title="New Party" subtitle="Add a customer or supplier" backHref="/parties" />
      <Card>
        {c.error && <Notice kind="error">{c.error}</Notice>}
        <PartyForm defaultValues={partyToForm()} loading={c.loading} submitLabel="Create Party" onSubmit={c.submit} />
      </Card>
    </Page>
  );
}
