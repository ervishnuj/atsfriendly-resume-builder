import { afterEach, describe, expect, it, vi } from "vitest";
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";

function browser(embedded: boolean, popup: { closed: boolean; close: () => void } | null) {
  const location = { origin: "https://theresumerocket.com", href: "https://theresumerocket.com/login" };
  const open = vi.fn(() => popup);
  const self = {};
  vi.stubGlobal("window", {
    self,
    top: embedded ? {} : self,
    location,
    open,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    screenX: 0,
    screenY: 0,
    outerWidth: 1280,
    outerHeight: 900,
    screen: { width: 1280, height: 900 },
  });
  vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Chrome/131", maxTouchPoints: 0 });
  return { location, open };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Google sign-in browser routing", () => {
  it("opens a popup from the embedded preview without navigating the frame", async () => {
    vi.useFakeTimers();
    const close = vi.fn();
    const { location, open } = browser(true, { closed: true, close });
    const result = createLovableAuth().signInWithOAuth("google", { redirect_uri: location.origin });
    expect(open).toHaveBeenCalledOnce();
    const call = open.mock.calls[0] as unknown as [string, string, string] | undefined;
    if (!call) throw new Error("Expected sign-in popup");
    const url = new URL(call[0], location.origin);
    expect(url.pathname).toBe("/~oauth/initiate");
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("response_mode")).toBe("web_message");
    expect(url.searchParams.get("redirect_uri")).toBe("https://theresumerocket.com");
    expect(location.href).toBe("https://theresumerocket.com/login");
    await vi.advanceTimersByTimeAsync(500);
    expect((await result).error?.message).toBe("Sign in was cancelled");
    expect(close).toHaveBeenCalledOnce();
  });

  it("reports a blocked popup instead of loading Google in the preview frame", async () => {
    const { location } = browser(true, null);
    const result = await createLovableAuth().signInWithOAuth("google", { redirect_uri: location.origin });
    expect(result.error?.message).toBe("Popup was blocked");
    expect(location.href).toBe("https://theresumerocket.com/login");
  });

  it("uses full-page sign-in outside the preview and returns to the public origin", async () => {
    const { location, open } = browser(false, null);
    const result = await createLovableAuth().signInWithOAuth("google", { redirect_uri: location.origin });
    expect(result.redirected).toBe(true);
    expect(open).not.toHaveBeenCalled();
    const url = new URL(location.href, location.origin);
    expect(url.pathname).toBe("/~oauth/initiate");
    expect(url.searchParams.get("redirect_uri")).toBe("https://theresumerocket.com");
    expect(url.searchParams.has("response_mode")).toBe(false);
  });
});