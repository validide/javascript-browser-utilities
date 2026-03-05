import { describe, expect, it } from "vitest";
import { getRandomString } from "./getRandomString";

describe("getRandomString", () => {
  it("should return a non empty string", () => {
    const values: string[] = [];
    for (let index = 0; index < 100; index++) {
      const value = getRandomString();
      expect(value.length).not.toBe(0);
      values.push(value);
    }

    values.forEach((v, i, arr) => {
      expect(arr.indexOf(v)).toBe(i);
    });
  });
});
