export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs = 250): T {
  let timer: NodeJS.Timeout | undefined;
  return function (this: any, ...args: any[]) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn.apply(this, args), delayMs);
  } as T;
}
