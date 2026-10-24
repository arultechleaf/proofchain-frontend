'use client';

import { useForm } from 'react-hook-form';
import { Field, Grid, SubmitButton } from '@/components/ui';
import type { Party } from '@/types';

export interface PartyFormValues {
  name: string;
  partyType: 'customer' | 'supplier' | 'both';
  phone: string;
  email: string;
  taxId: string;
  city: string;
  address: string;
  openingBalance: number;
}

export function partyToForm(p?: Party): PartyFormValues {
  return {
    name: p?.name ?? '',
    partyType: p?.partyType ?? 'customer',
    phone: p?.phone ?? '',
    email: p?.email ?? '',
    taxId: p?.taxId ?? '',
    city: p?.city ?? '',
    address: p?.address ?? '',
    openingBalance: p?.openingBalance ?? 0,
  };
}

/** Empty optional fields are sent as undefined so the API leaves them unset. */
export function formToPartyPayload(v: PartyFormValues) {
  const opt = (s: string) => (s.trim() ? s.trim() : undefined);
  return {
    name: v.name.trim(),
    partyType: v.partyType,
    phone: opt(v.phone),
    email: opt(v.email),
    taxId: opt(v.taxId),
    city: opt(v.city),
    address: opt(v.address),
    openingBalance: Number(v.openingBalance) || 0,
  };
}

export function PartyForm({
  defaultValues, onSubmit, loading, submitLabel = 'Save', readOnly,
}: {
  defaultValues: PartyFormValues;
  onSubmit: (v: PartyFormValues) => void | Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  readOnly?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<PartyFormValues>({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Grid cols="2fr 1fr">
          <Field label="Name" required error={errors.name?.message}>
            <input className="form-input" placeholder="Acme Retail Pvt Ltd"
              {...register('name', { required: 'Name is required', maxLength: { value: 150, message: 'Max 150 characters' } })} />
          </Field>
          <Field label="Type">
            <select className="form-input" {...register('partyType')}>
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="both">Customer &amp; Supplier</option>
            </select>
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Phone">
            <input className="form-input" placeholder="98765 00001" {...register('phone')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" className="form-input" placeholder="accounts@acme.example"
              {...register('email', { pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
          </Field>
        </Grid>
        <Grid cols={2}>
          <Field label="Tax ID / GSTIN">
            <input className="form-input" placeholder="29ABCDE1234F1Z5" {...register('taxId')} />
          </Field>
          <Field label="City">
            <input className="form-input" {...register('city')} />
          </Field>
        </Grid>
        <Field label="Address">
          <textarea className="form-input" rows={2} style={{ resize: 'none' }} {...register('address')} />
        </Field>
        <Field label="Opening balance" hint="Positive: they owe you. Negative: you owe them.">
          <input type="number" step="0.01" className="form-input" {...register('openingBalance', { valueAsNumber: true })} />
        </Field>
      </fieldset>
      {!readOnly && (
        <div><SubmitButton loading={loading}>{submitLabel}</SubmitButton></div>
      )}
    </form>
  );
}
