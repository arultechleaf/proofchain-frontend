import { canChange, canWriteScreen, getScreens, matchScreen } from '@/lib/access';

/**
 * Hides actions the API would reject anyway. Once the user's screen access has loaded, it follows the screen being
 * viewed (from the role_permissions table); before that it falls back to the built-in roles.
 */
export function canWrite(role?: string) {
  const screens = getScreens();
  if (screens && typeof window !== 'undefined') {
    const screen = matchScreen(screens, window.location.pathname);
    if (screen) return canChange(screen.level);
  }
  return role === 'admin' || role === 'company_a' || role === 'company_b' || role === 'manager';
}

/** Can the user use a specific action screen, such as "sales_create" or "deliveries_create"? */
export function canUse(screenKey: string, role?: string) {
  const byScreen = canWriteScreen(screenKey);
  return byScreen === undefined ? canWrite(role) : byScreen;
}
