import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc, from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { user_id: "user" }, error: null }) }) }) }) } }));
vi.mock("./partners.server", () => ({ getPartnerForUser: vi.fn() }));
import { runPartnerGeneration } from "./partner-generation.server";

const resume = { summary: "Source-backed candidate" };
const usage = { used: 1, limit: 30, balance: 29 };
function stubRpc(start: unknown) {
  rpc.mockImplementation(async (name: string) => {
    if (name === "start_partner_resume_generation") return { data: start, error: null };
    if (name === "finish_partner_resume_generation") return { data: { ok: true, code: "OK" }, error: null };
    if (name === "get_partner_usage") return { data: usage, error: new Error("unused usage read") };
    throw new Error(`Unexpected RPC: ${name}`);
  });
}
beforeEach(() => { rpc.mockReset(); });

describe("partner resume credit orchestration", () => {
  it("blocks insufficient credits before any generation", async () => {
    stubRpc({ allowed: false, code: "NO_CREDITS" });
    const generate = vi.fn();
    await expect(runPartnerGeneration("user", "partner", "request-123", generate)).rejects.toThrow("PARTNER_NO_CREDITS");
    expect(generate).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("releases a failed generation without requesting a charge", async () => {
    stubRpc({ allowed: true, code: "OK" });
    await expect(runPartnerGeneration("user", "partner", "request-123", async () => { throw new Error("Provider refused"); })).rejects.toThrow("Provider refused");
    expect(rpc).toHaveBeenLastCalledWith("finish_partner_resume_generation", expect.objectContaining({ _success: false, _result: null }));
    expect(rpc.mock.calls.filter(([name, args]) => name === "finish_partner_resume_generation" && args._success)).toHaveLength(0);
  });
  it("commits one successful result without refunding it when usage refresh fails", async () => {
    stubRpc({ allowed: true, code: "OK" });
    await expect(runPartnerGeneration("user", "partner", "request-123", async () => resume)).rejects.toThrow("Unable to read partner credits");
    const finishes = rpc.mock.calls.filter(([name]) => name === "finish_partner_resume_generation");
    expect(finishes).toHaveLength(1);
    expect(finishes[0]?.[1]).toMatchObject({ _success: true, _result: resume });
  });
  it("does not regenerate or charge an already cached request", async () => {
    stubRpc({ allowed: false, code: "DUPLICATE_RESULT", result: resume });
    const generate = vi.fn();
    await expect(runPartnerGeneration("user", "partner", "request-123", generate)).rejects.toThrow("Unable to read partner credits");
    expect(generate).not.toHaveBeenCalled();
    expect(rpc.mock.calls.filter(([name]) => name === "finish_partner_resume_generation")).toHaveLength(0);
  });
  it("enforces the partner limit of 30 without starting the 31st generation", async () => {
    stubRpc({ allowed: false, code: "DAILY_LIMIT_REACHED", limit: 30, used: 30, remaining: 0 });
    const generate = vi.fn();
    await expect(runPartnerGeneration("user", "partner", "request-31", generate)).rejects.toThrow('"limit":30');
    expect(generate).not.toHaveBeenCalled();
  });
  it("blocks simultaneous duplicate requests without releasing the original reservation", async () => {
    stubRpc({ allowed: false, code: "DUPLICATE_IN_FLIGHT" });
    await expect(runPartnerGeneration("user", "partner", "request-123", vi.fn())).rejects.toThrow("DUPLICATE_GENERATION_IN_FLIGHT");
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("returns a successful resume with exactly one credit charged", async () => {
    stubRpc({ allowed: true, code: "OK" });
    rpc.mockImplementation(async (name: string) => ({ data: name === "start_partner_resume_generation" ? { allowed: true, code: "OK" } : name === "finish_partner_resume_generation" ? { ok: true, code: "OK" } : name === "get_partner_usage" ? usage : { resetAt: "2026-11-12T18:30:00Z" }, error: null }));
    const result = await runPartnerGeneration("user", "partner", "request-123", async () => resume);
    expect(result).toMatchObject({ resume, partnerCreditCharged: true, usage: { limit: 30, used: 1, balance: 29 } });
    expect(rpc.mock.calls.filter(([name]) => name === "finish_partner_resume_generation")).toHaveLength(1);
  });
});