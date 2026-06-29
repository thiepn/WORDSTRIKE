const CSS_VARIABLES = Object.freeze({
  height: "--game-viewport-height",
  width: "--game-viewport-width",
  offsetTop: "--game-viewport-offset-top",
  offsetLeft: "--game-viewport-offset-left",
});

const finiteNonNegative = (value, fallback = 0) => (
  Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback
);

export function getGameplayViewportMetrics({
  visualViewport = globalThis.visualViewport,
  innerHeight = globalThis.innerHeight,
  innerWidth = globalThis.innerWidth,
} = {}) {
  return Object.freeze({
    height: finiteNonNegative(visualViewport?.height, finiteNonNegative(innerHeight)),
    width: finiteNonNegative(visualViewport?.width, finiteNonNegative(innerWidth)),
    offsetTop: finiteNonNegative(visualViewport?.offsetTop),
    offsetLeft: finiteNonNegative(visualViewport?.offsetLeft),
  });
}

export function applyGameplayViewportMetrics(style, metrics) {
  if (!style?.setProperty || !metrics) return false;
  for (const [key, property] of Object.entries(CSS_VARIABLES)) {
    style.setProperty(property, `${metrics[key]}px`);
  }
  return true;
}

export function focusGameplayInput(input, windowObject = globalThis.window) {
  if (!input?.focus) return false;
  const scrollX = finiteNonNegative(windowObject?.scrollX);
  const scrollY = finiteNonNegative(windowObject?.scrollY);
  try {
    input.focus({ preventScroll: true });
  } catch {
    input.focus();
  }
  const restoreScroll = () => {
    if (windowObject?.scrollX !== scrollX || windowObject?.scrollY !== scrollY) {
      windowObject?.scrollTo?.(scrollX, scrollY);
    }
  };
  restoreScroll();
  windowObject?.setTimeout?.(restoreScroll, 0);
  return true;
}

export function createGameplayViewportController({
  documentObject = globalThis.document,
  windowObject = globalThis.window,
  visualViewport = windowObject?.visualViewport ?? globalThis.visualViewport,
} = {}) {
  const root = documentObject?.documentElement;
  const body = documentObject?.body;
  const update = () => {
    const metrics = getGameplayViewportMetrics({
      visualViewport,
      innerHeight: windowObject?.innerHeight,
      innerWidth: windowObject?.innerWidth,
    });
    body?.classList?.toggle?.("gameplay-viewport-short", metrics.height < 520);
    return applyGameplayViewportMetrics(root?.style, metrics);
  };

  body?.classList?.add?.("gameplay-active");
  visualViewport?.addEventListener?.("resize", update);
  visualViewport?.addEventListener?.("scroll", update);
  windowObject?.addEventListener?.("resize", update);
  windowObject?.addEventListener?.("orientationchange", update);
  update();

  return Object.freeze({
    update,
    destroy() {
      visualViewport?.removeEventListener?.("resize", update);
      visualViewport?.removeEventListener?.("scroll", update);
      windowObject?.removeEventListener?.("resize", update);
      windowObject?.removeEventListener?.("orientationchange", update);
      body?.classList?.remove?.("gameplay-active");
      body?.classList?.remove?.("gameplay-viewport-short");
      for (const property of Object.values(CSS_VARIABLES)) root?.style?.removeProperty?.(property);
    },
  });
}
