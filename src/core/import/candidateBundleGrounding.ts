import {
  candidateBundleSchema,
  type CandidateBundle,
  type EntityCandidate,
  type RelationshipCandidate,
} from "../candidates/candidate";
import type { ScalarValue } from "../shared/schemas";
import type { SourceRef } from "../shared/sourceRef";
import {
  importedDocumentSchema,
  type ImportedDocument,
} from "./importedDocument";

export const CANDIDATE_BUNDLE_LIMITS = Object.freeze({
  entities: 40,
  relationships: 80,
  aliasesPerEntity: 20,
  tagsPerEntity: 30,
  sourceRefsPerCandidate: 20,
  descriptionCharacters: 2_000,
  excerptCharacters: 500,
  identifierCharacters: 255,
  nameCharacters: 500,
  scalarStringCharacters: 2_000,
});

export type CandidateBundleGroundingErrorCode =
  | "AI_DOCUMENT_ID_MISMATCH"
  | "AI_SOURCE_REF_MISMATCH"
  | "AI_UNGROUNDED_SOURCE_REF"
  | "AI_OUTPUT_LIMIT_EXCEEDED";

export class CandidateBundleGroundingError extends Error {
  readonly code: CandidateBundleGroundingErrorCode;

  constructor(code: CandidateBundleGroundingErrorCode) {
    super(code);
    this.name = "CandidateBundleGroundingError";
    this.code = code;
  }
}

function assertStringLimit(value: string, limit: number): void {
  if (value.length > limit) {
    throw new CandidateBundleGroundingError("AI_OUTPUT_LIMIT_EXCEEDED");
  }
}

function assertScalarLimit(value: ScalarValue): void {
  if (typeof value === "string") {
    assertStringLimit(
      value,
      CANDIDATE_BUNDLE_LIMITS.scalarStringCharacters,
    );
  }
}

function assertSourceRef(
  document: ImportedDocument,
  sourceRef: SourceRef,
): void {
  if (
    sourceRef.documentId !== document.id ||
    sourceRef.fileName !== document.fileName
  ) {
    throw new CandidateBundleGroundingError("AI_SOURCE_REF_MISMATCH");
  }

  assertStringLimit(
    sourceRef.excerpt,
    CANDIDATE_BUNDLE_LIMITS.excerptCharacters,
  );

  if (
    sourceRef.excerpt.length === 0 ||
    !document.content.includes(sourceRef.excerpt)
  ) {
    throw new CandidateBundleGroundingError("AI_UNGROUNDED_SOURCE_REF");
  }
}

function assertEntityLimits(
  document: ImportedDocument,
  entity: EntityCandidate,
): void {
  assertStringLimit(
    entity.candidateId,
    CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
  );
  assertStringLimit(entity.name, CANDIDATE_BUNDLE_LIMITS.nameCharacters);
  assertStringLimit(
    entity.description,
    CANDIDATE_BUNDLE_LIMITS.descriptionCharacters,
  );

  if (
    entity.aliases.length > CANDIDATE_BUNDLE_LIMITS.aliasesPerEntity ||
    entity.tags.length > CANDIDATE_BUNDLE_LIMITS.tagsPerEntity ||
    entity.sourceRefs.length > CANDIDATE_BUNDLE_LIMITS.sourceRefsPerCandidate
  ) {
    throw new CandidateBundleGroundingError("AI_OUTPUT_LIMIT_EXCEEDED");
  }

  for (const alias of entity.aliases) {
    assertStringLimit(alias, CANDIDATE_BUNDLE_LIMITS.nameCharacters);
  }
  for (const tag of entity.tags) {
    assertStringLimit(tag, CANDIDATE_BUNDLE_LIMITS.identifierCharacters);
  }
  for (const [key, value] of Object.entries(entity.attributes)) {
    assertStringLimit(key, CANDIDATE_BUNDLE_LIMITS.identifierCharacters);
    assertScalarLimit(value);
  }
  for (const sourceRef of entity.sourceRefs) {
    assertSourceRef(document, sourceRef);
  }
}

function assertRelationshipLimits(
  document: ImportedDocument,
  relationship: RelationshipCandidate,
): void {
  assertStringLimit(
    relationship.candidateId,
    CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
  );
  assertStringLimit(
    relationship.relationType,
    CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
  );
  assertStringLimit(
    relationship.description,
    CANDIDATE_BUNDLE_LIMITS.descriptionCharacters,
  );
  if (
    relationship.sourceRefs.length >
    CANDIDATE_BUNDLE_LIMITS.sourceRefsPerCandidate
  ) {
    throw new CandidateBundleGroundingError("AI_OUTPUT_LIMIT_EXCEEDED");
  }

  for (const reference of [relationship.fromRef, relationship.toRef]) {
    if (reference.candidateId !== undefined) {
      assertStringLimit(
        reference.candidateId,
        CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
      );
    }
    if (reference.name !== undefined) {
      assertStringLimit(
        reference.name,
        CANDIDATE_BUNDLE_LIMITS.nameCharacters,
      );
    }
  }
  for (const sourceRef of relationship.sourceRefs) {
    assertSourceRef(document, sourceRef);
  }
}

export function validateCandidateBundleGrounding(
  documentInput: ImportedDocument,
  candidateBundleInput: CandidateBundle,
): CandidateBundle {
  const document = importedDocumentSchema.parse(documentInput);
  const candidateBundle = candidateBundleSchema.parse(candidateBundleInput);

  if (candidateBundle.documentId !== document.id) {
    throw new CandidateBundleGroundingError("AI_DOCUMENT_ID_MISMATCH");
  }

  if (
    candidateBundle.entities.length > CANDIDATE_BUNDLE_LIMITS.entities ||
    candidateBundle.relationships.length >
      CANDIDATE_BUNDLE_LIMITS.relationships
  ) {
    throw new CandidateBundleGroundingError("AI_OUTPUT_LIMIT_EXCEEDED");
  }

  const candidateIds = new Set<string>();
  for (const entity of candidateBundle.entities) {
    if (candidateIds.has(entity.candidateId)) {
      throw new CandidateBundleGroundingError("AI_OUTPUT_LIMIT_EXCEEDED");
    }
    candidateIds.add(entity.candidateId);
    assertEntityLimits(document, entity);
  }
  for (const relationship of candidateBundle.relationships) {
    if (candidateIds.has(relationship.candidateId)) {
      throw new CandidateBundleGroundingError("AI_OUTPUT_LIMIT_EXCEEDED");
    }
    candidateIds.add(relationship.candidateId);
    assertRelationshipLimits(document, relationship);
  }

  return candidateBundle;
}
