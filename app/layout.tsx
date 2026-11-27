import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { IgnoreExtensionErrors } from '@/components/layout/IgnoreExtensionErrors';
import GlobalLoader from '@/components/components/loader/GlobalLoader';

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
        {/* Apply the theme before the first paint so there is no flash: light by default,
            dark only when the user chose it with the theme button. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){var t='light';try{if(localStorage.getItem('theme-v3')==='dark')t='dark'}catch(e){}if(t==='light')document.documentElement.dataset.theme='light'})()" }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b0f0d" />
      </head>
      <body className="bg-grid antialiased">
        <IgnoreExtensionErrors />
        <AuthProvider>
          <GlobalLoader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
