import { createClient } from "@supabase/supabase-js";

export async function getOptionalVerifiedUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  if (!authorization.startsWith("Bearer ")) throw new Error("Invalid sign-in session.");
  const token = authorization.slice("Bearer ".length);
  if (token.split(".").length !== 3) throw new Error("Invalid sign-in session.");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Contact service is temporarily unavailable.");
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid sign-in session.");
  return data.user.id;
}