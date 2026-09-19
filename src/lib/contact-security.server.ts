import { createHmac } from "node:crypto";

type RateLimitRpc = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function enforceContactRateLimit(request: Request, email: string): Promise<void> {
  const secret = process.env["APP_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Contact service is temporarily unavailable.");
  const forwarded = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const keyHash = createHmac("sha256", secret).update(`${ip}|${email.trim().toLowerCase()}`).digest("hex");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as unknown as RateLimitRpc).rpc("consume_contact_submission", {
    _key_hash: keyHash,
    _window_seconds: 900,
    _window_limit: 5,
    _daily_limit: 20,
  });
  if (error) throw new Error("Contact service is temporarily unavailable.");
  if (!data) throw new Error("Too many messages were sent recently. Please wait and try again later.");
}