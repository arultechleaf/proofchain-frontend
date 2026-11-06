'use client';

/**
 * The menu button: a soft glass tile whose three bars turn into an arrow when the menu is open.
 * Hover lifts and glows it, a click presses it in and sends a ripple out. All the motion is in globals.css (.menu-toggle).
 */
export function MenuToggle({ open, onClick, size = 'md' }: { open: boolean; onClick?: () => void; size?: 'sm' | 'md' }) {
  const label = open ? 'Collapse menu' : 'Expand menu';
  return (
    <button
      type="button" onClick={onClick} aria-label={label} title={label} aria-expanded={open}
      className={`menu-toggle${size === 'sm' ? ' menu-toggle-sm' : ''}`} data-open={open}
    >
      <span className="menu-toggle-bars" aria-hidden>
        <i /><i /><i />
      </span>
    </button>
  );
}
