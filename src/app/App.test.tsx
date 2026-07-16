import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("identifies the current implementation boundary", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Creative Knowledge Engine" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 0–1 foundation ready")).toBeInTheDocument();
    expect(
      screen.getByText(/AI proposes create candidates/i),
    ).toBeInTheDocument();
  });
});
