import { expect, type Page } from "@playwright/test";

import { PUBLIC_DEMO_STORY_NAME } from "../../src/app/demo/publicDemoStory.js";

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function statusPattern(label: string, status: string): RegExp {
  return new RegExp(`${escapePattern(label)}.*${escapePattern(status)}`, "u");
}

export async function waitForHome(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: /散らばった設定/u }),
  ).toBeVisible();
}

export async function beginFirstFixtureDocument(page: Page): Promise<void> {
  await page
    .getByRole("button", {
      name: `${PUBLIC_DEMO_STORY_NAME} Demoを開始`,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "01-astra-foundation.md", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Entity Candidate Review" }),
  ).toBeVisible();
}

export async function beginNextFixtureDocument(
  page: Page,
  expectedFileName: string,
): Promise<void> {
  await expect(page.getByRole("heading", { name: "文書をImport" })).toBeVisible();
  await page.getByRole("button", { name: "ImportしてReview" }).click();
  await expect(
    page.getByRole("heading", { name: expectedFileName, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Entity Candidate Review" }),
  ).toBeVisible();
}

export async function acceptEntity(page: Page, name: string): Promise<void> {
  const list = page.getByRole("navigation", { name: "Entity Candidate一覧" });
  const candidate = list.getByRole("button", {
    name: new RegExp(escapePattern(name), "u"),
  });
  await candidate.click();
  await page.getByRole("button", { name: "Accept as new" }).click();
  await expect(
    list.getByRole("button", { name: statusPattern(name, "accepted") }),
  ).toBeVisible();
}

export async function rejectEntity(page: Page, name: string): Promise<void> {
  const list = page.getByRole("navigation", { name: "Entity Candidate一覧" });
  await list
    .getByRole("button", { name: statusPattern(name, "pending") })
    .click();
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.getByRole("button", { name: "Rejectを確定" }).click();
  await expect(
    list.getByRole("button", { name: statusPattern(name, "rejected") }),
  ).toBeVisible();
}

export async function mergeEntity(
  page: Page,
  name: string,
  targetEntityId: string,
): Promise<void> {
  const list = page.getByRole("navigation", { name: "Entity Candidate一覧" });
  await list
    .getByRole("button", { name: statusPattern(name, "pending") })
    .click();
  await page.getByLabel("merge先").selectOption(targetEntityId);
  await page.getByRole("button", { name: "Merge", exact: true }).click();
  await expect(
    list.getByRole("button", { name: statusPattern(name, "merged") }),
  ).toBeVisible();
}

export async function editEntityName(
  page: Page,
  currentName: string,
  nextName: string,
): Promise<void> {
  const list = page.getByRole("navigation", { name: "Entity Candidate一覧" });
  await list
    .getByRole("button", { name: statusPattern(currentName, "pending") })
    .click();
  await page.getByRole("textbox", { name: "name", exact: true }).fill(nextName);
  await page.getByRole("button", { name: "Editを保存" }).click();
  await expect(
    list.getByRole("button", { name: statusPattern(nextName, "pending") }),
  ).toBeVisible();
}

export async function advanceToRelationships(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Relationship Reviewへ進む" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Relationship Candidate Review" }),
  ).toBeVisible();
}

export async function acceptRelationship(
  page: Page,
  relationType: string,
): Promise<void> {
  const list = page.getByRole("navigation", {
    name: "Relationship Candidate一覧",
  });
  const candidate = list.getByRole("button", {
    name: new RegExp(escapePattern(relationType), "u"),
  });
  await candidate.click();
  await page.getByRole("button", { name: "Accept Relationship" }).click();
  await expect(
    list.getByRole("button", {
      name: new RegExp(
        `${escapePattern(relationType)}.*(?:accepted|merged)`,
        "u",
      ),
    }),
  ).toBeVisible();
}

export async function rejectBlockedRelationship(page: Page): Promise<void> {
  await expect(
    page
      .locator(".callout.warning-callout")
      .filter({ hasText: "終点を解決できません" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept Relationship" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Reject Relationship" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Relationship Candidate一覧" })
      .getByRole("button", { name: /points_to.*rejected/u }),
  ).toBeVisible();
}

export async function completeAndApply(page: Page): Promise<void> {
  await page
    .getByRole("button", {
      name: "Reviewを完了してKnowledgeへ反映",
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Relationship Candidate Review" }),
  ).not.toBeVisible();
}
