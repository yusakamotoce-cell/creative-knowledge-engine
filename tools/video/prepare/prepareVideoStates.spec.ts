import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

import { installFixtureNetworkGuard } from "../networkGuard.js";
import { ensureVideoDirectories, resolveVideoPaths } from "../paths.js";
import { assertNoSecretMaterial } from "../safety.js";
import {
  acceptEntity,
  acceptRelationship,
  advanceToRelationships,
  beginFirstFixtureDocument,
  beginNextFixtureDocument,
  completeAndApply,
  editEntityName,
  mergeEntity,
  rejectBlockedRelationship,
  rejectEntity,
  waitForHome,
} from "../uiWorkflow.js";
import type { VideoStateName } from "../types.js";

test("prepares Fixture-only video states through the browser UI", async ({
  page,
  baseURL,
}) => {
  if (baseURL === undefined) {
    throw new Error("Video baseURL is required.");
  }

  const paths = resolveVideoPaths();
  await ensureVideoDirectories(paths);
  const guard = await installFixtureNetworkGuard(page, baseURL);
  const savedStates: VideoStateName[] = [];

  const saveState = async (name: VideoStateName): Promise<void> => {
    await page.context().storageState({ path: paths.state(name) });
    savedStates.push(name);
  };

  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await waitForHome(page);
  await saveState("empty");

  await beginFirstFixtureDocument(page);
  await saveState("doc1EntityReview");
  for (const name of [
    "Nova Arclight",
    "Astra Survey Corps",
    "Northstar Observatory",
    "First Light Briefing",
    "Aster Compass",
  ]) {
    await acceptEntity(page, name);
  }
  await advanceToRelationships(page);
  for (const relationType of [
    "member_of",
    "carries",
    "appears_in",
    "located_at",
  ]) {
    await acceptRelationship(page, relationType);
  }
  await completeAndApply(page);

  await beginNextFixtureDocument(page, "02-nova-archive-revision.md");
  await saveState("doc2BeforeEdit");
  await mergeEntity(page, "Nova", "ent-astra-001");
  await editEntityName(
    page,
    "North Star Observatory",
    "Northstar Observatory",
  );
  await mergeEntity(page, "Northstar Observatory", "ent-astra-003");
  await advanceToRelationships(page);
  await acceptRelationship(page, "ＭＥＭＢＥＲ＿ＯＦ");
  await completeAndApply(page);

  await beginNextFixtureDocument(page, "03-unknown-nova-log.md");
  await expect(
    page.getByText(/Duplicate候補があります。別EntityとしてAccept/u),
  ).toBeVisible();
  await saveState("doc3DuplicateReview");
  await acceptEntity(page, "ＮＯＶＡ");
  await advanceToRelationships(page);
  await acceptRelationship(page, "appears_in");
  await completeAndApply(page);

  await beginNextFixtureDocument(page, "04-quiet-prism-card.md");
  await acceptEntity(page, "Quiet Prism");
  await rejectEntity(page, "Royal Key");
  await advanceToRelationships(page);
  await expect(
    page
      .locator(".callout.warning-callout")
      .filter({ hasText: "終点を解決できません" }),
  ).toBeVisible();
  await saveState("doc4BlockedRelationship");
  await rejectBlockedRelationship(page);
  await saveState("doc4ReadyToComplete");
  await completeAndApply(page);

  await expect(
    page.getByRole("heading", { name: "Knowledge & Insights" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Knowledge統計" }),
  ).toContainText("Entities7Relationships5Orphans1Conflicts1");
  await saveState("finalKnowledge");

  await guard.stop();
  guard.assertClean();
  const summary = JSON.stringify(
    {
      mode: "fixture-only",
      liveAiRequests: guard.report.extractRequests.length,
      externalRequests: guard.report.externalRequests.length,
      states: savedStates,
    },
    null,
    2,
  );
  assertNoSecretMaterial(summary);
  await writeFile(paths.report("state-preparation.json"), `${summary}\n`, "utf8");
});
