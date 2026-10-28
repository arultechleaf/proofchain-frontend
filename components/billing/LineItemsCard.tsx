'use client';

/** VIEW — editable table of document lines. State and totals come from useLineItems. */
import { Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { Card } from '@/components/ui';
import { num, type LineState, type PriceableItem } from '@/controllers/useLineItems';

interface Props {
  title?: string;
  items: PriceableItem[];
  lines: LineState[];
  onUpdate: (key: number, patch: Partial<LineState>) => void;
  onPickItem: (key: number, itemId: string) => void;
  onAdd: () => void;
  onRemove: (key: number) => void;
}

export function LineItemsCard({ title = 'Items', items, lines, onUpdate, onPickItem, onAdd, onRemove }: Props) {
  return (
    <Card title={title} style={{ marginBottom: 18 }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="line-table">
          <thead>
            <tr>
              <th style={{ width: '24%' }}>Item</th>
              <th>Description</th>
              <th style={{ width: 90 }}>Qty</th>
              <th style={{ width: 110 }}>Rate</th>
              <th style={{ width: 80 }}>Tax %</th>
              <th style={{ width: 120, textAlign: 'right' }}>Amount</th>
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td>
                  <select className="form-input" value={l.itemId} onChange={(e) => onPickItem(l.key, e.target.value)} aria-label="Item">
                    <option value="">Custom line</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </td>
                <td><input className="form-input" value={l.description} onChange={(e) => onUpdate(l.key, { description: e.target.value })} aria-label="Description" /></td>
                <td><input type="number" step="any" min="0" className="form-input" value={l.quantity} onChange={(e) => onUpdate(l.key, { quantity: e.target.value })} aria-label="Quantity" /></td>
                <td><input type="number" step="0.01" min="0" className="form-input" value={l.rate} onChange={(e) => onUpdate(l.key, { rate: e.target.value })} aria-label="Rate" /></td>
                <td><input type="number" step="0.01" min="0" max="100" className="form-input" value={l.taxRate} onChange={(e) => onUpdate(l.key, { taxRate: e.target.value })} aria-label="Tax percent" /></td>
                <td className="amount">{formatMoney(Math.round(num(l.quantity) * num(l.rate) * 100) / 100)}</td>
                <td>
                  {lines.length > 1 && (
                    <button type="button" className="btn btn-ghost" onClick={() => onRemove(l.key)} aria-label="Remove line"><Trash2 size={15} color="#f87171" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-secondary" style={{ marginTop: 6 }} onClick={onAdd}><Plus size={14} /> Add line</button>
    </Card>
  );
}
