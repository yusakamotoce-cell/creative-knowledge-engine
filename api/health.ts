import {
  handleHealthRequest,
  type HealthEnvironment,
} from "../src/server/health/healthHandler.js";

declare const process: {
  env: Readonly<Record<string, string | undefined>>;
};

export function createHealthFetchHandler(
  environment: HealthEnvironment,
): (request: Request) => Response {
  return (request) => {
    const result = handleHealthRequest(request.method, environment);
    return Response.json(result.body, {
      status: result.status,
      headers: result.headers,
    });
  };
}

const healthFunction = {
  fetch(request: Request): Response {
    return createHealthFetchHandler(process.env)(request);
  },
};

export default healthFunction;
