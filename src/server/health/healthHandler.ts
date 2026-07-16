export const HEALTH_SCHEMA_VERSION = 1 as const;
export const HEALTH_SERVICE_NAME = "creative-knowledge-engine" as const;

export interface HealthEnvironment {
  readonly OPENAI_API_KEY?: string;
  readonly LIVE_AI_ENABLED?: string;
}

export interface HealthHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

const HEALTH_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
});

export function isLiveAiConfigured(environment: HealthEnvironment): boolean {
  return (
    environment.LIVE_AI_ENABLED !== "false" &&
    environment.OPENAI_API_KEY !== undefined &&
    environment.OPENAI_API_KEY.trim().length > 0
  );
}

export function handleHealthRequest(
  method: string,
  environment: HealthEnvironment,
): HealthHttpResponse {
  if (method.toUpperCase() !== "GET") {
    return {
      status: 405,
      headers: HEALTH_HEADERS,
      body: {
        ok: false,
        schemaVersion: HEALTH_SCHEMA_VERSION,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Method not allowed.",
        },
      },
    };
  }

  return {
    status: 200,
    headers: HEALTH_HEADERS,
    body: {
      ok: true,
      schemaVersion: HEALTH_SCHEMA_VERSION,
      service: HEALTH_SERVICE_NAME,
      liveAi: isLiveAiConfigured(environment) ? "enabled" : "disabled",
    },
  };
}
