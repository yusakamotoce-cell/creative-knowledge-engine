import { expect, type Page } from "@playwright/test";

const internalIdPattern =
  /\b(?:astra-doc|cand-astra|ent-astra|rel-astra|relcand-astra|review-astra)-?[a-z0-9-]*/iu;

export async function applyRecordingUi(
  page: Page,
  extraCss = "",
): Promise<void> {
  await page.addStyleTag({
    content: `
      .review-header > div > p:last-child,
      .detail-list > div:first-child:has(dt:first-child),
      .entity-detail > .candidate-title > code,
      .source-list > li > small,
      .demo-progress small,
      .document-card h3 + p,
      .relationship-selection-list code,
      .relationship-table-wrap td small,
      .insight-item li small,
      .insight-list code,
      .candidate-panel .subpanel li code,
      .candidate-panel > .reviewed-note {
        display: none !important;
      }
      ${extraCss}
    `,
  });
  await redactSelectOptionIds(page);
}

export async function redactSelectOptionIds(page: Page): Promise<void> {
  await page.locator("option").evaluateAll((options) => {
    const pattern =
      /\s*\((?:ent-astra|rel-astra|cand-astra|relcand-astra|review-astra|astra-doc)-?[a-z0-9-]*\)\s*$/iu;
    for (const option of options) {
      (option as HTMLOptionElement).label =
        option.textContent?.replace(pattern, "") ?? "";
    }
  });
}

export async function assertNoVisibleInternalIds(page: Page): Promise<void> {
  let visibleText = await page.locator("body").innerText();
  for (const optionText of await page.locator("option").allTextContents()) {
    visibleText = visibleText.replaceAll(optionText, "");
  }
  expect(visibleText).not.toMatch(internalIdPattern);
}

export async function openSavedWorkspace(
  page: Page,
  destination: "graph" | "knowledge" | "review" | "search",
): Promise<void> {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /散らばった設定/u }),
  ).toBeVisible();
  if (destination === "review") {
    await page.getByRole("button", { name: "作業を再開" }).click();
    return;
  }
  const label = {
    graph: "Graph",
    knowledge: "Knowledge",
    search: "Search",
  }[destination];
  await page
    .getByRole("navigation", { name: "メインナビゲーション" })
    .getByRole("button", { name: label })
    .click();
}

export async function markFormByHeading(
  page: Page,
  heading: string,
  marker: string,
): Promise<void> {
  const form = page.getByRole("heading", { name: heading }).locator("..");
  await form.evaluate(
    (element, value) => element.setAttribute("data-video-form", value),
    marker,
  );
}
