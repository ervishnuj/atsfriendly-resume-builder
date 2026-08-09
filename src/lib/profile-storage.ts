// Per-user local profile cache. Keys are namespaced by the authenticated user's
// id so one browser never leaks one account's profile into another's session.
const PREFIX = "ats-resume-builder:profile";
const LEGACY_KEY = PREFIX;

export function profileStorageKey(userId: string) {
  return `${PREFIX}:${userId}`;
}

export function readLocalProfile<T>(userId: string): T | null {
  try {
    const raw =
      localStorage.getItem(profileStorageKey(userId)) ??
      // one-time migration of the old shared key into this user's namespace
      (() => {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          localStorage.setItem(profileStorageKey(userId), legacy);
          localStorage.removeItem(LEGACY_KEY);
        }
        return legacy;
      })();
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
      if (key === LEGACY_KEY || key.startsWith(`${PREFIX}:`)) localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
