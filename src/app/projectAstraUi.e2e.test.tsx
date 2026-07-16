import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemoryStorageAdapter } from "../core/storage";
import { loadProjectAstraFixture } from "../data/demo/project-astra";
import { App } from "./App";
import { createTestApplicationDependencies } from "./testSupport";

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function acceptEntity(name: string): Promise<void> {
  const list = screen.getByRole("navigation", { name: "Entity Candidate一覧" });
  const candidate = within(list).getByRole("button", {
    name: new RegExp(escapePattern(name)),
  });
  fireEvent.click(candidate);
  fireEvent.click(screen.getByRole("button", { name: "Accept as new" }));
  await waitFor(() =>
    expect(
      within(screen.getByRole("navigation", { name: "Entity Candidate一覧" })).getByRole(
        "button",
        { name: new RegExp(`${escapePattern(name)}.*accepted`) },
      ),
    ).toBeInTheDocument(),
  );
}

async function acceptRelationship(relationType: string): Promise<void> {
  const list = screen.getByRole("navigation", {
    name: "Relationship Candidate一覧",
  });
  fireEvent.click(
    within(list).getByRole("button", {
      name: new RegExp(escapePattern(relationType)),
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Accept Relationship" }),
  );
  await waitFor(() =>
    expect(
      within(
        screen.getByRole("navigation", {
          name: "Relationship Candidate一覧",
        }),
      ).getByRole("button", {
        name: new RegExp(`${escapePattern(relationType)}.*(?:accepted|merged)`),
      }),
    ).toBeInTheDocument(),
  );
}

async function beginNextDocument(expectedFileName: string): Promise<void> {
  if (expectedFileName === "01-astra-foundation.md") {
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(
      screen.getByRole("button", { name: "Project Astra Demoを開始" }),
    );
  } else {
    await screen.findByRole("heading", { name: "文書をImport" });
    fireEvent.click(screen.getByRole("button", { name: "ImportしてReview" }));
  }
  expect(
    await screen.findByRole("heading", { name: expectedFileName, level: 1 }),
  ).toBeInTheDocument();
}

async function completeAndApply(): Promise<void> {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Reviewを完了してKnowledgeへ反映",
    }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", { name: "Relationship Candidate Review" }),
    ).not.toBeInTheDocument(),
  );
}

describe("Project Astra browser workflow", () => {
  it("completes all four documents and restores final Insights after refresh", async () => {
    const storage = new MemoryStorageAdapter();
    const fixture = loadProjectAstraFixture();
    const first = render(
      <App dependencies={createTestApplicationDependencies(storage)} />,
    );

    await beginNextDocument("01-astra-foundation.md");
    for (const name of [
      "Nova Arclight",
      "Astra Survey Corps",
      "Northstar Observatory",
      "First Light Briefing",
      "Aster Compass",
    ]) {
      await acceptEntity(name);
    }
    fireEvent.click(
      screen.getByRole("button", { name: "Relationship Reviewへ進む" }),
    );
    await screen.findByRole("heading", {
      name: "Relationship Candidate Review",
    });
    for (const relation of ["member_of", "carries", "appears_in", "located_at"]) {
      await acceptRelationship(relation);
    }
    await completeAndApply();

    await beginNextDocument("02-nova-archive-revision.md");
    const entityList02 = screen.getByRole("navigation", {
      name: "Entity Candidate一覧",
    });
    fireEvent.click(
      within(entityList02).getByRole("button", { name: /Nova.*pending/ }),
    );
    fireEvent.change(screen.getByLabelText("merge先"), {
      target: { value: "ent-astra-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("navigation", { name: "Entity Candidate一覧" }),
        ).getByRole("button", { name: /Nova.*merged/ }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Entity Candidate一覧" }),
      ).getByRole("button", { name: /North Star Observatory.*pending/ }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "name" }), {
      target: { value: "Northstar Observatory" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Editを保存" }));
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("navigation", { name: "Entity Candidate一覧" }),
        ).getByRole("button", { name: /Northstar Observatory.*pending/ }),
      ).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("merge先"), {
      target: { value: "ent-astra-003" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("navigation", { name: "Entity Candidate一覧" }),
        ).getByRole("button", { name: /Northstar Observatory.*merged/ }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Relationship Reviewへ進む" }),
    );
    await screen.findByRole("heading", {
      name: "Relationship Candidate Review",
    });
    expect(
      screen.getByText(/Acceptすると既存Relationship.*SourceRefを統合/),
    ).toBeInTheDocument();
    await acceptRelationship("ＭＥＭＢＥＲ＿ＯＦ");
    await completeAndApply();

    await beginNextDocument("03-unknown-nova-log.md");
    expect(screen.getByText(/Duplicate候補があります。別EntityとしてAccept/)).toBeInTheDocument();
    await acceptEntity("ＮＯＶＡ");
    fireEvent.click(
      screen.getByRole("button", { name: "Relationship Reviewへ進む" }),
    );
    await screen.findByRole("heading", {
      name: "Relationship Candidate Review",
    });
    await acceptRelationship("appears_in");
    await completeAndApply();

    await beginNextDocument("04-quiet-prism-card.md");
    await acceptEntity("Quiet Prism");
    const entityList04 = screen.getByRole("navigation", {
      name: "Entity Candidate一覧",
    });
    fireEvent.click(
      within(entityList04).getByRole("button", { name: /Royal Key.*pending/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Rejectを確定" }));
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("navigation", { name: "Entity Candidate一覧" }),
        ).getByRole("button", { name: /Royal Key.*rejected/ }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Relationship Reviewへ進む" }),
    );
    await screen.findByRole("heading", {
      name: "Relationship Candidate Review",
    });
    expect(await screen.findByText(/Blocked:.*終点を解決できません/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept Relationship" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Reject Relationship" }),
    );
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("navigation", {
            name: "Relationship Candidate一覧",
          }),
        ).getByRole("button", { name: /points_to.*rejected/ }),
      ).toBeInTheDocument(),
    );
    await completeAndApply();

    expect(
      await screen.findByRole("heading", { name: "Knowledge & Insights" }),
    ).toBeInTheDocument();
    const finalSnapshot = await storage.load();
    expect(finalSnapshot.knowledgeRevision).toBe(4);
    expect(finalSnapshot.knowledge).toEqual(fixture.expectedKnowledge);
    expect(screen.getByRole("region", { name: "Knowledge統計" })).toHaveTextContent(
      "Entities7Relationships5Orphans1Conflicts1",
    );
    first.unmount();

    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "Knowledge" }));
    expect(
      await screen.findByRole("heading", { name: "Knowledge & Insights" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nova Arclight · age")).toBeInTheDocument();
    expect(screen.getAllByText("Quiet Prism").length).toBeGreaterThan(0);
  }, 30_000);
});
