import { getRandomString } from "../../infrastructure";

/**
 * Generate a random id that is not present in the document at this time
 * @param document The reference to the document object
 * @returns A random generated string
 */
function generateUniqueId(document: Document, prefix: string = ''): string {
  const prefixString = (prefix ?? '');
  while(true) {
    const id = prefixString + getRandomString() + getRandomString();

    // If we do not have a prefix check that the first digit is a letter
    if (prefixString.length === 0 && !id.match(/^[a-z]/i))
      continue;

    if (document.getElementById(id) === null) {
      return id;
    }
  }
}

export { generateUniqueId };
