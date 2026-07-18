import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { resolveVideoPaths } from "../paths.js";
import { recordFixtureShot } from "../recording.js";
import {
  applyRecordingUi,
  assertNoVisibleInternalIds,
  markFormByHeading,
  openSavedWorkspace,
  redactSelectOptionIds,
} from "../recordingUi.js";
import {
  canonConflictCard,
  codexFinishCard,
  finalCardMarkup,
  FINAL_CARD_LINES,
  scatteredLoreCard,
} from "../titleCards.js";

const paths = resolveVideoPaths();

function requireBaseURL(baseURL: string | undefined): string {
  if (baseURL === undefined) throw new Error("Video baseURL is required.");
  return baseURL;
}

async function markPanelByHeading(
  page: Page,
  heading: string,
  marker: string,
): Promise<void> {
  await page
    .getByRole("heading", { name: heading })
    .locator("..")
    .evaluate(
      (element, value) => element.setAttribute("data-video-panel", value),
      marker,
    );
}

async function currentReviewCandidateCounts(
  page: Page,
): Promise<{ entities: number; relationships: number }> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem(
      "creative-knowledge-engine:storage:v1",
    );
    if (raw === null) throw new Error("Missing saved review state.");
    const envelope = JSON.parse(raw) as {
      snapshot: {
        reviewSessions: Array<{
          phase: string;
          entityReviews: unknown[];
          relationshipReviews: unknown[];
        }>;
      };
    };
    const session = [...envelope.snapshot.reviewSessions]
      .reverse()
      .find((candidate) => candidate.phase === "entities");
    if (session === undefined) throw new Error("Missing Entity Review session.");
    return {
      entities: session.entityReviews.length,
      relationships: session.relationshipReviews.length,
    };
  });
}

async function assertExportContract(serialized: string): Promise<void> {
  const parsed = JSON.parse(serialized) as Record<string, unknown>;
  expect(parsed.schemaVersion).toBe(1);
  expect(parsed.knowledgeRevision).toBe(4);
  expect(parsed).toHaveProperty("knowledge");
  expect(Object.keys(parsed).sort()).toEqual([
    "knowledge",
    "knowledgeRevision",
    "schemaVersion",
  ]);
  for (const excluded of [
    "importedDocuments",
    "importRegistry",
    "reviewSessions",
    "reviewApplications",
    "rawDocuments",
  ]) {
    expect(parsed).not.toHaveProperty(excluded);
  }
}

test.describe("generated problem and closing cards", () => {
  test.use({ storageState: paths.state("empty") });

  test("01_title_problem records scattered lore sources", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "01_title_problem",
      prepare: async () => {
        await page.setContent(scatteredLoreCard());
        for (const fileName of [
          "character-notes.md",
          "world-setting.md",
          "revision.json",
          "scene-draft.md",
        ]) {
          await expect(page.getByRole("button", { name: fileName })).toBeVisible();
        }
      },
      perform: async (control) => {
        await control.showLabel("Lore is scattered across source documents.", {
          duration: 1_700,
        });
        await control.waitUntilElapsed(900);
        const cards = page.locator("[data-file]");
        for (let index = 0; index < 4; index += 1) {
          const card = cards.nth(index);
          await card.click();
          await card.evaluate((element) => element.classList.add("active"));
          await page.waitForTimeout(250);
        }
        await control.showLabel("One story · four files · unclear canon", {
          duration: 2_100,
          position: "bottom-right",
          tone: "warning",
        });
        return {
          sourceFiles: 4,
          productUi: false,
          scatteredLoreVisible: true,
        };
      },
    });
  });

  test("02_duplicate_conflict_problem records Nova canon conflict", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "02_duplicate_conflict_problem",
      prepare: async () => {
        await page.setContent(canonConflictCard());
        await expect(page.getByText("Nova", { exact: true })).toBeVisible();
        await expect(page.getByText("ＮＯＶＡ", { exact: true })).toBeVisible();
        await expect(page.getByText("Age 17")).toBeVisible();
        await expect(page.getByText("Age 18")).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Which version is canon?" }),
        ).toBeVisible();
      },
      perform: async (control) => {
        await control.waitUntilElapsed(1_200);
        for (const version of ["nova", "fullwidth"]) {
          const card = page.locator(`[data-version="${version}"]`);
          await card.click();
          await card.evaluate((element) => element.classList.add("active"));
          await page.waitForTimeout(1_200);
        }
        await control.showLabel("Which version is canon?", {
          duration: 4_500,
          tone: "warning",
        });
        return {
          novaVariants: 2,
          ageClaims: "17 / 18",
          canonQuestionVisible: true,
        };
      },
    });
  });

  test("15_codex_finish uses dynamic test metadata and final card", async ({
    page,
    baseURL,
  }) => {
    let testCount = 0;
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "15_codex_finish",
      prepare: async () => {
        const metadata = JSON.parse(
          await readFile(paths.report("metadata.json"), "utf8"),
        ) as { tests?: unknown };
        if (
          typeof metadata.tests !== "number" ||
          !Number.isInteger(metadata.tests) ||
          metadata.tests <= 0
        ) {
          throw new Error("Video metadata does not contain a valid test count.");
        }
        testCount = metadata.tests;
        await page.setContent(codexFinishCard(testCount));
        await expect(page.getByText("Built with Codex.")).toBeVisible();
        await expect(page.getByText("Powered by GPT-5.6.")).toBeVisible();
        await expect(
          page.getByText(
            `${testCount.toLocaleString("en-US")} automated tests support creator-controlled knowledge.`,
          ),
        ).toBeVisible();
      },
      perform: async (control) => {
        await control.showLabel(
          "Specification · implementation · tests · fixes",
          { duration: 4_200 },
        );
        await control.waitUntilElapsed(9_450);
        await page
          .locator("[data-finish-stage]")
          .evaluate((element, markup) => {
            element.outerHTML = markup;
          }, finalCardMarkup());
        await expect(page.getByText(FINAL_CARD_LINES[0])).toBeVisible();
        await expect(page.getByText(FINAL_CARD_LINES[1])).toBeVisible();
        return {
          dynamicTestCount: testCount,
          gpt56Visible: true,
          finalCardText: FINAL_CARD_LINES.join(" / "),
          finalCardHoldMs: 3_550,
        };
      },
    });
  });
});

