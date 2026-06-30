const safeInteger = (value, fallback = 0) => (
  Number.isInteger(Number(value)) ? Math.max(0, Number(value)) : fallback
);

export function getSpeedTestLineWindow({
  currentLineIndex = 0,
  lineCount = 0,
  constrained = false,
} = {}) {
  const count = safeInteger(lineCount);
  const activeLine = Math.min(safeInteger(currentLineIndex), Math.max(0, count - 1));
  const visibleLineCount = constrained ? 2 : 3;
  const maximumTopLine = Math.max(0, count - visibleLineCount);
  const preferredTopLine = constrained
    ? activeLine
    : activeLine >= 2 ? activeLine - 1 : 0;
  const topLineIndex = constrained
    ? Math.min(preferredTopLine, maximumTopLine)
    : preferredTopLine;
  const bottomLineIndex = Math.min(
    Math.max(0, count - 1),
    topLineIndex + visibleLineCount - 1,
  );

  return Object.freeze({
    topLineIndex,
    bottomLineIndex,
    activeLineIndex: activeLine,
    visibleLineCount,
  });
}

export function isConstrainedSpeedTestLayout({
  body = globalThis.document?.body,
  matchMedia = globalThis.matchMedia,
} = {}) {
  if (body?.classList?.contains?.("gameplay-viewport-short")) return true;
  return matchMedia?.("(max-width: 760px), (pointer: coarse) and (max-height: 700px)")?.matches === true;
}
