const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/u,
  /\bOPENAI_API_KEY\s*=/u,
  /\bAuthorization:\s*Bearer\s+\S+/iu,
] as const;

export function assertNoSecretMaterial(value: string): void {
  if (secretPatterns.some((pattern) => pattern.test(value))) {
    throw new Error("Video artifact content contains secret-like material.");
  }
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}
