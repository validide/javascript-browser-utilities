import { JSDOM } from "jsdom";

export const falsies = [undefined, null, false, ""];

export const getDelayPromise = (delayMs = 1, success = true): Promise<void> => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      if (success) res();
      else rej();
    }, delayMs);
  });
};

export function getNewDocument(html = "<!DOCTYPE html>", url?: string): Document {
  const options = url ? { url } : undefined;
  return new JSDOM(html, options as any).window.document;
}
