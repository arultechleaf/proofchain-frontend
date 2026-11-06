'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { formatMoney } from '@/lib/utils';

/** A UPI QR code (upi://pay link) any UPI app can scan. The customer pays straight to the company's UPI ID. */
export function UpiQr({ upiId, payee, amount, note }: { upiId: string | null; payee: string; amount: number; note: string }) {
  const [image, setImage] = useState('');

  useEffect(() => {
    if (!upiId || !(amount >= 1)) { setImage(''); return; }
    const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
    let live = true;
    QRCode.toDataURL(link, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (live) setImage(url); })
      .catch(() => { if (live) setImage(''); });
    return () => { live = false; };
  }, [upiId, payee, amount, note]);

  if (!upiId) {
    return (
      <p className="form-hint" style={{ margin: 0 }}>
        No UPI ID set. <Link href="/company/settings" className="auth-link">Add it in Bank &amp; invoice settings</Link> to show a QR code here.
      </p>
    );
  }
  if (!(amount >= 1)) return <p className="form-hint" style={{ margin: 0 }}>The QR code appears once the amount is ₹1 or more.</p>;

  return (
    <div style={{ textAlign: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {image ? <img src={image} alt={`UPI QR code for ${formatMoney(amount)}`} width={180} height={180} style={{ borderRadius: 8, background: '#fff' }} /> : <div style={{ width: 180, height: 180 }} />}
      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b8a96' }}>Scan with any UPI app · {formatMoney(amount)}</p>
      <p style={{ margin: 0, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#94b2bd' }}>{upiId}</p>
    </div>
  );
}
