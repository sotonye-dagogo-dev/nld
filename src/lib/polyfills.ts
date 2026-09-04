// Polyfill for Promise.withResolvers (ES2024) — required by pdfjs-dist 4.10.x on older runtimes
// Older Safari (iOS 16, etc.) and some WebViews do not have this; pdf.js calls it
// unguarded, producing "Promise.withResolvers is not a function".
// Must be imported before any pdfjs-dist import.

type WithResolversPolyfill = <T>() => { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void };

if (typeof Promise !== "undefined" && typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !== "function") {
  (Promise as unknown as { withResolvers: WithResolversPolyfill }).withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export {};
