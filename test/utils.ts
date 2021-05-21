export const falsies = [undefined, null, false, ''];

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function getDelayPromise(delayMs = 1, success = true): Promise<void> {
  return new Promise((res, rej) =>{
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      success ? res() : rej();
    }, delayMs);
  });
}
