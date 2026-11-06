import { Banknote, Landmark } from 'lucide-react';
import { bankBrand } from '@/lib/banks';

/** The icon of a cash/bank account: the bank's brand mark when the name is a known bank (HDFC, SBI…), else a bank or cash icon. */
export function BankIcon({ name, type = 'bank', size = 36 }: { name?: string | null; type?: 'cash' | 'bank'; size?: number }) {
  const brand = type === 'bank' ? bankBrand(name) : null;
  const box: React.CSSProperties = { width: size, height: size, borderRadius: Math.round(size * 0.28), flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
  if (brand) {
    const long = brand.mark.length;
    const fontSize = Math.round(size * (long >= 5 ? 0.26 : long === 4 ? 0.3 : long === 3 ? 0.36 : 0.5));
    return (
      <span title={brand.name} aria-label={brand.name} style={{ ...box, background: brand.bg, color: brand.fg, fontWeight: 800, fontSize, letterSpacing: long > 2 ? '-0.02em' : 0, fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {brand.mark}
      </span>
    );
  }
  const Icon = type === 'cash' ? Banknote : Landmark;
  return (
    <span aria-hidden style={{ ...box, background: type === 'cash' ? 'rgba(74, 222, 128,0.14)' : 'rgba(34,211,238,0.14)', color: type === 'cash' ? '#4ade80' : '#2dd4bf' }}>
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}
