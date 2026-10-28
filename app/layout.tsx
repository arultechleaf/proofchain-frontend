import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { IgnoreExtensionErrors } from '@/components/layout/IgnoreExtensionErrors';

export const metadata: Metadata = {
  title: 'ProofChain — Blockchain Delivery Verification',
  description:
    'Enterprise blockchain platform for delivery proof, verification, and audit. Powered by Hyperledger Besu.',
  keywords: ['blockchain', 'delivery', 'verification', 'proof', 'hyperledger', 'besu'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛓️</text></svg>" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#050d1a" />
      </head>
      <body className="bg-grid antialiased">
        <IgnoreExtensionErrors />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