test.describe("empty workspace shots", () => {
  test.use({ storageState: paths.state("empty") });

  test("03_home_intro records the empty workspace and Import path", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "03_home_intro",
      prepare: async () => {
        await page.goto("/");
        await applyRecordingUi(
          page,
          ".demo-progress ol { display:none !important; }",
        );
        await expect(
          page.getByRole("button", {
            name: "The Names Between Stars Demoを開始",
          }),
        ).toBeVisible();
        await expect(
          page.getByLabel("現在のKnowledge revision"),
        ).toContainText("0");
        await expect(
          page.getByRole("heading", { name: "作業状況" }),
        ).not.toBeVisible();
        await assertNoVisibleInternalIds(page);
      },
      perform: async (control) => {
        await control.showLabel(
          "Empty workspace · The Names Between Stars",
          { duration: 3_500 },
        );
        await control.waitUntilElapsed(6_400);
        await page.getByRole("button", { name: "文書をImport" }).click();
        await expect(
          page.getByRole("heading", { name: "文書をImport" }),
        ).toBeVisible();
        await assertNoVisibleInternalIds(page);
        return {
          emptyWorkspace: true,
          publicStoryNameVisible: true,
          importPathVisible: true,
        };
      },
    });
  });

  test("04_import_astra records Document 01 Import and Candidate Review", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "04_import_astra",
      prepare: async () => {
        await page.goto("/");
        await page
          .getByRole("navigation", { name: "メインナビゲーション" })
          .getByRole("button", { name: "Import" })
          .click();
        await applyRecordingUi(
          page,
          `
            .import-layout { grid-template-columns: 1fr !important; }
            .import-layout > section:last-child { display:none !important; }
          `,
        );
        await expect(
          page.getByRole("heading", {
            name: "次のThe Names Between Stars文書",
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "01-astra-foundation.md" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "ImportしてReview" }),
        ).toBeVisible();
        await assertNoVisibleInternalIds(page);
      },
      perform: async (control) => {
        await control.showLabel(
          "Document 01 · The Names Between Stars",
          { duration: 2_800 },
        );
        await control.waitUntilElapsed(3_200);
        await page.getByRole("button", { name: "ImportしてReview" }).click();
        await expect(
          page.getByRole("heading", { name: "Entity Candidate Review" }),
        ).toBeVisible();
        await applyRecordingUi(page);
        const counts = await currentReviewCandidateCounts(page);
        expect(counts).toEqual({ entities: 5, relationships: 4 });
        await control.showLabel(
          "Candidate entities and relationships · nothing is canon yet",
          { duration: 5_200, position: "bottom-right" },
        );
        await assertNoVisibleInternalIds(page);
        return {
          documentOrder: 1,
          entityCandidates: counts.entities,
          relationshipCandidates: counts.relationships,
          transitionedToEntityReview: true,
          candidateTypesEnumeratedInCopy: false,
        };
      },
    });
  });
});

