'use client';

/**
 * Sign-in / sign-up layout: a green welcome panel with a curved edge (logo, greeting, a button to the other
 * page) beside a white form panel. On phones the green panel becomes a curved header above the form.
 */
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './AuthSplit.module.css';

export interface AuthSide {
  heading: string;
  text: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface AuthSplitProps {
  title: string;
  subtitle?: string;
  side: AuthSide;
  /** Roomier form panel (the step-by-step sign-up). */
  wide?: boolean;
  children: React.ReactNode;
}

export function AuthSplit({ title, subtitle, side, wide, children }: AuthSplitProps) {
  return (
    // page-center auth-bg: the app's light theme leaves these pages in their real colours
    <div className={`page-center auth-bg ${styles.page}`}>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`${styles.shell}${wide ? ` ${styles.wide}` : ''}`}
      >
        <aside className={styles.brand}>
          <span className={styles.bubbleA} aria-hidden="true" />
          <span className={styles.bubbleB} aria-hidden="true" />

          <div className={styles.brandInner}>
            <div className={styles.logo}>
              <img src="/A_logo.svg" alt="" />
            </div>
            <p className={styles.appName}>Inventory Audit</p>

            <div className={styles.brandText}>
              <h2>{side.heading}</h2>
              <p>{side.text}</p>
              {side.actionHref && side.actionLabel && (
                <Link href={side.actionHref} className={styles.ghostBtn}>
                  {side.actionLabel}
                </Link>
              )}
            </div>
          </div>
        </aside>

        <section className={styles.panel}>
          <div className={styles.panelInner}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            <div className={styles.form}>{children}</div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
