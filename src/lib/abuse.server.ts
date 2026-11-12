import { createHmac } from "node:crypto";

type Rpc = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/** Per-visitor (hashed IP) throttle reusing the existing rate-limit table. Returns false when over limit. */
export async function consumeVisitorLimit(
  request: Request,
  scope: string,
  windowSeconds: number,
  windowLimit: number,
  dailyLimit: number,
): Promise<boolean> {
  const secret = process.env["APP_ENCRYPTION_KEY"];
  if (!secret) return false;
  const forwarded = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const keyHash = createHmac("sha256", secret).update(`${scope}|${ip}`).digest("hex");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as unknown as Rpc).rpc("consume_contact_submission", {
    _key_hash: keyHash,
    _window_seconds: windowSeconds,
    _window_limit: windowLimit,
    _daily_limit: dailyLimit,
  });
  return !error && Boolean(data);
}