test.describe("Document 02 Edit and Merge", () => {
  test.use({ storageState: paths.state("doc2BeforeEdit") });

  test("06_edit_merge re-checks corrected Location and merges", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "06_edit_merge",
      prepare: async () => {
        await openSavedWorkspace(page, "review");
        const list = page.getByRole("navigation", {
          name: "Entity Candidate一覧",
        });
        await list
          .getByRole("button", { name: /North Star Observatory.*pending/u })
          .click();
        await markPanelByHeading(page, "SourceRefs", "source");
        await markFormByHeading(page, "登録済みEntityへMerge", "merge");
        await markFormByHeading(page, "CandidateをEdit", "edit");
        await applyRecordingUi(
          page,
          `
            [data-video-panel="source"],
            .candidate-panel > .detail-list,
            .candidate-panel > p:first-of-type { display:none !important; }
            [data-video-form="edit"] > label,
            [data-video-form="edit"] > fieldset,
            [data-video-form="edit"] > p,
            [data-video-form="edit"] .form-row > label:first-child {
              display:none !important;
            }
            [data-video-form="merge"] > label:nth-of-type(n+2) {
              display:none !important;
            }
          `,
        );
        await expect(
          page.getByRole("heading", { name: "North Star Observatory" }),
        ).toBeVisible();
        await expect(
          page.getByRole("textbox", { name: "name", exact: true }),
        ).toHaveValue("North Star Observatory");
        await assertNoVisibleInternalIds(page);
      },
      perform: async (control) => {
        await control.showLabel("Source spelling: North Star Observatory", {
          duration: 2_300,
          tone: "warning",
        });
        await control.waitUntilElapsed(1_600);
        await page
          .getByRole("textbox", { name: "name", exact: true })
          .fill("Northstar Observatory");
        await page.getByRole("button", { name: "Editを保存" }).click();
        await expect(
          page.getByRole("heading", {
            name: "Northstar Observatory",
            exact: true,
          }),
        ).toBeVisible();
        await markFormByHeading(page, "登録済みEntityへMerge", "merge");
        await markFormByHeading(page, "CandidateをEdit", "edit");
        await redactSelectOptionIds(page);
        const duplicatePanel = page
          .getByRole("heading", { name: "Duplicate候補" })
          .locator("..");
        await expect(duplicatePanel).toContainText("Northstar Observatory");
        await control.showLabel(
          "Re-checked · existing Location detected",
          { duration: 2_400, position: "bottom-right", tone: "success" },
        );
        await page.getByLabel("merge先").selectOption("ent-astra-003");
        await page.getByRole("button", { name: "Merge", exact: true }).click();
          await expect(
            page.locator(".candidate-panel .status-chip"),
          ).toHaveText("merged");
        await control.showLabel("Merged into the existing Location", {
          duration: 2_600,
          tone: "success",
        });
        await assertNoVisibleInternalIds(page);
        return {
          originalName: "North Star Observatory",
          editedName: "Northstar Observatory",
          recheckedDuplicate: true,
          existingEntityType: "location",
          mergeCompleted: true,
        };
      },
    });
  });
});

test.describe("Document 03 duplicate decision", () => {
  test.use({ storageState: paths.state("doc3DuplicateReview") });

  test("07_duplicate_accept_new keeps full-width Nova separate", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "07_duplicate_accept_new",
      prepare: async () => {
        await openSavedWorkspace(page, "review");
        await markPanelByHeading(page, "SourceRefs", "source");
        await applyRecordingUi(
          page,
          `
              [data-video-panel="source"],
              .candidate-panel > .detail-list,
              .candidate-panel > p:first-of-type,
              .candidate-panel > form {
              display:none !important;
            }
          `,
        );
        await expect(
          page.getByRole("heading", { name: "ＮＯＶＡ", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(
            "Duplicate候補があります。別EntityとしてAcceptすることもできます。",
          ),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Duplicate候補" }).locator(".."),
        ).toContainText("Nova Arclight");
        await assertNoVisibleInternalIds(page);
      },
      perform: async (control) => {
        await control.showLabel(
          "Duplicate warning · a match is not an automatic decision",
          { duration: 3_700, tone: "warning" },
        );
        await control.waitUntilElapsed(5_100);
        await page.getByRole("button", { name: "Accept as new" }).click();
        await expect(
          page
            .getByRole("navigation", { name: "Entity Candidate一覧" })
            .getByRole("button", { name: /ＮＯＶＡ.*accepted/u }),
        ).toBeVisible();
        await control.showLabel("Kept as a separate Character", {
          duration: 3_300,
          position: "bottom-right",
          tone: "success",
        });
        await assertNoVisibleInternalIds(page);
        return {
          candidateName: "ＮＯＶＡ",
          duplicateOf: "Nova Arclight",
          warningOnly: true,
          acceptedAsNew: true,
          retainedAsSeparateCharacter: true,
        };
      },
    });
  });
});

