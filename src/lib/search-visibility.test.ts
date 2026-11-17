import { describe, expect, it } from "vitest";
import { isPrivateSearchPath } from "./search-visibility";

describe("search visibility boundaries", () => {
  it("excludes account and financial pages, including nested paths", () => {
    for (const path of ["/builder", "/dashboard", "/tracker", "/subscription", "/admin/partners", "/partner/invoice/abc", "/payment/checkout/abc", "/login", "/register"]) expect(isPrivateSearchPath(path)).toBe(true);
  });
  it("keeps the no-signup checker and editorial pages discoverable", () => {
    for (const path of ["/", "/ats-checker", "/ai-resume-builder", "/guides/java-developer-resume", "/pricing", "/resume-templates", "/partnership"]) expect(isPrivateSearchPath(path)).toBe(false);
  });
});