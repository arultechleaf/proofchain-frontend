'use client';

import { useForm } from 'react-hook-form';
import { CheckField, Field, Grid, Form } from '@/components/ui';
import type { Company } from '@/models';

export interface CompanyFormValues {
  name: string;
  organizationCode: string;
  organizationType: Company['organizationType'];
  description: string;
  gstin: string;
  isActive: boolean;
}

export function companyToForm(c?: Company): CompanyFormValues {
  return {
    name: c?.name ?? '',
    organizationCode: c?.organizationCode ?? '',
    organizationType: c?.organizationType ?? 'sender',
    description: c?.description ?? '',
    gstin: c?.gstin ?? '',
    isActive: c?.isActive ?? true,
  };
}

export function CompanyForm({
  defaultValues, onSubmit, loading, submitLabel = 'Save', showActive,
}: {
  defaultValues: CompanyFormValues;
  onSubmit: (v: CompanyFormValues) => void | Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  /** Only shown when editing; new organizations are always active. */
  showActive?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CompanyFormValues>({ defaultValues });

  return (
    <Form onSubmit={handleSubmit(onSubmit)} loading={loading} submitLabel={submitLabel}>
      <Field label="Organization name" required error={errors.name?.message}>
        <input className="form-input" placeholder="Company C — Distributor"
          {...register('name', { required: 'Name is required', maxLength: { value: 100, message: 'Max 100 characters' } })} />
      </Field>
      <Grid cols={2}>
        <Field label="Organization code" required error={errors.organizationCode?.message}
          hint="Used by staff to join this organization when registering">
          <input className="form-input" placeholder="COMP-C" style={{ textTransform: 'uppercase' }}
            {...register('organizationCode', {
              required: 'Code is required',
              pattern: { value: /^[A-Za-z0-9_-]+$/, message: 'Letters, numbers, - and _ only' },
            })} />
        </Field>
        <Field label="Type">
          <select className="form-input" {...register('organizationType')}>
            <option value="sender">Sender (ships goods)</option>
            <option value="receiver">Receiver (accepts goods)</option>
            <option value="auditor">Auditor (read-only)</option>
          </select>
        </Field>
      </Grid>
      <Field label="GSTIN" error={errors.gstin?.message}
        hint="15 characters. The first two digits are your state, which decides CGST + SGST or IGST on invoices">
        <input className="form-input uppercase-input" placeholder="29ABCDE1234F1Z5" maxLength={15}
          {...register('gstin', { pattern: { value: /^([0-9A-Za-z]{15})?$/, message: 'GSTIN must be 15 letters/digits' } })} />
      </Field>
      <Field label="Description">
        <textarea className="form-input" rows={3} style={{ resize: 'none' }} {...register('description')} />
      </Field>
      {showActive && (
        <CheckField label="Organization is active" {...register('isActive')} />
      )}
    </Form>
  );
}
