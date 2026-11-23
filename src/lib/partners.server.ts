import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PartnerRow = {
  id: string;
  user_id: string | null;
  business_name: string;
  contact_person: string;
  phone: string;
  email: string;
  location: string;
  category: string;
  partner_code: string;
  status: "active" | "inactive" | "suspended";
  daily_credit_limit: number;
  selling_price: number | null;
  created_at: string;
};

/**
 * Resolve the partner account for a signed-in user. If a partner row exists
 * with the user's email but no linked account yet, claim it on first visit
 * (emails come from verified auth accounts).
 */
export async function getPartnerForUser(userId: string, email: string | null): Promise<PartnerRow | null> {
  const { data: linked } = await supabaseAdmin
    .from("partners")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (linked) return linked as PartnerRow;

  if (!email) return null;
  // Use the auth record (not caller claims) and require a confirmed email.
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const verifiedEmail = authUser?.user?.email_confirmed_at ? authUser.user.email?.trim().toLowerCase() : null;
  if (!verifiedEmail || verifiedEmail !== email.trim().toLowerCase()) return null;

  // Exact (case-insensitive) match only — never pattern matching.
  const { data: candidates } = await supabaseAdmin
    .from("partners")
    .select("*")
    .is("user_id", null);
  const matches = (candidates ?? []).filter(
    (p) => typeof p.email === "string" && p.email.trim().toLowerCase() === verifiedEmail,
  );
  if (matches.length !== 1) return null;
  const byEmail = matches[0]!;

  const { data: claimed, error } = await supabaseAdmin
    .from("partners")
    .update({ user_id: userId })
    .eq("id", byEmail.id)
    .is("user_id", null)
    .select("*")
    .maybeSingle();
  if (error || !claimed) return null;
  return claimed as PartnerRow;
}

export async function requirePartner(userId: string, email: string | null): Promise<PartnerRow> {
  const partner = await getPartnerForUser(userId, email);
  if (!partner) throw new Response("No partner account is linked to this login.", { status: 403 });
  if (partner.status !== "active") {
    throw new Response("This partner account is not active. Contact the administrator.", { status: 403 });
  }
  return partner;
}

export function generatePartnerCode(businessName: string): string {
  const base = businessName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6) || "PARTNER";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}
