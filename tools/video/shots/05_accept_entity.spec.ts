import { expect, test } from "@playwright/test";

import { resolveVideoPaths } from "../paths.js";
import { recordFixtureShot } from "../recording.js";
import {
  applyRecordingUi,
  assertNoVisibleInternalIds,
  openSavedWorkspace,
} from "../recordingUi.js";

const paths = resolveVideoPaths();

test.use({
  storageState: paths.state("doc1EntityReview"),
});

test("05_accept_entity records Fixture review without Live AI", async ({
  page,
  baseURL,
}) => {
  if (baseURL === undefined) {
    throw new Error("Video baseURL is required.");
  }

  await recordFixtureShot({
    page,
    baseURL,
    shotId: "05_accept_entity",
    prepare: async () => {
      await openSavedWorkspace(page, "review");
      await applyRecordingUi(
        page,
        `
          .review-header { margin-bottom:14px !important; padding:18px 24px !important; }
          .review-toolbar { margin-bottom:12px !important; }
          .candidate-panel { padding:20px !important; }
          .candidate-panel > p { margin-bottom:8px !important; }
          .detail-list { margin:10px 0 !important; }
          .candidate-panel > .subpanel + .subpanel { display:none !important; }
          .candidate-panel > form,
          .candidate-panel > .form-stack,
          .phase-footer { display:none !important; }
        `,
      );
      await expect(
        page.getByRole("heading", { name: "Entity Candidate Review" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Nova Arclight" }),
      ).toBeVisible();
      const sourceReference = page
        .locator(".candidate-panel > .subpanel")
        .first();
      await sourceReference.scrollIntoViewIfNeeded();
      await expect(sourceReference).toContainText(
        "Nova Arclight, known as Nova, is a 17-year-old celestial cartographer",
      );
      await expect(
        page.getByRole("button", { name: "Accept as new" }),
      ).toBeVisible();
      await assertNoVisibleInternalIds(page);
    },
    perform: async (control) => {
      await page.screencast.showChapter("Human review before canon", {
        description: "The Names Between Stars · Fixture Mode",
        duration: 1_600,
      });
      await control.waitUntilElapsed(1_900);
      await control.showLabel("Source Reference · exact excerpt", {
        duration: 2_700,
      });
      await control.waitUntilElapsed(4_500);
      await page.getByRole("button", { name: "Accept as new" }).click();
      await expect(
        page
          .getByRole("navigation", { name: "Entity Candidate一覧" })
          .getByRole("button", { name: /Nova Arclight.*accepted/u }),
      ).toBeVisible();
      await control.showLabel("Creator decision saved · accepted", {
        duration: 3_500,
        position: "bottom-right",
        tone: "success",
      });
      await assertNoVisibleInternalIds(page);
      return {
        candidate: "Nova Arclight",
        exactSourceReference: true,
        acceptedAsNew: true,
        internalIdsVisible: false,
      };
    },
  });
});
