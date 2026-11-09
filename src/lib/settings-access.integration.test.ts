import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Read-only checks against the configured backend. Never changes roles or settings.
function query(sql: string) {
  const result = execFileSync("lovable", ["supabase", "query", sql, "--json"], {
    encoding: "utf8",
  });
  return (JSON.parse(result) as { rows: Array<Record<string, unknown>> }).rows;
}

describe("business and partner settings authorization", () => {
  it("recognizes the existing verified owner as a protected admin", () => {
    const rows = query(`SELECT public.has_role(id, 'admin'::public.app_role) AS allowed
      FROM auth.users WHERE id = '80b63195-1f96-4526-8196-76a5429d9a31'
      AND lower(email) = 'ervishnuj@gmail.com' AND email_confirmed_at IS NOT NULL`);
    expect(rows).toEqual([{ allowed: true }]);
  }, 30000);

  for (const table of ["business_tax_settings", "partner_settings"]) {
    it(`${table} allows only authenticated protected admins to read`, () => {
      const rows = query(`SELECT roles::text AS roles, qual FROM pg_policies
        WHERE schemaname='public' AND tablename='${table}' AND cmd IN ('SELECT','ALL')`);
      expect(rows).toEqual([{
        roles: "{authenticated}",
        qual: "has_role(auth.uid(), 'admin'::app_role)",
      }]);
    }, 30000);
  }

  it("denies the settings role predicate for every existing non-admin account", () => {
    const rows = query(`SELECT count(*)::integer AS checked,
      count(*) FILTER (WHERE public.has_role(u.id, 'admin'::public.app_role))::integer AS allowed
      FROM auth.users u WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id AND r.role='admin'::public.app_role)`);
    expect(Number(rows[0]?.checked)).toBeGreaterThan(0);
    expect(rows[0]?.allowed).toBe(0);
  }, 30000);
});