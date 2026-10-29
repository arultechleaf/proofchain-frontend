/**
 * Screen access for the signed-in user. The list comes from the API (`GET /roles/permissions/me`), which reads the
 * roles / screens / role_permissions tables in MySQL. The sidebar, the route guard and the action buttons all use it.
 */
export type AccessLevel = 'full' | 'own' | 'read' | 'none';

export interface ScreenAccess {
  key: string;
  path: string;
  label: string;
  group: string;
  level: AccessLevel;
}

let current: ScreenAccess[] | null = null;

/** Called by the auth provider whenever the list is (re)loaded or cleared. */
export function setScreens(screens: ScreenAccess[] | null) {
  current = screens;
}

export const getScreens = () => current;

/** The screen whose path is the longest prefix of `pathname` (so /sales/create beats /sales). */
export function matchScreen(screens: ScreenAccess[], pathname: string): ScreenAccess | undefined {
  let best: ScreenAccess | undefined;
  for (const s of screens) {
    if (pathname === s.path || pathname.startsWith(s.path + '/')) {
      if (!best || s.path.length > best.path.length) best = s;
    }
  }
  return best;
}

export const canView = (level?: AccessLevel) => !!level && level !== 'none';
export const canChange = (level?: AccessLevel) => level === 'own' || level === 'full';

/** Can the user change things on this screen key (e.g. "sales_create")? Unknown until the list has loaded. */
export function canWriteScreen(key: string): boolean | undefined {
  if (!current) return undefined;
  const s = current.find((x) => x.key === key);
  return s ? canChange(s.level) : false;
}
