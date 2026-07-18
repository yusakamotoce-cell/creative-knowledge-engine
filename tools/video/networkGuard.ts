import type { Page, Route } from "@playwright/test";

export interface FixtureNetworkReport {
  extractRequests: string[];
  externalRequests: string[];
  consoleErrors: string[];
  pageErrors: string[];
}

export async function installFixtureNetworkGuard(
  page: Page,
  baseURL: string,
): Promise<{
  report: FixtureNetworkReport;
  assertClean(): void;
  stop(): Promise<void>;
}> {
  const allowedOrigin = new URL(baseURL).origin;
  const report: FixtureNetworkReport = {
    extractRequests: [],
    externalRequests: [],
    consoleErrors: [],
    pageErrors: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      report.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    report.pageErrors.push(error.message);
  });
  const routeHandler = async (route: Route): Promise<void> => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/extract") {
      report.extractRequests.push(url.toString());
      await route.abort("blockedbyclient");
      return;
    }
    if (
      url.protocol !== "data:" &&
      url.protocol !== "blob:" &&
      url.origin !== allowedOrigin
    ) {
      report.externalRequests.push(url.toString());
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  };
  await page.route("**/*", routeHandler);

  return {
    report,
    assertClean() {
      const violations = [
        ...report.extractRequests.map((url) => `Live AI request: ${url}`),
        ...report.externalRequests.map((url) => `External request: ${url}`),
        ...report.consoleErrors.map((message) => `Console error: ${message}`),
        ...report.pageErrors.map((message) => `Page error: ${message}`),
      ];
      if (violations.length > 0) {
        throw new Error(violations.join("\n"));
      }
    },
    async stop() {
      await page.unroute("**/*", routeHandler);
    },
  };
}
