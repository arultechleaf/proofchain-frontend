'use client';

import { useForm } from 'react-hook-form';
import { Field, Grid, Form } from '@/components/ui';
import type { Item } from '@/models';

export interface ItemFormValues {
  name: string;
  sku: string;
  hsnCode: string;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  taxRate: number;
  stock: number;
  lowStockLevel: number;
  reorderQuantity: number;
  description: string;
}

export function itemToForm(i?: Item): ItemFormValues {
  return {
    name: i?.name ?? '',
    sku: i?.sku ?? '',
    hsnCode: i?.hsnCode ?? '',
    unit: i?.unit ?? 'pcs',
    salePrice: i?.salePrice ?? 0,
    purchasePrice: i?.purchasePrice ?? 0,
    taxRate: i?.taxRate ?? 0,
    stock: i?.stock ?? 0,
    lowStockLevel: i?.lowStockLevel ?? 0,
    reorderQuantity: i?.reorderQuantity ?? 0,
    description: i?.description ?? '',
  };
}

export function formToItemPayload(v: ItemFormValues, includeStock: boolean) {
  const opt = (s: string) => (s.trim() ? s.trim() : undefined);
  return {
    name: v.name.trim(),
    sku: opt(v.sku),
    hsnCode: opt(v.hsnCode),
    unit: opt(v.unit) ?? 'pcs',
    salePrice: Number(v.salePrice) || 0,
    purchasePrice: Number(v.purchasePrice) || 0,
    taxRate: Number(v.taxRate) || 0,
    lowStockLevel: Number(v.lowStockLevel) || 0,
    reorderQuantity: Number(v.reorderQuantity) || 0,
    description: opt(v.description),
    ...(includeStock ? { stock: Number(v.stock) || 0 } : {}),
  };
}

export function ItemForm({
  defaultValues, onSubmit, loading, submitLabel = 'Save', readOnly, isNew,
}: {
  defaultValues: ItemFormValues;
  onSubmit: (v: ItemFormValues) => void | Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  readOnly?: boolean;
  /** New items can set opening stock; existing items change stock through adjustments. */
  isNew?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ItemFormValues>({ defaultValues });
  const num = { valueAsNumber: true, min: { value: 0, message: 'Cannot be negative' } };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} loading={loading} submitLabel={submitLabel} readOnly={readOnly}>
        <Grid cols="2fr 1fr 1fr 1fr">
          <Field label="Item name" required error={errors.name?.message}>
            <input className="form-input" placeholder="Temperature Sensor"
              {...register('name', { required: 'Name is required' })} />
          </Field>
          <Field label="SKU / code">
            <input className="form-input" placeholder="SEN-001" {...register('sku')} />
          </Field>
          <Field label="HSN / SAC code" hint="Printed on GST invoices">
            <input className="form-input" placeholder="8471" {...register('hsnCode')} />
          </Field>
          <Field label="Unit">
            <input className="form-input" placeholder="pcs" {...register('unit')} />
          </Field>
        </Grid>
        <Grid cols={3}>
          <Field label="Sale price" error={errors.salePrice?.message}>
            <input type="number" step="0.01" className="form-input" {...register('salePrice', num)} />
          </Field>
          <Field label="Purchase price" error={errors.purchasePrice?.message}>
            <input type="number" step="0.01" className="form-input" {...register('purchasePrice', num)} />
          </Field>
          <Field label="GST rate (%)" error={errors.taxRate?.message}>
            <input type="number" step="0.01" className="form-input"
              {...register('taxRate', { ...num, max: { value: 100, message: 'Max 100' } })} />
          </Field>
        </Grid>
        <Grid cols={2}>
          {isNew && (
            <Field label="Opening stock" error={errors.stock?.message}>
              <input type="number" step="any" className="form-input" {...register('stock', num)} />
            </Field>
          )}
          <Field label="Low-stock alert at" hint="The company is notified when stock first falls to this level" error={errors.lowStockLevel?.message}>
            <input type="number" step="any" className="form-input" {...register('lowStockLevel', num)} />
          </Field>
          <Field label="Reorder quantity" hint="How much to order when it runs low (shown as a suggestion)" error={errors.reorderQuantity?.message}>
            <input type="number" step="any" className="form-input" {...register('reorderQuantity', num)} />
          </Field>
        </Grid>
        <Field label="Description">
          <textarea className="form-input" rows={2} style={{ resize: 'none' }} {...register('description')} />
        </Field>
    </Form>
  );
}
