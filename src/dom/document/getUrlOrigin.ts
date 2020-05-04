/**
 * Return the origin of an url
 * @param document The reference to the document object
 * @param url The ´url´ for which to get the 'origin'
 * @returns A string representing the url origin
 */
function getUrlOrigin(document: Document, url: string): string {
  if (!url)
    return '';

  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.protocol + '//' + a.hostname + (a.port && ':' + a.port);
}

export { getUrlOrigin };
