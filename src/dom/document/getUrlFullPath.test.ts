import { beforeEach, describe, expect, it } from "vitest";
import { getNewDocument } from "../../test/utils";
import { getUrlFullPath } from "./getUrlFullPath";

describe("getUrlFullPath", () => {
  let doc = getNewDocument();
  beforeEach(() => {
    doc = getNewDocument();
  });

  it('should return empty string if url is "undefined", "null" or empty string', () => {
    expect(getUrlFullPath(doc, undefined as unknown as string)).toBe("");
    expect(getUrlFullPath(doc, null as unknown as string)).toBe("");
    expect(getUrlFullPath(doc, "")).toBe("");
  });

  it('should thow an error if document is "undefined"', () => {
    expect(() => getUrlFullPath(undefined as unknown as Document, "some value")).toThrowError(
      /Cannot read propert[y|ies].* of undefined/gim,
    );
  });

  it('should thow an error if document is "null"', () => {
    expect(() => getUrlFullPath(null as unknown as Document, "some value")).toThrowError(
      /Cannot read propert[y|ies].* of null/gim,
    );
  });

  it("should return origin", () => {
    expect(getUrlFullPath(doc, "http://localhost")).toBe("http://localhost/");
    expect(getUrlFullPath(doc, "http://localhost:81")).toBe("http://localhost:81/");
    expect(getUrlFullPath(doc, "http://localhost/")).toBe("http://localhost/");
    expect(getUrlFullPath(doc, "http://localhost:81/")).toBe("http://localhost:81/");
    expect(getUrlFullPath(doc, "https://localhost:443")).toBe("https://localhost/");
    expect(getUrlFullPath(doc, "https://localhost:443/")).toBe("https://localhost/");
    expect(getUrlFullPath(doc, "https://localhost:444/")).toBe("https://localhost:444/");
    expect(getUrlFullPath(doc, "https://localhost:444/sasasasa")).toBe("https://localhost:444/sasasasa");
    expect(getUrlFullPath(doc, "https://localhost:444/sasasasa/")).toBe("https://localhost:444/sasasasa/");
    expect(getUrlFullPath(doc, "http://localhost/seg-1/seg-2")).toBe("http://localhost/seg-1/seg-2");
    expect(getUrlFullPath(doc, "http://localhost/seg-1/seg-2?foo=1&bar=2#bzz")).toBe("http://localhost/seg-1/seg-2");
  });
});
