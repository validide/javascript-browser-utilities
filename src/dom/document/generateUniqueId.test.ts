import { beforeEach, describe, expect, it } from "vitest";
import { falsies, getNewDocument } from "../../test/utils";
import { generateUniqueId } from "./generateIds";

describe("generateUniqueId", () => {
  let doc = getNewDocument();
  beforeEach(() => {
    doc = getNewDocument();
  });

  it("should return an id that is unique within the DOM", () => {
    const id = generateUniqueId(doc);

    expect(id.indexOf("prefix_")).toBe(-1);
    expect(doc.getElementById(id)).toBeNull();
  });

  it("should return an id that is unique within the DOM and starts with a prefix", () => {
    const id = generateUniqueId(doc, "prefix_");

    expect(id.indexOf("prefix_")).toBe(0);
    expect(doc.getElementById(id)).toBeNull();
  });

  it("should not fail for falsies", () => {
    const ids: string[] = falsies.map((f) => generateUniqueId(doc, f as unknown as string));

    ids.forEach((id: string, idx: number) => {
      expect(id.length).toBeGreaterThan(0);
      expect(ids.indexOf(id)).toBe(idx);
      expect(ids.lastIndexOf(id)).toBe(idx);
    });
  });

  it("should return an id that is unique", () => {
    let called = 0;
    const fake = {
      getElementById: (): HTMLElement | null => {
        if (called >= falsies.length) {
          return doc.createElement("div");
        }
        called++;
        return falsies[called - 1] as unknown as HTMLElement;
      },
    };
    const id = generateUniqueId(fake as unknown as Document, "");

    expect(id.length).toBeGreaterThan(0);
    expect(doc.getElementById(id)).toBeNull();
  });
});
