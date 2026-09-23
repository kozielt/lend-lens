import { describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import { settle } from "../settle";

describe("settle", () => {
  it("wraps a resolved value", async () => {
    await expect(settle(Promise.resolve(42), "x")).resolves.toEqual({ ok: true, value: 42 });
  });

  it("turns a rejection into our own reason, not the error message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(settle(Promise.reject(new Error("secret upstream detail")), "RPC error")).resolves.toEqual({ ok: false, reason: "RPC error" });
    log.mockRestore();
  });

  it("lets notFound() through", async () => {
    const p = Promise.resolve().then(() => notFound());
    await expect(settle(p, "x")).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });
});
