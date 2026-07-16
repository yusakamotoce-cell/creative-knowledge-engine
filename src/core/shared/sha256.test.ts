import { describe, expect, it } from "vitest";

import { WebCryptoSha256Hasher } from "./sha256";

describe("WebCryptoSha256Hasher", () => {
  const hasher = new WebCryptoSha256Hasher();

  it("matches the empty known vector", async () => {
    await expect(hasher.hashUtf8("")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("matches the abc known vector", async () => {
    await expect(hasher.hashUtf8("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashes Japanese text as UTF-8", async () => {
    await expect(hasher.hashUtf8("日本語")).resolves.toBe(
      "77710aedc74ecfa33685e33a6c7df5cc83004da1bdcef7fb280f5c2b2e97e0a5",
    );
  });

  it("distinguishes LF and CRLF raw content", async () => {
    expect(await hasher.hashUtf8("a\nb")).not.toBe(
      await hasher.hashUtf8("a\r\nb"),
    );
  });

  it("distinguishes a leading BOM from otherwise equal content", async () => {
    expect(await hasher.hashUtf8("text")).not.toBe(
      await hasher.hashUtf8("\uFEFFtext"),
    );
  });

  it("does not semantically normalize JSON", async () => {
    expect(await hasher.hashUtf8('{"a":1}')).not.toBe(
      await hasher.hashUtf8('{ "a": 1 }'),
    );
  });

  it("is deterministic for identical input", async () => {
    expect(await hasher.hashUtf8("same")).toBe(await hasher.hashUtf8("same"));
  });

  it("supports injected browser-compatible digest behavior", async () => {
    const injected = new WebCryptoSha256Hasher(async () => new Uint8Array(32).buffer);

    await expect(injected.hashUtf8("anything")).resolves.toBe("0".repeat(64));
  });
});
