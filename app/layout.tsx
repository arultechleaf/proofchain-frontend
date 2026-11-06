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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/A_logo.svg" />
        {/* Apply the saved theme before the first paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme-v2')==='light')document.documentElement.dataset.theme='light'}catch(e){}" }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b0f0d" />
      </head>
      <body className="bg-grid antialiased">
        <IgnoreExtensionErrors />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
