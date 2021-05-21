/**
 * Return the full path of an url (the origin and path name)
 *
 * @param document The reference to the document object
 * @param url The ´url´ for which to get the full path
 * @returns A string representing the url full path
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function getUrlFullPath(document: Document, url: string): string {
  if (!url)
    return '';

  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.protocol + '//' + a.hostname + (a.port && ':' + a.port) + a.pathname;
}

export { getUrlFullPath };
