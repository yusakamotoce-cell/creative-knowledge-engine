import type { CandidateBundle } from "../candidates/candidate";
import { sha256HexSchema } from "../shared/sha256";
import { ImportDomainError } from "./errors";
import type { ExtractionAdapter } from "./extractionAdapter";
import type { ImportedDocument } from "./importedDocument";

export interface FixtureExtractionEntry {
  contentSha256: string;
  candidateBundle: CandidateBundle;
}

export class FixtureExtractionAdapter implements ExtractionAdapter {
  readonly #entries: Map<string, CandidateBundle>;

  constructor(entries: readonly FixtureExtractionEntry[]) {
    this.#entries = new Map();

    for (const entry of entries) {
      const hash = sha256HexSchema.parse(entry.contentSha256);
      if (this.#entries.has(hash)) {
        throw new ImportDomainError("DUPLICATE_FIXTURE_HASH");
      }

      this.#entries.set(hash, structuredClone(entry.candidateBundle));
    }
  }

  async extract(document: ImportedDocument): Promise<unknown> {
    const bundle = this.#entries.get(document.contentSha256);

    if (bundle === undefined) {
      throw new ImportDomainError("FIXTURE_NOT_FOUND");
    }

    return structuredClone(bundle);
  }
}
