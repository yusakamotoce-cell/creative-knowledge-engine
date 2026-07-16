import type { CandidateBundle } from "../core/candidates/candidate";
import type { ImportedDocument } from "../core/import/importedDocument";
import type { ProviderCandidateBundle } from "../server/live-extraction/providerCandidateBundle";

export function createLiveTestDocument(
  overrides: Partial<ImportedDocument> = {},
): ImportedDocument {
  return {
    id: "doc-live-001",
    sourceKind: "pasted_text",
    format: "plain_text",
    fileName: "live-notes.txt",
    mediaType: "text/plain",
    content: "Mira Vale maps North Harbor.\r\nCafé Lantern is nearby.",
    contentSha256: "a".repeat(64),
    importedAt: "2026-07-16T00:00:00.000Z",
    ...overrides,
  };
}

export function createLiveTestBundle(
  overrides: Partial<CandidateBundle> = {},
): CandidateBundle {
  return {
    schemaVersion: 1,
    documentId: "doc-live-001",
    entities: [
      {
        candidateId: "candidate-mira",
        entityType: "character",
        name: "Mira Vale",
        aliases: [],
        description: "A cartographer.",
        attributes: { role: "cartographer" },
        tags: ["cartographer"],
        sourceRefs: [
          {
            documentId: "doc-live-001",
            fileName: "live-notes.txt",
            excerpt: "Mira Vale maps North Harbor.",
          },
        ],
      },
    ],
    relationships: [],
    ...overrides,
  };
}

export function createLiveTestProviderBundle(
  overrides: Partial<ProviderCandidateBundle> = {},
): ProviderCandidateBundle {
  return {
    schemaVersion: 1,
    documentId: "doc-live-001",
    entities: [
      {
        candidateId: "candidate-mira",
        entityType: "character",
        name: "Mira Vale",
        aliases: [],
        description: "A cartographer.",
        attributes: [{ key: "role", value: "cartographer" }],
        tags: ["cartographer"],
        sourceRefs: [
          {
            documentId: "doc-live-001",
            fileName: "live-notes.txt",
            excerpt: "Mira Vale maps North Harbor.",
          },
        ],
      },
    ],
    relationships: [],
    ...overrides,
  };
}

export function completedOpenAiResponse(
  providerCandidateBundle: unknown = createLiveTestProviderBundle(),
): Response {
  return Response.json({
    status: "completed",
    model: "gpt-5.6-2026-07-01",
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(providerCandidateBundle),
          },
        ],
      },
    ],
  });
}
