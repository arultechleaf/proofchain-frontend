'use client';

/** Header button that switches between the dark and light theme and remembers the choice. */
import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';
const EVENT = 'theme:changed';

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const read = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => 'dark' as Theme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* private mode: still switches for this visit */ }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
