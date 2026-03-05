import { beforeEach, describe, expect, it } from "vitest";
import { getNewDocument } from "../../test/utils";
import { getUrlOrigin } from "./getUrlOrigin";

describe("getUrlOrigin", () => {
  let doc: Document;
  beforeEach(() => {
    doc = getNewDocument();
  });

  it('should return empty string if url is "undefined", "null" or empty string', () => {
    expect(getUrlOrigin(doc, undefined as unknown as string)).toBe("");
    expect(getUrlOrigin(doc, null as unknown as string)).toBe("");
    expect(getUrlOrigin(doc, "")).toBe("");
  });

  it('should thow an error if document is "undefined"', () => {
    expect(() => getUrlOrigin(undefined as unknown as Document, "some value")).toThrowError(
      /Cannot read propert[y|ies].* of undefined/gim,
    );
  });

  it('should thow an error if document is "null"', () => {
    expect(() => getUrlOrigin(null as unknown as Document, "some value")).toThrowError(
      /Cannot read propert[y|ies].* of null/gim,
    );
  });

  it("should return origin", () => {
    expect(getUrlOrigin(doc, "http://localhost")).toBe("http://localhost");
    expect(getUrlOrigin(doc, "http://localhost:81")).toBe("http://localhost:81");
    expect(getUrlOrigin(doc, "http://localhost/")).toBe("http://localhost");
    expect(getUrlOrigin(doc, "http://localhost:81/")).toBe("http://localhost:81");
    expect(getUrlOrigin(doc, "https://localhost:443/sasasasa")).toBe("https://localhost");
    expect(getUrlOrigin(doc, "https://localhost:444/sasasasa")).toBe("https://localhost:444");
  });
});
