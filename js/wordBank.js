const FALLBACK_WORDS = [
  "arc", "bit", "code", "dash", "echo", "flux", "glow", "grid", "laser", "neon",
  "pixel", "pulse", "quick", "react", "shift", "spark", "strike", "target", "vector",
  "velocity", "keyboard", "midnight", "overdrive", "precision", "starlight",
];

export async function loadWordBank() {
  try {
    const response = await fetch("./data/theme-default.json");
    if (!response.ok) throw new Error(`Word bank request failed: ${response.status}`);
    const data = await response.json();
    if (!data?.tiers) throw new Error("Invalid word bank");
    return data;
  } catch (error) {
    console.warn("Using fallback word bank.", error);
    return { theme: "fallback", tiers: { 1: FALLBACK_WORDS } };
  }
}

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function selectWordsForLevel(bank, config, levelNumber) {
  const tierNumbers = Object.keys(bank.tiers).map(Number).sort((a, b) => a - b);
  const preferredTiers = tierNumbers.filter((tier) => tier <= config.wordTier);
  const sourceTiers = preferredTiers.length ? preferredTiers : tierNumbers;
  const allWords = sourceTiers.flatMap((tier) => bank.tiers[String(tier)] || bank.tiers[tier] || []);
  const inRange = allWords.filter(
    (word) => word.length >= config.minWordLength && word.length <= config.maxWordLength,
  );
  const pool = [...new Set(inRange.length ? inRange : allWords.length ? allWords : FALLBACK_WORDS)];
  const random = seededRandom(levelNumber * 7919 + config.wordCount);

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  const selected = [];
  for (let index = 0; index < config.wordCount; index += 1) {
    selected.push(pool[index % pool.length]);
  }
  return selected;
}
