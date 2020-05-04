export const falsies = [undefined, null, false, ''];

export function getDelayPromise(delayMs: number = 1, success: boolean = true): Promise<void> {
  return new Promise((res, rej) =>{
    setTimeout(() => {
      success ? res() : rej();
    }, delayMs);
  });
}
