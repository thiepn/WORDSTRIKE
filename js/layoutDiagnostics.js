export function getHorizontalOverflow(documentObject = globalThis.document) {
  const root = documentObject?.documentElement;
  const scrollWidth = Number(root?.scrollWidth) || 0;
  const clientWidth = Number(root?.clientWidth) || 0;
  return Object.freeze({
    scrollWidth,
    clientWidth,
    overflowPixels: Math.max(0, scrollWidth - clientWidth),
    hasOverflow: scrollWidth > clientWidth,
  });
}
