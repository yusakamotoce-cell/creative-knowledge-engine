import { z } from "zod";

import { knowledgeRevisionSchema } from "../application/types";
import { knowledgeStateSchema } from "../knowledge/knowledgeState";
import type { StorageSnapshot } from "../storage";

export const knowledgeExportV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  knowledgeRevision: knowledgeRevisionSchema,
  knowledge: knowledgeStateSchema,
});

export type KnowledgeExportV1 = z.infer<typeof knowledgeExportV1Schema>;

export class KnowledgeExportError extends Error {
  readonly code = "INVALID_KNOWLEDGE_EXPORT";

  constructor(options: { cause?: unknown } = {}) {
    super("INVALID_KNOWLEDGE_EXPORT", options);
    this.name = "KnowledgeExportError";
  }
}

function parseExport(value: unknown): KnowledgeExportV1 {
  const parsed = knowledgeExportV1Schema.safeParse(value);
  if (!parsed.success) {
    throw new KnowledgeExportError({ cause: parsed.error });
  }
  return parsed.data;
}

export function createKnowledgeExport(
  snapshot: StorageSnapshot,
): KnowledgeExportV1 {
  return parseExport({
    schemaVersion: 1,
    knowledgeRevision: snapshot.knowledgeRevision,
    knowledge: snapshot.knowledge,
  });
}

export function serializeKnowledgeExport(value: KnowledgeExportV1): string {
  return `${JSON.stringify(parseExport(value), null, 2)}\n`;
}

