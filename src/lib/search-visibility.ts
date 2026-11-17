// Indexing directives are not access control; existing account guards remain authoritative.
export function isPrivateSearchPath(pathname: string): boolean {
  const roots = ["builder", "dashboard", "tracker", "subscription", "payment", "partner", "admin", "profile", "account", "login", "register", "auth", "reset-password"];
  return roots.some(root => pathname === `/${root}` || pathname.startsWith(`/${root}/`));
}