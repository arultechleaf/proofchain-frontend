/** Slim footer shown under every dashboard page. */
export function Footer() {
  return (
    <footer className="app-footer">
      <span>© {new Date().getFullYear()} ProofChain · Inventory Audit</span>
      <span className="app-footer-muted">Blockchain-verified delivery &amp; billing ledger</span>
    </footer>
  );
}
