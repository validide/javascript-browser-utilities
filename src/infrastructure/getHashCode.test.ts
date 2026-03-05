import { describe, expect, it } from "vitest";
import { getHashCode } from "./getHashCode";

describe("getHashCode", () => {
  it("returns same value for identical input and 0 for empty string", () => {
    const value = "some string";
    expect(getHashCode(value)).toBe(getHashCode(value));
    expect(getHashCode("")).toBe(0);
  });
});
