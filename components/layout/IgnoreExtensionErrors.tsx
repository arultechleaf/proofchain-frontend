'use client';

import { useEffect } from 'react';

/**
 * Browser wallets such as MetaMask inject a script into every page and log "Failed to connect to
 * MetaMask" when they are locked. ProofChain never uses a wallet, so these errors are noise and
 * would otherwise show up in the Next.js dev overlay and console. Errors whose stack comes from a
 * browser-extension URL (or that name MetaMask) are swallowed; every other error is left alone.
 */
const fromExtension = (reason: unknown): boolean => {
  const text = [
    (reason as { stack?: string } | null)?.stack,
    (reason as { message?: string } | null)?.message,
    typeof reason === 'string' ? reason : '',
  ].join(' ');
  return /(chrome|moz|safari-web)-extension:\/\//i.test(text) || /metamask/i.test(text);
};

export function IgnoreExtensionErrors() {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      if (!fromExtension(e.reason)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const onError = (e: ErrorEvent) => {
      if (!fromExtension(e.error ?? e.message) && !/(chrome|moz|safari-web)-extension:\/\//i.test(e.filename ?? '')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    // Capture phase so this runs before the dev overlay's own listeners.
    window.addEventListener('unhandledrejection', onRejection, true);
    window.addEventListener('error', onError, true);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection, true);
      window.removeEventListener('error', onError, true);
    };
  }, []);

  return null;
}
