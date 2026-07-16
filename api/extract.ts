import {
  createLiveExtractionHttpHandler,
  type FetchLike,
  LiveExtractionService,
  OpenAiResponsesClient,
} from "../src/server/live-extraction";

declare const process: {
  env: Readonly<Record<string, string | undefined>>;
};

export interface ExtractFunctionEnvironment {
  readonly OPENAI_API_KEY?: string;
  readonly OPENAI_MODEL?: string;
  readonly LIVE_AI_ENABLED?: string;
}

export interface ExtractFunctionDependencies {
  readonly environment: ExtractFunctionEnvironment;
  readonly fetcher: FetchLike;
}

async function readRequestBody(request: Request): Promise<unknown> {
  if (request.method.toUpperCase() !== "POST") return undefined;
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function createExtractFetchHandler(
  dependencies: ExtractFunctionDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const apiKey = dependencies.environment.OPENAI_API_KEY;
    const model = dependencies.environment.OPENAI_MODEL;
    const enabled = dependencies.environment.LIVE_AI_ENABLED !== "false";
    const service =
      apiKey === undefined || apiKey.trim().length === 0
        ? undefined
        : new LiveExtractionService(
            new OpenAiResponsesClient({
              apiKey,
              ...(model === undefined ? {} : { model }),
              fetcher: dependencies.fetcher,
            }),
          );
    const httpHandler = createLiveExtractionHttpHandler({
      enabled,
      ...(service === undefined ? {} : { service }),
    });
    const result = await httpHandler({
      method: request.method,
      contentType: request.headers.get("content-type") ?? undefined,
      body: await readRequestBody(request),
    });

    return Response.json(result.body, {
      status: result.status,
      headers: result.headers,
    });
  };
}

const extractFunction = {
  fetch(request: Request): Promise<Response> {
    return createExtractFetchHandler({
      environment: process.env,
      fetcher: (input, init) => fetch(input, init),
    })(request);
  },
};

export default extractFunction;
