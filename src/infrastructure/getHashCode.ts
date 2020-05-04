/**
 * Get a hash code for the given string
 * @returns The has code
 */
function getHashCode(value: string): number {
  let hash = 0;
  const length = value.length;
  let char;
  let index = 0;
  if (length === 0)
    return hash;

  while (index < length) {
    char = value.charCodeAt(index);
    // tslint:disable: no-bitwise
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer

    index++;
  }

  return hash;
}


export { getHashCode };