test.describe("Document 04 blocked Relationship and apply", () => {
  test.describe("blocked Relationship", () => {
    test.use({ storageState: paths.state("doc4BlockedRelationship") });

    test("08_blocked_relationship rejects unresolved Outer Gate", async ({
      page,
      baseURL,
    }) => {
      await recordFixtureShot({
        page,
        baseURL: requireBaseURL(baseURL),
        shotId: "08_blocked_relationship",
        prepare: async () => {
          await openSavedWorkspace(page, "review");
          await markPanelByHeading(page, "SourceRefs", "source");
          await markFormByHeading(page, "端点を手動解決", "manual");
          await applyRecordingUi(
            page,
            `
              [data-video-panel="source"],
              [data-video-form="manual"],
              .candidate-list,
              .candidate-panel .detail-list {
                display:none !important;
              }
              .review-layout {
                grid-template-columns:1fr !important;
              }
            `,
          );
          const relationshipHeading = page.getByRole("heading", {
            name: /→ points_to → Outer Gate/u,
          });
          await relationshipHeading.evaluate((element) => {
            element.textContent = "Quiet Prism → points_to → Outer Gate";
          });
          await expect(
            page.getByRole("heading", {
              name: "Quiet Prism → points_to → Outer Gate",
            }),
          ).toBeVisible();
          await expect(
            page
              .locator(".callout.warning-callout")
              .filter({ hasText: "終点を解決できません" }),
          ).toBeVisible();
          await expect(
            page.getByRole("button", { name: "Accept Relationship" }),
          ).toBeDisabled();
          await assertNoVisibleInternalIds(page);
        },
        perform: async (control) => {
          await control.showLabel(
            "Unresolved endpoint · Accept remains blocked",
            { duration: 3_800, tone: "warning" },
          );
          await control.waitUntilElapsed(5_100);
          await page
            .getByRole("button", { name: "Reject Relationship" })
            .click();
          await expect(
            page.locator(".candidate-panel .status-chip"),
          ).toHaveText("rejected");
          await control.showLabel("Creator decision · Reject", {
            duration: 3_000,
            position: "bottom-right",
            tone: "success",
          });
          await assertNoVisibleInternalIds(page);
          return {
            relationship: "Quiet Prism → Outer Gate",
            unresolvedEndpoint: true,
            acceptDisabled: true,
            rejected: true,
          };
        },
      });
    });
  });

  test.describe("ready to apply", () => {
    test.use({ storageState: paths.state("doc4ReadyToComplete") });

    test("09_complete_apply advances canonical Knowledge revision", async ({
      page,
      baseURL,
    }) => {
      await recordFixtureShot({
        page,
        baseURL: requireBaseURL(baseURL),
        shotId: "09_complete_apply",
        prepare: async () => {
          await openSavedWorkspace(page, "review");
          await applyRecordingUi(
            page,
            `
              .review-layout,
              .review-toolbar { display:none !important; }
              .phase-footer { margin-top:80px !important; }
            `,
          );
          await expect(
            page.getByRole("button", {
              name: "Reviewを完了してKnowledgeへ反映",
            }),
          ).toBeEnabled();
          await assertNoVisibleInternalIds(page);
        },
        perform: async (control) => {
          await control.showLabel("Review complete · ready to apply", {
            duration: 2_300,
            tone: "success",
          });
          await control.waitUntilElapsed(2_500);
          await page
            .getByRole("button", {
              name: "Reviewを完了してKnowledgeへ反映",
            })
            .click();
          await expect(
            page.getByRole("heading", { name: "Knowledge & Insights" }),
          ).toBeVisible();
          await expect(page.getByLabel("Knowledge revision")).toContainText(
            "4",
          );
          await applyRecordingUi(page);
          await control.showLabel(
            "Applied to canonical Knowledge · Revision 4",
            { duration: 3_400, position: "bottom-right", tone: "success" },
          );
          await assertNoVisibleInternalIds(page);
          return {
            reviewComplete: true,
            applied: true,
            knowledgeRevision: 4,
          };
        },
      });
    });
  });
});

