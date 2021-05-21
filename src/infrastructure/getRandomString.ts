/**
 * Generate a random string
 *
 * @returns A random generated string
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function getRandomString(): string { return Math.random().toString(36).substring(2); }

export { getRandomString };
