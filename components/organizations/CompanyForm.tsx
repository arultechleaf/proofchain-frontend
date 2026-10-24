'use client';

import { useForm } from 'react-hook-form';
import { Field, Grid, SubmitButton } from '@/components/ui';
import type { Company } from '@/types';

export interface CompanyFormValues {
  name: string;
  organizationCode: string;
  organizationType: Company['organizationType'];
  description: string;
  isActive: boolean;
}

export function companyToForm(c?: Company): CompanyFormValues {
  return {
    name: c?.name ?? '',
    organizationCode: c?.organizationCode ?? '',
    organizationType: c?.organizationType ?? 'sender',
    description: c?.description ?? '',
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
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
      <Field label="Description">
        <textarea className="form-input" rows={3} style={{ resize: 'none' }} {...register('description')} />
      </Field>
      {showActive && (
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
          <input type="checkbox" {...register('isActive')} /> Organization is active
        </label>
      )}
      <div><SubmitButton loading={loading}>{submitLabel}</SubmitButton></div>
    </form>
  );
}
