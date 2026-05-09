import { describe, expect, it, vi } from "vitest";

import {
  pollUntilApproved,
  startConnect,
  type PollResult,
} from "../auth/device-flow";
import { createOmnidrawAuthAdapter } from "../auth/adapter";
import { createMemoryKeyStore } from "../auth/keychain";

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("device-flow client", () => {
  it("startConnect parses the start response", async () => {
    const fetchSpy = vi.fn(async () =>
      json(200, {
        device_code: "dev-secret",
        user_code: "ABCD-1234",
        verification_uri: "https://omnizen.ai/connect",
        verification_uri_complete:
          "https://omnizen.ai/connect?code=ABCD-1234",
        interval: 2,
        expires_in: 600,
      }),
    );
    const result = await startConnect({
      authBase: "https://example.test/auth",
      fetch: fetchSpy as unknown as typeof fetch,
    });
    expect(result.deviceCode).toBe("dev-secret");
    expect(result.userCode).toBe("ABCD-1234");
    expect(result.verificationUriComplete).toContain("ABCD-1234");
    expect(result.expiresIn).toBe(600);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.test/auth/start",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("pollUntilApproved: pending × 3 → approved", async () => {
    const responses: Response[] = [
      json(200, { status: "pending" }),
      json(200, { status: "pending" }),
      json(200, { status: "pending" }),
      json(200, {
        status: "approved",
        api_key: "omn_live_xyz",
        base_url: "https://api.omnizen.ai/v1",
      }),
    ];
    const fetchSpy = vi.fn(async () => responses.shift()!);
    const sleep = vi.fn(async () => {});

    const out = await pollUntilApproved("dev-secret", {
      authBase: "https://example.test/auth",
      fetch: fetchSpy as unknown as typeof fetch,
      sleep,
      defaultIntervalMs: 50,
    });

    expect(out.kind).toBe("approved");
    if (out.kind === "approved") {
      expect(out.apiKey).toBe("omn_live_xyz");
      expect(out.baseUrl).toBe("https://api.omnizen.ai/v1");
    }
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    // We slept after each pending response (3 sleeps), not after approved.
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it("pollUntilApproved: 410 expired → expired", async () => {
    const fetchSpy = vi.fn(async () => json(410, { status: "expired" }));
    const out = await pollUntilApproved("dev", {
      authBase: "https://x",
      fetch: fetchSpy as unknown as typeof fetch,
      sleep: async () => {},
    });
    expect(out.kind).toBe("expired");
  });

  it("pollUntilApproved: 410 denied → denied", async () => {
    const fetchSpy = vi.fn(async () => json(410, { status: "denied" }));
    const out = await pollUntilApproved("dev", {
      authBase: "https://x",
      fetch: fetchSpy as unknown as typeof fetch,
      sleep: async () => {},
    });
    expect(out.kind).toBe("denied");
  });

  it("pollUntilApproved: aborted signal → cancelled", async () => {
    const ac = new AbortController();
    ac.abort();
    const fetchSpy = vi.fn(async () => json(200, { status: "pending" }));
    const out = await pollUntilApproved("dev", {
      authBase: "https://x",
      fetch: fetchSpy as unknown as typeof fetch,
      sleep: async () => {},
      signal: ac.signal,
    });
    expect(out.kind).toBe("cancelled");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("pollUntilApproved: slow_down honours retry_after_ms", async () => {
    const responses: Response[] = [
      json(200, { status: "slow_down", retry_after_ms: 250 }),
      json(200, {
        status: "approved",
        api_key: "k",
        base_url: "https://api.omnizen.ai/v1",
      }),
    ];
    const sleeps: number[] = [];
    const out = await pollUntilApproved("dev", {
      authBase: "https://x",
      fetch: (async () => responses.shift()!) as unknown as typeof fetch,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      defaultIntervalMs: 50,
    });
    expect((out as Extract<PollResult, { kind: "approved" }>).kind).toBe(
      "approved",
    );
    expect(sleeps[0]).toBe(250);
  });
});

describe("OmnidrawAuthAdapter", () => {
  it("end-to-end: start → poll(pending)×3 → poll(approved) → key persisted", async () => {
    const responses: Response[] = [
      // /start
      json(200, {
        device_code: "dev-secret",
        user_code: "ABCD-1234",
        verification_uri_complete:
          "https://omnizen.ai/connect?code=ABCD-1234",
        interval: 0,
        expires_in: 600,
      }),
      // /poll × 3 pending
      json(200, { status: "pending" }),
      json(200, { status: "pending" }),
      json(200, { status: "pending" }),
      // /poll approved
      json(200, {
        status: "approved",
        api_key: "omn_live_test",
        base_url: "https://api.omnizen.ai/v1",
      }),
      // validate ping (returns 200 ok)
      json(200, { id: "ok" }),
    ];
    const fetchSpy = vi.fn(async () => responses.shift()!);

    const opened: string[] = [];
    const store = createMemoryKeyStore();

    const adapter = createOmnidrawAuthAdapter({
      store,
      authBase: "https://example.test/auth",
      fetch: fetchSpy as unknown as typeof fetch,
      openBrowser: (u) => {
        opened.push(u);
      },
      defaultPollIntervalMs: 1,
      validate: async () => true,
    });

    const start = await adapter.startConnect();
    expect(start.userCode).toBe("ABCD-1234");
    expect(opened).toEqual(["https://omnizen.ai/connect?code=ABCD-1234"]);

    const result = await adapter.awaitConnect();
    expect(result.kind).toBe("approved");

    expect(await adapter.isConnected()).toBe(true);
    const stored = await store.load();
    expect(stored?.apiKey).toBe("omn_live_test");
    expect(stored?.baseUrl).toBe("https://api.omnizen.ai/v1");
  });

  it("storeKey rejects when validation fails", async () => {
    const store = createMemoryKeyStore();
    const adapter = createOmnidrawAuthAdapter({
      store,
      validate: async () => false,
    });
    const r = await adapter.storeKey("bad");
    expect(r.ok).toBe(false);
    expect(await adapter.isConnected()).toBe(false);
  });

  it("disconnect wipes the key", async () => {
    const store = createMemoryKeyStore({
      apiKey: "k",
      baseUrl: "https://api.omnizen.ai/v1",
      storedAt: "now",
    });
    const adapter = createOmnidrawAuthAdapter({ store });
    expect(await adapter.isConnected()).toBe(true);
    await adapter.disconnect();
    expect(await adapter.isConnected()).toBe(false);
  });
});
