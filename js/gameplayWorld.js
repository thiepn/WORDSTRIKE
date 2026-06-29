export const GAMEPLAY_WORLD = Object.freeze({
  width: 1280,
  height: 720,
  margin: 32,
  coreRadius: 42,
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function logicalSpawnPosition(edge, ratio) {
  const { width, height, margin } = GAMEPLAY_WORLD;
  const position = clamp01(ratio);
  if (edge === 0 || edge === "top") return { x: position * width, y: margin };
  if (edge === 1 || edge === "right") return { x: width - margin, y: position * height };
  if (edge === 2 || edge === "bottom") return { x: position * width, y: height - margin };
  return { x: margin, y: position * height };
}

export function createWordTrajectory({ edge, ratio, speed }) {
  const spawn = logicalSpawnPosition(edge, ratio);
  const coreX = GAMEPLAY_WORLD.width / 2;
  const coreY = GAMEPLAY_WORLD.height / 2;
  const dx = coreX - spawn.x;
  const dy = coreY - spawn.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const travelDistance = Math.max(1, distance - GAMEPLAY_WORLD.coreRadius);
  const safeSpeed = Math.max(1, Number(speed) || 1);
  return {
    logicalSpawnX: spawn.x,
    logicalSpawnY: spawn.y,
    logicalX: spawn.x,
    logicalY: spawn.y,
    logicalEndX: spawn.x + dx / distance * travelDistance,
    logicalEndY: spawn.y + dy / distance * travelDistance,
    travelProgress: 0,
    travelDistance,
    travelDurationMs: travelDistance / safeSpeed * 1000,
  };
}

export function projectWordTrajectory(word, viewport) {
  const progress = clamp01(word.travelProgress);
  const logicalX = word.logicalSpawnX + (word.logicalEndX - word.logicalSpawnX) * progress;
  const logicalY = word.logicalSpawnY + (word.logicalEndY - word.logicalSpawnY) * progress;
  word.logicalX = logicalX;
  word.logicalY = logicalY;
  word.x = logicalX / GAMEPLAY_WORLD.width * viewport.width;
  word.y = logicalY / GAMEPLAY_WORLD.height * viewport.height;
  return word;
}

export function advanceWordTrajectory(word, deltaMs, viewport) {
  word.travelProgress = clamp01(
    word.travelProgress + Math.max(0, Number(deltaMs) || 0) / word.travelDurationMs,
  );
  projectWordTrajectory(word, viewport);
  return word.travelProgress >= 1;
}

export function logicalWordDistance(first, second) {
  return Math.hypot(first.logicalX - second.x, first.logicalY - second.y);
}

export function wordDistanceToImpact(word) {
  if (Number.isFinite(word?.travelProgress) && Number.isFinite(word?.travelDistance)) {
    return Math.max(0, 1 - word.travelProgress) * word.travelDistance;
  }
  return null;
}
