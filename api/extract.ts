import {
  createLiveExtractionHttpHandler,
  LiveExtractionService,
  OpenAiResponsesClient,
} from "../src/server/live-extraction";

declare const process: {
  env: Readonly<Record<string, string | undefined>>;
};

interface ApiRequest {
  method?: string;
  headers: Readonly<Record<string, string | string[] | undefined>>;
  body?: unknown;
}

interface ApiResponse {
  status(statusCode: number): ApiResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

function requestBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  const enabled = process.env.LIVE_AI_ENABLED !== "false";
  const model = process.env.OPENAI_MODEL;
  const service =
    apiKey === undefined || apiKey.trim().length === 0
      ? undefined
      : new LiveExtractionService(
          new OpenAiResponsesClient({
            apiKey,
            ...(model === undefined ? {} : { model }),
            fetcher: (input, init) => fetch(input, init),
          }),
        );
  const httpHandler = createLiveExtractionHttpHandler({
    enabled,
    ...(service === undefined ? {} : { service }),
  });

  const contentTypeHeader = request.headers["content-type"];
  const result = await httpHandler({
    method: request.method,
    contentType: Array.isArray(contentTypeHeader)
      ? contentTypeHeader[0]
      : contentTypeHeader,
    body: requestBody(request.body),
  });

  for (const [name, value] of Object.entries(result.headers)) {
    response.setHeader(name, value);
  }
  response.status(result.status).json(result.body);
}
