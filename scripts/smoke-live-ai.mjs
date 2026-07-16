/* global console, fetch, process */

const endpoint =
  process.env.LIVE_AI_SMOKE_ENDPOINT ?? "http://localhost:3000/api/extract";

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "NOT RUN: OPENAI_API_KEY is absent. A skipped smoke test is not a success.",
  );
  process.exitCode = 2;
} else {
  const content =
    "Mira Vale is a cartographer. Mira Vale maps North Harbor.";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: 1,
      document: {
        id: "smoke-live-ai-001",
        fileName: "smoke-live-ai.txt",
        format: "plain_text",
        mediaType: "text/plain",
        content,
      },
    }),
  });
  const body = await response.json();

  if (!response.ok || body?.ok !== true) {
    throw new Error("Live AI smoke failed with a safe endpoint error.");
  }
  const bundle = body.candidateBundle;
  if (
    bundle?.schemaVersion !== 1 ||
    bundle?.documentId !== "smoke-live-ai-001" ||
    !Array.isArray(bundle.entities) ||
    !Array.isArray(bundle.relationships)
  ) {
    throw new Error("Live AI smoke returned an invalid Candidate Bundle.");
  }
  const candidates = [...bundle.entities, ...bundle.relationships];
  const sourceRefs = candidates.flatMap((candidate) => candidate.sourceRefs ?? []);
  if (
    sourceRefs.some(
      (sourceRef) =>
        sourceRef.documentId !== "smoke-live-ai-001" ||
        sourceRef.fileName !== "smoke-live-ai.txt" ||
        typeof sourceRef.excerpt !== "string" ||
        sourceRef.excerpt.length === 0 ||
        !content.includes(sourceRef.excerpt),
    )
  ) {
    throw new Error("Live AI smoke returned ungrounded SourceRef evidence.");
  }
  console.log("PASS: Live AI endpoint returned a grounded Candidate Bundle.");
}
