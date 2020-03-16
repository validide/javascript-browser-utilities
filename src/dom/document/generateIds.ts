import { getRandomString } from "../../infrastructure";

/**
 * Generate a random id that is not present in the document at this time
 * @param document The reference to the document object
 * @returns A random generated string
 */
function generateUniqueId(document: Document, prefix: string = ''): string {
  const prefixString = (prefix ?? '');
  while(true) {
    // The 'A-' will ensure this is always a valid JavaScript ID
    const id = prefixString + 'A-' + getRandomString() + getRandomString();

    if (document.getElementById(id) === null) {
      return id;
    }
  }
}

export { generateUniqueId };
