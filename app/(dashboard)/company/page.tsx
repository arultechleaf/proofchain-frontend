'use client';

/** VIEW — the signed-in user's own company: business details printed on invoices. */
import { useForm } from 'react-hook-form';
import { Building2 } from 'lucide-react';
import { Card, Field, Form, Grid, KeyValue, Notice, Page, PageHeader, Spinner } from '@/components/ui';
import { useCompanyProfileController } from '@/controllers/company.controller';
import { GST_STATES } from '@/lib/gst';
import type { CompanyProfile } from '@/models/company';

type Values = {
  name: string; description: string; gstin: string; pan: string; address: string; city: string; state: string;
  pincode: string; phone: string; email: string; website: string; logoUrl: string;
};

const toValues = (p: CompanyProfile): Values => ({
  name: p.name, description: p.description ?? '', gstin: p.gstin ?? '', pan: p.pan ?? '', address: p.address ?? '', city: p.city ?? '',
  state: p.state ?? '', pincode: p.pincode ?? '', phone: p.phone ?? '', email: p.email ?? '', website: p.website ?? '', logoUrl: p.logoUrl ?? '',
});

function ProfileForm({ profile, saving, writable, onSave }: { profile: CompanyProfile; saving: boolean; writable: boolean; onSave: (v: Values) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ defaultValues: toValues(profile) });
  return (
    <Form onSubmit={handleSubmit(onSave)} loading={saving} submitLabel="Save company details" readOnly={!writable}>
      <h3 className="form-section">Business</h3>
      <Grid cols={2}>
        <Field label="Business name" required error={errors.name?.message}>
          <input className="form-input" {...register('name', { required: 'Business name is required', maxLength: { value: 100, message: 'Max 100 characters' } })} />
        </Field>
        <Field label="Website" error={errors.website?.message}>
          <input className="form-input" placeholder="https://" {...register('website', { maxLength: { value: 255, message: 'Max 255 characters' } })} />
        </Field>
      </Grid>
      <Field label="About the business">
        <textarea className="form-input" rows={2} style={{ resize: 'none' }} {...register('description', { maxLength: { value: 500, message: 'Max 500 characters' } })} />
      </Field>

      <h3 className="form-section">Tax</h3>
      <Grid cols={2}>
        <Field label="GSTIN" error={errors.gstin?.message} hint="Its first two digits decide CGST + SGST versus IGST on your invoices">
          <input className="form-input" maxLength={15} placeholder="29ABCDE1234F1Z5"
            {...register('gstin', { pattern: { value: /^([0-9A-Za-z]{15})?$/, message: 'GSTIN must be 15 letters or digits' } })} />
        </Field>
        <Field label="PAN" error={errors.pan?.message}>
          <input className="form-input" maxLength={10} placeholder="ABCDE1234F"
            {...register('pan', { pattern: { value: /^([A-Za-z]{5}[0-9]{4}[A-Za-z])?$/, message: 'PAN must look like ABCDE1234F' } })} />
        </Field>
      </Grid>

      <h3 className="form-section">Contact and address</h3>
      <Grid cols={2}>
        <Field label="Phone" error={errors.phone?.message}>
          <input className="form-input" inputMode="tel" {...register('phone', { pattern: { value: /^(\+?[0-9 -]{7,15})?$/, message: 'Enter a valid phone number' } })} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" className="form-input" {...register('email', { pattern: { value: /^(\S+@\S+\.\S+)?$/, message: 'Enter a valid email' } })} />
        </Field>
      </Grid>
      <Field label="Address">
        <textarea className="form-input" rows={2} style={{ resize: 'none' }} {...register('address', { maxLength: { value: 500, message: 'Max 500 characters' } })} />
      </Field>
      <Grid cols={3}>
        <Field label="City / town"><input className="form-input" {...register('city')} /></Field>
        <Field label="State">
          <select className="form-input" {...register('state')}>
            <option value="">Select...</option>
            {GST_STATES.map(([code, name]) => <option key={code} value={name}>{name}</option>)}
          </select>
        </Field>
        <Field label="Pincode" error={errors.pincode?.message}>
          <input inputMode="numeric" maxLength={6} className="form-input" {...register('pincode', { pattern: { value: /^(\d{6})?$/, message: 'Pincode must be 6 digits' } })} />
        </Field>
      </Grid>
      <Field label="Logo address" hint="A link to your logo image (shown on printed invoices later)">
        <input className="form-input" placeholder="https://…/logo.png" {...register('logoUrl')} />
      </Field>
    </Form>
  );
}

export default function CompanyProfilePage() {
  const c = useCompanyProfileController();
  return (
    <Page narrow>
      <PageHeader title="Company profile" />
      {c.error ? <Notice kind="error">Could not load your company. Your account may not be linked to an organization.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}
      {!c.writable && c.profile ? <Notice kind="info">You can view these details. Only a manager or administrator can change them.</Notice> : null}
      {c.loading && !c.profile && <Card><Spinner /></Card>}
      {c.profile && (
        <>
          <Card title="Organization" icon={Building2} style={{ marginBottom: 18 }}>
            <KeyValue rows={[['Organization code', c.profile.organizationCode], ['Type', c.profile.organizationType]]} />
          </Card>
          <Card>
            <ProfileForm key={c.profile.id + String(c.saving)} profile={c.profile} saving={c.saving} writable={c.writable} onSave={(v) => c.save(v)} />
          </Card>
        </>
      )}
    </Page>
  );
}
