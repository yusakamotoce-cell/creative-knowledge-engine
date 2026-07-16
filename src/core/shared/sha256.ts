import { z } from "zod";

export const sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/u);

export interface Sha256Hasher {
  hashUtf8(value: string): Promise<string>;
}

export type Sha256Digest = (
  data: Uint8Array<ArrayBuffer>,
) => Promise<ArrayBuffer>;

async function webCryptoDigest(
  data: Uint8Array<ArrayBuffer>,
): Promise<ArrayBuffer> {
  return globalThis.crypto.subtle.digest("SHA-256", data);
}

export class WebCryptoSha256Hasher implements Sha256Hasher {
  readonly #digest: Sha256Digest;

  constructor(digest: Sha256Digest = webCryptoDigest) {
    this.#digest = digest;
  }

  async hashUtf8(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const digest = await this.#digest(bytes);
    const hex = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return sha256HexSchema.parse(hex);
  }
}
