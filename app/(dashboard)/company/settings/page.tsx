'use client';

/** VIEW — bank details printed on invoices, invoice numbering and defaults. */
import { useForm } from 'react-hook-form';
import { Banknote, FileText } from 'lucide-react';
import { Card, Field, Form, Grid, Notice, Page, PageHeader, Spinner } from '@/components/ui';
import { useCompanySettingsController } from '@/controllers/company.controller';
import { GST_RATES } from '@/lib/gst';
import type { CompanySettings } from '@/models/company';

type Values = {
  bankName: string; accountHolder: string; accountNumber: string; ifscCode: string; bankBranch: string; upiId: string;
  salesPrefix: string; purchasePrefix: string; defaultTaxRate: number; currency: string; paymentTermsDays: number;
  terms: string; invoiceNotes: string; invoiceFooter: string;
};

const toValues = (s: CompanySettings): Values => ({
  bankName: s.bankName ?? '', accountHolder: s.accountHolder ?? '', accountNumber: s.accountNumber ?? '', ifscCode: s.ifscCode ?? '',
  bankBranch: s.bankBranch ?? '', upiId: s.upiId ?? '', salesPrefix: s.salesPrefix, purchasePrefix: s.purchasePrefix,
  defaultTaxRate: s.defaultTaxRate, currency: s.currency, paymentTermsDays: s.paymentTermsDays,
  terms: s.terms ?? '', invoiceNotes: s.invoiceNotes ?? '', invoiceFooter: s.invoiceFooter ?? '',
});

function SettingsForm({ settings, saving, writable, onSave }: { settings: CompanySettings; saving: boolean; writable: boolean; onSave: (v: Values) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ defaultValues: toValues(settings) });
  const prefix = { required: 'Required', pattern: { value: /^[A-Za-z0-9]{1,10}$/, message: '1-10 letters or digits' } };
  return (
    <Form onSubmit={handleSubmit(onSave)} loading={saving} submitLabel="Save settings" readOnly={!writable}>
      <h3 className="form-section"><Banknote size={13} /> Bank details (shown on invoices)</h3>
      <Grid cols={2}>
        <Field label="Bank name"><input className="form-input" {...register('bankName')} /></Field>
        <Field label="Account holder"><input className="form-input" {...register('accountHolder')} /></Field>
      </Grid>
      <Grid cols={3}>
        <Field label="Account number" error={errors.accountNumber?.message}>
          <input inputMode="numeric" className="form-input" {...register('accountNumber', { pattern: { value: /^([0-9]{6,30})?$/, message: 'Digits only (6-30)' } })} />
        </Field>
        <Field label="IFSC" error={errors.ifscCode?.message}>
          <input className="form-input" maxLength={11} placeholder="HDFC0001234"
            {...register('ifscCode', { pattern: { value: /^([A-Za-z]{4}0[A-Za-z0-9]{6})?$/, message: 'IFSC must look like HDFC0001234' } })} />
        </Field>
        <Field label="Bank branch"><input className="form-input" {...register('bankBranch')} /></Field>
      </Grid>
      <Field label="UPI id" error={errors.upiId?.message} hint="For example name@bank">
        <input className="form-input" {...register('upiId', { pattern: { value: /^([\w.-]{2,}@[A-Za-z]{2,})?$/, message: 'UPI id must look like name@bank' } })} />
      </Field>

      <h3 className="form-section"><FileText size={13} /> Invoice defaults</h3>
      <Grid cols={3}>
        <Field label="Sales number prefix" required error={errors.salesPrefix?.message} hint="INV gives INV-2026-0001">
          <input className="form-input" maxLength={10} {...register('salesPrefix', prefix)} />
        </Field>
        <Field label="Purchase number prefix" required error={errors.purchasePrefix?.message}>
          <input className="form-input" maxLength={10} {...register('purchasePrefix', prefix)} />
        </Field>
        <Field label="Currency" error={errors.currency?.message}>
          <input className="form-input" maxLength={3} {...register('currency', { pattern: { value: /^[A-Za-z]{3}$/, message: '3-letter code, e.g. INR' } })} />
        </Field>
      </Grid>
      <Grid cols={2}>
        <Field label="Default GST % on a new invoice line" error={errors.defaultTaxRate?.message}>
          <select className="form-input" {...register('defaultTaxRate', { valueAsNumber: true })}>
            {(GST_RATES.includes(settings.defaultTaxRate) ? GST_RATES : [...GST_RATES, settings.defaultTaxRate]).map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
        </Field>
        <Field label="Payment due after (days)" error={errors.paymentTermsDays?.message} hint="0 = due on the invoice date">
          <input type="number" min={0} max={365} className="form-input" {...register('paymentTermsDays', { valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' }, max: { value: 365, message: 'Max 365' } })} />
        </Field>
      </Grid>
      <Field label="Terms and conditions">
        <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} {...register('terms', { maxLength: { value: 2000, message: 'Max 2000 characters' } })} />
      </Field>
      <Field label="Notes shown on every invoice">
        <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} {...register('invoiceNotes', { maxLength: { value: 2000, message: 'Max 2000 characters' } })} />
      </Field>
      <Field label="Footer line"><input className="form-input" placeholder="Thank you for your business" {...register('invoiceFooter')} /></Field>
    </Form>
  );
}

export default function CompanySettingsPage() {
  const c = useCompanySettingsController();
  return (
    <Page narrow>
      <PageHeader title="Bank & invoice settings" />
      {c.error ? <Notice kind="error">Could not load the settings.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}
      {!c.writable && c.settings ? <Notice kind="info">You can view these settings. Only a manager or administrator can change them.</Notice> : null}
      {c.loading && !c.settings && <Card><Spinner /></Card>}
      {c.settings && (
        <Card><SettingsForm key={String(c.saving)} settings={c.settings} saving={c.saving} writable={c.writable} onSave={(v) => c.save(v)} /></Card>
      )}
    </Page>
  );
}
