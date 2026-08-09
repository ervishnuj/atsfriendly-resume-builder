// Per-user local profile cache. Keys are namespaced by the authenticated user's
// id so one browser never leaks one account's profile into another's session.
const LEGACY_PREFIX = "ats-resume-builder:profile";
const PREFIX = "ats-resume-builder:profile:v2";
const LEGACY_KEY = LEGACY_PREFIX;

export function profileStorageKey(userId: string) {
  return `${PREFIX}:${userId}`;
}

export function readLocalProfile<T>(userId: string): T | null {
  try {
    // Never migrate the old shared value into an account: its owner cannot be
    // established, so assigning it to the current user would leak profile data.
    for (const key of Object.keys(localStorage)) {
      if (key === LEGACY_KEY || key.startsWith(`${LEGACY_PREFIX}:`)) {
        localStorage.removeItem(key);
      }
    }
    const raw = localStorage.getItem(profileStorageKey(userId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLocalProfile(userId: string, value: unknown) {
  try {
    localStorage.setItem(profileStorageKey(userId), JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function removeLocalProfile(userId: string) {
  try {
    localStorage.removeItem(profileStorageKey(userId));
  } catch {
    // ignore
  }
}

/** Wipe every cached profile in this browser (used on sign out). */
export function clearAllLocalProfiles() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (
        key === LEGACY_KEY ||
        key.startsWith(`${LEGACY_PREFIX}:`) ||
        key.startsWith(`${PREFIX}:`)
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

/** Clear non-auth application state that must never survive an account switch. */
export function clearBrowserUserData() {
  clearAllLocalProfiles();
  try {
    sessionStorage.clear();
  } catch {
    // ignore unavailable storage
  }
}
