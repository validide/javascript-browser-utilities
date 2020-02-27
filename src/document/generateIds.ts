/**
 * Generate a random id
 * @returns A random generated string
 */
function getRanomId(): string { return Math.random().toString(36).substr(2); }

/**
 * Generate a random id that is not present in the document at this time
 * @param document The reference to the document object
 * @returns A random generated string
 */
function generateUniqueId(document: Document, prefix: string): string {
  while(true) {
    const id = (prefix ?? '') + getRanomId();
    if (document.getElementById(id) === null) {
      return id;
    }
  }
}

export { generateUniqueId };
