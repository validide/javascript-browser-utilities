import { getRandomString } from '../../infrastructure/index';

/**
 * Generate a random id that is not present in the document at this time
 *
 * @param document The reference to the document object
 * @returns A random generated string
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function generateUniqueId(document: Document, prefix = ''): string {
  const prefixString = (prefix ?? '');
  // eslint-disable-next-line no-constant-condition
  while(true) {
    // The 'A-' will ensure this is always a valid JavaScript ID
    const id = prefixString + 'A-' + getRandomString() + getRandomString();

    if (document.getElementById(id) === null) {
      return id;
    }
  }
}

export { generateUniqueId };
