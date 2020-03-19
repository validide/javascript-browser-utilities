/**
 * Generate a random string
 * @returns A random generated string
 */
function getRandomString(): string { return Math.random().toString(36).substring(2); }

export { getRandomString }