test.describe("final Knowledge views", () => {
  test.use({ storageState: paths.state("finalKnowledge") });

  test("10_insights records counts, Duplicate, Conflict, and Orphan", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "10_insights",
      prepare: async () => {
        await openSavedWorkspace(page, "knowledge");
        await applyRecordingUi(
          page,
          `
            .export-panel,
            .knowledge-browser,
            .relationship-table-wrap,
            section[aria-labelledby="relationships-title"] {
              display:none !important;
            }
            .page-intro { margin-bottom:18px !important; }
            .insight-grid { margin-top:14px !important; }
          `,
        );
        await page
          .getByRole("heading", { name: "Entity types" })
          .locator("..")
          .evaluate((element) => {
            element.style.display = "none";
          });
        const statistics = page.getByRole("region", {
          name: "Knowledge統計",
        });
        await expect(statistics).toHaveText(
          "Entities7Relationships5Orphans1Conflicts1",
        );
        const duplicate = page
          .getByRole("heading", { name: "Duplicate" })
          .locator("..");
        await expect(duplicate).toContainText("Nova Arclight");
        await expect(duplicate).toContainText("ＮＯＶＡ");
        const conflict = page
          .getByRole("heading", { name: "Conflict" })
          .locator("..");
        await expect(conflict).toContainText("Nova Arclight · age");
        await expect(conflict).toContainText("17 / 18");
        const orphan = page
          .getByRole("heading", { name: "Orphan" })
          .locator("..");
        await expect(orphan).toContainText("Quiet Prism");
        await assertNoVisibleInternalIds(page);
      },
      perform: async (control) => {
        await control.showLabel("7 Entities · 5 Relationships", {
          duration: 3_200,
          tone: "success",
        });
        await control.waitUntilElapsed(3_600);
        await page.locator(".insight-grid").scrollIntoViewIfNeeded();
        await control.showLabel(
          "Duplicate · age Conflict · Quiet Prism Orphan",
          { duration: 5_200, position: "bottom-right", tone: "warning" },
        );
        await assertNoVisibleInternalIds(page);
        return {
          entities: 7,
          relationships: 5,
          duplicateGroup: "Nova Arclight / ＮＯＶＡ",
          unresolvedConflict: "Nova Arclight.age = 17 / 18",
          orphan: "Quiet Prism",
        };
      },
    });
  });

  test("11_search asserts full-width Nova result ranking", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "11_search",
      prepare: async () => {
        await openSavedWorkspace(page, "search");
        await applyRecordingUi(
          page,
          `
            .search-controls .filter-grid { display:none !important; }
            .search-controls { margin-bottom:12px !important; padding:18px !important; }
            .page-intro { margin-bottom:16px !important; }
            .entity-detail .detail-list,
            .entity-detail .subpanel { display:none !important; }
          `,
        );
        await expect(
          page.getByRole("heading", { name: "Entity Search" }),
        ).toBeVisible();
        await assertNoVisibleInternalIds(page);
      },
      perform: async (control) => {
        await control.showLabel("Search: ＮＯＶＡ", { duration: 2_300 });
        await page.getByRole("searchbox", { name: "検索語" }).fill("ＮＯＶＡ");
        const results = page
          .getByRole("navigation", { name: "Entity検索結果" })
          .getByRole("button");
        await expect(results).toHaveCount(2);
        await expect(results.nth(0)).toContainText("ＮＯＶＡ");
        await expect(results.nth(1)).toContainText("Nova Arclight");
        await control.showLabel(
          "1. ＮＯＶＡ   2. Nova Arclight · deterministic ranking",
          { duration: 4_300, position: "bottom-right", tone: "success" },
        );
        await results.nth(0).click();
        await expect(
          page.locator(".search-layout > .panel").nth(1),
        ).toContainText("ＮＯＶＡ");
        await assertNoVisibleInternalIds(page);
        return {
          query: "ＮＯＶＡ",
          resultCount: 2,
          firstResult: "ＮＯＶＡ",
          secondResult: "Nova Arclight",
          rankingAsserted: true,
        };
      },
    });
  });

  test("12_graph asserts seven nodes and five directed edges", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "12_graph",
      prepare: async () => {
        await openSavedWorkspace(page, "graph");
        await applyRecordingUi(
          page,
          `
            .graph-controls .filter-grid { display:none !important; }
            .graph-controls { padding:18px !important; margin-bottom:12px !important; }
            .page-intro { margin-bottom:14px !important; }
          `,
        );
        const graph = page.getByRole("group", {
          name: "Knowledge Graph: 7 nodes and 5 directed edges",
        });
        await expect(graph).toBeVisible();
        await expect(graph.locator(".graph-node")).toHaveCount(7);
        await expect(graph.locator(".graph-edge")).toHaveCount(5);
        await expect(page.getByText("Read-only derived view")).toBeVisible();
        await assertNoVisibleInternalIds(page);
      },
      perform: async (control) => {
        await control.showLabel(
          "Read-only Knowledge Graph · 7 nodes · 5 directed edges",
          { duration: 3_700, tone: "success" },
        );
        await page.getByRole("button", { name: "Fit view" }).click();
        await control.waitUntilElapsed(4_200);
        const novaNode = page
          .getByRole("group", {
            name: "Knowledge Graph: 7 nodes and 5 directed edges",
          })
          .getByRole("button", {
            name: /Nova Arclight, character, 3 relationships/u,
          });
        await novaNode.click();
        await page.locator(".graph-entity-detail").scrollIntoViewIfNeeded();
        await expect(page.locator(".graph-entity-detail")).toContainText(
          "Nova Arclight",
        );
        await control.showLabel("Selected node · Nova Arclight details", {
          duration: 3_700,
          position: "bottom-right",
        });
        await assertNoVisibleInternalIds(page);
        return {
          readOnly: true,
          nodes: 7,
          directedEdges: 5,
          selectedEntity: "Nova Arclight",
          entityDetailsVisible: true,
        };
      },
    });
  });

  test("13_export asserts versioned Knowledge-only JSON", async ({
    page,
    baseURL,
  }) => {
    await recordFixtureShot({
      page,
      baseURL: requireBaseURL(baseURL),
      shotId: "13_export",
      prepare: async () => {
        await openSavedWorkspace(page, "knowledge");
        await applyRecordingUi(
          page,
          `
            .knowledge-metrics,
            .export-panel ~ * { display:none !important; }
            .page-intro { margin-bottom:18px !important; }
          `,
        );
        await expect(
          page.getByRole("heading", { name: "Knowledge JSON Export" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "JSON previewを表示" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", {
            name: "Knowledge JSONをダウンロード",
          }),
        ).toBeVisible();
        await assertNoVisibleInternalIds(page);
      },
      perform: async (control) => {
        await control.showLabel("Versioned canonical Knowledge JSON", {
          duration: 2_600,
        });
        await page.getByRole("button", { name: "JSON previewを表示" }).click();
        const preview = page.locator("#knowledge-export-preview");
        const serialized = await preview.textContent();
        if (serialized === null) throw new Error("Missing JSON preview.");
        await assertExportContract(serialized);
        const parsed = JSON.parse(serialized) as {
          schemaVersion: number;
          knowledgeRevision: number;
          knowledge: { entities: unknown[]; relationships: unknown[] };
        };
        await preview.evaluate(
          (element, value) => {
            element.textContent = value;
          },
          JSON.stringify(
            {
              schemaVersion: parsed.schemaVersion,
              knowledgeRevision: parsed.knowledgeRevision,
              knowledge: {
                entities: `[${parsed.knowledge.entities.length} canonical entities]`,
                relationships: `[${parsed.knowledge.relationships.length} directed relationships]`,
              },
            },
            null,
            2,
          ),
        );
        await control.showLabel(
          "Preview · Review Sessions and raw documents excluded",
          { duration: 3_500, position: "bottom-right", tone: "success" },
        );

        const downloadPromise = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Knowledge JSONをダウンロード" })
          .click();
        const download = await downloadPromise;
        const downloadPath = await download.path();
        if (downloadPath === null) throw new Error("Missing export download.");
        await assertExportContract(await readFile(downloadPath, "utf8"));
        await assertNoVisibleInternalIds(page);
        return {
          schemaVersion: 1,
          knowledgeRevision: 4,
          previewVisible: true,
          downloadCompleted: true,
          reviewSessionsExcluded: true,
          rawImportedDocumentsExcluded: true,
        };
      },
    });
  });
});
