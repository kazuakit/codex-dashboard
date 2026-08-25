import { describe, expect, it } from "vitest";
import messages from "./text-master.json" with { type: "json" };

describe("text master", () => {
  it("provides the shared validation error messages", () => {
    expect(messages.errors.validation.required).toBeTruthy();
  });
});
