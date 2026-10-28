'use client';

import { useForm } from 'react-hook-form';
import { Field, Grid, SubmitButton } from '@/components/ui';
import type { PartyFormValues } from '@/models/party';

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
