import { readFile } from "node:fs/promises";
import {
  buildBossWordPools,
  generateBossEncounter,
  getBossWordTier,
} from "../js/bossGenerator.js";

const seed = Number(process.argv[2]) || 12345;
const typing = JSON.parse(
  await readFile(new URL("../data/typingTestWords.json", import.meta.url), "utf8"),
);
const long = JSON.parse(
  await readFile(new URL("../data/bossCommonLongWords.json", import.meta.url), "utf8"),
);
const source = {
  pools: buildBossWordPools({
    typingWords: typing.words,
    longWords: long.words,
  }),
};

for (let level = 10; level <= 100; level += 10) {
  const encounter = generateBossEncounter(source, level, seed);
  console.log(`BOSS ${level} // SEED ${seed}`);
  encounter.segments.forEach((segment, index) => {
    const annotated = segment
      .split(" ")
      .map((word) => `${word}[${getBossWordTier(word)}]`)
      .join(" ");
    console.log(`  ${index + 1}: ${annotated}`);
  });
  console.log(
    `  characters=${encounter.metrics.totalRequiredCharacters}`
    + ` target=${encounter.profile.targetCharacters}`
    + ` range=${encounter.profile.minimumCharacters}-${encounter.profile.maximumCharacters}`
    + ` wpm=${encounter.profile.targetWPM}`
    + ` timer=${encounter.timing.effectiveTimeLimitSec.toFixed(3)}s`,
  );
}
